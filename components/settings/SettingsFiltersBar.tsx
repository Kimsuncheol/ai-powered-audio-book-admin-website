'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type {
  SettingCategory,
  SettingListFilters,
  SettingSortDirection,
  SettingSortField,
} from '@/lib/types';

const CATEGORY_OPTIONS: Array<SettingCategory | 'all'> = [
  'all',
  'general_app',
  'feature_flags',
  'moderation_policy',
  'user_management_policy',
  'review_policy',
  'report_policy',
  'ai_ops_policy',
  'security_policy',
];

function labelize(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface SettingsFiltersBarProps {
  filters: SettingListFilters;
  sortField: SettingSortField;
  sortDirection: SettingSortDirection;
  onFiltersChange: (patch: Partial<SettingListFilters>) => void;
  onSortFieldChange: (value: SettingSortField) => void;
  onSortDirectionChange: (value: SettingSortDirection) => void;
  onReset: () => void;
}

export default function SettingsFiltersBar({
  filters,
  sortField,
  sortDirection,
  onFiltersChange,
  onSortFieldChange,
  onSortDirectionChange,
  onReset,
}: SettingsFiltersBarProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: '1fr',
          md: '2fr 1fr 1fr 1fr 1fr auto',
        },
        mb: 2,
      }}
    >
      <TextField
        size="small"
        label="Search"
        placeholder="Key, label, description"
        value={filters.search ?? ''}
        onChange={(e) => onFiltersChange({ search: e.target.value })}
      />

      <TextField
        select
        size="small"
        label="Category"
        value={filters.category ?? 'all'}
        onChange={(e) =>
          onFiltersChange({
            category: e.target.value as SettingListFilters['category'],
          })
        }
      >
        {CATEGORY_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option === 'all' ? 'All Categories' : labelize(option)}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Editability"
        value={filters.editable ?? 'all'}
        onChange={(e) =>
          onFiltersChange({
            editable: e.target.value as SettingListFilters['editable'],
          })
        }
      >
        <MenuItem value="all">All</MenuItem>
        <MenuItem value="editable">Editable</MenuItem>
        <MenuItem value="read_only">Read Only</MenuItem>
      </TextField>

      <TextField
        select
        size="small"
        label="Sensitivity"
        value={filters.sensitive ?? 'all'}
        onChange={(e) =>
          onFiltersChange({
            sensitive: e.target.value as SettingListFilters['sensitive'],
          })
        }
      >
        <MenuItem value="all">All</MenuItem>
        <MenuItem value="sensitive">Sensitive</MenuItem>
        <MenuItem value="non_sensitive">Non-sensitive</MenuItem>
      </TextField>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          select
          size="small"
          label="Sort"
          value={sortField}
          onChange={(e) => onSortFieldChange(e.target.value as SettingSortField)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="lastUpdatedAt">Updated</MenuItem>
          <MenuItem value="key">Key</MenuItem>
          <MenuItem value="category">Category</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Dir"
          value={sortDirection}
          onChange={(e) =>
            onSortDirectionChange(e.target.value as SettingSortDirection)
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
