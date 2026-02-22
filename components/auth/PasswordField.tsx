'use client';

import React, { useState } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  type TextFieldProps,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

// Omit 'type' because it is controlled internally by the visibility toggle (FR-PWDUI-001)
type PasswordFieldProps = Omit<TextFieldProps, 'type'>;

/**
 * A MUI TextField for password input with a built-in visibility toggle.
 *
 * - Toggle switches between masked and plain-text without clearing value (FR-PWDUI-002)
 * - Toggle button is keyboard-accessible with semantic aria-label (FR-PWDUI-003)
 * - Visibility state is local to this instance (FR-PWDUI-004)
 */
export default function PasswordField(props: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleToggle = () => setShowPassword((prev) => !prev);

  // Prevent the mousedown event from blurring the text field
  const handleMouseDownPrevent = (e: React.MouseEvent) => e.preventDefault();

  return (
    <TextField
      {...props}
      type={showPassword ? 'text' : 'password'}
      slotProps={{
        ...props.slotProps,
        input: {
          ...(props.slotProps?.input as object),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={handleToggle}
                onMouseDown={handleMouseDownPrevent}
                edge="end"
                size="small"
                tabIndex={0}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
