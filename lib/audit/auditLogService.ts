import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  Timestamp as FirestoreTimestamp,
  type DocumentSnapshot,
  type Query,
  type DocumentData,
} from 'firebase/firestore';
import db from '@/lib/firebase/firestore';
import type {
  AuditAction,
  AdminRole,
  AuditLogDocument,
  AuditLogFilters,
  AuditLogPage,
  ResourceType,
} from '@/lib/types';

const AUDIT_LOGS_COLLECTION = 'audit_logs';

export interface ListAuditLogsParams {
  filters: AuditLogFilters;
  pageSize: 25 | 50 | 100;
  cursor: DocumentSnapshot | null;  // null = first page
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function docToAuditLog(snap: DocumentSnapshot): AuditLogDocument {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    actorUid: typeof data.actorUid === 'string' ? data.actorUid : '',
    actorEmail: typeof data.actorEmail === 'string' ? data.actorEmail : '',
    actorRole:
      data.actorRole === 'super_admin' || data.actorRole === 'admin'
        ? (data.actorRole as AdminRole)
        : 'admin',
    action: (data.action as AuditAction) ?? 'view',
    resourceType: (data.resourceType as ResourceType) ?? 'auth',
    resourceId: typeof data.resourceId === 'string' ? data.resourceId : null,
    metadata:
      typeof data.metadata === 'object' && data.metadata !== null
        ? (data.metadata as Record<string, unknown>)
        : {},
    timestamp: data.timestamp,
    // Optional M4 fields — undefined if absent (legacy docs)
    schemaVersion:
      typeof data.schemaVersion === 'number' ? data.schemaVersion : undefined,
    actorType:
      data.actorType === 'admin_user' || data.actorType === 'system'
        ? data.actorType
        : undefined,
    result:
      data.result === 'success' || data.result === 'failure'
        ? data.result
        : undefined,
    reason: typeof data.reason === 'string' ? data.reason : undefined,
    before:
      typeof data.before === 'object' && data.before !== null
        ? (data.before as Record<string, unknown>)
        : undefined,
    after:
      typeof data.after === 'object' && data.after !== null
        ? (data.after as Record<string, unknown>)
        : undefined,
  };
}

/**
 * Applies all filters that were NOT sent to Firestore (secondary equality
 * filters + client-side email substring search).
 *
 * Because this runs after Firestore pagination, the returned array may be
 * shorter than the requested page size. Callers that use actorEmail should
 * fetch pageSize * 2 from Firestore to reduce the chance of an empty page.
 */
function applyClientFilters(
  entries: AuditLogDocument[],
  filters: AuditLogFilters
): AuditLogDocument[] {
  let list = entries;

  if (filters.resourceType && filters.resourceType !== 'all') {
    list = list.filter((e) => e.resourceType === filters.resourceType);
  }
  if (filters.action && filters.action !== 'all') {
    list = list.filter((e) => e.action === filters.action);
  }
  if (filters.actorRole && filters.actorRole !== 'all') {
    list = list.filter((e) => e.actorRole === filters.actorRole);
  }
  if (filters.actorEmail?.trim()) {
    const q = filters.actorEmail.trim().toLowerCase();
    list = list.filter((e) => e.actorEmail.toLowerCase().includes(q));
  }

  return list;
}

/**
 * Build the Firestore query.
 *
 * Strategy: apply ONE Firestore-level equality filter at most (priority:
 * resourceType > action > actorRole) to avoid requiring many composite
 * indexes. All remaining equality filters are applied client-side.
 *
 * Date range (timestamp >= / <=) is applied only when there is NO other
 * equality filter active, because combining them requires composite indexes
 * that also include the equality field — deferred to a future milestone.
 */
function buildQuery(
  params: ListAuditLogsParams,
  fetchLimit: number
): Query<DocumentData> {
  const { filters, cursor } = params;

  // Determine which (if any) single Firestore equality filter to apply
  const resourceTypeActive =
    filters.resourceType && filters.resourceType !== 'all';
  const actionActive = filters.action && filters.action !== 'all';
  const actorRoleActive = filters.actorRole && filters.actorRole !== 'all';
  const dateRangeActive = !!(filters.dateFrom || filters.dateTo);

  // Build constraint list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const constraints: any[] = [];

  if (resourceTypeActive) {
    constraints.push(where('resourceType', '==', filters.resourceType));
  } else if (actionActive) {
    constraints.push(where('action', '==', filters.action));
  } else if (actorRoleActive) {
    constraints.push(where('actorRole', '==', filters.actorRole));
  } else if (dateRangeActive) {
    // Date range only when no equality filter is active
    if (filters.dateFrom) {
      constraints.push(
        where('timestamp', '>=', FirestoreTimestamp.fromDate(filters.dateFrom))
      );
    }
    if (filters.dateTo) {
      constraints.push(
        where('timestamp', '<=', FirestoreTimestamp.fromDate(filters.dateTo))
      );
    }
  }

  constraints.push(orderBy('timestamp', 'desc'));

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(fetchLimit));

  return query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List audit logs with cursor-based pagination.
 *
 * Returns a page of results plus a cursor that can be passed back on the next
 * call to advance to the subsequent page.
 *
 * Note: when `actorEmail` filter is set, this function fetches `pageSize * 2`
 * entries from Firestore and applies client-side filtering to reduce the risk
 * of returning an unexpectedly short page.
 */
export async function listAuditLogs(
  params: ListAuditLogsParams
): Promise<AuditLogPage> {
  const hasEmailFilter = !!(params.filters.actorEmail?.trim());

  // Fetch one extra to detect hasNextPage; double when email filter is active
  // to mitigate the risk of empty pages after client-side email filtering.
  const fetchSize = hasEmailFilter
    ? params.pageSize * 2 + 1
    : params.pageSize + 1;

  const q = buildQuery(params, fetchSize);

  let snap;
  try {
    snap = await getDocs(q);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : String(err);
    // Surface Firestore index-missing errors in a user-friendly way
    if (msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')) {
      throw new Error(
        'Failed to apply this filter combination. A required Firestore index may be missing. ' +
          'Please try a different filter or contact the system administrator.'
      );
    }
    throw err;
  }

  const rawDocs = snap.docs;

  // Use the pageSize + 1 trick: if we got more than pageSize results,
  // there is another page. Trim the extra document before returning.
  const hasNextPage = rawDocs.length > params.pageSize;
  const trimmedDocs = hasNextPage ? rawDocs.slice(0, params.pageSize) : rawDocs;

  const entries = trimmedDocs.map(docToAuditLog);
  const clientFiltered = applyClientFilters(entries, params.filters);

  const nextCursor =
    hasNextPage && trimmedDocs.length > 0
      ? trimmedDocs[trimmedDocs.length - 1]
      : null;

  return {
    entries: clientFiltered,
    nextCursor,
    hasNextPage,
  };
}

/**
 * Fetch a single audit log entry by document ID.
 * Returns null when the document does not exist.
 */
export async function getAuditLog(
  logId: string
): Promise<AuditLogDocument | null> {
  const snap = await getDoc(doc(db, AUDIT_LOGS_COLLECTION, logId));
  if (!snap.exists()) return null;
  return docToAuditLog(snap);
}
