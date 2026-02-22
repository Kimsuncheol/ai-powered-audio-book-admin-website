'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type {
  ReportListFilters,
  ReportSortDirection,
  ReportSortField,
  ReportStatus,
  ReportTargetEntityType,
} from '@/lib/types';

const STATUS_OPTIONS: Array<ReportStatus | 'all'> = [
  'all',
  'open',
  'in_review',
  'resolved_action_taken',
  'resolved_no_action',
  'dismissed',
];

const TARGET_OPTIONS: Array<ReportTargetEntityType | 'all'> = [
  'all',
  'review',
  'user',
  'book',
  'author_profile',
];

function labelize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface ReportFiltersBarProps {
  filters: ReportListFilters;
  sortField: ReportSortField;
  sortDirection: ReportSortDirection;
  onFiltersChange: (patch: Partial<ReportListFilters>) => void;
  onSortFieldChange: (value: ReportSortField) => void;
  onSortDirectionChange: (value: ReportSortDirection) => void;
  onReset: () => void;
}

export default function ReportFiltersBar({
  filters,
  sortField,
  sortDirection,
  onFiltersChange,
  onSortFieldChange,
  onSortDirectionChange,
  onReset,
}: ReportFiltersBarProps) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 1fr auto' }, mb: 2 }}>
      <TextField
        size="small"
        label="Search"
        placeholder="Report ID, target ID, reporter, assignee"
        value={filters.search ?? ''}
        onChange={(e) => onFiltersChange({ search: e.target.value })}
      />

      <TextField
        select
        size="small"
        label="Status"
        value={filters.status ?? 'all'}
        onChange={(e) => onFiltersChange({ status: e.target.value as ReportListFilters['status'] })}
      >
        {STATUS_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option === 'all' ? 'All Statuses' : labelize(option)}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Target Type"
        value={filters.targetEntityType ?? 'all'}
        onChange={(e) =>
          onFiltersChange({
            targetEntityType: e.target.value as ReportListFilters['targetEntityType'],
          })
        }
      >
        {TARGET_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option === 'all' ? 'All Types' : labelize(option)}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        size="small"
        label="Assignee"
        placeholder="UID or 'unassigned'"
        value={filters.assigneeUid && filters.assigneeUid !== 'all' ? filters.assigneeUid : ''}
        onChange={(e) =>
          onFiltersChange({
            assigneeUid: e.target.value.trim() ? e.target.value : 'all',
          })
        }
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          select
          size="small"
          label="Sort"
          value={sortField}
          onChange={(e) => onSortFieldChange(e.target.value as ReportSortField)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="updatedAt">Updated</MenuItem>
          <MenuItem value="createdAt">Created</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Dir"
          value={sortDirection}
          onChange={(e) => onSortDirectionChange(e.target.value as ReportSortDirection)}
          sx={{ minWidth: 100 }}
        >
          <MenuItem value="desc">Desc</MenuItem>
          <MenuItem value="asc">Asc</MenuItem>
        </TextField>
      </Box>

      <Button variant="outlined" onClick={onReset}>
        Reset
      </Button>
    </Box>
  );
}

