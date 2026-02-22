'use client';

import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { AuthorStatus } from '@/lib/types';

type ChipColor = 'default' | 'info' | 'success' | 'error' | 'warning';

const AUTHOR_STATUS_CONFIG: Record<
  AuthorStatus,
  { label: string; color: ChipColor }
> = {
  pending:   { label: 'Pending',   color: 'info' },
  approved:  { label: 'Approved',  color: 'success' },
  rejected:  { label: 'Rejected',  color: 'error' },
  suspended: { label: 'Suspended', color: 'warning' },
};

export default function AuthorStatusChip({
  authorStatus,
  sx,
}: {
  authorStatus: AuthorStatus | undefined;
  sx?: SxProps<Theme>;
}) {
  if (!authorStatus) return null;
  const config = AUTHOR_STATUS_CONFIG[authorStatus];
  return <Chip label={config.label} color={config.color} size="small" sx={sx} />;
}
