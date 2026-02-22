'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
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
import ReportFiltersBar from './ReportFiltersBar';
import ReportStatusChip from './ReportStatusChip';
import ReportTargetTypeChip from './ReportTargetTypeChip';
import type {
  ReportDocument,
  ReportListFilters,
  ReportSortDirection,
  ReportSortField,
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

function initialFilters(): ReportListFilters {
  return {
    search: '',
    status: 'all',
    targetEntityType: 'all',
    assigneeUid: 'all',
  };
}

interface ReportListProps {
  reports: ReportDocument[];
  isLoading: boolean;
  loadError: string | null;
}

export default function ReportList({
  reports,
  isLoading,
  loadError,
}: ReportListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ReportListFilters>(initialFilters);
  const [sortField, setSortField] = useState<ReportSortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<ReportSortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filteredReports = useMemo(() => {
    let list = [...reports];

    if (filters.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.targetEntityType && filters.targetEntityType !== 'all') {
      list = list.filter((r) => r.targetEntityType === filters.targetEntityType);
    }
    if (filters.assigneeUid && filters.assigneeUid !== 'all') {
      if (filters.assigneeUid === 'unassigned') {
        list = list.filter((r) => !r.assignedToUid);
      } else {
        const q = filters.assigneeUid.toLowerCase();
        list = list.filter((r) => (r.assignedToUid ?? '').toLowerCase().includes(q));
      }
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((r) => {
        return (
          (r.id ?? '').toLowerCase().includes(q) ||
          r.targetEntityId.toLowerCase().includes(q) ||
          (r.reporterUid ?? '').toLowerCase().includes(q) ||
          (r.reporterEmail ?? '').toLowerCase().includes(q) ||
          (r.assignedToUid ?? '').toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      const aMs =
        sortField === 'createdAt'
          ? timestampToMillis(a.createdAt)
          : timestampToMillis(a.updatedAt);
      const bMs =
        sortField === 'createdAt'
          ? timestampToMillis(b.createdAt)
          : timestampToMillis(b.updatedAt);
      return sortDirection === 'asc' ? aMs - bMs : bMs - aMs;
    });

    return list;
  }, [filters, reports, sortDirection, sortField]);

  const paginatedReports = filteredReports.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <ReportFiltersBar
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
      ) : filteredReports.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {reports.length === 0 ? 'No reports found.' : 'No reports match the current filters.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Report ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Target ID</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell align="right">Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedReports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{report.id}</TableCell>
                    <TableCell>
                      <ReportStatusChip status={report.status} />
                    </TableCell>
                    <TableCell>
                      <ReportTargetTypeChip targetEntityType={report.targetEntityType} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {report.targetEntityId}
                    </TableCell>
                    <TableCell>{report.category}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>
                      {report.assignedToUid ?? '—'}
                    </TableCell>
                    <TableCell>{formatDate(report.createdAt)}</TableCell>
                    <TableCell>{formatDate(report.updatedAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open report detail">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/reports/${report.id}`)}
                          aria-label={`Open report ${report.id}`}
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
            count={filteredReports.length}
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

