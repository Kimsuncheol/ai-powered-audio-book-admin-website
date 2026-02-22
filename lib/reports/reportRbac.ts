import type { AdminRole } from '@/lib/types';

export function canViewReport(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canAssignReport(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canUpdateReportStatus(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canResolveReport(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canViewReporterEmail(
  role: AdminRole | null | undefined
): boolean {
  return role === 'super_admin' || role === 'admin';
}
