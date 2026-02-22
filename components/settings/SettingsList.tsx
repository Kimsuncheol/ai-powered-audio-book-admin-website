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
import SettingsFiltersBar from '@/components/settings/SettingsFiltersBar';
import { summarizeSettingValue } from '@/lib/settings/settingsUtils';
import type {
  SettingDocument,
  SettingListFilters,
  SettingSortDirection,
  SettingSortField,
} from '@/lib/types';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

function initialFilters(): SettingListFilters {
  return {
    search: '',
    category: 'all',
    editable: 'all',
    sensitive: 'all',
  };
}

interface SettingsListProps {
  settings: SettingDocument[];
  isLoading: boolean;
  loadError: string | null;
}

export default function SettingsList({
  settings,
  isLoading,
  loadError,
}: SettingsListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<SettingListFilters>(initialFilters);
  const [sortField, setSortField] = useState<SettingSortField>('lastUpdatedAt');
  const [sortDirection, setSortDirection] = useState<SettingSortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filteredSettings = useMemo(() => {
    let list = [...settings];

    if (filters.category && filters.category !== 'all') {
      list = list.filter((s) => s.category === filters.category);
    }
    if (filters.editable && filters.editable !== 'all') {
      list = list.filter((s) => (filters.editable === 'editable' ? s.editable : !s.editable));
    }
    if (filters.sensitive && filters.sensitive !== 'all') {
      list = list.filter((s) =>
        filters.sensitive === 'sensitive' ? s.sensitive : !s.sensitive
      );
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((s) => {
        return (
          s.key.toLowerCase().includes(q) ||
          s.label.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'lastUpdatedAt') {
        const aMs =
          typeof a.lastUpdatedAt?.toDate === 'function' ? a.lastUpdatedAt.toDate().getTime() : 0;
        const bMs =
          typeof b.lastUpdatedAt?.toDate === 'function' ? b.lastUpdatedAt.toDate().getTime() : 0;
        cmp = aMs - bMs;
      } else if (sortField === 'key') {
        cmp = a.key.localeCompare(b.key);
      } else {
        cmp = a.category.localeCompare(b.category) || a.key.localeCompare(b.key);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [filters, settings, sortDirection, sortField]);

  const paginatedSettings = filteredSettings.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <SettingsFiltersBar
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
          setSortField('lastUpdatedAt');
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
      ) : filteredSettings.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {settings.length === 0 ? 'No settings found.' : 'No settings match the current filters.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Editable</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell align="right">Open</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSettings.map((setting) => (
                  <TableRow key={setting.key} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{setting.key}</TableCell>
                    <TableCell>{setting.category}</TableCell>
                    <TableCell>{setting.label}</TableCell>
                    <TableCell>{setting.valueType}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
                        {summarizeSettingValue(setting.value, setting.valueType)}
                      </Typography>
                    </TableCell>
                    <TableCell>{setting.editable ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{setting.version}</TableCell>
                    <TableCell>{formatDate(setting.lastUpdatedAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open setting detail">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/settings/${encodeURIComponent(setting.key)}`)}
                          aria-label={`Open setting ${setting.key}`}
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
            count={filteredSettings.length}
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
