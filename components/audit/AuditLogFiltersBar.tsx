'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { AuditAction, AuditLogFilters, AdminRole, ResourceType } from '@/lib/types';

const RESOURCE_TYPE_OPTIONS: Array<ResourceType | 'all'> = [
  'all',
  'auth',
  'book',
  'chapter',
  'user',
  'review',
  'report',
  'settings',
  'ai_config',
];

const ACTION_OPTIONS: Array<AuditAction | 'all'> = [
  'all',
  'activate_user',
  'approve_author',
  'assign_report',
  'assign_role',
  'create',
  'delete',
  'export',
  'failed_auth',
  'hide_review',
  'publish',
  'reject_author',
  'remove_review',
  'resolve_report',
  'restore_review',
  'revoke_role',
  'rollback_setting',
  'sign_in',
  'sign_out',
  'sign_up',
  'suspend_user',
  'unpublish',
  'update',
  'update_report_status',
  'update_setting',
  'view',
  'view_setting_sensitive',
];

const ACTOR_ROLE_OPTIONS: Array<AdminRole | 'all'> = ['all', 'super_admin', 'admin'];

function labelize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface AuditLogFiltersBarProps {
  filters: AuditLogFilters;
  pageSize: 25 | 50 | 100;
  onFiltersChange: (patch: Partial<AuditLogFilters>) => void;
  onPageSizeChange: (size: 25 | 50 | 100) => void;
  onReset: () => void;
}

export default function AuditLogFiltersBar({
  filters,
  pageSize,
  onFiltersChange,
  onPageSizeChange,
  onReset,
}: AuditLogFiltersBarProps) {
  const dateRangeInvalid =
    !!(filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo);

  const toInputDate = (d: Date | null | undefined): string => {
    if (!d) return '';
    return d.toISOString().slice(0, 10);
  };

  const fromInputDate = (s: string): Date | null => {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr auto' },
        mb: 2,
      }}
    >
      {/* Email search */}
      <TextField
        size="small"
        label="Actor Email"
        placeholder="Search by email"
        value={filters.actorEmail ?? ''}
        onChange={(e) => onFiltersChange({ actorEmail: e.target.value })}
      />

      {/* Resource type */}
      <TextField
        select
        size="small"
        label="Resource Type"
        value={filters.resourceType ?? 'all'}
        onChange={(e) =>
          onFiltersChange({ resourceType: e.target.value as ResourceType | 'all' })
        }
      >
        {RESOURCE_TYPE_OPTIONS.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt === 'all' ? 'All Types' : labelize(opt)}
          </MenuItem>
        ))}
      </TextField>

      {/* Action */}
      <TextField
        select
        size="small"
        label="Action"
        value={filters.action ?? 'all'}
        onChange={(e) =>
          onFiltersChange({ action: e.target.value as AuditAction | 'all' })
        }
      >
        {ACTION_OPTIONS.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt === 'all' ? 'All Actions' : labelize(opt)}
          </MenuItem>
        ))}
      </TextField>

      {/* Actor role */}
      <TextField
        select
        size="small"
        label="Actor Role"
        value={filters.actorRole ?? 'all'}
        onChange={(e) =>
          onFiltersChange({ actorRole: e.target.value as AdminRole | 'all' })
        }
      >
        {ACTOR_ROLE_OPTIONS.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt === 'all' ? 'All Roles' : labelize(opt)}
          </MenuItem>
        ))}
      </TextField>

      {/* Date range */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          type="date"
          size="small"
          label="From"
          slotProps={{ inputLabel: { shrink: true } }}
          value={toInputDate(filters.dateFrom)}
          error={dateRangeInvalid}
          helperText={dateRangeInvalid ? '"From" must be before "To"' : undefined}
          onChange={(e) =>
            onFiltersChange({ dateFrom: fromInputDate(e.target.value) })
          }
          sx={{ flex: 1 }}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          slotProps={{ inputLabel: { shrink: true } }}
          value={toInputDate(filters.dateTo)}
          error={dateRangeInvalid}
          onChange={(e) =>
            onFiltersChange({ dateTo: fromInputDate(e.target.value) })
          }
          sx={{ flex: 1 }}
        />
      </Box>

      {/* Page size + Reset */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          select
          size="small"
          label="Rows"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as 25 | 50 | 100)}
          sx={{ minWidth: 80 }}
        >
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={onReset} sx={{ whiteSpace: 'nowrap' }}>
          Reset
        </Button>
      </Box>
    </Box>
  );
}
