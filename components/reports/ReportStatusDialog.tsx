'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { getAllowedNextReportStatuses } from '@/lib/reports/reportValidation';
import { updateReportStatus } from '@/lib/reports/reportService';
import type { Actor, ReportDocument, ReportStatus } from '@/lib/types';

function statusLabel(status: ReportStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_review':
      return 'In Review';
    case 'resolved_action_taken':
      return 'Resolved (Action Taken)';
    case 'resolved_no_action':
      return 'Resolved (No Action)';
    case 'dismissed':
      return 'Dismissed';
  }
}

interface ReportStatusDialogProps {
  open: boolean;
  report: ReportDocument;
  actor: Actor;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportStatusDialog({
  open,
  report,
  actor,
  onClose,
  onSuccess,
}: ReportStatusDialogProps) {
  const nextOptions = useMemo(
    () => getAllowedNextReportStatuses(report.status),
    [report.status]
  );

  const [nextStatus, setNextStatus] = useState<ReportStatus | ''>(nextOptions[0] ?? '');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNextStatus(nextOptions[0] ?? '');
    setReason('');
    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  }, [open, nextOptions]);

  const handleSubmit = async () => {
    if (!nextStatus) {
      setSubmitError('No valid next status available for this report.');
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
      await updateReportStatus(report.id ?? '', nextStatus, reason.trim(), actor);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update report status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Report Status</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Current status: {statusLabel(report.status)}
        </Typography>

        {nextOptions.length === 0 ? (
          <Alert severity="info">This report cannot transition to another status in MVP policy.</Alert>
        ) : (
          <TextField
            select
            size="small"
            label="New Status"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as ReportStatus)}
            disabled={isSubmitting}
          >
            {nextOptions.map((status) => (
              <MenuItem key={status} value={status}>
                {statusLabel(status)}
              </MenuItem>
            ))}
          </TextField>
        )}

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
          placeholder="Describe why this status is being changed..."
        />

        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || nextOptions.length === 0}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

