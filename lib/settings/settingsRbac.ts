import type { AdminRole } from '@/lib/types';

export function canViewSettings(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canEditSettings(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin';
}

export function canRollbackSetting(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin';
}

export function canViewSensitiveSettingValue(
  role: AdminRole | null | undefined
): boolean {
  return role === 'super_admin';
}
