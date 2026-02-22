'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { validatePassword } from '@/lib/auth/passwordValidation';

interface PasswordConstraintListProps {
  password: string;
}

/**
 * Shows inline pass/fail indicators for each password constraint (FR-SIGNUP-008).
 *
 * Renders when the password field has any value. Each constraint uses a
 * check (green) or cancel (grey) icon for non-color accessibility cues (NFR-UX-AUTH-004).
 */
export default function PasswordConstraintList({
  password,
}: PasswordConstraintListProps) {
  if (!password) return null;

  const { constraints } = validatePassword(password);

  return (
    <Box sx={{ mt: 1 }} role="list" aria-label="Password requirements">
      {constraints.map((constraint) => (
        <Box
          key={constraint.label}
          role="listitem"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mb: 0.25,
          }}
        >
          {constraint.met ? (
            <CheckCircle
              fontSize="small"
              color="success"
              aria-label="Requirement met"
            />
          ) : (
            <Cancel
              fontSize="small"
              sx={{ color: 'text.disabled' }}
              aria-label="Requirement not met"
            />
          )}
          <Typography
            variant="caption"
            color={constraint.met ? 'success.main' : 'text.secondary'}
          >
            {constraint.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
