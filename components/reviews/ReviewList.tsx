'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Rating from '@mui/material/Rating';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReviewFiltersBar from './ReviewFiltersBar';
import ReviewStatusChip from './ReviewStatusChip';
import type {
  ReviewDocument,
  ReviewListFilters,
  ReviewSortDirection,
  ReviewSortField,
} from '@/lib/types';

function timestampToMillis(value: { toDate?: () => Date } | null | undefined): number {
  if (!value) return 0;
  try {
    return typeof value.toDate === 'function' ? value.toDate().getTime() : 0;
  } catch {
    return 0;
  }
}

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    const date = typeof value.toDate === 'function' ? value.toDate() : new Date();
    return date.toLocaleString();
  } catch {
    return '—';
  }
}

function initialFilters(): ReviewListFilters {
  return {
    search: '',
    status: 'all',
    rating: 'all',
    flagged: 'all',
    bookId: '',
  };
}

interface ReviewListProps {
  reviews: ReviewDocument[];
  isLoading: boolean;
  loadError: string | null;
}

export default function ReviewList({
  reviews,
  isLoading,
  loadError,
}: ReviewListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ReviewListFilters>(initialFilters);
  const [sortField, setSortField] = useState<ReviewSortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<ReviewSortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (filters.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.rating && filters.rating !== 'all') {
      list = list.filter((r) => r.rating === filters.rating);
    }
    if (filters.flagged && filters.flagged !== 'all') {
      list = list.filter((r) =>
        filters.flagged === 'flagged'
          ? (r.reportCount ?? 0) > 0
          : (r.reportCount ?? 0) === 0
      );
    }
    if (filters.bookId?.trim()) {
      const q = filters.bookId.trim().toLowerCase();
      list = list.filter((r) => r.bookId.toLowerCase().includes(q));
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((r) => {
        return (
          (r.id ?? '').toLowerCase().includes(q) ||
          r.userId.toLowerCase().includes(q) ||
          r.bookId.toLowerCase().includes(q) ||
          (r.title ?? '').toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'createdAt':
          aValue = timestampToMillis(a.createdAt);
          bValue = timestampToMillis(b.createdAt);
          break;
        case 'updatedAt':
          aValue = timestampToMillis(a.updatedAt);
          bValue = timestampToMillis(b.updatedAt);
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'reportCount':
          aValue = a.reportCount ?? 0;
          bValue = b.reportCount ?? 0;
          break;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return list;
  }, [filters, reviews, sortDirection, sortField]);

  const paginatedReviews = filteredReviews.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <ReviewFiltersBar
        filters={filters}
        sortField={sortField}
        sortDirection={sortDirection}
        onFiltersChange={(patch) => {
          setFilters((prev) => ({ ...prev, ...patch }));
          setPage(0);
        }}
        onSortFieldChange={(value) => {
          setSortField(value);
          setPage(0);
        }}
        onSortDirectionChange={(value) => {
          setSortDirection(value);
          setPage(0);
        }}
        onReset={() => {
          setFilters(initialFilters());
          setSortField('updatedAt');
          setSortDirection('desc');
          setPage(0);
        }}
      />

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredReviews.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {reviews.length === 0 ? 'No reviews found.' : 'No reviews match the current filters.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Review ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Book ID</TableCell>
                  <TableCell>User ID</TableCell>
                  <TableCell>Reports</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell align="right">Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedReviews.map((review) => (
                  <TableRow key={review.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{review.id}</TableCell>
                    <TableCell>
                      <ReviewStatusChip status={review.status} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating size="small" readOnly value={review.rating} max={5} />
                        <Typography variant="caption" color="text.secondary">
                          {review.rating}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{review.bookId}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{review.userId}</TableCell>
                    <TableCell>
                      {(review.reportCount ?? 0) > 0 ? (
                        <Chip
                          size="small"
                          color="warning"
                          label={`${review.reportCount} flagged`}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          0
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(review.createdAt)}</TableCell>
                    <TableCell>{formatDate(review.updatedAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open review detail">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/reviews/${review.id}`)}
                          aria-label={`Open review ${review.id}`}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredReviews.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </>
      )}
    </Box>
  );
}

