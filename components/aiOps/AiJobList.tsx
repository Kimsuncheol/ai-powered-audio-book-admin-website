'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
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
import AiJobFiltersBar from '@/components/aiOps/AiJobFiltersBar';
import AiJobStatusChip from '@/components/aiOps/AiJobStatusChip';
import type {
  AiJobDocument,
  AiJobListFilters,
  AiJobSortDirection,
  AiJobSortField,
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
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

function initialFilters(): AiJobListFilters {
  return {
    search: '',
    status: 'all',
    workflowType: 'all',
    provider: 'all',
    model: '',
    retryCountMin: null,
  };
}

interface AiJobListProps {
  jobs: AiJobDocument[];
  isLoading: boolean;
  loadError: string | null;
}

const AI_JOB_SKELETON_ROW_COUNT = 8;

function AiJobTableSkeleton() {
  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {[
                'Job ID',
                'Status',
                'Workflow',
                'Provider / Model',
                'Target',
                'Retries',
                'Created',
                'Updated',
                'Open',
              ].map((column) => (
                <TableCell key={column}>
                  <Skeleton
                    variant="text"
                    width={column === 'Open' ? 36 : 72}
                    height={20}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: AI_JOB_SKELETON_ROW_COUNT }).map((_, rowIndex) => (
              <TableRow key={`ai-job-skeleton-row-${rowIndex}`}>
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  <Skeleton
                    variant="text"
                    width={`${70 + (rowIndex % 3) * 10}%`}
                    height={20}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                </TableCell>
                <TableCell>
                  <Skeleton
                    variant="rounded"
                    width={84}
                    height={24}
                    animation="wave"
                    sx={{ borderRadius: 10 }}
                  />
                </TableCell>
                <TableCell>
                  <Skeleton
                    variant="text"
                    width={`${65 + (rowIndex % 2) * 15}%`}
                    height={20}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                </TableCell>
                <TableCell>
                  <Skeleton
                    variant="text"
                    width="60%"
                    height={20}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                  <Skeleton
                    variant="text"
                    width="75%"
                    height={18}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                </TableCell>
                <TableCell>
                  <Skeleton
                    variant="text"
                    width="55%"
                    height={20}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={18}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                </TableCell>
                <TableCell>
                  <Skeleton
                    variant="text"
                    width={48}
                    height={20}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                </TableCell>
                <TableCell>
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={20}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                </TableCell>
                <TableCell>
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={20}
                    animation="wave"
                    sx={{ transform: 'none' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Skeleton
                    variant="circular"
                    width={28}
                    height={28}
                    animation="wave"
                    sx={{ ml: 'auto' }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1.5,
        }}
      >
        <Skeleton variant="text" width={180} height={20} animation="wave" sx={{ transform: 'none' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="rounded" width={56} height={28} animation="wave" />
          <Skeleton variant="rounded" width={56} height={28} animation="wave" />
        </Box>
      </Box>
    </>
  );
}

export default function AiJobList({ jobs, isLoading, loadError }: AiJobListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<AiJobListFilters>(initialFilters);
  const [sortField, setSortField] = useState<AiJobSortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<AiJobSortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const workflowOptions = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.workflowType))).sort(),
    [jobs]
  );
  const providerOptions = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.provider))).sort(),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    if (filters.status && filters.status !== 'all') {
      list = list.filter((job) => job.status === filters.status);
    }
    if (filters.workflowType && filters.workflowType !== 'all') {
      list = list.filter((job) => job.workflowType === filters.workflowType);
    }
    if (filters.provider && filters.provider !== 'all') {
      list = list.filter((job) => job.provider === filters.provider);
    }
    if (filters.model?.trim()) {
      const q = filters.model.trim().toLowerCase();
      list = list.filter((job) => job.model.toLowerCase().includes(q));
    }
    if (typeof filters.retryCountMin === 'number') {
      list = list.filter((job) => (job.retryCount ?? 0) >= filters.retryCountMin!);
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((job) => {
        return (
          (job.id ?? '').toLowerCase().includes(q) ||
          (job.jobId ?? '').toLowerCase().includes(q) ||
          (job.requestId ?? '').toLowerCase().includes(q) ||
          (job.targetEntityId ?? '').toLowerCase().includes(q) ||
          job.workflowType.toLowerCase().includes(q) ||
          (job.initiatedByUid ?? '').toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'createdAt':
          cmp = timestampToMillis(a.createdAt) - timestampToMillis(b.createdAt);
          break;
        case 'updatedAt':
          cmp = timestampToMillis(a.updatedAt) - timestampToMillis(b.updatedAt);
          break;
        case 'durationMs':
          cmp = (a.durationMs ?? 0) - (b.durationMs ?? 0);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [filters, jobs, sortDirection, sortField]);

  const paginatedJobs = filteredJobs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <AiJobFiltersBar
        filters={filters}
        sortField={sortField}
        sortDirection={sortDirection}
        workflowOptions={workflowOptions}
        providerOptions={providerOptions}
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
        <AiJobTableSkeleton />
      ) : filteredJobs.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {jobs.length === 0 ? 'No AI jobs found.' : 'No AI jobs match the current filters.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Job ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Provider / Model</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Retries</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell align="right">Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedJobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{job.id}</TableCell>
                    <TableCell>
                      <AiJobStatusChip status={job.status} />
                    </TableCell>
                    <TableCell>{job.workflowType}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{job.provider}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {job.model}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {job.targetEntityType && job.targetEntityId ? (
                        <>
                          <Typography variant="body2">{job.targetEntityType}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {job.targetEntityId}
                          </Typography>
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {job.retryCount}
                      {typeof job.maxRetries === 'number' ? ` / ${job.maxRetries}` : ''}
                    </TableCell>
                    <TableCell>{formatDate(job.createdAt)}</TableCell>
                    <TableCell>{formatDate(job.updatedAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open AI job detail">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/ai-ops/${job.id}`)}
                          aria-label={`Open AI job ${job.id}`}
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
            count={filteredJobs.length}
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
