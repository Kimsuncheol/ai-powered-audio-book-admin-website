'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import PasswordField from './PasswordField';

interface ReauthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Label describing the sensitive action requiring reauthentication */
  actionLabel?: string;
}

/**
 * Modal dialog that prompts the current user to re-enter their password
 * before a sensitive action is performed (FR-AUTH-005, SEC-AUTH-007).
 *
 * Usage: render this dialog and call onSuccess to proceed with the action.
 * Default freshness window: 15 minutes (enforced by the caller via getAuthAgeSeconds).
 */
export default function ReauthDialog({
  open,
  onClose,
  onSuccess,
  actionLabel = 'perform this action',
}: ReauthDialogProps) {
  const { reauthenticate } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await reauthenticate(password);
      setPassword('');
      onSuccess();
      onClose();
    } catch {
      setError('Incorrect password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="reauth-dialog-title"
    >
      <DialogTitle id="reauth-dialog-title">Confirm Your Identity</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          For security, please re-enter your password to {actionLabel}.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <PasswordField
          label="Password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && password) handleConfirm();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!password || isSubmitting}
          startIcon={
            isSubmitting ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {isSubmitting ? 'Verifying...' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
