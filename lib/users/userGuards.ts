import { collection, getDocs, query, where } from 'firebase/firestore';
import db from '@/lib/firebase/firestore';

/**
 * Returns true if the given uid is the only active super_admin.
 * Used to prevent self-demotion / removal of the last super_admin (FR-ADMIN-005).
 */
export async function isLastSuperAdmin(uid: string): Promise<boolean> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'super_admin'),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  const superAdminIds = snap.docs.map((d) => d.id);
  return superAdminIds.length === 1 && superAdminIds[0] === uid;
}
