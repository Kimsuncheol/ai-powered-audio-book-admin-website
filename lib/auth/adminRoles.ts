import type { AdminRole } from '@/lib/types';

export type LegacyAdminRole =
  | AdminRole
  | 'content_admin'
  | 'community_admin'
  | 'analyst';

export function normalizeAdminRole(
  role: string | null | undefined
): AdminRole | null {
  if (!role) return null;
  if (role === 'super_admin' || role === 'admin') return role;
  if (
    role === 'content_admin' ||
    role === 'community_admin' ||
    role === 'analyst'
  ) {
    return 'admin';
  }
  return null;
}
