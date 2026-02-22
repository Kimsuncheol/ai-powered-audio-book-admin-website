'use client';

import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

export default function ReviewReportSummaryPanel({
  reviewId,
  reportCount,
  lastReportedAt,
}: {
  reviewId: string;
  reportCount: number | null | undefined;
  lastReportedAt: { toDate?: () => Date } | null | undefined;
}) {
  const flaggedCount = reportCount ?? 0;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Report Summary
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={1.25}>
        <Typography variant="body2">
          <strong>Linked Report Count:</strong> {flaggedCount}
        </Typography>
        <Typography variant="body2">
          <strong>Last Reported At:</strong> {formatDate(lastReportedAt)}
        </Typography>
        {flaggedCount > 0 ? (
          <Alert severity="warning">
            This review has been flagged. Use the Reports queue to inspect and resolve linked report
            workflows.
          </Alert>
        ) : (
          <Alert severity="info">No linked reports are indicated on this review record.</Alert>
        )}
        <Box>
          <Button component={Link} href="/reports" variant="outlined">
            Open Reports Queue
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Review ID: <span style={{ fontFamily: 'monospace' }}>{reviewId}</span>
        </Typography>
      </Stack>
    </Paper>
  );
}

