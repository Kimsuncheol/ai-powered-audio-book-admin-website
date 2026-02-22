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
  CircularProgress,
} from '@mui/material';
import ReauthDialog from '@/components/auth/ReauthDialog';
import { assignAdminRole, revokeAdminRole } from '@/lib/users/userService';
import { isLastSuperAdmin } from '@/lib/users/userGuards';
import { useAuth } from '@/contexts/AuthContext';
import type { Actor, AdminRole, UserDocument } from '@/lib/types';

const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin:      'Super Admin',
  admin:            'Admin',
};

const REAUTH_MAX_AGE_SECONDS = 300; // 5 minutes

interface AdminRoleDialogProps {
  open: boolean;
  mode: 'assign' | 'revoke';
  user: UserDocument;
  actor: Actor;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminRoleDialog({
  open,
  mode,
  user,
  actor,
  onClose,
  onSuccess,
}: AdminRoleDialogProps) {
  const { getAuthAgeSeconds } = useAuth();

  const [selectedRole, setSelectedRole] = useState<AdminRole>('admin');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [isReauthed, setIsReauthed] = useState(false);

  const authAge = getAuthAgeSeconds();
  const needsReauth = authAge !== null && authAge > REAUTH_MAX_AGE_SECONDS && !isReauthed;

  useEffect(() => {
    if (open) {
      setSelectedRole(user.role ?? 'admin');
      setReason('');
      setReasonError(null);
      setSubmitError(null);
      setIsReauthed(false);
    }
  }, [open, user.role]);

  const handleSubmit = async () => {
    if (needsReauth) {
      setSubmitError('Please re-authenticate before making role changes.');
      return;
    }
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters.');
      return;
    }
    setReasonError(null);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (mode === 'revoke') {
        const isLast = await isLastSuperAdmin(user.uid);
        if (isLast) {
          setSubmitError('Cannot revoke the last active super admin.');
          return;
        }
        await revokeAdminRole(user.uid, reason.trim(), actor);
      } else {
        await assignAdminRole(user.uid, selectedRole, reason.trim(), actor);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to update admin role.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {mode === 'assign' ? 'Assign Admin Role' : 'Revoke Admin Role'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {user.displayName ?? user.email}
          </Typography>

          {needsReauth && (
            <Alert
              severity="warning"
              action={
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setReauthOpen(true)}
                >
                  Re-authenticate
                </Button>
              }
            >
              For security, role changes require recent authentication.
            </Alert>
          )}

          {mode === 'assign' ? (
            <>
              <TextField
                select
                label="Admin Role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                size="small"
                disabled={isSubmitting}
              >
                {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map((r) => (
                  <MenuItem key={r} value={r}>
                    {ADMIN_ROLE_LABELS[r]}
                  </MenuItem>
                ))}
              </TextField>
              <Alert severity="info" sx={{ py: 0.5 }}>
                This will set <strong>{ADMIN_ROLE_LABELS[selectedRole]}</strong> permissions and grant access to the admin website.
              </Alert>
            </>
          ) : (
            <Alert severity="warning">
              This will remove all admin privileges and demote this account to Reader.
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
            placeholder="Describe the reason for this role change..."
          />

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={mode === 'revoke' ? 'error' : 'primary'}
            onClick={handleSubmit}
            disabled={isSubmitting || needsReauth}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting
              ? 'Saving...'
              : mode === 'assign'
                ? 'Assign Role'
                : 'Revoke Role'}
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
        actionLabel="change admin roles"
      />
    </>
  );
}
