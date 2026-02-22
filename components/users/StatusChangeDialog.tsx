'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import AccountStatusChip from './AccountStatusChip';
import { updateUserStatus } from '@/lib/users/userService';
import type { Actor, UserDocument } from '@/lib/types';

type AccountStatus = 'active' | 'suspended' | 'disabled';

interface StatusChangeDialogProps {
  open: boolean;
  user: UserDocument;
  actor: Actor;
  onClose: () => void;
  onSuccess: (newStatus: AccountStatus) => void;
}

export default function StatusChangeDialog({
  open,
  user,
  actor,
  onClose,
  onSuccess,
}: StatusChangeDialogProps) {
  const [newStatus, setNewStatus] = useState<AccountStatus>(user.status);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewStatus(user.status);
      setReason('');
      setReasonError(null);
      setSubmitError(null);
    }
  }, [open, user.status]);

  const validate = (): boolean => {
    if (newStatus === user.status) {
      setReasonError('Please select a different status.');
      return false;
    }
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return false;
    }
    setReasonError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await updateUserStatus(user.uid, newStatus, reason.trim(), actor);
      onSuccess(newStatus);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to update status.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Account Status</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
          <AccountStatusChip status={user.status} />
        </Box>

        <TextField
          select
          label="New Status"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as AccountStatus)}
          size="small"
          disabled={isSubmitting}
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="suspended">Suspended</MenuItem>
          <MenuItem value="disabled">Disabled</MenuItem>
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
          placeholder="Describe the reason for this status change..."
        />

        {submitError && <Alert severity="error">{submitError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : 'Change Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
