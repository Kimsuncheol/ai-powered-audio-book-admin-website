'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { summarizeSettingValue } from '@/lib/settings/settingsUtils';
import type { SettingHistoryEntry, SettingValueType } from '@/lib/types';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

function actionLabel(action: SettingHistoryEntry['action']): string {
  return action === 'rollback' ? 'Rolled Back' : 'Updated';
}

function snapshotValueSummary(snapshot: Record<string, unknown> | null | undefined): string {
  if (!snapshot) return '—';
  const valueType =
    typeof snapshot.valueType === 'string'
      ? (snapshot.valueType as SettingValueType)
      : 'string';
  return summarizeSettingValue(snapshot.value, valueType);
}

interface SettingHistoryTimelineProps {
  entries: SettingHistoryEntry[];
  loadError?: string | null;
  canRollback?: boolean;
  onSelectRollback?: (entry: SettingHistoryEntry) => void;
  selectedEntryId?: string | null;
}

export default function SettingHistoryTimeline({
  entries,
  loadError,
  canRollback = false,
  onSelectRollback,
  selectedEntryId,
}: SettingHistoryTimelineProps) {
  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  if (entries.length === 0) {
    return <Typography color="text.secondary">No history entries yet.</Typography>;
  }

  return (
    <List disablePadding>
      {entries.map((entry, index) => (
        <Box key={entry.id ?? `${entry.action}-${index}`}>
          <ListItem sx={{ px: 0, py: 1.5, display: 'block' }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 0.75 }}>
              <Chip label={actionLabel(entry.action)} size="small" variant="outlined" />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                actor: {entry.actorUid}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(entry.timestamp)}
              </Typography>
              {typeof entry.versionAfter === 'number' && (
                <Typography variant="caption" color="text.secondary">
                  v{entry.versionAfter}
                </Typography>
              )}
            </Stack>

            {entry.reason && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {entry.reason}
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary" component="div">
              Before: {snapshotValueSummary(entry.before)}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
              After: {snapshotValueSummary(entry.after)}
            </Typography>

            {canRollback && onSelectRollback && entry.id && (
              <Button
                size="small"
                variant={selectedEntryId === entry.id ? 'contained' : 'outlined'}
                onClick={() => onSelectRollback(entry)}
              >
                Roll Back To This Version
              </Button>
            )}
          </ListItem>
          {index < entries.length - 1 && <Divider />}
        </Box>
      ))}
    </List>
  );
}
