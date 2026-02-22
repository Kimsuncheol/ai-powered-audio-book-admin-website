import { SettingsServiceError } from '@/lib/settings/settingsValidation';
import type { SettingDocument, SettingValue, SettingValueType } from '@/lib/types';

export const SETTINGS_REAUTH_MAX_AGE_SECONDS = 300;
export const REDACTED_DISPLAY_VALUE = '[REDACTED]';

export function isSettingValueRedacted(value: unknown): boolean {
  return value === REDACTED_DISPLAY_VALUE;
}

export function summarizeSettingValue(value: unknown, valueType: SettingValueType): string {
  if (isSettingValueRedacted(value)) return REDACTED_DISPLAY_VALUE;
  if (value == null) return 'null';

  switch (valueType) {
    case 'boolean':
    case 'number':
      return String(value);
    case 'string': {
      const text = String(value);
      return text.length > 60 ? `${text.slice(0, 57)}...` : text;
    }
    case 'enum':
      return String(value);
    case 'json':
      try {
        const json = JSON.stringify(value);
        return json.length > 80 ? `${json.slice(0, 77)}...` : json;
      } catch {
        return '[Invalid JSON]';
      }
    case 'string_list':
    case 'number_list':
      return Array.isArray(value) ? `${value.length} item(s)` : '[Invalid list]';
  }
}

export function prettyPrintSettingValue(value: unknown): string {
  if (isSettingValueRedacted(value)) return REDACTED_DISPLAY_VALUE;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function serializeEditorValue(
  value: unknown,
  valueType: SettingValueType
): string {
  if (isSettingValueRedacted(value)) return '';

  switch (valueType) {
    case 'boolean':
      return String(Boolean(value));
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
    case 'string':
    case 'enum':
      return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    case 'json':
      return value && typeof value === 'object' ? JSON.stringify(value, null, 2) : '{}';
    case 'string_list':
      return Array.isArray(value) ? value.map(String).join('\n') : '';
    case 'number_list':
      return Array.isArray(value) ? value.map(String).join('\n') : '';
  }
}

export function parseEditorValue(
  rawValue: string,
  setting: Pick<SettingDocument, 'valueType' | 'allowedValues'>
): SettingValue {
  switch (setting.valueType) {
    case 'boolean':
      if (rawValue !== 'true' && rawValue !== 'false') {
        throw new SettingsServiceError('VALIDATION_ERROR', 'Select true or false.');
      }
      return rawValue === 'true';
    case 'number': {
      const num = Number(rawValue);
      if (!Number.isFinite(num)) {
        throw new SettingsServiceError('VALIDATION_ERROR', 'Enter a valid number.');
      }
      return num;
    }
    case 'string':
      return rawValue;
    case 'enum': {
      if (setting.allowedValues?.some((v) => typeof v === 'number')) {
        const numeric = Number(rawValue);
        return Number.isFinite(numeric) && String(numeric) === rawValue
          ? numeric
          : rawValue;
      }
      return rawValue;
    }
    case 'json': {
      try {
        const parsed = JSON.parse(rawValue || '{}') as unknown;
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
          throw new Error('invalid');
        }
        return parsed as Record<string, unknown>;
      } catch {
        throw new SettingsServiceError(
          'VALIDATION_ERROR',
          'Enter valid JSON object syntax.'
        );
      }
    }
    case 'string_list':
      return rawValue
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    case 'number_list': {
      const values = rawValue
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const parsed = values.map((line) => Number(line));
      if (parsed.some((n) => !Number.isFinite(n))) {
        throw new SettingsServiceError(
          'VALIDATION_ERROR',
          'Each list line must be a valid number.'
        );
      }
      return parsed;
    }
  }
}

export function isHighRiskSetting(
  setting: Pick<SettingDocument, 'sensitive' | 'category'>
): boolean {
  return setting.sensitive || setting.category === 'security_policy';
}
