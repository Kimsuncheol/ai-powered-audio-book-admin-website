import type { AdminRole } from '@/lib/types';

export function canViewAiOps(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canControlAiJobs(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin';
}

export function canViewAiJobSensitivePayload(
  role: AdminRole | null | undefined
): boolean {
  return role === 'super_admin';
}
