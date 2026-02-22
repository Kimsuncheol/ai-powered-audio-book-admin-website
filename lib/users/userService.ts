import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import db from '@/lib/firebase/firestore';
import { logAuditAction } from '@/lib/auth/auditLog';
import { normalizeAdminRole } from '@/lib/auth/adminRoles';
import type {
  Actor,
  AdminRole,
  AuthorStatus,
  UserDocument,
  UserFilters,
} from '@/lib/types';

const USERS_COLLECTION = 'users';

// ---- Helper ----

function docToUser(id: string, data: Record<string, unknown>): UserDocument {
  const user = {
    ...(data as Omit<UserDocument, 'uid'>),
    uid: id,
  } as UserDocument & { role?: string | null };

  const rawRole: string | null = typeof user.role === 'string' ? user.role : null;
  const normalizedAdminRole = normalizeAdminRole(rawRole) ?? undefined;

  // Backward-compat:
  // Some user docs store a general role string (e.g. "author", "reader(user)")
  // instead of (or before) a dedicated `userType` field.
  const derivedUserType =
    user.userType ??
    (normalizedAdminRole
      ? 'admin'
      : rawRole === 'author'
        ? 'author'
        : rawRole === 'reader' ||
            rawRole === 'reader(user)' ||
            rawRole === 'user'
          ? 'reader'
          : undefined);

  return {
    ...user,
    role: normalizedAdminRole,
    userType: derivedUserType,
  };
}

// ---- Read ----

export async function listUsers(
  filters: UserFilters,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _actor: Actor
): Promise<UserDocument[]> {
  const q = query(
    collection(db, USERS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => docToUser(d.id, d.data()));

  const filtered = all.filter((u) => {
    if (filters.userType && filters.userType !== 'all') {
      if (u.userType !== filters.userType) return false;
    }
    if (filters.status && filters.status !== 'all') {
      if (u.status !== filters.status) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesEmail = u.email.toLowerCase().includes(q);
      const matchesName = u.displayName?.toLowerCase().includes(q) ?? false;
      if (!matchesEmail && !matchesName) return false;
    }
    return true;
  });

  return filtered;
}

export async function getUser(
  uid: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _actor: Actor
): Promise<UserDocument | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return docToUser(snap.id, snap.data());
}

// ---- Status ----

export async function updateUserStatus(
  uid: string,
  status: 'active' | 'suspended' | 'disabled',
  reason: string,
  actor: Actor
): Promise<void> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  const before = snap.exists() ? (snap.data() as UserDocument).status : null;

  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    status,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: status === 'active' ? 'activate_user' : 'suspend_user',
    resourceType: 'user',
    resourceId: uid,
    metadata: { before, after: status, reason },
  });
}

// ---- Admin Role ----

export async function assignAdminRole(
  uid: string,
  adminRole: AdminRole,
  reason: string,
  actor: Actor
): Promise<void> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  const before = snap.exists() ? (snap.data() as UserDocument).role ?? null : null;

  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    role: adminRole,
    userType: 'admin',
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'assign_role',
    resourceType: 'user',
    resourceId: uid,
    metadata: { before, after: adminRole, reason },
  });
}

export async function revokeAdminRole(
  uid: string,
  reason: string,
  actor: Actor
): Promise<void> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  const before = snap.exists() ? (snap.data() as UserDocument).role ?? null : null;

  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    role: deleteField(),
    userType: 'reader',
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'revoke_role',
    resourceType: 'user',
    resourceId: uid,
    metadata: { before, after: null, reason },
  });
}

// ---- Author Status ----

const AUTHOR_STATUS_TO_AUDIT_ACTION: Record<
  AuthorStatus,
  'approve_author' | 'reject_author' | 'suspend_user' | 'activate_user'
> = {
  approved: 'approve_author',
  rejected: 'reject_author',
  suspended: 'suspend_user',
  pending: 'activate_user',
};

export async function updateAuthorStatus(
  uid: string,
  authorStatus: AuthorStatus,
  reason: string,
  actor: Actor
): Promise<void> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  const before = snap.exists()
    ? (snap.data() as UserDocument).authorStatus ?? null
    : null;

  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    authorStatus,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: AUTHOR_STATUS_TO_AUDIT_ACTION[authorStatus],
    resourceType: 'user',
    resourceId: uid,
    metadata: { before, after: authorStatus, reason },
  });
}
