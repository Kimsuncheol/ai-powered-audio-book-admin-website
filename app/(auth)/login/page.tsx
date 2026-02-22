"use client";

import React, { Suspense, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import PasswordField from "@/components/auth/PasswordField";
import {
  getRememberedEmail,
  setRememberedEmail,
  clearRememberedEmail,
} from "@/lib/auth/rememberMe";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Inner component isolates useSearchParams so it can be wrapped in Suspense
function LoginForm() {
  const { signIn, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FR-SIGNIN-009: Prefill email from localStorage on mount
  useEffect(() => {
    const remembered = getRememberedEmail();
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  // Redirect already-authenticated users after render (FR-SESSION-001)
  useEffect(() => {
    if (!isAuthenticated) return;
    router.replace(from);
  }, [from, isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError("Email is required.");
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // FR-SIGNIN-002: Validate email format before submission
    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    try {
      await signIn(email, password);

      // FR-SIGNIN-007/008: Persist or clear remembered email
      if (rememberMe) {
        setRememberedEmail(email);
      } else {
        clearRememberedEmail();
      }

      router.replace(from);
    } catch (err) {
      // FR-SIGNIN-006: User-friendly messages without exposing internals
      const raw = err instanceof Error ? err.message : "";
      if (raw === "No admin role assigned to this account.") {
        setFormError(raw);
      } else if (
        raw.includes("invalid-credential") ||
        raw.includes("wrong-password") ||
        raw.includes("user-not-found")
      ) {
        setFormError("Invalid email or password.");
      } else {
        setFormError("Sign in failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card sx={{ width: "100%", maxWidth: 440, p: 2 }} elevation={3}>
      <CardContent>
        <Typography variant="h5" fontWeight={700} mb={1} color="primary">
          AudioBook Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Sign in with your admin credentials
        </Typography>

        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* FR-SIGNIN-001: Email field */}
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
            autoFocus={!email}
            disabled={isSubmitting}
            inputProps={{ "aria-label": "Email address" }}
          />

          {/* FR-PWDUI-001: Password field with visibility toggle */}
          <PasswordField
            label="Password"
            fullWidth
            required
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isSubmitting}
          />

          {/* FR-SIGNIN-007: Remember me option */}
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                size="small"
              />
            }
            label={<Typography variant="body2">Remember me</Typography>}
            sx={{ mt: 0.5 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 2 }}
            disabled={isSubmitting || !email || !password}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </Box>

        {/* FR-SIGNIN-010: Link to sign-up page */}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {"Don't have an account? "}
            <MuiLink component={Link} href="/sign-up" underline="hover">
              Sign up
            </MuiLink>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// Suspense boundary required for useSearchParams in Next.js App Router
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
