'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ReauthDialog from '@/components/auth/ReauthDialog';
import SettingFieldEditor from '@/components/settings/SettingFieldEditor';
import { useAuth } from '@/contexts/AuthContext';
import { updateSetting } from '@/lib/settings/settingsService';
import {
  SETTINGS_REAUTH_MAX_AGE_SECONDS,
  isHighRiskSetting,
  parseEditorValue,
  serializeEditorValue,
  summarizeSettingValue,
} from '@/lib/settings/settingsUtils';
import type { Actor, SettingDocument, SettingValue } from '@/lib/types';

interface EditSettingDialogProps {
  open: boolean;
  setting: SettingDocument;
  actor: Actor;
  onClose: () => void;
  onSuccess: () => void;
}

type EditStep = 'edit' | 'confirm';

export default function EditSettingDialog({
  open,
  setting,
  actor,
  onClose,
  onSuccess,
}: EditSettingDialogProps) {
  const { getAuthAgeSeconds } = useAuth();
  const [step, setStep] = useState<EditStep>('edit');
  const [rawValue, setRawValue] = useState('');
  const [parsedValue, setParsedValue] = useState<SettingValue | null>(null);
  const [reason, setReason] = useState('');
  const [valueError, setValueError] = useState<string | null>(null);
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

  const canEditValue = setting.editable && !setting.sensitive;

  useEffect(() => {
    if (!open) return;
    setStep('edit');
    setRawValue(serializeEditorValue(setting.value, setting.valueType));
    setParsedValue(null);
    setReason('');
    setValueError(null);
    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setIsReauthed(false);
  }, [open, setting]);

  const nextValueSummary = useMemo(() => {
    if (parsedValue == null) return '—';
    return summarizeSettingValue(parsedValue, setting.valueType);
  }, [parsedValue, setting.valueType]);

  const currentValueSummary = useMemo(
    () => summarizeSettingValue(setting.value, setting.valueType),
    [setting.value, setting.valueType]
  );

  const handleProceedToConfirm = () => {
    if (!canEditValue) {
      setSubmitError(
        setting.sensitive
          ? 'MVP does not allow editing sensitive settings values.'
          : 'This setting is read-only.'
      );
      return;
    }

    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return;
    }

    try {
      const parsed = parseEditorValue(rawValue, setting);
      setParsedValue(parsed);
      setValueError(null);
      setReasonError(null);
      setSubmitError(null);
      setStep('confirm');
    } catch (err) {
      setValueError(err instanceof Error ? err.message : 'Invalid value.');
    }
  };

  const handleSubmit = async () => {
    if (needsReauth) {
      setSubmitError('Please re-authenticate before changing this setting.');
      return;
    }
    if (parsedValue == null) {
      setSubmitError('No parsed value available. Return to edit and try again.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await updateSetting(
        setting.key,
        {
          value: parsedValue,
          reason: reason.trim(),
          expectedVersion: setting.version,
        },
        actor
      );
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update setting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {step === 'edit' ? `Edit Setting: ${setting.key}` : `Confirm Setting Change: ${setting.key}`}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {setting.label} ({setting.category})
            </Typography>

            {!canEditValue && (
              <Alert severity={setting.sensitive ? 'warning' : 'info'}>
                {setting.sensitive
                  ? 'Sensitive setting values are read-only in MVP (secret reference metadata only).'
                  : 'This setting is read-only.'}
              </Alert>
            )}

            {needsReauth && (
              <Alert
                severity="warning"
                action={
                  <Button size="small" color="inherit" onClick={() => setReauthOpen(true)}>
                    Re-authenticate
                  </Button>
                }
              >
                Recent authentication is required for this high-risk setting change.
              </Alert>
            )}

            {step === 'edit' ? (
              <>
                <SettingFieldEditor
                  setting={setting}
                  rawValue={rawValue}
                  onRawValueChange={(value) => {
                    setRawValue(value);
                    setValueError(null);
                    setSubmitError(null);
                  }}
                  disabled={isSubmitting || !canEditValue}
                  error={!!valueError}
                  helperText={valueError ?? undefined}
                />

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
                  disabled={isSubmitting || !canEditValue}
                  placeholder="Explain why this setting is being changed..."
                />
              </>
            ) : (
              <>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Change Summary
                  </Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Current:</strong> {currentValueSummary}
                    </Typography>
                    <Typography variant="body2">
                      <strong>New:</strong> {nextValueSummary}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Version:</strong> {setting.version} → {setting.version + 1}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Reason:</strong> {reason.trim()}
                    </Typography>
                    {setting.category === 'security_policy' && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Security policy changes may require propagation time and can impact admin operations.
                      </Alert>
                    )}
                  </Stack>
                </Box>
              </>
            )}

            {submitError && <Alert severity="error">{submitError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {step === 'confirm' && (
            <Button onClick={() => setStep('edit')} disabled={isSubmitting}>
              Back
            </Button>
          )}
          {step === 'edit' ? (
            <Button
              variant="contained"
              onClick={handleProceedToConfirm}
              disabled={!canEditValue || isSubmitting}
            >
              Review Change
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isSubmitting || needsReauth}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isSubmitting ? 'Saving...' : 'Confirm Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ReauthDialog
        open={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={() => {
          setIsReauthed(true);
          setReauthOpen(false);
        }}
        actionLabel="change this setting"
      />
    </>
  );
}
