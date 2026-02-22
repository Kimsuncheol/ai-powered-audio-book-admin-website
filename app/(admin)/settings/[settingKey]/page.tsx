'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditSettingDialog from '@/components/settings/EditSettingDialog';
import RollbackSettingDialog from '@/components/settings/RollbackSettingDialog';
import SettingHistoryTimeline from '@/components/settings/SettingHistoryTimeline';
import SettingValueChip from '@/components/settings/SettingValueChip';
import { useAuth } from '@/contexts/AuthContext';
import { canEditSettings, canRollbackSetting } from '@/lib/settings/settingsRbac';
import { getSetting, getSettingHistory } from '@/lib/settings/settingsService';
import {
  prettyPrintSettingValue,
  summarizeSettingValue,
} from '@/lib/settings/settingsUtils';
import type { Actor, SettingDocument, SettingHistoryEntry } from '@/lib/types';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

export default function SettingDetailPage() {
  const params = useParams<{ settingKey: string }>();
  const router = useRouter();
  const { firebaseUser, role } = useAuth();

  const [setting, setSetting] = useState<SettingDocument | null>(null);
  const [history, setHistory] = useState<SettingHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<SettingHistoryEntry | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const actor = useMemo<Actor | null>(
    () =>
      firebaseUser && role
        ? { uid: firebaseUser.uid, email: firebaseUser.email ?? '', role }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firebaseUser?.uid, firebaseUser?.email, role]
  );

  const settingKey =
    typeof params.settingKey === 'string' ? decodeURIComponent(params.settingKey) : '';

  const permissions = useMemo(
    () => ({
      canEdit: role ? canEditSettings(role) : false,
      canRollback: role ? canRollbackSetting(role) : false,
    }),
    [role]
  );

  const loadData = useCallback(async () => {
    if (!actor || !settingKey) return;

    setIsLoading(true);
    setLoadError(null);
    setHistoryError(null);
    try {
      const [settingData, historyData] = await Promise.all([
        getSetting(settingKey, actor),
        getSettingHistory(settingKey, actor),
      ]);

      if (!settingData) {
        setLoadError('Setting not found.');
        setSetting(null);
        setHistory([]);
      } else {
        setSetting(settingData);
        setHistory(historyData);
        setSelectedHistoryEntry((prev) => {
          if (!prev) return historyData[0] ?? null;
          return historyData.find((entry) => entry.id === prev.id) ?? historyData[0] ?? null;
        });
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load setting.');
      setHistory([]);
      setSetting(null);
    } finally {
      setIsLoading(false);
    }
  }, [actor, settingKey]);

  useEffect(() => {
    if (!actor || !settingKey) return;
    loadData();
  }, [actor, settingKey, loadData]);

  const handleReloadAfterMutation = async (message: string) => {
    setSuccessMessage(message);
    await loadData();
  };

  if (!actor) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !setting) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/settings')} sx={{ mb: 2 }}>
          Back to Settings
        </Button>
        <Alert severity="error">{loadError ?? 'Setting not found.'}</Alert>
      </Box>
    );
  }

  const canEditThisSetting = permissions.canEdit && setting.editable && !setting.sensitive;
  const canRollbackThisSetting =
    permissions.canRollback && setting.editable && history.length > 0 && !!selectedHistoryEntry;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => router.push('/settings')} aria-label="Back to settings">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 220 }}>
          <Typography variant="h4" fontWeight={700}>
            {setting.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {setting.key}
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={loadData} aria-label="Refresh setting">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Metadata
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Category:</strong> {setting.category}
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {setting.description?.trim() || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Environment Scope:</strong> {setting.environmentScope ?? 'global/default'}
              </Typography>
              <Typography variant="body2">
                <strong>Version:</strong> {setting.version}
              </Typography>
              <Typography variant="body2">
                <strong>Last Updated:</strong> {formatDate(setting.lastUpdatedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Last Updated By:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{setting.lastUpdatedBy ?? '—'}</span>
              </Typography>
              <Typography variant="body2">
                <strong>Updated By Role:</strong> {setting.updatedByRole ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Source/Eff. Value:</strong> Override/default layering not implemented in MVP.
              </Typography>
            </Stack>
            <Box sx={{ mt: 2 }}>
              <SettingValueChip setting={setting} />
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Current Value
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Typography variant="body2">
                <strong>Summary:</strong> {summarizeSettingValue(setting.value, setting.valueType)}
              </Typography>
              {setting.secretRef && (
                <Typography variant="body2">
                  <strong>Secret Reference:</strong>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{setting.secretRef}</span>
                </Typography>
              )}
              {setting.allowedValues && setting.allowedValues.length > 0 && (
                <Typography variant="body2">
                  <strong>Allowed Values:</strong> {setting.allowedValues.join(', ')}
                </Typography>
              )}
              {setting.validation && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="pre"
                  sx={{ m: 0, whiteSpace: 'pre-wrap' }}
                >
                  {JSON.stringify(setting.validation, null, 2)}
                </Typography>
              )}
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: 'action.hover',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                }}
              >
                {prettyPrintSettingValue(setting.value)}
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <SettingHistoryTimeline
              entries={history}
              loadError={historyError}
              canRollback={permissions.canRollback && setting.editable}
              onSelectRollback={(entry) => setSelectedHistoryEntry(entry)}
              selectedEntryId={selectedHistoryEntry?.id ?? null}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditOpen(true)}
                disabled={!canEditThisSetting}
              >
                Edit Setting
              </Button>
              {!permissions.canEdit && (
                <Alert severity="info">Read-only access: only Super Admin can edit settings.</Alert>
              )}
              {permissions.canEdit && setting.sensitive && (
                <Alert severity="warning">
                  Sensitive setting values are read-only in MVP. Manage secret references outside this flow.
                </Alert>
              )}
              {permissions.canEdit && !setting.editable && (
                <Alert severity="info">This setting is read-only and cannot be changed.</Alert>
              )}

              <Button
                variant="outlined"
                color="warning"
                startIcon={<HistoryIcon />}
                onClick={() => setRollbackOpen(true)}
                disabled={!canRollbackThisSetting}
              >
                Rollback Selected Version
              </Button>
              {!selectedHistoryEntry && (
                <Typography variant="caption" color="text.secondary">
                  Select a history entry below to enable rollback.
                </Typography>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Selected History Entry
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {selectedHistoryEntry ? (
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Entry ID:</strong>{' '}
                  <span style={{ fontFamily: 'monospace' }}>{selectedHistoryEntry.id}</span>
                </Typography>
                <Typography variant="body2">
                  <strong>Action:</strong> {selectedHistoryEntry.action}
                </Typography>
                <Typography variant="body2">
                  <strong>Timestamp:</strong> {formatDate(selectedHistoryEntry.timestamp)}
                </Typography>
                <Typography variant="body2">
                  <strong>Reason:</strong> {selectedHistoryEntry.reason ?? '—'}
                </Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">No history entry selected.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <EditSettingDialog
        open={editOpen}
        setting={setting}
        actor={actor}
        onClose={() => setEditOpen(false)}
        onSuccess={() => handleReloadAfterMutation('Setting updated successfully.')}
      />

      {selectedHistoryEntry && (
        <RollbackSettingDialog
          open={rollbackOpen}
          setting={setting}
          historyEntry={selectedHistoryEntry}
          actor={actor}
          onClose={() => setRollbackOpen(false)}
          onSuccess={() => handleReloadAfterMutation('Setting rolled back successfully.')}
        />
      )}
    </Box>
  );
}
