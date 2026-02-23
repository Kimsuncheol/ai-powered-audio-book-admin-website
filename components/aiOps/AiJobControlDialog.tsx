'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { cancelAiJob, retryAiJob } from '@/lib/aiOps/aiOpsService';
import type { Actor, AiJobDocument } from '@/lib/types';

type ControlMode = 'retry' | 'cancel';

interface AiJobControlDialogProps {
  open: boolean;
  mode: ControlMode;
  job: AiJobDocument;
  actor: Actor;
  onClose: () => void;
  onSuccess: () => void;
}

function timestampToMillis(value: { toDate?: () => Date } | null | undefined): number {
  if (!value) return 0;
  try {
    return typeof value.toDate === 'function' ? value.toDate().getTime() : 0;
  } catch {
    return 0;
  }
}

export default function AiJobControlDialog({
  open,
  mode,
  job,
  actor,
  onClose,
  onSuccess,
}: AiJobControlDialogProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = useMemo(
    () =>
      mode === 'retry'
        ? {
            title: 'Retry AI Job',
            submitLabel: 'Retry Job',
            submitColor: 'primary' as const,
            warning:
              'This will requeue the job and clear current failure fields for the next attempt.',
          }
        : {
            title: 'Cancel AI Job',
            submitLabel: 'Cancel Job',
            submitColor: 'warning' as const,
            warning:
              'This will mark the current queued/running job as cancelled. Underlying workers may take time to reflect the terminal state.',
          },
    [mode]
  );

  useEffect(() => {
    if (!open) return;
    setReason('');
    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  }, [open, mode, job.id]);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return;
    }

    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const baseInput = {
        reason: reason.trim(),
        expectedStatus: job.status,
        expectedUpdatedAtMs: timestampToMillis(job.updatedAt),
      };

      if (mode === 'retry') {
        await retryAiJob(job.id ?? '', baseInput, actor);
      } else {
        await cancelAiJob(job.id ?? '', baseInput, actor);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : `Failed to ${mode} job.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{config.title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Job: {job.id}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Workflow: {job.workflowType} · Provider/Model: {job.provider} / {job.model}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Current status: {job.status} · Retry count: {job.retryCount}
        </Typography>

        <Alert severity={mode === 'retry' ? 'info' : 'warning'}>{config.warning}</Alert>

        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          rows={3}
          required
          error={!!reasonError}
          helperText={reasonError ?? 'Required — at least 10 characters'}
          disabled={isSubmitting}
          placeholder={`Explain why this job should be ${mode === 'retry' ? 'retried' : 'cancelled'}...`}
        />

        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={config.submitColor}
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Submitting...' : config.submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
