'use client';

import React, { Suspense, useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import PasswordField from '@/components/auth/PasswordField';
import PasswordStrengthBar from '@/components/auth/PasswordStrengthBar';
import PasswordConstraintList from '@/components/auth/PasswordConstraintList';
import { validatePassword } from '@/lib/auth/passwordValidation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Maps Firebase Auth error codes to user-friendly messages (ERR-AUTH-001)
function mapSignUpError(err: unknown): string {
  const code =
    err instanceof Error && 'code' in err
      ? (err as { code: string }).code
      : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return 'Registration failed. Please try again.';
  }
}

// Inner form component
function SignUpForm() {
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    !isSubmitting &&
    Boolean(email) &&
    passwordValidation.valid &&
    Boolean(confirmPassword) &&
    passwordsMatch;

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email is required.');
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateConfirmPassword = (value: string): boolean => {
    if (value && value !== password) {
      setConfirmError('Passwords do not match.');
      return false;
    }
    setConfirmError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateEmail(email)) return;
    if (!passwordValidation.valid) return;
    // VAL-AUTH-003: Confirm passwords match
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password);
      setIsSuccess(true);
    } catch (err) {
      setFormError(mapSignUpError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state — invitation-only pending message (OD-AUTH-001)
  if (isSuccess) {
    return (
      <Card sx={{ width: '100%', maxWidth: 440, p: 2 }} elevation={3}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} mb={2} color="primary">
            Account Created
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Your account has been created. Please contact your administrator to
            be granted admin access before signing in.
          </Alert>
          <MuiLink component={Link} href="/login" underline="hover">
            ← Back to Sign In
          </MuiLink>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ width: '100%', maxWidth: 440, p: 2 }} elevation={3}>
      <CardContent>
        <Typography variant="h5" fontWeight={700} mb={1} color="primary">
          Create Admin Account
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          After registration, an administrator must grant you access.
        </Typography>

        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* FR-SIGNUP-001/002: Email with format validation */}
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            margin="normal"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) validateEmail(e.target.value);
            }}
            onBlur={(e) => validateEmail(e.target.value)}
            error={Boolean(emailError)}
            helperText={emailError}
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
          />

          {/* FR-PWDUI-001: Password field with visibility toggle */}
          <PasswordField
            label="Password"
            fullWidth
            required
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          {/* FR-SIGNUP-006/007: Real-time password strength bar */}
          <PasswordStrengthBar password={password} />

          {/* FR-SIGNUP-008: Inline constraint checklist */}
          <PasswordConstraintList password={password} />

          {/* FR-SIGNUP-003/004: Confirm password field */}
          <PasswordField
            label="Confirm Password"
            fullWidth
            required
            margin="normal"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmError) validateConfirmPassword(e.target.value);
            }}
            onBlur={(e) => validateConfirmPassword(e.target.value)}
            error={Boolean(confirmError)}
            helperText={confirmError}
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={!canSubmit}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {'Already have an account? '}
            <MuiLink component={Link} href="/login" underline="hover">
              Sign in
            </MuiLink>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// Suspense boundary — consistent with login page pattern
export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
