'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { getReviewModerationActionForTransition } from '@/lib/reviews/reviewValidation';
import { updateReviewStatus } from '@/lib/reviews/reviewService';
import type { Actor, ReviewDocument, ReviewModerationStatus } from '@/lib/types';

function actionUi(nextStatus: ReviewModerationStatus) {
  switch (nextStatus) {
    case 'hidden':
      return { title: 'Hide Review', submitLabel: 'Hide Review', color: 'warning' as const };
    case 'removed':
      return { title: 'Remove Review', submitLabel: 'Remove Review', color: 'error' as const };
    case 'published':
      return { title: 'Restore Review', submitLabel: 'Restore Review', color: 'primary' as const };
  }
}

interface ReviewModerationDialogProps {
  open: boolean;
  review: ReviewDocument;
  nextStatus: ReviewModerationStatus;
  actor: Actor;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModerationDialog({
  open,
  review,
  nextStatus,
  actor,
  onClose,
  onSuccess,
}: ReviewModerationDialogProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const ui = actionUi(nextStatus);
  const moderationAction = getReviewModerationActionForTransition(review.status, nextStatus);
  const requiresRemoveConfirm = moderationAction === 'remove';

  useEffect(() => {
    if (!open) return;
    setReason('');
    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setConfirmRemove(false);
  }, [open, review.id, nextStatus]);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return;
    }
    if (requiresRemoveConfirm && !confirmRemove) {
      setSubmitError('Please confirm the remove action before continuing.');
      return;
    }

    setReasonError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await updateReviewStatus(review.id ?? '', nextStatus, reason.trim(), actor);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to update review moderation status.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{ui.title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Review: {review.id}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Current status: {review.status} → New status: {nextStatus}
        </Typography>

        {requiresRemoveConfirm && (
          <Alert severity="warning">
            Removing a review is a destructive moderation action. The review content is retained
            for admin operations, but consumer visibility should be disabled.
          </Alert>
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
          placeholder="Explain the moderation decision..."
        />

        {requiresRemoveConfirm && (
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmRemove}
                onChange={(e) => setConfirmRemove(e.target.checked)}
                disabled={isSubmitting}
              />
            }
            label="I confirm I want to remove this review."
          />
        )}

        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button
          variant="contained"
          color={ui.color}
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : ui.submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

