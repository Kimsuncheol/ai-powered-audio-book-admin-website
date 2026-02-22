'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { assignReport } from '@/lib/reports/reportService';
import type { Actor, ReportDocument } from '@/lib/types';

interface AssignReportDialogProps {
  open: boolean;
  report: ReportDocument;
  actor: Actor;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignReportDialog({
  open,
  report,
  actor,
  onClose,
  onSuccess,
}: AssignReportDialogProps) {
  const [assigneeUid, setAssigneeUid] = useState(report.assignedToUid ?? actor.uid);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAssigneeUid(report.assignedToUid ?? actor.uid);
    setReason('');
    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  }, [open, report.assignedToUid, actor.uid]);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return;
    }
    if (!assigneeUid.trim()) {
      setSubmitError('Assignee UID is required.');
      return;
    }

    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await assignReport(report.id ?? '', assigneeUid.trim(), reason.trim(), actor);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to assign report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Report</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Report: {report.id}
        </Typography>

        <TextField
          label="Assignee UID"
          value={assigneeUid}
          onChange={(e) => setAssigneeUid(e.target.value)}
          size="small"
          disabled={isSubmitting}
        />

        <Button
          variant="text"
          size="small"
          sx={{ alignSelf: 'flex-start' }}
          onClick={() => setAssigneeUid(actor.uid)}
          disabled={isSubmitting}
        >
          Assign to me
        </Button>

        <TextField
          label="Reason / Note"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          rows={3}
          required
          error={!!reasonError}
          helperText={reasonError ?? 'Required — at least 10 characters'}
          disabled={isSubmitting}
          placeholder="Explain why this report is being assigned/reassigned..."
        />

        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

