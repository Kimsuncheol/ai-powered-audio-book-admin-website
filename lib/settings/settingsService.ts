import {
  collection,
  doc,
  documentId,
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
  canEditSettings,
  canRollbackSetting,
  canViewSensitiveSettingValue,
  canViewSettings,
} from '@/lib/settings/settingsRbac';
import {
  SettingsServiceError,
  assertEditable,
  assertReason,
  assertRollbackEligible,
  assertSettingEnumValue,
  assertSettingValueConstraints,
  assertSettingValueMatchesType,
  isSettingCategory,
  isSettingEnvironmentScope,
  isSettingValueType,
} from '@/lib/settings/settingsValidation';
import type {
  Actor,
  SettingDocument,
  SettingHistoryAction,
  SettingHistoryEntry,
  SettingListQuery,
  SettingRollbackInput,
  SettingSortDirection,
  SettingSortField,
  SettingUpdateInput,
} from '@/lib/types';

const SETTINGS_COLLECTION = 'settings';
const DEFAULT_LIST_LIMIT = 300;
const REDACTED_VALUE = '[REDACTED]';

type ServiceAction = 'view' | 'update' | 'rollback';
type SettingSnapshot = Record<string, unknown>;

function requirePermission(actor: Actor, action: ServiceAction): void {
  const allowed =
    action === 'view'
      ? canViewSettings(actor.role)
      : action === 'update'
        ? canEditSettings(actor.role)
        : canRollbackSetting(actor.role);

  if (!allowed) {
    throw new SettingsServiceError(
      'FORBIDDEN',
      action === 'view'
        ? 'You do not have permission to view settings.'
        : 'You do not have permission to change settings.'
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

function getSettingsCollection() {
  return collection(db, SETTINGS_COLLECTION);
}

function getSettingHistoryCollection(settingKey: string) {
  return collection(db, SETTINGS_COLLECTION, settingKey, 'history');
}

function toFirestoreSortField(field: SettingSortField): string | ReturnType<typeof documentId> {
  if (field === 'key') return documentId();
  return field;
}

function docToSetting(id: string, data: Record<string, unknown>): SettingDocument {
  const raw = { ...data } as Record<string, unknown>;
  const key =
    typeof raw.key === 'string' && raw.key.trim().length > 0 ? raw.key : id;
  const label =
    typeof raw.label === 'string' && raw.label.trim()
      ? raw.label
      : key;
  const category = raw.category;
  const valueType = raw.valueType;

  if (!isSettingCategory(category)) {
    throw new SettingsServiceError(
      'INTERNAL_ERROR',
      `Invalid category for setting "${key}".`
    );
  }
  if (!isSettingValueType(valueType)) {
    throw new SettingsServiceError(
      'INTERNAL_ERROR',
      `Invalid valueType for setting "${key}".`
    );
  }

  const editable = typeof raw.editable === 'boolean' ? raw.editable : false;
  const sensitive = typeof raw.sensitive === 'boolean' ? raw.sensitive : false;
  const version =
    typeof raw.version === 'number' && Number.isFinite(raw.version)
      ? raw.version
      : 0;
  const environmentScope =
    raw.environmentScope == null
      ? null
      : isSettingEnvironmentScope(raw.environmentScope)
        ? raw.environmentScope
        : null;

  const setting: SettingDocument = {
    key,
    category,
    label,
    description:
      typeof raw.description === 'string' ? raw.description : null,
    valueType,
    value: (raw.value ?? null) as SettingDocument['value'],
    allowedValues: Array.isArray(raw.allowedValues)
      ? (raw.allowedValues.filter(
          (v): v is string | number => typeof v === 'string' || typeof v === 'number'
        ) as Array<string | number>)
      : null,
    validation: isPlainObject(raw.validation)
      ? (safeClone(raw.validation) as SettingDocument['validation'])
      : null,
    editable,
    sensitive,
    secretRef: typeof raw.secretRef === 'string' ? raw.secretRef : null,
    environmentScope,
    version,
    lastUpdatedAt: raw.lastUpdatedAt as SettingDocument['lastUpdatedAt'],
    lastUpdatedBy:
      typeof raw.lastUpdatedBy === 'string' ? raw.lastUpdatedBy : null,
    updatedByRole:
      raw.updatedByRole === 'super_admin' || raw.updatedByRole === 'admin'
        ? raw.updatedByRole
        : null,
  };

  return setting;
}

function docToSettingHistory(
  id: string,
  data: Record<string, unknown>
): SettingHistoryEntry {
  const raw = { ...data } as Record<string, unknown>;
  const action =
    raw.action === 'update' || raw.action === 'rollback'
      ? raw.action
      : 'update';
  const actorRole =
    raw.actorRole === 'super_admin' || raw.actorRole === 'admin'
      ? raw.actorRole
      : 'admin';

  return {
    id,
    settingKey: typeof raw.settingKey === 'string' ? raw.settingKey : '',
    category: (raw.category ?? 'general_app') as SettingHistoryEntry['category'],
    action,
    before: isPlainObject(raw.before) ? safeClone(raw.before) : null,
    after: isPlainObject(raw.after) ? safeClone(raw.after) : null,
    reason: typeof raw.reason === 'string' ? raw.reason : null,
    actorUid: typeof raw.actorUid === 'string' ? raw.actorUid : '',
    actorRole,
    timestamp: raw.timestamp as SettingHistoryEntry['timestamp'],
    versionBefore:
      typeof raw.versionBefore === 'number' ? raw.versionBefore : null,
    versionAfter:
      typeof raw.versionAfter === 'number' ? raw.versionAfter : null,
  };
}

function redactSettingValue(value: unknown): string {
  void value;
  return REDACTED_VALUE;
}

function redactSettingForActor(
  setting: SettingDocument,
  actor: Actor
): SettingDocument {
  if (!setting.sensitive || canViewSensitiveSettingValue(actor.role)) {
    return setting;
  }
  return {
    ...setting,
    value: redactSettingValue(setting.value),
  };
}

function maskSnapshotForOutput(snapshot: SettingSnapshot | null | undefined): SettingSnapshot | null {
  if (!snapshot) return null;
  const cloned = safeClone(snapshot);
  if (cloned.sensitive === true && 'value' in cloned) {
    cloned.value = REDACTED_VALUE;
  }
  return cloned;
}

function redactHistoryEntryForActor(
  entry: SettingHistoryEntry,
  actor: Actor
): SettingHistoryEntry {
  const canSeeSensitive = canViewSensitiveSettingValue(actor.role);
  if (canSeeSensitive) {
    // Default policy still redacts sensitive values in history snapshots.
    return {
      ...entry,
      before: maskSnapshotForOutput(entry.before),
      after: maskSnapshotForOutput(entry.after),
    };
  }
  return {
    ...entry,
    before: maskSnapshotForOutput(entry.before),
    after: maskSnapshotForOutput(entry.after),
  };
}

function pickSettingSnapshot(
  setting: Pick<
    SettingDocument,
    | 'value'
    | 'valueType'
    | 'editable'
    | 'sensitive'
    | 'secretRef'
    | 'version'
    | 'lastUpdatedBy'
    | 'updatedByRole'
  >
): SettingSnapshot {
  return {
    value: safeClone(setting.value),
    valueType: setting.valueType,
    editable: setting.editable,
    sensitive: setting.sensitive,
    secretRef: setting.secretRef ?? null,
    version: setting.version,
    lastUpdatedBy: setting.lastUpdatedBy ?? null,
    updatedByRole: setting.updatedByRole ?? null,
  };
}

function buildHistoryPayload(params: {
  settingKey: string;
  category: SettingDocument['category'];
  action: SettingHistoryAction;
  before: SettingSnapshot | null;
  after: SettingSnapshot | null;
  reason: string;
  actor: Actor;
  versionBefore: number;
  versionAfter: number;
}) {
  return {
    settingKey: params.settingKey,
    category: params.category,
    action: params.action,
    before: params.before,
    after: params.after,
    reason: params.reason,
    actorUid: params.actor.uid,
    actorRole: params.actor.role,
    timestamp: serverTimestamp(),
    versionBefore: params.versionBefore,
    versionAfter: params.versionAfter,
  };
}

function applyClientFilters(
  settings: SettingDocument[],
  queryInput: SettingListQuery | undefined
): SettingDocument[] {
  const filters = queryInput?.filters;
  let filtered = [...settings];

  if (filters?.category && filters.category !== 'all') {
    filtered = filtered.filter((s) => s.category === filters.category);
  }
  if (filters?.editable && filters.editable !== 'all') {
    filtered = filtered.filter((s) =>
      filters.editable === 'editable' ? s.editable : !s.editable
    );
  }
  if (filters?.sensitive && filters.sensitive !== 'all') {
    filtered = filtered.filter((s) =>
      filters.sensitive === 'sensitive' ? s.sensitive : !s.sensitive
    );
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter((s) => {
      return (
        s.key.toLowerCase().includes(q) ||
        s.label.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q)
      );
    });
  }

  const sortField = queryInput?.sortField ?? 'lastUpdatedAt';
  const sortDirection = queryInput?.sortDirection ?? 'desc';
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortField === 'lastUpdatedAt') {
      cmp = timestampToMillis(a.lastUpdatedAt) - timestampToMillis(b.lastUpdatedAt);
    } else if (sortField === 'key') {
      cmp = a.key.localeCompare(b.key);
    } else {
      cmp = a.category.localeCompare(b.category) || a.key.localeCompare(b.key);
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  return filtered;
}

function assertVersionMatch(
  currentVersion: number,
  expectedVersion: number | undefined
): void {
  if (expectedVersion == null) return;
  if (currentVersion !== expectedVersion) {
    throw new SettingsServiceError(
      'CONFLICT',
      'This setting was updated by another user. Refresh and try again.'
    );
  }
}

function extractRollbackValueFromHistory(entry: SettingHistoryEntry): unknown {
  if (!entry.after || !('value' in entry.after)) {
    throw new SettingsServiceError(
      'CONFLICT',
      'Selected history entry does not contain a restorable value.'
    );
  }
  if (entry.after.value === REDACTED_VALUE) {
    throw new SettingsServiceError(
      'CONFLICT',
      'Selected history entry value is redacted and cannot be restored.'
    );
  }
  return safeClone(entry.after.value);
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return Object.is(a, b);
  }
}

export async function listSettings(
  queryInput: SettingListQuery,
  actor: Actor
): Promise<SettingDocument[]> {
  requirePermission(actor, 'view');

  const cappedLimit = Math.min(
    Math.max(queryInput.limit ?? DEFAULT_LIST_LIMIT, 1),
    DEFAULT_LIST_LIMIT
  );
  const sortField = queryInput.sortField ?? 'lastUpdatedAt';
  const sortDirection: SettingSortDirection = queryInput.sortDirection ?? 'desc';

  let snap;
  try {
    snap = await getDocs(
      query(
        getSettingsCollection(),
        orderBy(toFirestoreSortField(sortField), sortDirection),
        limit(cappedLimit)
      )
    );
  } catch {
    snap = await getDocs(
      query(getSettingsCollection(), orderBy('lastUpdatedAt', 'desc'), limit(cappedLimit))
    );
  }

  const settings: SettingDocument[] = [];
  for (const d of snap.docs) {
    try {
      settings.push(docToSetting(d.id, d.data()));
    } catch (err) {
      console.warn('[SettingsService] Skipping invalid settings doc', d.id, err);
    }
  }

  const filtered = applyClientFilters(settings, queryInput).map((s) =>
    redactSettingForActor(s, actor)
  );

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'settings',
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

export async function getSetting(
  settingKey: string,
  actor: Actor
): Promise<SettingDocument | null> {
  requirePermission(actor, 'view');

  const snap = await getDoc(doc(db, SETTINGS_COLLECTION, settingKey));
  if (!snap.exists()) return null;

  const setting = docToSetting(snap.id, snap.data());
  const redacted = redactSettingForActor(setting, actor);

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action:
      setting.sensitive && canViewSensitiveSettingValue(actor.role)
        ? 'view_setting_sensitive'
        : 'view',
    resourceType: 'settings',
    resourceId: settingKey,
    metadata: {
      category: setting.category,
      sensitive: setting.sensitive,
    },
  });

  return redacted;
}

export async function getSettingHistory(
  settingKey: string,
  actor: Actor
): Promise<SettingHistoryEntry[]> {
  requirePermission(actor, 'view');

  const snap = await getDocs(
    query(getSettingHistoryCollection(settingKey), orderBy('timestamp', 'desc'), limit(100))
  );

  const entries = snap.docs.map((d) => docToSettingHistory(d.id, d.data()));
  return entries.map((entry) => redactHistoryEntryForActor(entry, actor));
}

export async function updateSetting(
  settingKey: string,
  input: SettingUpdateInput,
  actor: Actor
): Promise<void> {
  requirePermission(actor, 'update');
  assertReason(input.reason);

  const settingRef = doc(db, SETTINGS_COLLECTION, settingKey);

  const result = await runTransaction(db, async (tx) => {
    const settingSnap = await tx.get(settingRef);
    if (!settingSnap.exists()) {
      throw new SettingsServiceError('NOT_FOUND', 'Setting not found.');
    }

    const currentSetting = docToSetting(settingSnap.id, settingSnap.data());
    assertEditable(currentSetting);
    assertVersionMatch(currentSetting.version, input.expectedVersion);
    assertSettingValueMatchesType(currentSetting.valueType, input.value);
    assertSettingEnumValue(currentSetting, input.value);
    assertSettingValueConstraints(currentSetting, input.value);

    const versionBefore = currentSetting.version;
    const versionAfter = versionBefore + 1;
    const beforeSnapshot = pickSettingSnapshot(currentSetting);
    const nextSetting: SettingDocument = {
      ...currentSetting,
      value: safeClone(input.value),
      version: versionAfter,
      lastUpdatedBy: actor.uid,
      updatedByRole: actor.role,
    };
    const afterSnapshot = pickSettingSnapshot(nextSetting);

    tx.update(settingRef, {
      value: safeClone(input.value),
      version: versionAfter,
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: actor.uid,
      updatedByRole: actor.role,
    });

    const historyRef = doc(getSettingHistoryCollection(settingKey));
    tx.set(
      historyRef,
      buildHistoryPayload({
        settingKey,
        category: currentSetting.category,
        action: 'update',
        before: beforeSnapshot,
        after: afterSnapshot,
        reason: input.reason.trim(),
        actor,
        versionBefore,
        versionAfter,
      })
    );

    return {
      historyEntryId: historyRef.id,
      category: currentSetting.category,
      beforeSnapshot,
      afterSnapshot,
      versionBefore,
      versionAfter,
      sensitive: currentSetting.sensitive,
    };
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'update_setting',
    resourceType: 'settings',
    resourceId: settingKey,
    metadata: {
      settingKey,
      historyEntryId: result.historyEntryId,
      category: result.category,
      reason: input.reason.trim(),
      versionBefore: result.versionBefore,
      versionAfter: result.versionAfter,
      before: maskSnapshotForOutput(result.beforeSnapshot),
      after: maskSnapshotForOutput(result.afterSnapshot),
      sensitive: result.sensitive,
    },
  });
}

export async function rollbackSetting(
  settingKey: string,
  input: SettingRollbackInput,
  actor: Actor
): Promise<void> {
  requirePermission(actor, 'rollback');
  assertReason(input.reason);

  const settingRef = doc(db, SETTINGS_COLLECTION, settingKey);
  const historyRef = doc(db, SETTINGS_COLLECTION, settingKey, 'history', input.historyEntryId);

  const result = await runTransaction(db, async (tx) => {
    const [settingSnap, historySnap] = await Promise.all([
      tx.get(settingRef),
      tx.get(historyRef),
    ]);

    if (!settingSnap.exists()) {
      throw new SettingsServiceError('NOT_FOUND', 'Setting not found.');
    }
    if (!historySnap.exists()) {
      throw new SettingsServiceError('NOT_FOUND', 'History entry not found.');
    }

    const currentSetting = docToSetting(settingSnap.id, settingSnap.data());
    const sourceHistory = docToSettingHistory(historySnap.id, historySnap.data());
    assertRollbackEligible(currentSetting);
    assertVersionMatch(currentSetting.version, input.expectedVersion);

    const rollbackValue = extractRollbackValueFromHistory(sourceHistory);
    assertSettingValueMatchesType(currentSetting.valueType, rollbackValue);
    assertSettingEnumValue(currentSetting, rollbackValue);
    assertSettingValueConstraints(currentSetting, rollbackValue);

    if (areValuesEqual(currentSetting.value, rollbackValue)) {
      throw new SettingsServiceError(
        'CONFLICT',
        'Setting already matches the selected history version.'
      );
    }

    const versionBefore = currentSetting.version;
    const versionAfter = versionBefore + 1;
    const beforeSnapshot = pickSettingSnapshot(currentSetting);
    const nextSetting: SettingDocument = {
      ...currentSetting,
      value: safeClone(rollbackValue) as SettingDocument['value'],
      version: versionAfter,
      lastUpdatedBy: actor.uid,
      updatedByRole: actor.role,
    };
    const afterSnapshot = pickSettingSnapshot(nextSetting);

    tx.update(settingRef, {
      value: safeClone(rollbackValue),
      version: versionAfter,
      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: actor.uid,
      updatedByRole: actor.role,
    });

    const rollbackHistoryRef = doc(getSettingHistoryCollection(settingKey));
    tx.set(
      rollbackHistoryRef,
      buildHistoryPayload({
        settingKey,
        category: currentSetting.category,
        action: 'rollback',
        before: beforeSnapshot,
        after: afterSnapshot,
        reason: input.reason.trim(),
        actor,
        versionBefore,
        versionAfter,
      })
    );

    return {
      rollbackHistoryEntryId: rollbackHistoryRef.id,
      sourceHistoryEntryId: sourceHistory.id ?? input.historyEntryId,
      category: currentSetting.category,
      beforeSnapshot,
      afterSnapshot,
      versionBefore,
      versionAfter,
      sensitive: currentSetting.sensitive,
    };
  });

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'rollback_setting',
    resourceType: 'settings',
    resourceId: settingKey,
    metadata: {
      settingKey,
      sourceHistoryEntryId: result.sourceHistoryEntryId,
      rollbackHistoryEntryId: result.rollbackHistoryEntryId,
      category: result.category,
      reason: input.reason.trim(),
      versionBefore: result.versionBefore,
      versionAfter: result.versionAfter,
      before: maskSnapshotForOutput(result.beforeSnapshot),
      after: maskSnapshotForOutput(result.afterSnapshot),
      sensitive: result.sensitive,
    },
  });
}
