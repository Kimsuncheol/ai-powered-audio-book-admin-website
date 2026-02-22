import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

export default function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Settings
      </Typography>
      <Paper sx={{ p: 4 }} variant="outlined">
        <Typography color="text.secondary">
          System configuration and rate limits — coming in M4.
        </Typography>
      </Paper>
    </Box>
  );
}
