'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ReauthDialog from '@/components/auth/ReauthDialog';
import { useAuth } from '@/contexts/AuthContext';
import { rollbackSetting } from '@/lib/settings/settingsService';
import {
  SETTINGS_REAUTH_MAX_AGE_SECONDS,
  isHighRiskSetting,
  summarizeSettingValue,
} from '@/lib/settings/settingsUtils';
import type { Actor, SettingDocument, SettingHistoryEntry } from '@/lib/types';

interface RollbackSettingDialogProps {
  open: boolean;
  setting: SettingDocument;
  historyEntry: SettingHistoryEntry;
  actor: Actor;
  onClose: () => void;
  onSuccess: () => void;
}

function getSnapshotValueSummary(
  snapshot: Record<string, unknown> | null | undefined
): string {
  if (!snapshot) return '—';
  const valueType =
    typeof snapshot.valueType === 'string'
      ? (snapshot.valueType as SettingDocument['valueType'])
      : 'string';
  return summarizeSettingValue(snapshot.value, valueType);
}

export default function RollbackSettingDialog({
  open,
  setting,
  historyEntry,
  actor,
  onClose,
  onSuccess,
}: RollbackSettingDialogProps) {
  const { getAuthAgeSeconds } = useAuth();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [isReauthed, setIsReauthed] = useState(false);

  const authAge = getAuthAgeSeconds();
  const needsReauth =
    isHighRiskSetting(setting) &&
    authAge !== null &&
    authAge > SETTINGS_REAUTH_MAX_AGE_SECONDS &&
    !isReauthed;

  useEffect(() => {
    if (!open) return;
    setReason('');
    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setIsReauthed(false);
  }, [open, historyEntry.id]);

  const preview = useMemo(
    () => ({
      current: summarizeSettingValue(setting.value, setting.valueType),
      target: getSnapshotValueSummary(historyEntry.after),
    }),
    [setting.value, setting.valueType, historyEntry.after]
  );

  const handleSubmit = async () => {
    if (needsReauth) {
      setSubmitError('Please re-authenticate before rolling back this setting.');
      return;
    }
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return;
    }

    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await rollbackSetting(
        setting.key,
        {
          historyEntryId: historyEntry.id ?? '',
          reason: reason.trim(),
          expectedVersion: setting.version,
        },
        actor
      );
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to roll back setting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Roll Back Setting</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {setting.key} · Selected history entry {historyEntry.id}
            </Typography>

            {needsReauth && (
              <Alert
                severity="warning"
                action={
                  <Button size="small" color="inherit" onClick={() => setReauthOpen(true)}>
                    Re-authenticate
                  </Button>
                }
              >
                Recent authentication is required for this high-risk rollback.
              </Alert>
            )}

            <Alert severity="warning">
              This will create a new version (v{setting.version + 1}) using the selected historical value.
            </Alert>

            <Typography variant="body2">
              <strong>Current value:</strong> {preview.current}
            </Typography>
            <Typography variant="body2">
              <strong>Rollback target:</strong> {preview.target}
            </Typography>

            <TextField
              label="Reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(null);
              }}
              multiline
              rows={3}
              required
              error={!!reasonError}
              helperText={reasonError ?? 'Required — at least 10 characters'}
              disabled={isSubmitting}
              placeholder="Explain why this rollback is necessary..."
            />

            {submitError && <Alert severity="error">{submitError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSubmit}
            disabled={isSubmitting || needsReauth || !historyEntry.id}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting ? 'Rolling Back...' : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>

      <ReauthDialog
        open={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={() => {
          setIsReauthed(true);
          setReauthOpen(false);
        }}
        actionLabel="roll back this setting"
      />
    </>
  );
}
