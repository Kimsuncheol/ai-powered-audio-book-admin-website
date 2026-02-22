// SEC-AUTH-008: Remember Me stores email address ONLY.
// Passwords and auth tokens must never be stored here.
const STORAGE_KEY = 'admin_remembered_email';

/** Returns the stored email, or null if none / running server-side. */
export function getRememberedEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

/** Persists the email for future sign-in prefill (FR-SIGNIN-008). */
export function setRememberedEmail(email: string): void {
  localStorage.setItem(STORAGE_KEY, email);
}

/** Clears the stored email (called when Remember Me is unchecked on submit). */
export function clearRememberedEmail(): void {
  localStorage.removeItem(STORAGE_KEY);
}
