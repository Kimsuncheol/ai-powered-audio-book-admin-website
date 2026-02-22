import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

export default function AuditLogsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Audit Logs
      </Typography>
      <Paper sx={{ p: 4 }} variant="outlined">
        <Typography color="text.secondary">
          Admin action audit log viewer — coming in M4.
        </Typography>
      </Paper>
    </Box>
  );
}
