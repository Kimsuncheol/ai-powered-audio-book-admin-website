'use client';

import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ResourceType } from '@/lib/types';

interface AuditResourceChipProps {
  resourceType: ResourceType | string;
  sx?: SxProps<Theme>;
}

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'warning'
  | 'info'
  | 'success';

const RESOURCE_CONFIG: Record<string, { label: string; color: ChipColor }> = {
  auth:      { label: 'Auth',      color: 'secondary' },
  book:      { label: 'Book',      color: 'primary'   },
  user:      { label: 'User',      color: 'info'      },
  review:    { label: 'Review',    color: 'success'   },
  ai_config: { label: 'AI Config', color: 'warning'   },
  report:    { label: 'Report',    color: 'error'     },
  settings:  { label: 'Settings',  color: 'warning'   },
  chapter:   { label: 'Chapter',   color: 'primary'   },
};

export default function AuditResourceChip({
  resourceType,
  sx,
}: AuditResourceChipProps) {
  const config = RESOURCE_CONFIG[resourceType] ?? {
    label: resourceType,
    color: 'default' as ChipColor,
  };
  return <Chip label={config.label} color={config.color} size="small" sx={sx} />;
}
