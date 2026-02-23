'use client';

import Chip from '@mui/material/Chip';
import type { AiJobStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  AiJobStatus,
  {
    label: string;
    color: 'default' | 'info' | 'success' | 'error' | 'warning';
  }
> = {
  queued: { label: 'Queued', color: 'default' },
  running: { label: 'Running', color: 'info' },
  succeeded: { label: 'Succeeded', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  cancelled: { label: 'Cancelled', color: 'warning' },
};

interface AiJobStatusChipProps {
  status: AiJobStatus;
}

export default function AiJobStatusChip({ status }: AiJobStatusChipProps) {
  const config = STATUS_CONFIG[status];
  return <Chip size="small" label={config.label} color={config.color} />;
}
