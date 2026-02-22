import zxcvbn from 'zxcvbn';
import type {
  PasswordValidationResult,
  PasswordStrengthResult,
  PasswordConstraint,
} from '@/lib/types';

// VAL-AUTH-004: Password constraint definitions
const CONSTRAINT_RULES: Array<{ label: string; test: (p: string) => boolean }> = [
  { label: 'At least 8 characters',        test: (p) => p.length >= 8 },
  { label: 'At least 1 uppercase letter',  test: (p) => /[A-Z]/.test(p) },
  { label: 'At least 1 lowercase letter',  test: (p) => /[a-z]/.test(p) },
  { label: 'At least 1 number',            test: (p) => /\d/.test(p) },
  { label: 'At least 1 special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Evaluates each password constraint and returns validation result.
 * `valid` is true only when all constraints are met (VAL-AUTH-004).
 */
export function validatePassword(password: string): PasswordValidationResult {
  const constraints: PasswordConstraint[] = CONSTRAINT_RULES.map((rule) => ({
    label: rule.label,
    met: rule.test(password),
  }));
  return { valid: constraints.every((c) => c.met), constraints };
}

// Maps zxcvbn score (0–4) to display properties
const STRENGTH_MAP: Record<
  number,
  Omit<PasswordStrengthResult, 'score' | 'value'>
> = {
  0: { level: 'very_weak', label: 'Very Weak', color: 'error' },
  1: { level: 'weak',      label: 'Weak',      color: 'error' },
  2: { level: 'fair',      label: 'Fair',      color: 'warning' },
  3: { level: 'good',      label: 'Good',      color: 'info' },
  4: { level: 'strong',    label: 'Strong',    color: 'success' },
};

/**
 * Returns a password strength result based on zxcvbn entropy analysis.
 * `value` is scaled 0–100 for MUI LinearProgress (VAL-AUTH-005).
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { ...STRENGTH_MAP[0], score: 0, value: 0 };
  }
  const result = zxcvbn(password);
  const score = result.score as 0 | 1 | 2 | 3 | 4;
  return { ...STRENGTH_MAP[score], score, value: (score + 1) * 20 };
}
