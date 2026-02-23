'use client';

import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { AuditAction } from '@/lib/types';

interface AuditActionChipProps {
  action: AuditAction | string;
  sx?: SxProps<Theme>;
}

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success';

const ACTION_CONFIG: Record<string, { label: string; color: ChipColor }> = {
  sign_in:              { label: 'Sign In',          color: 'default' },
  sign_out:             { label: 'Sign Out',         color: 'default' },
  sign_up:              { label: 'Sign Up',          color: 'default' },
  failed_auth:          { label: 'Failed Auth',      color: 'error'   },
  create:               { label: 'Create',           color: 'success' },
  update:               { label: 'Update',           color: 'info'    },
  delete:               { label: 'Delete',           color: 'error'   },
  view:                 { label: 'View',             color: 'default' },
  export:               { label: 'Export',           color: 'default' },
  publish:              { label: 'Publish',          color: 'success' },
  unpublish:            { label: 'Unpublish',        color: 'warning' },
  assign_role:          { label: 'Assign Role',      color: 'warning' },
  revoke_role:          { label: 'Revoke Role',      color: 'error'   },
  suspend_user:         { label: 'Suspend User',     color: 'error'   },
  activate_user:        { label: 'Activate User',    color: 'warning' },
  approve_author:       { label: 'Approve Author',   color: 'warning' },
  reject_author:        { label: 'Reject Author',    color: 'error'   },
  assign_report:        { label: 'Assign Report',    color: 'info'    },
  update_report_status: { label: 'Update Report',    color: 'info'    },
  resolve_report:       { label: 'Resolve Report',   color: 'success' },
  update_setting:       { label: 'Update Setting',   color: 'info'    },
  rollback_setting:     { label: 'Rollback Setting', color: 'warning' },
  view_setting_sensitive: { label: 'View Sensitive', color: 'warning' },
  hide_review:          { label: 'Hide Review',      color: 'warning' },
  remove_review:        { label: 'Remove Review',    color: 'error'   },
  restore_review:       { label: 'Restore Review',   color: 'success' },
};

export default function AuditActionChip({ action, sx }: AuditActionChipProps) {
  const config = ACTION_CONFIG[action] ?? {
    label: action,
    color: 'default' as ChipColor,
  };
  return <Chip label={config.label} color={config.color} size="small" sx={sx} />;
}
