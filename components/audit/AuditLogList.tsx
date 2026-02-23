'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { DocumentSnapshot } from 'firebase/firestore';
import { listAuditLogs } from '@/lib/audit/auditLogService';
import type { AuditLogDocument, AuditLogFilters, AuditLogPage } from '@/lib/types';
import AuditActionChip from '@/components/audit/AuditActionChip';
import AuditLogDetailDrawer from '@/components/audit/AuditLogDetailDrawer';
import AuditLogFiltersBar from '@/components/audit/AuditLogFiltersBar';
import AuditResourceChip from '@/components/audit/AuditResourceChip';

// ---------------------------------------------------------------------------
// FetchKey — all variables that trigger a re-fetch when changed
// ---------------------------------------------------------------------------
interface FetchKey {
  filters: AuditLogFilters;
  pageSize: 25 | 50 | 100;
  cursorStack: Array<DocumentSnapshot | null>;
  pageIndex: number;
}

const DEFAULT_FILTERS: AuditLogFilters = {
  resourceType: 'all',
  action: 'all',
  actorRole: 'all',
  actorEmail: '',
  dateFrom: null,
  dateTo: null,
};

const DEFAULT_FETCH_KEY: FetchKey = {
  filters: DEFAULT_FILTERS,
  pageSize: 25,
  cursorStack: [null],
  pageIndex: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTimestamp(ts: AuditLogDocument['timestamp']): string {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleString();
  } catch {
    return '—';
  }
}

// ---------------------------------------------------------------------------
// AuditLogList component
// ---------------------------------------------------------------------------
export default function AuditLogList() {
  const [fetchKey, setFetchKey] = useState<FetchKey>(DEFAULT_FETCH_KEY);
  const [page, setPage] = useState<AuditLogPage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogDocument | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchPage = useCallback(
    async (key: FetchKey) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const cursor = key.cursorStack[key.pageIndex];
        const result = await listAuditLogs({
          filters: key.filters,
          pageSize: key.pageSize,
          cursor,
        });
        setPage(result);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load audit logs.');
        setPage(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPage(fetchKey);
  }, [fetchKey, fetchPage]);

  // ---------------------------------------------------------------------------
  // Filter and pagination handlers
  // ---------------------------------------------------------------------------
  const handleFiltersChange = (patch: Partial<AuditLogFilters>) => {
    setFetchKey((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...patch },
      cursorStack: [null],
      pageIndex: 0,
    }));
  };

  const handlePageSizeChange = (size: 25 | 50 | 100) => {
    setFetchKey((prev) => ({
      ...prev,
      pageSize: size,
      cursorStack: [null],
      pageIndex: 0,
    }));
  };

  const handleReset = () => {
    setFetchKey(DEFAULT_FETCH_KEY);
  };

  const handleNextPage = () => {
    if (!page?.hasNextPage || !page.nextCursor) return;
    const cursor = page.nextCursor;
    setFetchKey((prev) => ({
      ...prev,
      cursorStack: [...prev.cursorStack, cursor],
      pageIndex: prev.pageIndex + 1,
    }));
  };

  const handlePrevPage = () => {
    if (fetchKey.pageIndex === 0) return;
    setFetchKey((prev) => ({
      ...prev,
      pageIndex: prev.pageIndex - 1,
    }));
  };

  // ---------------------------------------------------------------------------
  // Drawer handlers
  // ---------------------------------------------------------------------------
  const handleRowClick = (log: AuditLogDocument) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
  };

  const isFirstPage = fetchKey.pageIndex === 0;
  const isLastPage = !page?.hasNextPage;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <AuditLogFiltersBar
        filters={fetchKey.filters}
        pageSize={fetchKey.pageSize}
        onFiltersChange={handleFiltersChange}
        onPageSizeChange={handlePageSizeChange}
        onReset={handleReset}
      />

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      <Paper variant="outlined">
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !page || page.entries.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {loadError ? 'Could not load audit logs.' : 'No audit logs match the current filters.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Resource ID</TableCell>
                  <TableCell>Actor Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {page.entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(entry)}
                  >
                    <TableCell>
                      <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                        {formatTimestamp(entry.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <AuditActionChip action={entry.action} />
                    </TableCell>
                    <TableCell>
                      <AuditResourceChip resourceType={entry.resourceType} />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          color: 'text.secondary',
                          maxWidth: 140,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {entry.resourceId ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.actorEmail || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.actorRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                        color={entry.actorRole === 'super_admin' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View details">
                        <span>
                          <InfoOutlinedIcon fontSize="small" color="action" />
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            px: 2,
            py: 1,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Page {fetchKey.pageIndex + 1}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ChevronLeftIcon />}
            onClick={handlePrevPage}
            disabled={isFirstPage || isLoading}
          >
            Previous
          </Button>
          <Button
            size="small"
            variant="outlined"
            endIcon={<ChevronRightIcon />}
            onClick={handleNextPage}
            disabled={isLastPage || isLoading}
          >
            Next
          </Button>
        </Box>
      </Paper>

      <AuditLogDetailDrawer
        open={isDrawerOpen}
        log={selectedLog}
        onClose={handleDrawerClose}
      />
    </>
  );
}
