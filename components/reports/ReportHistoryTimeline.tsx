'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import type { ReportHistoryEntry } from '@/lib/types';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

function actionLabel(action: ReportHistoryEntry['action']): string {
  switch (action) {
    case 'assign':
      return 'Assigned';
    case 'status_change':
      return 'Status Changed';
    case 'resolve':
      return 'Resolved';
  }
}

interface ReportHistoryTimelineProps {
  entries: ReportHistoryEntry[];
  loadError?: string | null;
}

export default function ReportHistoryTimeline({
  entries,
  loadError,
}: ReportHistoryTimelineProps) {
  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  if (entries.length === 0) {
    return (
      <Typography color="text.secondary">
        No history entries yet.
      </Typography>
    );
  }

  return (
    <List disablePadding>
      {entries.map((entry, index) => (
        <Box key={entry.id ?? `${entry.action}-${index}`}>
          <ListItem sx={{ px: 0, py: 1.5, display: 'block' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <Chip label={actionLabel(entry.action)} size="small" variant="outlined" />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                actor: {entry.actorUid}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(entry.timestamp)}
              </Typography>
            </Box>
            {entry.note && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {entry.note}
              </Typography>
            )}
            {(entry.before || entry.after) && (
              <Typography variant="caption" color="text.secondary" component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify({ before: entry.before ?? null, after: entry.after ?? null }, null, 2)}
              </Typography>
            )}
          </ListItem>
          {index < entries.length - 1 && <Divider />}
        </Box>
      ))}
    </List>
  );
}

