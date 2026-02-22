'use client';

import { useEffect, useState } from 'react';
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
import { resolveReport } from '@/lib/reports/reportService';
import type { Actor, ReportDocument, ReportResolutionOutcome } from '@/lib/types';

interface ResolveReportDialogProps {
  open: boolean;
  report: ReportDocument;
  actor: Actor;
  onClose: () => void;
  onSuccess: () => void;
}

function outcomeLabel(outcome: ReportResolutionOutcome): string {
  switch (outcome) {
    case 'action_taken':
      return 'Action Taken';
    case 'no_action':
      return 'No Action';
    case 'dismissed':
      return 'Dismissed';
  }
}

const OUTCOMES: ReportResolutionOutcome[] = ['action_taken', 'no_action', 'dismissed'];

export default function ResolveReportDialog({
  open,
  report,
  actor,
  onClose,
  onSuccess,
}: ResolveReportDialogProps) {
  const [outcome, setOutcome] = useState<ReportResolutionOutcome>('action_taken');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOutcome('action_taken');
    setReason('');
    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  }, [open, report.id]);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return;
    }

    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await resolveReport(report.id ?? '', outcome, reason.trim(), actor);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to resolve report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Resolve / Dismiss Report</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Report: {report.id}
        </Typography>

        <TextField
          select
          size="small"
          label="Outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as ReportResolutionOutcome)}
          disabled={isSubmitting}
        >
          {OUTCOMES.map((item) => (
            <MenuItem key={item} value={item}>
              {outcomeLabel(item)}
            </MenuItem>
          ))}
        </TextField>

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
          placeholder="Document the resolution decision..."
        />

        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button
          variant="contained"
          color={outcome === 'dismissed' ? 'warning' : 'primary'}
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : 'Submit Resolution'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

