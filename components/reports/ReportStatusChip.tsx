'use client';

import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReportStatus } from '@/lib/types';

type ChipColor = 'default' | 'info' | 'success' | 'warning' | 'error';

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: ChipColor }> = {
  open: { label: 'Open', color: 'error' },
  in_review: { label: 'In Review', color: 'warning' },
  resolved_action_taken: { label: 'Resolved (Action)', color: 'success' },
  resolved_no_action: { label: 'Resolved (No Action)', color: 'default' },
  dismissed: { label: 'Dismissed', color: 'info' },
};

export default function ReportStatusChip({
  status,
  sx,
}: {
  status: ReportStatus;
  sx?: SxProps<Theme>;
}) {
  const config = STATUS_CONFIG[status];
  return <Chip label={config.label} color={config.color} size="small" sx={sx} />;
}

