'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '@/contexts/AuthContext';
import AuditLogList from '@/components/audit/AuditLogList';

export default function AuditLogsPage() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (role !== 'super_admin') {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} mb={3}>
          Audit Logs
        </Typography>
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" fontWeight={600}>
            Access Denied
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Only super administrators can view audit logs.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Audit Logs
      </Typography>
      <AuditLogList />
    </Box>
  );
}
