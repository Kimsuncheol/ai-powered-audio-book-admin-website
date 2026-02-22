'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import type { ReviewModerationHistoryEntry } from '@/lib/types';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

function labelForAction(action: ReviewModerationHistoryEntry['action']): string {
  switch (action) {
    case 'hide':
      return 'Hide';
    case 'remove':
      return 'Remove';
    case 'restore':
      return 'Restore';
  }
}

export default function ReviewHistoryTimeline({
  entries,
  loadError,
}: {
  entries: ReviewModerationHistoryEntry[];
  loadError?: string | null;
}) {
  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  if (entries.length === 0) {
    return <Typography color="text.secondary">No moderation history entries yet.</Typography>;
  }

  return (
    <List disablePadding>
      {entries.map((entry, index) => (
        <Box key={entry.id ?? `${entry.action}-${index}`}>
          <ListItem sx={{ px: 0, py: 1.5, display: 'block' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <Chip size="small" variant="outlined" label={labelForAction(entry.action)} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                actor: {entry.actorUid}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(entry.timestamp)}
              </Typography>
            </Box>
            {entry.reason && <Typography variant="body2" sx={{ mb: 0.5 }}>{entry.reason}</Typography>}
            <Typography
              variant="caption"
              color="text.secondary"
              component="pre"
              sx={{ m: 0, whiteSpace: 'pre-wrap' }}
            >
              {JSON.stringify({ before: entry.before ?? null, after: entry.after ?? null }, null, 2)}
            </Typography>
          </ListItem>
          {index < entries.length - 1 && <Divider />}
        </Box>
      ))}
    </List>
  );
}

