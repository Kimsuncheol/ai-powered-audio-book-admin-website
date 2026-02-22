'use client';

import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReviewModerationStatus } from '@/lib/types';

type ChipColor = 'default' | 'success' | 'warning' | 'error';

const STATUS_CONFIG: Record<
  ReviewModerationStatus,
  { label: string; color: ChipColor }
> = {
  published: { label: 'Published', color: 'success' },
  hidden: { label: 'Hidden', color: 'warning' },
  removed: { label: 'Removed', color: 'error' },
};

export default function ReviewStatusChip({
  status,
  sx,
}: {
  status: ReviewModerationStatus;
  sx?: SxProps<Theme>;
}) {
  const config = STATUS_CONFIG[status];
  return <Chip label={config.label} color={config.color} size="small" sx={sx} />;
}

