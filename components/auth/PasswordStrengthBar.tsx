'use client';

import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { getPasswordStrength } from '@/lib/auth/passwordValidation';

interface PasswordStrengthBarProps {
  password: string;
}

/**
 * Displays a color-coded strength bar and text label for a given password.
 *
 * - Uses zxcvbn entropy-based scoring (OD-AUTH-002)
 * - Non-color cue via text label meets WCAG requirements (NFR-UX-AUTH-004)
 * - Hidden when password is empty
 */
export default function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);

  return (
    <Box sx={{ mt: 1, mb: 0.5 }}>
      <LinearProgress
        variant="determinate"
        value={strength.value}
        color={strength.color}
        aria-label={`Password strength: ${strength.label}`}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Typography
        variant="caption"
        color={`${strength.color}.main`}
        sx={{ mt: 0.25, display: 'block' }}
      >
        {strength.label}
      </Typography>
    </Box>
  );
}
