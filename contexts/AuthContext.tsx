'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { setCookie, destroyCookie } from 'nookies';
import auth from '@/lib/firebase/auth';
import db from '@/lib/firebase/firestore';
import { logAuditAction } from '@/lib/auth/auditLog';
import { normalizeAdminRole } from '@/lib/auth/adminRoles';
import type { AuthContextValue, UserDocument } from '@/lib/types';

// Cookie name must match exactly what proxy.ts reads
export const AUTH_TOKEN_COOKIE = 'admin_auth_token';

const COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 8, // 8 hours
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserDoc = useCallback(
    async (uid: string): Promise<UserDocument | null> => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const raw = snap.data() as UserDocument & { role?: string | null };
          return {
            ...raw,
            role: normalizeAdminRole(raw.role) ?? undefined,
          };
        }
        return null;
      } catch {
        // No Firestore doc or permission denied — treat as unauthorized
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Store ID token in cookie for proxy presence check
        const idToken = await user.getIdToken();
        setCookie(null, AUTH_TOKEN_COOKIE, idToken, COOKIE_OPTIONS);

        const docData = await fetchUserDoc(user.uid);
        setFirebaseUser(user);
        setUserDoc(docData);
      } else {
        destroyCookie(null, AUTH_TOKEN_COOKIE, { path: '/' });
        setFirebaseUser(null);
        setUserDoc(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [fetchUserDoc]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const docData = await fetchUserDoc(credential.user.uid);

      if (!docData) {
        // AUD-AUTH-003: log failed admin authorization before throwing
        await logAuditAction({
          actorUid: credential.user.uid,
          actorEmail: credential.user.email ?? '',
          actorRole: 'admin', // placeholder — role not provisioned
          action: 'failed_auth',
          resourceType: 'auth',
          resourceId: null,
          metadata: { reason: 'no_admin_role' },
        });
        await firebaseSignOut(auth);
        throw new Error('No admin role assigned to this account.');
      }

      // AUD-AUTH-001: log successful sign-in
      await logAuditAction({
        actorUid: credential.user.uid,
        actorEmail: credential.user.email ?? '',
        actorRole: docData.role ?? 'admin',
        action: 'sign_in',
        resourceType: 'auth',
        resourceId: null,
        metadata: {},
      });
    },
    [fetchUserDoc],
  );

  const signOut = useCallback(async () => {
    if (firebaseUser && userDoc) {
      // AUD-AUTH-002: log sign-out before clearing state
      await logAuditAction({
        actorUid: firebaseUser.uid,
        actorEmail: firebaseUser.email ?? '',
        actorRole: userDoc.role ?? 'admin',
        action: 'sign_out',
        resourceType: 'auth',
        resourceId: null,
        metadata: {},
      });
    }
    await firebaseSignOut(auth);
  }, [firebaseUser, userDoc]);

  const signUp = useCallback(async (email: string, password: string) => {
    // Invitation-only policy (OD-AUTH-001):
    // Create the Firebase account, log the event, then sign out immediately.
    // Access is pending until a super_admin creates the users/{uid} Firestore doc.
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await logAuditAction({
      actorUid: credential.user.uid,
      actorEmail: email,
      actorRole: 'admin', // placeholder — no role assigned yet
      action: 'sign_up',
      resourceType: 'auth',
      resourceId: null,
      metadata: { pending: true },
    });

    await firebaseSignOut(auth);
  }, []);

  const reauthenticate = useCallback(
    async (password: string) => {
      if (!firebaseUser?.email) throw new Error('No authenticated user');
      const cred = EmailAuthProvider.credential(firebaseUser.email, password);
      await reauthenticateWithCredential(firebaseUser, cred);
    },
    [firebaseUser],
  );

  /**
   * Returns seconds elapsed since the user's last sign-in.
   * Used to enforce reauthentication freshness for sensitive actions (FR-AUTH-005).
   * Returns null if not authenticated or lastSignInTime is unavailable.
   */
  const getAuthAgeSeconds = useCallback((): number | null => {
    if (!firebaseUser?.metadata.lastSignInTime) return null;
    const lastSignIn = new Date(firebaseUser.metadata.lastSignInTime).getTime();
    return Math.floor((Date.now() - lastSignIn) / 1000);
  }, [firebaseUser]);

  const value: AuthContextValue = {
    firebaseUser,
    userDoc,
    role: userDoc?.role ?? null,
    isLoading,
    isAuthenticated: !!firebaseUser && !!userDoc,
    signIn,
    signOut,
    signUp,
    reauthenticate,
    getAuthAgeSeconds,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
