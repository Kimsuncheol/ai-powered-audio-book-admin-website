'use client';

import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';

type AccountStatus = 'active' | 'suspended' | 'disabled';

type ChipColor = 'success' | 'warning' | 'error';

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: ChipColor }> = {
  active:    { label: 'Active',    color: 'success' },
  suspended: { label: 'Suspended', color: 'warning' },
  disabled:  { label: 'Disabled',  color: 'error' },
};

export default function AccountStatusChip({
  status,
  sx,
}: {
  status: AccountStatus | undefined;
  sx?: SxProps<Theme>;
}) {
  const config = status ? STATUS_CONFIG[status] : null;
  if (!config) return <Chip label="Unknown" color="default" size="small" sx={sx} />;
  return <Chip label={config.label} color={config.color} size="small" sx={sx} />;
}
