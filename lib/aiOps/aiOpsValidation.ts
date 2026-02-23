import type {
  AiFailureCategory,
  AiJobDocument,
  AiJobHistoryEventType,
  AiJobStatus,
  AiOpsServiceErrorCode,
} from '@/lib/types';

const AI_JOB_STATUSES: AiJobStatus[] = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
];

const AI_FAILURE_CATEGORIES: AiFailureCategory[] = [
  'provider_error',
  'timeout',
  'validation',
  'safety',
  'internal',
];

const AI_JOB_HISTORY_EVENTS: AiJobHistoryEventType[] = [
  'status_change',
  'retry_requested',
  'cancel_requested',
  'worker_update',
];

const TERMINAL_STATUSES: AiJobStatus[] = ['succeeded', 'failed', 'cancelled'];

const REDACTED = '[REDACTED]';

export class AiOpsServiceError extends Error {
  code: AiOpsServiceErrorCode;

  constructor(code: AiOpsServiceErrorCode, message: string) {
    super(message);
    this.name = 'AiOpsServiceError';
    this.code = code;
  }
}

export function isAiJobStatus(value: unknown): value is AiJobStatus {
  return typeof value === 'string' && AI_JOB_STATUSES.includes(value as AiJobStatus);
}

export function isAiFailureCategory(value: unknown): value is AiFailureCategory {
  return (
    typeof value === 'string' &&
    AI_FAILURE_CATEGORIES.includes(value as AiFailureCategory)
  );
}

export function isAiJobHistoryEventType(
  value: unknown
): value is AiJobHistoryEventType {
  return (
    typeof value === 'string' &&
    AI_JOB_HISTORY_EVENTS.includes(value as AiJobHistoryEventType)
  );
}

export function isTerminalAiJobStatus(status: AiJobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function assertValidControlReason(reason: string): void {
  if (reason.trim().length < 10) {
    throw new AiOpsServiceError(
      'VALIDATION_ERROR',
      'Reason must be at least 10 characters.'
    );
  }
}

export function canRetryAiJob(job: Pick<AiJobDocument, 'status' | 'retryCount' | 'maxRetries'>): boolean {
  if (!(job.status === 'failed' || job.status === 'cancelled')) return false;
  if (typeof job.maxRetries === 'number' && job.retryCount >= job.maxRetries) return false;
  return true;
}

export function canCancelAiJob(job: Pick<AiJobDocument, 'status'>): boolean {
  return job.status === 'queued' || job.status === 'running';
}

export function assertRetryEligible(
  job: Pick<AiJobDocument, 'status' | 'retryCount' | 'maxRetries'>
): void {
  if (!(job.status === 'failed' || job.status === 'cancelled')) {
    throw new AiOpsServiceError(
      'CONFLICT',
      `Cannot retry a job in ${job.status} status.`
    );
  }
  if (typeof job.maxRetries === 'number' && job.retryCount >= job.maxRetries) {
    throw new AiOpsServiceError(
      'VALIDATION_ERROR',
      'Retry limit reached for this job.'
    );
  }
}

export function assertCancelEligible(job: Pick<AiJobDocument, 'status'>): void {
  if (!canCancelAiJob(job)) {
    throw new AiOpsServiceError(
      'CONFLICT',
      `Cannot cancel a job in ${job.status} status.`
    );
  }
}

function looksSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.includes('secret') ||
    k.includes('token') ||
    k.includes('password') ||
    k.includes('credential') ||
    k.includes('apikey') ||
    k.includes('api_key') ||
    k.includes('authorization') ||
    k.includes('cookie')
  );
}

export function sanitizeAiJobPayload(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeAiJobPayload(item, depth + 1));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(record)) {
      if (looksSensitiveKey(key)) {
        result[key] = REDACTED;
        continue;
      }
      result[key] = sanitizeAiJobPayload(inner, depth + 1);
    }
    return result;
  }

  if (typeof value === 'string') {
    if (value.length > 4000) return `${value.slice(0, 3997)}...`;
    return value;
  }

  return value;
}

export function redactRestrictedAiJobFields(
  restrictedFields: unknown,
  payload: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (!payload || !Array.isArray(restrictedFields)) return payload;
  const clone = { ...payload };
  for (const field of restrictedFields) {
    if (typeof field === 'string' && field in clone) {
      clone[field] = REDACTED;
    }
  }
  return clone;
}
