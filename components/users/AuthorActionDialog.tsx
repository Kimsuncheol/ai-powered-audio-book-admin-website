'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import { updateAuthorStatus } from '@/lib/users/userService';
import type { Actor, AuthorStatus, UserDocument } from '@/lib/types';

type AuthorAction = 'approve' | 'reject' | 'suspend';

const ACTION_CONFIG: Record<
  AuthorAction,
  { title: string; targetStatus: AuthorStatus; buttonLabel: string; color: 'primary' | 'error' | 'warning' }
> = {
  approve: { title: 'Approve Author',  targetStatus: 'approved',  buttonLabel: 'Approve',  color: 'primary' },
  reject:  { title: 'Reject Author',   targetStatus: 'rejected',  buttonLabel: 'Reject',   color: 'error' },
  suspend: { title: 'Suspend Author',  targetStatus: 'suspended', buttonLabel: 'Suspend',  color: 'warning' },
};

interface AuthorActionDialogProps {
  open: boolean;
  action: AuthorAction;
  user: UserDocument;
  actor: Actor;
  onClose: () => void;
  onSuccess: (newStatus: AuthorStatus) => void;
}

export default function AuthorActionDialog({
  open,
  action,
  user,
  actor,
  onClose,
  onSuccess,
}: AuthorActionDialogProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const config = ACTION_CONFIG[action];

  useEffect(() => {
    if (open) {
      setReason('');
      setReasonError(null);
      setSubmitError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return;
    }
    setReasonError(null);
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateAuthorStatus(user.uid, config.targetStatus, reason.trim(), actor);
      onSuccess(config.targetStatus);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to update author status.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{config.title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {user.displayName ?? user.email}
        </Typography>

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
          placeholder={`Describe the reason for this ${action} decision...`}
        />

        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={config.color}
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : config.buttonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
