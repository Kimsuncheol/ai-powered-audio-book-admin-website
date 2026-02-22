'use client';

import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { SettingDocument } from '@/lib/types';

interface SettingFieldEditorProps {
  setting: Pick<SettingDocument, 'valueType' | 'allowedValues' | 'label'>;
  rawValue: string;
  onRawValueChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export default function SettingFieldEditor({
  setting,
  rawValue,
  onRawValueChange,
  disabled,
  error,
  helperText,
}: SettingFieldEditorProps) {
  if (setting.valueType === 'boolean') {
    return (
      <TextField
        select
        label="Value"
        size="small"
        value={rawValue}
        onChange={(e) => onRawValueChange(e.target.value)}
        disabled={disabled}
        error={error}
        helperText={helperText ?? 'Boolean setting'}
      >
        <MenuItem value="true">True</MenuItem>
        <MenuItem value="false">False</MenuItem>
      </TextField>
    );
  }

  if (setting.valueType === 'enum' && setting.allowedValues?.length) {
    return (
      <TextField
        select
        label="Value"
        size="small"
        value={rawValue}
        onChange={(e) => onRawValueChange(e.target.value)}
        disabled={disabled}
        error={error}
        helperText={helperText ?? 'Select one allowed value'}
      >
        {setting.allowedValues.map((value) => (
          <MenuItem key={String(value)} value={String(value)}>
            {String(value)}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (setting.valueType === 'json') {
    return (
      <TextField
        label="JSON Value"
        value={rawValue}
        onChange={(e) => onRawValueChange(e.target.value)}
        multiline
        minRows={8}
        disabled={disabled}
        error={error}
        helperText={helperText ?? 'Enter a valid JSON object'}
        sx={{ '& textarea': { fontFamily: 'monospace' } }}
      />
    );
  }

  if (setting.valueType === 'string_list' || setting.valueType === 'number_list') {
    return (
      <>
        <TextField
          label="List Values"
          value={rawValue}
          onChange={(e) => onRawValueChange(e.target.value)}
          multiline
          minRows={6}
          disabled={disabled}
          error={error}
          helperText={helperText ?? 'One item per line'}
          sx={{ '& textarea': { fontFamily: 'monospace' } }}
        />
        <Typography variant="caption" color="text.secondary">
          Enter one value per line.
        </Typography>
      </>
    );
  }

  return (
    <TextField
      label={setting.valueType === 'number' ? 'Number Value' : 'Value'}
      value={rawValue}
      onChange={(e) => onRawValueChange(e.target.value)}
      size="small"
      type={setting.valueType === 'number' ? 'number' : 'text'}
      disabled={disabled}
      error={error}
      helperText={helperText}
    />
  );
}
