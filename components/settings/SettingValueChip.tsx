'use client';

import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import type { SettingDocument } from '@/lib/types';

interface SettingValueChipProps {
  setting: Pick<SettingDocument, 'valueType' | 'editable' | 'sensitive'>;
}

function typeLabel(value: SettingDocument['valueType']): string {
  return value.replace(/_/g, ' ');
}

export default function SettingValueChip({ setting }: SettingValueChipProps) {
  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
      <Chip
        size="small"
        variant="outlined"
        label={`Type: ${typeLabel(setting.valueType)}`}
      />
      <Chip
        size="small"
        color={setting.editable ? 'success' : 'default'}
        variant={setting.editable ? 'filled' : 'outlined'}
        label={setting.editable ? 'Editable' : 'Read Only'}
      />
      <Chip
        size="small"
        color={setting.sensitive ? 'warning' : 'default'}
        variant={setting.sensitive ? 'filled' : 'outlined'}
        label={setting.sensitive ? 'Sensitive' : 'Non-sensitive'}
      />
    </Stack>
  );
}
