import type { AdminRole } from '@/lib/types';

export function canViewReviews(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canModerateReviews(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canViewReviewerSensitiveFields(
  role: AdminRole | null | undefined
): boolean {
  return role === 'super_admin' || role === 'admin';
}

