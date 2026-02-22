import React from 'react';
import { Box } from '@mui/material';

// Auth layout: full-height centered page, no sidebar
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
      }}
    >
      {children}
    </Box>
  );
}
