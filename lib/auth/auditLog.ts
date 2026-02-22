import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import db from '@/lib/firebase/firestore';
import type { AuditAction, ResourceType, AdminRole } from '@/lib/types';

interface LogAuditActionParams {
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Writes a document to the `audit_logs` Firestore collection.
 *
 * This function never throws — audit failures must not block the triggering
 * user action. Call this after any state-changing admin operation (FR-005).
 */
export async function logAuditAction(params: LogAuditActionParams): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata ?? {},
      // serverTimestamp() uses the Firestore server clock, ensuring
      // consistent ordering regardless of client clock skew
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Swallow the error — audit failures are silent to the user
    console.error('[AuditLog] Failed to write audit log:', err);
  }
}
