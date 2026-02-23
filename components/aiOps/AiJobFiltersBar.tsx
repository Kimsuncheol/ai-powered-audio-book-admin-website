'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type {
  AiJobListFilters,
  AiJobSortDirection,
  AiJobSortField,
  AiJobStatus,
} from '@/lib/types';

const STATUS_OPTIONS: Array<AiJobStatus | 'all'> = [
  'all',
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
];

function labelize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface AiJobFiltersBarProps {
  filters: AiJobListFilters;
  sortField: AiJobSortField;
  sortDirection: AiJobSortDirection;
  workflowOptions: string[];
  providerOptions: string[];
  onFiltersChange: (patch: Partial<AiJobListFilters>) => void;
  onSortFieldChange: (value: AiJobSortField) => void;
  onSortDirectionChange: (value: AiJobSortDirection) => void;
  onReset: () => void;
}

export default function AiJobFiltersBar({
  filters,
  sortField,
  sortDirection,
  workflowOptions,
  providerOptions,
  onFiltersChange,
  onSortFieldChange,
  onSortDirectionChange,
  onReset,
}: AiJobFiltersBarProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: '1fr',
          md: '2fr 1fr 1fr 1fr 1fr 1fr auto',
        },
        mb: 2,
      }}
    >
      <TextField
        size="small"
        label="Search"
        placeholder="Job ID, request ID, target, workflow"
        value={filters.search ?? ''}
        onChange={(e) => onFiltersChange({ search: e.target.value })}
      />

      <TextField
        select
        size="small"
        label="Status"
        value={filters.status ?? 'all'}
        onChange={(e) =>
          onFiltersChange({ status: e.target.value as AiJobListFilters['status'] })
        }
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
        label="Workflow"
        value={filters.workflowType ?? 'all'}
        onChange={(e) =>
          onFiltersChange({
            workflowType: e.target.value as AiJobListFilters['workflowType'],
          })
        }
      >
        <MenuItem value="all">All Workflows</MenuItem>
        {workflowOptions.map((workflow) => (
          <MenuItem key={workflow} value={workflow}>
            {workflow}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Provider"
        value={filters.provider ?? 'all'}
        onChange={(e) =>
          onFiltersChange({ provider: e.target.value as AiJobListFilters['provider'] })
        }
      >
        <MenuItem value="all">All Providers</MenuItem>
        {providerOptions.map((provider) => (
          <MenuItem key={provider} value={provider}>
            {provider}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        size="small"
        label="Model"
        placeholder="Model contains..."
        value={filters.model ?? ''}
        onChange={(e) => onFiltersChange({ model: e.target.value })}
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          label="Min Retries"
          type="number"
          value={filters.retryCountMin ?? ''}
          onChange={(e) =>
            onFiltersChange({
              retryCountMin:
                e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
            })
          }
          sx={{ minWidth: 120 }}
        />
        <TextField
          select
          size="small"
          label="Sort"
          value={sortField}
          onChange={(e) => onSortFieldChange(e.target.value as AiJobSortField)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="updatedAt">Updated</MenuItem>
          <MenuItem value="createdAt">Created</MenuItem>
          <MenuItem value="durationMs">Duration</MenuItem>
          <MenuItem value="status">Status</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Dir"
          value={sortDirection}
          onChange={(e) =>
            onSortDirectionChange(e.target.value as AiJobSortDirection)
          }
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
