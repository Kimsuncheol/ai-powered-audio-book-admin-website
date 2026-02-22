import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import db from '@/lib/firebase/firestore';
import { logAuditAction } from '@/lib/auth/auditLog';
import {
  canAssignReport,
  canResolveReport,
  canUpdateReportStatus,
  canViewReport,
} from '@/lib/reports/reportRbac';
import {
  ReportServiceError,
  assertValidReason,
  assertValidStatusTransition,
  isReportResolutionOutcome,
  isReportStatus,
  isReportTargetEntityType,
  mapOutcomeToStatus,
} from '@/lib/reports/reportValidation';
import type {
  Actor,
  ReportDocument,
  ReportHistoryAction,
  ReportHistoryEntry,
  ReportListQuery,
  ReportResolutionOutcome,
  ReportStatus,
  UserDocument,
} from '@/lib/types';

const REPORTS_COLLECTION = 'reports';
const USERS_COLLECTION = 'users';
const DEFAULT_LIST_LIMIT = 200;

type ServiceAction = 'view' | 'assign' | 'status' | 'resolve';

function requirePermission(actor: Actor, action: ServiceAction): void {
  const allowed =
    action === 'view'
      ? canViewReport(actor.role)
      : action === 'assign'
        ? canAssignReport(actor.role)
        : action === 'status'
          ? canUpdateReportStatus(actor.role)
          : canResolveReport(actor.role);

  if (!allowed) {
    throw new ReportServiceError(
      'FORBIDDEN',
      'You do not have permission to manage reports.'
    );
  }
}

function timestampToMillis(
  value: { toDate?: () => Date } | null | undefined
): number {
  if (!value) return 0;
  try {
    if (typeof value.toDate === 'function') return value.toDate().getTime();
  } catch {
    return 0;
  }
  return 0;
}

function docToReport(id: string, data: Record<string, unknown>): ReportDocument {
  const report = { ...(data as Omit<ReportDocument, 'id'>), id };

  if (!isReportTargetEntityType(report.targetEntityType)) {
    throw new ReportServiceError(
      'INTERNAL_ERROR',
      `Invalid report target type for report ${id}.`
    );
  }
  if (!isReportStatus(report.status)) {
    throw new ReportServiceError(
      'INTERNAL_ERROR',
      `Invalid report status for report ${id}.`
    );
  }
  if (
    report.resolutionOutcome !== undefined &&
    report.resolutionOutcome !== null &&
    !isReportResolutionOutcome(report.resolutionOutcome)
  ) {
    throw new ReportServiceError(
      'INTERNAL_ERROR',
      `Invalid report resolution outcome for report ${id}.`
    );
  }

  return report;
}

function docToHistory(
  id: string,
  data: Record<string, unknown>
): ReportHistoryEntry {
  return { ...(data as Omit<ReportHistoryEntry, 'id'>), id };
}

function getReportHistoryCollection(reportId: string) {
  return collection(db, REPORTS_COLLECTION, reportId, 'history');
}

function pickReportSnapshot(report: ReportDocument): Record<string, unknown> {
  return {
    status: report.status,
    assignedToUid: report.assignedToUid ?? null,
    resolutionOutcome: report.resolutionOutcome ?? null,
    resolvedBy: report.resolvedBy ?? null,
    resolvedAt: report.resolvedAt ?? null,
    updatedBy: report.updatedBy ?? null,
    updatedAt: report.updatedAt ?? null,
  };
}

async function writeReportHistory(
  reportId: string,
  action: ReportHistoryAction,
  actor: Actor,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  note: string
): Promise<void> {
  await addDoc(getReportHistoryCollection(reportId), {
    reportId,
    action,
    actorUid: actor.uid,
    before,
    after,
    note,
    timestamp: serverTimestamp(),
  });
}

async function getReportForMutation(
  reportId: string,
  actor: Actor,
  action: ServiceAction
): Promise<ReportDocument> {
  requirePermission(actor, action);

  const snap = await getDoc(doc(db, REPORTS_COLLECTION, reportId));
  if (!snap.exists()) {
    throw new ReportServiceError('NOT_FOUND', 'Report not found.');
  }
  return docToReport(snap.id, snap.data());
}

async function assertAssigneeEligible(assigneeUid: string): Promise<void> {
  if (!assigneeUid.trim()) {
    throw new ReportServiceError('VALIDATION_ERROR', 'Assignee UID is required.');
  }

  const userSnap = await getDoc(doc(db, USERS_COLLECTION, assigneeUid));
  if (!userSnap.exists()) {
    throw new ReportServiceError('NOT_FOUND', 'Assignee user not found.');
  }

  const user = userSnap.data() as UserDocument & {
    role?: string | null;
    userType?: string | null;
  };
  const isActive = user.status === 'active';
  const isAdmin = user.userType === 'admin' && typeof user.role === 'string';

  if (!isActive || !isAdmin) {
    throw new ReportServiceError(
      'VALIDATION_ERROR',
      'Assignee must be an active admin account.'
    );
  }
}

function applyClientFilters(
  reports: ReportDocument[],
  queryInput: ReportListQuery | undefined
): ReportDocument[] {
  const filters = queryInput?.filters;
  let filtered = [...reports];

  if (filters?.status && filters.status !== 'all') {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters?.targetEntityType && filters.targetEntityType !== 'all') {
    filtered = filtered.filter((r) => r.targetEntityType === filters.targetEntityType);
  }
  if (filters?.assigneeUid && filters.assigneeUid !== 'all') {
    if (filters.assigneeUid === 'unassigned') {
      filtered = filtered.filter((r) => !r.assignedToUid);
    } else {
      filtered = filtered.filter((r) => r.assignedToUid === filters.assigneeUid);
    }
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter((r) => {
      return (
        (r.id ?? '').toLowerCase().includes(q) ||
        r.targetEntityId.toLowerCase().includes(q) ||
        (r.reporterUid ?? '').toLowerCase().includes(q) ||
        (r.reporterEmail ?? '').toLowerCase().includes(q) ||
        (r.assignedToUid ?? '').toLowerCase().includes(q)
      );
    });
  }

  const sortField = queryInput?.sortField ?? 'updatedAt';
  const sortDirection = queryInput?.sortDirection ?? 'desc';
  filtered.sort((a, b) => {
    const aMs = timestampToMillis(sortField === 'createdAt' ? a.createdAt : a.updatedAt);
    const bMs = timestampToMillis(sortField === 'createdAt' ? b.createdAt : b.updatedAt);
    return sortDirection === 'asc' ? aMs - bMs : bMs - aMs;
  });

  return filtered;
}

export async function listReports(
  queryInput: ReportListQuery,
  actor: Actor
): Promise<ReportDocument[]> {
  requirePermission(actor, 'view');

  const cappedLimit = Math.min(
    Math.max(queryInput.limit ?? DEFAULT_LIST_LIMIT, 1),
    DEFAULT_LIST_LIMIT
  );
  const sortField = queryInput.sortField ?? 'updatedAt';
  const sortDirection = queryInput.sortDirection ?? 'desc';

  let snap;
  try {
    snap = await getDocs(
      query(
        collection(db, REPORTS_COLLECTION),
        orderBy(sortField, sortDirection),
        limit(cappedLimit)
      )
    );
  } catch {
    snap = await getDocs(
      query(
        collection(db, REPORTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(cappedLimit)
      )
    );
  }

  const reports = snap.docs.map((d) => docToReport(d.id, d.data()));
  const filtered = applyClientFilters(reports, queryInput);

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'report',
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

export async function getReport(
  reportId: string,
  actor: Actor
): Promise<ReportDocument | null> {
  requirePermission(actor, 'view');

  const snap = await getDoc(doc(db, REPORTS_COLLECTION, reportId));
  if (!snap.exists()) return null;

  const report = docToReport(snap.id, snap.data());
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'report',
    resourceId: reportId,
  });
  return report;
}

export async function getReportHistory(
  reportId: string,
  actor: Actor
): Promise<ReportHistoryEntry[]> {
  requirePermission(actor, 'view');

  const snap = await getDocs(
    query(getReportHistoryCollection(reportId), orderBy('timestamp', 'desc'), limit(100))
  );
  return snap.docs.map((d) => docToHistory(d.id, d.data()));
}

export async function assignReport(
  reportId: string,
  assigneeUid: string,
  reason: string,
  actor: Actor
): Promise<void> {
  assertValidReason(reason);
  await assertAssigneeEligible(assigneeUid);

  const report = await getReportForMutation(reportId, actor, 'assign');
  const before = pickReportSnapshot(report);

  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    assignedToUid: assigneeUid.trim(),
    assignedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  const after = {
    ...before,
    assignedToUid: assigneeUid.trim(),
    updatedBy: actor.uid,
  };

  await writeReportHistory(reportId, 'assign', actor, before, after, reason.trim());
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'assign_report',
    resourceType: 'report',
    resourceId: reportId,
    metadata: {
      reportId,
      assigneeUid: assigneeUid.trim(),
      reason: reason.trim(),
      before,
      after,
    },
  });
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  reason: string,
  actor: Actor
): Promise<void> {
  assertValidReason(reason);

  const report = await getReportForMutation(reportId, actor, 'status');
  assertValidStatusTransition(report.status, status);
  const before = pickReportSnapshot(report);

  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    status,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  const after = {
    ...before,
    status,
    updatedBy: actor.uid,
  };

  await writeReportHistory(
    reportId,
    'status_change',
    actor,
    before,
    after,
    reason.trim()
  );
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update_report_status',
    resourceType: 'report',
    resourceId: reportId,
    metadata: { reportId, status, reason: reason.trim(), before, after },
  });
}

export async function resolveReport(
  reportId: string,
  outcome: ReportResolutionOutcome,
  reason: string,
  actor: Actor
): Promise<void> {
  assertValidReason(reason);

  const report = await getReportForMutation(reportId, actor, 'resolve');
  const nextStatus = mapOutcomeToStatus(outcome);
  assertValidStatusTransition(report.status, nextStatus);
  const before = pickReportSnapshot(report);

  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    status: nextStatus,
    resolutionOutcome: outcome,
    resolutionNote: reason.trim(),
    resolvedBy: actor.uid,
    resolvedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  const after = {
    ...before,
    status: nextStatus,
    resolutionOutcome: outcome,
    resolutionNote: reason.trim(),
    resolvedBy: actor.uid,
    updatedBy: actor.uid,
  };

  await writeReportHistory(reportId, 'resolve', actor, before, after, reason.trim());
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'resolve_report',
    resourceType: 'report',
    resourceId: reportId,
    metadata: {
      reportId,
      outcome,
      status: nextStatus,
      reason: reason.trim(),
      before,
      after,
    },
  });
}
