import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { logAuditAction } from '@/lib/auth/auditLog';
import db from '@/lib/firebase/firestore';
import {
  canControlAiJobs,
  canViewAiOps,
  canViewAiJobSensitivePayload,
} from '@/lib/aiOps/aiOpsRbac';
import {
  AiOpsServiceError,
  assertCancelEligible,
  assertRetryEligible,
  assertValidControlReason,
  isAiFailureCategory,
  isAiJobHistoryEventType,
  isAiJobStatus,
  redactRestrictedAiJobFields,
  sanitizeAiJobPayload,
} from '@/lib/aiOps/aiOpsValidation';
import type {
  Actor,
  AiJobDocument,
  AiJobHistoryEntry,
  AiJobHistoryEventType,
  AiJobListQuery,
  AiJobSortDirection,
  AiJobStatus,
  CancelAiJobInput,
  RetryAiJobInput,
} from '@/lib/types';

const AI_JOBS_COLLECTION = 'ai_jobs';
const DEFAULT_LIST_LIMIT = 200;
const REDACTED = '[REDACTED]';

type ServiceAction = 'view' | 'control';
type AiJobSnapshot = Record<string, unknown>;

function requirePermission(actor: Actor, action: ServiceAction): void {
  const allowed =
    action === 'view' ? canViewAiOps(actor.role) : canControlAiJobs(actor.role);

  if (!allowed) {
    throw new AiOpsServiceError(
      'FORBIDDEN',
      action === 'view'
        ? 'You do not have permission to view AI Ops.'
        : 'You do not have permission to control AI jobs.'
    );
  }
}

function timestampToMillis(
  value: { toDate?: () => Date } | null | undefined
): number {
  if (!value) return 0;
  try {
    return typeof value.toDate === 'function' ? value.toDate().getTime() : 0;
  } catch {
    return 0;
  }
}

function safeClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getAiJobHistoryCollection(jobId: string) {
  return collection(db, AI_JOBS_COLLECTION, jobId, 'history');
}

function docToAiJob(id: string, data: Record<string, unknown>): AiJobDocument {
  const raw = { ...data } as Record<string, unknown>;

  if (!isAiJobStatus(raw.status)) {
    throw new AiOpsServiceError(
      'INTERNAL_ERROR',
      `Invalid AI job status for ${id}.`
    );
  }

  if (typeof raw.workflowType !== 'string' || !raw.workflowType.trim()) {
    throw new AiOpsServiceError(
      'INTERNAL_ERROR',
      `Invalid workflowType for AI job ${id}.`
    );
  }
  if (typeof raw.provider !== 'string' || !raw.provider.trim()) {
    throw new AiOpsServiceError(
      'INTERNAL_ERROR',
      `Invalid provider for AI job ${id}.`
    );
  }
  if (typeof raw.model !== 'string' || !raw.model.trim()) {
    throw new AiOpsServiceError(
      'INTERNAL_ERROR',
      `Invalid model for AI job ${id}.`
    );
  }

  const retryCount =
    typeof raw.retryCount === 'number' && Number.isFinite(raw.retryCount)
      ? raw.retryCount
      : 0;

  const maxRetries =
    typeof raw.maxRetries === 'number' && Number.isFinite(raw.maxRetries)
      ? raw.maxRetries
      : null;

  const job: AiJobDocument = {
    id,
    jobId: typeof raw.jobId === 'string' ? raw.jobId : id,
    workflowType: raw.workflowType,
    status: raw.status,
    provider: raw.provider,
    model: raw.model,
    priority:
      raw.priority === 'low' || raw.priority === 'normal' || raw.priority === 'high'
        ? raw.priority
        : null,
    initiatedByType:
      raw.initiatedByType === 'system' ||
      raw.initiatedByType === 'admin' ||
      raw.initiatedByType === 'user' ||
      raw.initiatedByType === 'pipeline'
        ? raw.initiatedByType
        : null,
    initiatedByUid: typeof raw.initiatedByUid === 'string' ? raw.initiatedByUid : null,
    targetEntityType: typeof raw.targetEntityType === 'string' ? raw.targetEntityType : null,
    targetEntityId: typeof raw.targetEntityId === 'string' ? raw.targetEntityId : null,
    requestId: typeof raw.requestId === 'string' ? raw.requestId : null,
    retryCount: Math.max(0, retryCount),
    maxRetries: maxRetries == null ? null : Math.max(0, maxRetries),
    startedAt: (raw.startedAt as AiJobDocument['startedAt']) ?? null,
    completedAt: (raw.completedAt as AiJobDocument['completedAt']) ?? null,
    durationMs:
      typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs)
        ? raw.durationMs
        : null,
    createdAt: raw.createdAt as AiJobDocument['createdAt'],
    updatedAt: raw.updatedAt as AiJobDocument['updatedAt'],
    errorCode: typeof raw.errorCode === 'string' ? raw.errorCode : null,
    errorMessage: typeof raw.errorMessage === 'string' ? raw.errorMessage : null,
    failureCategory: isAiFailureCategory(raw.failureCategory) ? raw.failureCategory : null,
    fallbackUsed: typeof raw.fallbackUsed === 'boolean' ? raw.fallbackUsed : null,
    fallbackProvider: typeof raw.fallbackProvider === 'string' ? raw.fallbackProvider : null,
    fallbackModel: typeof raw.fallbackModel === 'string' ? raw.fallbackModel : null,
    inputSummary: isPlainObject(raw.inputSummary)
      ? (safeClone(raw.inputSummary) as Record<string, unknown>)
      : null,
    outputSummary: isPlainObject(raw.outputSummary)
      ? (safeClone(raw.outputSummary) as Record<string, unknown>)
      : null,
    metadata: isPlainObject(raw.metadata)
      ? (safeClone(raw.metadata) as Record<string, unknown>)
      : null,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : null,
  };

  return job;
}

function docToAiJobHistory(id: string, data: Record<string, unknown>): AiJobHistoryEntry {
  const raw = { ...data } as Record<string, unknown>;
  const eventType = isAiJobHistoryEventType(raw.eventType)
    ? raw.eventType
    : 'worker_update';

  return {
    id,
    jobId: typeof raw.jobId === 'string' ? raw.jobId : '',
    eventType,
    before: isPlainObject(raw.before)
      ? (safeClone(raw.before) as Record<string, unknown>)
      : null,
    after: isPlainObject(raw.after)
      ? (safeClone(raw.after) as Record<string, unknown>)
      : null,
    actorType:
      raw.actorType === 'system' || raw.actorType === 'admin' ? raw.actorType : null,
    actorUid: typeof raw.actorUid === 'string' ? raw.actorUid : null,
    reason: typeof raw.reason === 'string' ? raw.reason : null,
    timestamp: raw.timestamp as AiJobHistoryEntry['timestamp'],
  };
}

function sanitizeStringOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const sanitized = sanitizeAiJobPayload(value);
  return typeof sanitized === 'string' ? sanitized : String(sanitized);
}

function sanitizeRecordOrNull(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!value) return null;
  const sanitized = sanitizeAiJobPayload(value);
  return isPlainObject(sanitized) ? (sanitized as Record<string, unknown>) : null;
}

function sanitizeAiJobForActor(job: AiJobDocument, actor: Actor): AiJobDocument {
  const canViewSensitive = canViewAiJobSensitivePayload(actor.role);
  const restrictedFields =
    Array.isArray(job.metadata?.restrictedFields) && !canViewSensitive
      ? job.metadata?.restrictedFields
      : null;

  let inputSummary = sanitizeRecordOrNull(job.inputSummary);
  let outputSummary = sanitizeRecordOrNull(job.outputSummary);
  let errorMessage = sanitizeStringOrNull(job.errorMessage);

  if (!canViewSensitive && restrictedFields) {
    if (restrictedFields.includes('errorMessage')) errorMessage = REDACTED;
    if (restrictedFields.includes('inputSummary')) inputSummary = { value: REDACTED };
    if (restrictedFields.includes('outputSummary')) outputSummary = { value: REDACTED };
  }

  const sanitizedMetadata = sanitizeRecordOrNull(job.metadata);
  const finalMetadata =
    !canViewSensitive && sanitizedMetadata
      ? redactRestrictedAiJobFields(
          sanitizedMetadata.restrictedFields,
          sanitizedMetadata,
        ) ?? sanitizedMetadata
      : sanitizedMetadata;

  return {
    ...job,
    errorMessage,
    inputSummary,
    outputSummary,
    metadata: finalMetadata,
  };
}

function sanitizeSnapshot(snapshot: AiJobSnapshot | null | undefined): AiJobSnapshot | null {
  if (!snapshot) return null;
  const sanitized = sanitizeAiJobPayload(snapshot);
  return isPlainObject(sanitized) ? sanitized : null;
}

function sanitizeHistoryEntryForActor(
  entry: AiJobHistoryEntry,
  actor: Actor
): AiJobHistoryEntry {
  void actor;
  return {
    ...entry,
    before: sanitizeSnapshot(entry.before),
    after: sanitizeSnapshot(entry.after),
    reason: sanitizeStringOrNull(entry.reason),
  };
}

function pickAiJobSnapshot(job: AiJobDocument): AiJobSnapshot {
  return {
    status: job.status,
    retryCount: job.retryCount,
    maxRetries: job.maxRetries ?? null,
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    failureCategory: job.failureCategory ?? null,
    fallbackUsed: job.fallbackUsed ?? null,
    fallbackProvider: job.fallbackProvider ?? null,
    fallbackModel: job.fallbackModel ?? null,
    updatedAt: job.updatedAt ?? null,
  };
}

function applyClientFilters(
  jobs: AiJobDocument[],
  queryInput: AiJobListQuery | undefined
): AiJobDocument[] {
  const filters = queryInput?.filters;
  let filtered = [...jobs];

  if (filters?.status && filters.status !== 'all') {
    filtered = filtered.filter((j) => j.status === filters.status);
  }
  if (filters?.workflowType && filters.workflowType !== 'all') {
    filtered = filtered.filter((j) => j.workflowType === filters.workflowType);
  }
  if (filters?.provider && filters.provider !== 'all') {
    filtered = filtered.filter((j) => j.provider === filters.provider);
  }
  if (filters?.model?.trim()) {
    const q = filters.model.trim().toLowerCase();
    filtered = filtered.filter((j) => j.model.toLowerCase().includes(q));
  }
  if (typeof filters?.retryCountMin === 'number') {
    filtered = filtered.filter((j) => (j.retryCount ?? 0) >= filters.retryCountMin!);
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter((j) => {
      return (
        (j.id ?? '').toLowerCase().includes(q) ||
        (j.jobId ?? '').toLowerCase().includes(q) ||
        (j.requestId ?? '').toLowerCase().includes(q) ||
        (j.targetEntityId ?? '').toLowerCase().includes(q) ||
        (j.workflowType ?? '').toLowerCase().includes(q) ||
        (j.initiatedByUid ?? '').toLowerCase().includes(q)
      );
    });
  }

  const sortField = queryInput?.sortField ?? 'updatedAt';
  const sortDirection = queryInput?.sortDirection ?? 'desc';
  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'createdAt':
        cmp = timestampToMillis(a.createdAt) - timestampToMillis(b.createdAt);
        break;
      case 'updatedAt':
        cmp = timestampToMillis(a.updatedAt) - timestampToMillis(b.updatedAt);
        break;
      case 'durationMs':
        cmp = (a.durationMs ?? 0) - (b.durationMs ?? 0);
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  return filtered;
}

function assertExpectedState(
  job: AiJobDocument,
  input: { expectedStatus?: AiJobStatus; expectedUpdatedAtMs?: number }
): void {
  if (input.expectedStatus && job.status !== input.expectedStatus) {
    throw new AiOpsServiceError(
      'CONFLICT',
      `Job status changed from ${input.expectedStatus} to ${job.status}. Refresh and try again.`
    );
  }
  if (
    typeof input.expectedUpdatedAtMs === 'number' &&
    timestampToMillis(job.updatedAt) !== input.expectedUpdatedAtMs
  ) {
    throw new AiOpsServiceError(
      'CONFLICT',
      'Job was updated by another process. Refresh and try again.'
    );
  }
}

function computeDurationFromStartedAt(
  startedAt: { toDate?: () => Date } | null | undefined
): number | null {
  const startedMs = timestampToMillis(startedAt);
  if (!startedMs) return null;
  return Math.max(0, Date.now() - startedMs);
}

function buildHistoryEventPayload(params: {
  jobId: string;
  eventType: AiJobHistoryEventType;
  before: AiJobSnapshot | null;
  after: AiJobSnapshot | null;
  actor: Actor;
  reason: string;
}) {
  return {
    jobId: params.jobId,
    eventType: params.eventType,
    before: params.before,
    after: params.after,
    actorType: 'admin',
    actorUid: params.actor.uid,
    reason: params.reason,
    timestamp: serverTimestamp(),
  };
}

export async function listAiJobs(
  queryInput: AiJobListQuery,
  actor: Actor
): Promise<AiJobDocument[]> {
  requirePermission(actor, 'view');

  const cappedLimit = Math.min(
    Math.max(queryInput.limit ?? DEFAULT_LIST_LIMIT, 1),
    DEFAULT_LIST_LIMIT
  );
  const sortField = queryInput.sortField ?? 'updatedAt';
  const sortDirection: AiJobSortDirection = queryInput.sortDirection ?? 'desc';

  let snap;
  try {
    snap = await getDocs(
      query(
        collection(db, AI_JOBS_COLLECTION),
        orderBy(sortField, sortDirection),
        limit(cappedLimit)
      )
    );
  } catch {
    snap = await getDocs(
      query(collection(db, AI_JOBS_COLLECTION), orderBy('createdAt', 'desc'), limit(cappedLimit))
    );
  }

  const jobs: AiJobDocument[] = [];
  for (const d of snap.docs) {
    try {
      jobs.push(docToAiJob(d.id, d.data()));
    } catch (err) {
      console.warn('[AiOpsService] Skipping invalid ai job doc', d.id, err);
    }
  }

  const filtered = applyClientFilters(jobs, queryInput).map((j) =>
    sanitizeAiJobForActor(j, actor)
  );

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'ai_job',
    resourceId: null,
    metadata: {
      count: filtered.length,
      filters: queryInput.filters ?? {},
      sortField,
      sortDirection,
    },
  });

  return filtered;
}

export async function getAiJob(
  jobId: string,
  actor: Actor
): Promise<AiJobDocument | null> {
  requirePermission(actor, 'view');

  const snap = await getDoc(doc(db, AI_JOBS_COLLECTION, jobId));
  if (!snap.exists()) return null;

  const job = docToAiJob(snap.id, snap.data());
  const sanitized = sanitizeAiJobForActor(job, actor);

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'ai_job',
    resourceId: jobId,
    metadata: {
      status: sanitized.status,
      workflowType: sanitized.workflowType,
      provider: sanitized.provider,
      model: sanitized.model,
    },
  });

  return sanitized;
}

export async function getAiJobHistory(
  jobId: string,
  actor: Actor
): Promise<AiJobHistoryEntry[]> {
  requirePermission(actor, 'view');

  const snap = await getDocs(
    query(getAiJobHistoryCollection(jobId), orderBy('timestamp', 'desc'), limit(100))
  );
  return snap.docs
    .map((d) => docToAiJobHistory(d.id, d.data()))
    .map((entry) => sanitizeHistoryEntryForActor(entry, actor));
}

export async function retryAiJob(
  jobId: string,
  input: RetryAiJobInput,
  actor: Actor
): Promise<void> {
  requirePermission(actor, 'control');
  assertValidControlReason(input.reason);

  const jobRef = doc(db, AI_JOBS_COLLECTION, jobId);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(jobRef);
    if (!snap.exists()) {
      throw new AiOpsServiceError('NOT_FOUND', 'AI job not found.');
    }

    const job = docToAiJob(snap.id, snap.data());
    assertExpectedState(job, input);
    assertRetryEligible(job);

    const before = pickAiJobSnapshot(job);
    const nextRetryCount = (job.retryCount ?? 0) + 1;

    tx.update(jobRef, {
      status: 'queued',
      retryCount: nextRetryCount,
      errorCode: null,
      errorMessage: null,
      failureCategory: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      fallbackUsed: null,
      fallbackProvider: null,
      fallbackModel: null,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });

    const after: AiJobSnapshot = {
      ...before,
      status: 'queued',
      retryCount: nextRetryCount,
      errorCode: null,
      errorMessage: null,
      failureCategory: null,
      fallbackUsed: null,
      fallbackProvider: null,
      fallbackModel: null,
    };

    const historyRef = doc(getAiJobHistoryCollection(jobId));
    tx.set(
      historyRef,
      buildHistoryEventPayload({
        jobId,
        eventType: 'retry_requested',
        before,
        after,
        actor,
        reason: input.reason.trim(),
      })
    );

    return {
      historyEntryId: historyRef.id,
      before,
      after,
      workflowType: job.workflowType,
      provider: job.provider,
      model: job.model,
    };
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'retry_ai_job',
    resourceType: 'ai_job',
    resourceId: jobId,
    metadata: {
      jobId,
      reason: input.reason.trim(),
      historyEntryId: result.historyEntryId,
      workflowType: result.workflowType,
      provider: result.provider,
      model: result.model,
      before: sanitizeSnapshot(result.before),
      after: sanitizeSnapshot(result.after),
    },
  });
}

export async function cancelAiJob(
  jobId: string,
  input: CancelAiJobInput,
  actor: Actor
): Promise<void> {
  requirePermission(actor, 'control');
  assertValidControlReason(input.reason);

  const jobRef = doc(db, AI_JOBS_COLLECTION, jobId);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(jobRef);
    if (!snap.exists()) {
      throw new AiOpsServiceError('NOT_FOUND', 'AI job not found.');
    }

    const job = docToAiJob(snap.id, snap.data());
    assertExpectedState(job, input);
    assertCancelEligible(job);

    const before = pickAiJobSnapshot(job);
    const durationMs = computeDurationFromStartedAt(job.startedAt);

    tx.update(jobRef, {
      status: 'cancelled',
      completedAt: serverTimestamp(),
      durationMs,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });

    const after: AiJobSnapshot = {
      ...before,
      status: 'cancelled',
      durationMs,
    };

    const historyRef = doc(getAiJobHistoryCollection(jobId));
    tx.set(
      historyRef,
      buildHistoryEventPayload({
        jobId,
        eventType: 'cancel_requested',
        before,
        after,
        actor,
        reason: input.reason.trim(),
      })
    );

    return {
      historyEntryId: historyRef.id,
      before,
      after,
      workflowType: job.workflowType,
      provider: job.provider,
      model: job.model,
    };
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'cancel_ai_job',
    resourceType: 'ai_job',
    resourceId: jobId,
    metadata: {
      jobId,
      reason: input.reason.trim(),
      historyEntryId: result.historyEntryId,
      workflowType: result.workflowType,
      provider: result.provider,
      model: result.model,
      before: sanitizeSnapshot(result.before),
      after: sanitizeSnapshot(result.after),
    },
  });
}
