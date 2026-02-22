'use client';

import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { BookStatus } from '@/lib/types';

interface BookStatusChipProps {
  status: BookStatus;
  sx?: SxProps<Theme>;
}

const STATUS_CONFIG: Record<
  BookStatus,
  { label: string; color: 'default' | 'success' | 'warning' | 'error' }
> = {
  draft: { label: 'Draft', color: 'default' },
  published: { label: 'Published', color: 'success' },
  archived: { label: 'Archived', color: 'warning' },
};

export default function BookStatusChip({ status, sx }: BookStatusChipProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      sx={sx}
    />
  );
}
