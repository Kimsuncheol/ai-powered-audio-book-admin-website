import type {
  SettingCategory,
  SettingDocument,
  SettingEnvironmentScope,
  SettingServiceErrorCode,
  SettingValue,
  SettingValueType,
} from '@/lib/types';

const SETTING_VALUE_TYPES: SettingValueType[] = [
  'boolean',
  'number',
  'string',
  'enum',
  'json',
  'string_list',
  'number_list',
];

const SETTING_CATEGORIES: SettingCategory[] = [
  'general_app',
  'feature_flags',
  'moderation_policy',
  'user_management_policy',
  'review_policy',
  'report_policy',
  'ai_ops_policy',
  'security_policy',
];

const SETTING_ENVIRONMENT_SCOPES: SettingEnvironmentScope[] = [
  'global',
  'dev',
  'staging',
  'prod',
];

export class SettingsServiceError extends Error {
  code: SettingServiceErrorCode;

  constructor(code: SettingServiceErrorCode, message: string) {
    super(message);
    this.name = 'SettingsServiceError';
    this.code = code;
  }
}

export function isSettingValueType(value: unknown): value is SettingValueType {
  return (
    typeof value === 'string' &&
    SETTING_VALUE_TYPES.includes(value as SettingValueType)
  );
}

export function isSettingCategory(value: unknown): value is SettingCategory {
  return (
    typeof value === 'string' &&
    SETTING_CATEGORIES.includes(value as SettingCategory)
  );
}

export function isSettingEnvironmentScope(
  value: unknown
): value is SettingEnvironmentScope {
  return (
    typeof value === 'string' &&
    SETTING_ENVIRONMENT_SCOPES.includes(value as SettingEnvironmentScope)
  );
}

export function assertReason(reason: string, minLen = 10): void {
  if (reason.trim().length < minLen) {
    throw new SettingsServiceError(
      'VALIDATION_ERROR',
      `Reason must be at least ${minLen} characters.`
    );
  }
}

export function assertEditable(setting: Pick<SettingDocument, 'editable' | 'key'>): void {
  if (!setting.editable) {
    throw new SettingsServiceError(
      'FORBIDDEN',
      `Setting "${setting.key}" is read-only.`
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertSettingValueMatchesType(
  valueType: SettingValueType,
  value: unknown
): asserts value is SettingValue {
  switch (valueType) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new SettingsServiceError('VALIDATION_ERROR', 'Value must be a boolean.');
      }
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new SettingsServiceError('VALIDATION_ERROR', 'Value must be a valid number.');
      }
      return;
    case 'string':
      if (typeof value !== 'string') {
        throw new SettingsServiceError('VALIDATION_ERROR', 'Value must be a string.');
      }
      return;
    case 'enum':
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new SettingsServiceError(
          'VALIDATION_ERROR',
          'Enum value must be a string or number.'
        );
      }
      return;
    case 'json':
      if (!isPlainObject(value)) {
        throw new SettingsServiceError(
          'VALIDATION_ERROR',
          'JSON setting value must be an object.'
        );
      }
      return;
    case 'string_list':
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new SettingsServiceError(
          'VALIDATION_ERROR',
          'Value must be a list of strings.'
        );
      }
      return;
    case 'number_list':
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== 'number' || !Number.isFinite(item))
      ) {
        throw new SettingsServiceError(
          'VALIDATION_ERROR',
          'Value must be a list of numbers.'
        );
      }
      return;
  }
}

export function assertSettingEnumValue(
  setting: Pick<SettingDocument, 'key' | 'valueType' | 'allowedValues'>,
  value: unknown
): void {
  if (setting.valueType !== 'enum') return;
  if (!setting.allowedValues || setting.allowedValues.length === 0) return;

  if (!setting.allowedValues.includes(value as string | number)) {
    throw new SettingsServiceError(
      'VALIDATION_ERROR',
      `Value must be one of: ${setting.allowedValues.join(', ')}`
    );
  }
}

export function assertSettingValueConstraints(
  setting: Pick<SettingDocument, 'key' | 'valueType' | 'validation'>,
  candidateValue: unknown
): void {
  const rules = setting.validation;
  if (!rules) return;

  if (rules.required) {
    const missing =
      candidateValue === null ||
      candidateValue === undefined ||
      (typeof candidateValue === 'string' && candidateValue.trim() === '') ||
      (Array.isArray(candidateValue) && candidateValue.length === 0);
    if (missing) {
      throw new SettingsServiceError('VALIDATION_ERROR', 'Value is required.');
    }
  }

  if (typeof candidateValue === 'number') {
    if (typeof rules.min === 'number' && candidateValue < rules.min) {
      throw new SettingsServiceError(
        'VALIDATION_ERROR',
        `Value must be >= ${rules.min}.`
      );
    }
    if (typeof rules.max === 'number' && candidateValue > rules.max) {
      throw new SettingsServiceError(
        'VALIDATION_ERROR',
        `Value must be <= ${rules.max}.`
      );
    }
  }

  if (typeof candidateValue === 'string') {
    if (
      typeof rules.minLength === 'number' &&
      candidateValue.length < rules.minLength
    ) {
      throw new SettingsServiceError(
        'VALIDATION_ERROR',
        `Value must be at least ${rules.minLength} characters.`
      );
    }
    if (
      typeof rules.maxLength === 'number' &&
      candidateValue.length > rules.maxLength
    ) {
      throw new SettingsServiceError(
        'VALIDATION_ERROR',
        `Value must be at most ${rules.maxLength} characters.`
      );
    }
    if (rules.regex) {
      let pattern: RegExp;
      try {
        pattern = new RegExp(rules.regex);
      } catch {
        throw new SettingsServiceError(
          'INTERNAL_ERROR',
          `Invalid regex configured for setting "${setting.key}".`
        );
      }
      if (!pattern.test(candidateValue)) {
        throw new SettingsServiceError(
          'VALIDATION_ERROR',
          'Value does not match the required pattern.'
        );
      }
    }
  }

  if (Array.isArray(candidateValue)) {
    if (
      typeof rules.minLength === 'number' &&
      candidateValue.length < rules.minLength
    ) {
      throw new SettingsServiceError(
        'VALIDATION_ERROR',
        `List must contain at least ${rules.minLength} items.`
      );
    }
    if (
      typeof rules.maxLength === 'number' &&
      candidateValue.length > rules.maxLength
    ) {
      throw new SettingsServiceError(
        'VALIDATION_ERROR',
        `List must contain at most ${rules.maxLength} items.`
      );
    }
  }
}

export function assertRollbackEligible(
  setting: Pick<SettingDocument, 'key' | 'editable' | 'version'>
): void {
  assertEditable(setting);
  if ((setting.version ?? 0) < 1) {
    throw new SettingsServiceError(
      'CONFLICT',
      `Setting "${setting.key}" does not have rollback history yet.`
    );
  }
}
