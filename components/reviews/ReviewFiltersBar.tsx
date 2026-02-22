'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type {
  ReviewListFilters,
  ReviewSortDirection,
  ReviewSortField,
} from '@/lib/types';

interface ReviewFiltersBarProps {
  filters: ReviewListFilters;
  sortField: ReviewSortField;
  sortDirection: ReviewSortDirection;
  onFiltersChange: (patch: Partial<ReviewListFilters>) => void;
  onSortFieldChange: (value: ReviewSortField) => void;
  onSortDirectionChange: (value: ReviewSortDirection) => void;
  onReset: () => void;
}

export default function ReviewFiltersBar({
  filters,
  sortField,
  sortDirection,
  onFiltersChange,
  onSortFieldChange,
  onSortDirectionChange,
  onReset,
}: ReviewFiltersBarProps) {
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
        placeholder="Review ID, user ID, book ID, title, content"
        value={filters.search ?? ''}
        onChange={(e) => onFiltersChange({ search: e.target.value })}
      />

      <TextField
        select
        size="small"
        label="Status"
        value={filters.status ?? 'all'}
        onChange={(e) =>
          onFiltersChange({ status: e.target.value as ReviewListFilters['status'] })
        }
      >
        <MenuItem value="all">All Statuses</MenuItem>
        <MenuItem value="published">Published</MenuItem>
        <MenuItem value="hidden">Hidden</MenuItem>
        <MenuItem value="removed">Removed</MenuItem>
      </TextField>

      <TextField
        select
        size="small"
        label="Rating"
        value={filters.rating ?? 'all'}
        onChange={(e) =>
          onFiltersChange({
            rating: (e.target.value === 'all'
              ? 'all'
              : Number(e.target.value)) as ReviewListFilters['rating'],
          })
        }
      >
        <MenuItem value="all">All Ratings</MenuItem>
        {[5, 4, 3, 2, 1].map((r) => (
          <MenuItem key={r} value={r}>
            {r} star{r > 1 ? 's' : ''}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Flagged"
        value={filters.flagged ?? 'all'}
        onChange={(e) =>
          onFiltersChange({ flagged: e.target.value as ReviewListFilters['flagged'] })
        }
      >
        <MenuItem value="all">All</MenuItem>
        <MenuItem value="flagged">Flagged</MenuItem>
        <MenuItem value="unflagged">Unflagged</MenuItem>
      </TextField>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          label="Book ID"
          placeholder="book id"
          value={filters.bookId ?? ''}
          onChange={(e) => onFiltersChange({ bookId: e.target.value })}
          sx={{ minWidth: 120 }}
        />
        <TextField
          select
          size="small"
          label="Sort"
          value={sortField}
          onChange={(e) => onSortFieldChange(e.target.value as ReviewSortField)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="updatedAt">Updated</MenuItem>
          <MenuItem value="createdAt">Created</MenuItem>
          <MenuItem value="rating">Rating</MenuItem>
          <MenuItem value="reportCount">Reports</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Dir"
          value={sortDirection}
          onChange={(e) => onSortDirectionChange(e.target.value as ReviewSortDirection)}
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

