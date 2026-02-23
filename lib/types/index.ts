import type { Timestamp, DocumentSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// ---- Role System ----
export type AdminRole =
  | 'super_admin'
  | 'admin';

export type UserType = 'admin' | 'author' | 'reader';

export type AuthorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type AuditAction =
  | 'sign_in'
  | 'sign_out'
  | 'sign_up'
  | 'failed_auth'
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'publish'
  | 'unpublish'
  | 'assign_role'
  | 'revoke_role'
  | 'suspend_user'
  | 'activate_user'
  | 'approve_author'
  | 'reject_author'
  | 'assign_report'
  | 'update_report_status'
  | 'resolve_report'
  | 'update_setting'
  | 'rollback_setting'
  | 'view_setting_sensitive'
  | 'retry_ai_job'
  | 'cancel_ai_job'
  | 'hide_review'
  | 'remove_review'
  | 'restore_review';

export type ResourceType =
  | 'auth'
  | 'book'
  | 'user'
  | 'review'
  | 'ai_job'
  | 'ai_config'
  | 'report'
  | 'settings'
  | 'chapter';

// ---- Firestore Document Shapes ----
export interface UserDocument {
  uid: string;
  email: string;
  displayName: string | null;
  role?: AdminRole;              // optional — only set for admin userType
  userType?: UserType;           // optional for backward compat with existing docs
  status: 'active' | 'suspended' | 'disabled';
  authorStatus?: AuthorStatus;  // only present when userType === 'author'
  bio?: string | null;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- User Management Filters ----
export interface UserFilters {
  userType?: UserType | 'all';
  status?: UserDocument['status'] | 'all';
  search?: string;
}

// ---- Reports ----
export type ReportTargetEntityType =
  | 'review'
  | 'user'
  | 'book'
  | 'author_profile';

export type ReportStatus =
  | 'open'
  | 'in_review'
  | 'resolved_action_taken'
  | 'resolved_no_action'
  | 'dismissed';

export type ReportResolutionOutcome =
  | 'action_taken'
  | 'no_action'
  | 'dismissed';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReportPriority = 'low' | 'normal' | 'high';

export interface ReportDocument {
  id?: string;
  targetEntityType: ReportTargetEntityType;
  targetEntityId: string;
  reporterUid?: string | null;
  reporterEmail?: string | null;
  category: string;
  description?: string | null;
  status: ReportStatus;
  severity?: ReportSeverity | null;
  priority?: ReportPriority | null;
  assignedToUid?: string | null;
  assignedAt?: Timestamp | null;
  resolutionOutcome?: ReportResolutionOutcome | null;
  resolutionNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy?: string | null;
}

export type ReportHistoryAction = 'assign' | 'status_change' | 'resolve';

export interface ReportHistoryEntry {
  id?: string;
  reportId: string;
  action: ReportHistoryAction;
  actorUid: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string | null;
  timestamp: Timestamp;
}

export interface ReportListFilters {
  search?: string;
  status?: ReportStatus | 'all';
  targetEntityType?: ReportTargetEntityType | 'all';
  assigneeUid?: string | 'all' | 'unassigned';
}

export type ReportSortField = 'createdAt' | 'updatedAt';
export type ReportSortDirection = 'asc' | 'desc';

export interface ReportListQuery {
  filters?: ReportListFilters;
  sortField?: ReportSortField;
  sortDirection?: ReportSortDirection;
  limit?: number;
}

export type ReportServiceErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

// ---- Settings ----
export type SettingCategory =
  | 'general_app'
  | 'feature_flags'
  | 'moderation_policy'
  | 'user_management_policy'
  | 'review_policy'
  | 'report_policy'
  | 'ai_ops_policy'
  | 'security_policy';

export type SettingValueType =
  | 'boolean'
  | 'number'
  | 'string'
  | 'enum'
  | 'json'
  | 'string_list'
  | 'number_list';

export type SettingEnvironmentScope = 'global' | 'dev' | 'staging' | 'prod';

export interface SettingValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  regex?: string;
}

export type SettingValue =
  | boolean
  | number
  | string
  | null
  | Record<string, unknown>
  | string[]
  | number[];

export interface SettingDocument {
  key: string;
  category: SettingCategory;
  label: string;
  description?: string | null;
  valueType: SettingValueType;
  value: SettingValue;
  allowedValues?: Array<string | number> | null;
  validation?: SettingValidationRules | null;
  editable: boolean;
  sensitive: boolean;
  secretRef?: string | null;
  environmentScope?: SettingEnvironmentScope | null;
  version: number;
  lastUpdatedAt: Timestamp;
  lastUpdatedBy?: string | null;
  updatedByRole?: AdminRole | null;
}

export type SettingHistoryAction = 'update' | 'rollback';

export interface SettingHistoryEntry {
  id?: string;
  settingKey: string;
  category: SettingCategory;
  action: SettingHistoryAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  actorUid: string;
  actorRole: AdminRole;
  timestamp: Timestamp;
  versionBefore?: number | null;
  versionAfter?: number | null;
}

export interface SettingListFilters {
  search?: string;
  category?: SettingCategory | 'all';
  editable?: 'all' | 'editable' | 'read_only';
  sensitive?: 'all' | 'sensitive' | 'non_sensitive';
}

export type SettingSortField = 'key' | 'category' | 'lastUpdatedAt';
export type SettingSortDirection = 'asc' | 'desc';

export interface SettingListQuery {
  filters?: SettingListFilters;
  sortField?: SettingSortField;
  sortDirection?: SettingSortDirection;
  limit?: number;
}

export interface SettingUpdateInput {
  value: SettingValue;
  reason: string;
  expectedVersion?: number;
}

export interface SettingRollbackInput {
  historyEntryId: string;
  reason: string;
  expectedVersion?: number;
}

export type SettingServiceErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

// ---- AI Ops ----
export type AiJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type AiJobPriority = 'low' | 'normal' | 'high';

export type AiInitiatedByType = 'system' | 'admin' | 'user' | 'pipeline';

export type AiFailureCategory =
  | 'provider_error'
  | 'timeout'
  | 'validation'
  | 'safety'
  | 'internal';

export interface AiJobDocument {
  id?: string;
  jobId?: string;
  workflowType: string;
  status: AiJobStatus;
  provider: string;
  model: string;
  priority?: AiJobPriority | null;
  initiatedByType?: AiInitiatedByType | null;
  initiatedByUid?: string | null;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  requestId?: string | null;
  retryCount: number;
  maxRetries?: number | null;
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
  durationMs?: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  errorCode?: string | null;
  errorMessage?: string | null;
  failureCategory?: AiFailureCategory | null;
  fallbackUsed?: boolean | null;
  fallbackProvider?: string | null;
  fallbackModel?: string | null;
  inputSummary?: Record<string, unknown> | null;
  outputSummary?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
}

export type AiJobHistoryEventType =
  | 'status_change'
  | 'retry_requested'
  | 'cancel_requested'
  | 'worker_update';

export interface AiJobHistoryEntry {
  id?: string;
  jobId: string;
  eventType: AiJobHistoryEventType;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  actorType?: 'system' | 'admin' | null;
  actorUid?: string | null;
  reason?: string | null;
  timestamp: Timestamp;
}

export interface AiJobListFilters {
  search?: string;
  status?: AiJobStatus | 'all';
  workflowType?: string | 'all';
  provider?: string | 'all';
  model?: string;
  retryCountMin?: number | null;
}

export type AiJobSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'durationMs'
  | 'status';

export type AiJobSortDirection = 'asc' | 'desc';

export interface AiJobListQuery {
  filters?: AiJobListFilters;
  sortField?: AiJobSortField;
  sortDirection?: AiJobSortDirection;
  limit?: number;
}

export interface RetryAiJobInput {
  reason: string;
  expectedStatus?: AiJobStatus;
  expectedUpdatedAtMs?: number;
}

export interface CancelAiJobInput {
  reason: string;
  expectedStatus?: AiJobStatus;
  expectedUpdatedAtMs?: number;
}

export type AiOpsServiceErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

// ---- Reviews ----
export type ReviewModerationStatus = 'published' | 'hidden' | 'removed';

export type ReviewModerationAction = 'hide' | 'remove' | 'restore';

export type ReviewModerationSource =
  | 'manual'
  | 'report_resolution'
  | 'automated';

export interface ReviewDocument {
  id?: string;
  bookId: string;
  userId: string;
  rating: number;
  title?: string | null;
  content: string;
  status: ReviewModerationStatus;
  reportCount?: number | null;
  lastReportedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy?: string | null;
  moderatedAt?: Timestamp | null;
  moderatedBy?: string | null;
  moderationReason?: string | null;
  moderationSource?: ReviewModerationSource | null;
}

export interface ReviewModerationHistoryEntry {
  id?: string;
  reviewId: string;
  action: ReviewModerationAction;
  actorUid: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  linkedReportIds?: string[] | null;
  timestamp: Timestamp;
}

export interface ReviewListFilters {
  search?: string;
  status?: ReviewModerationStatus | 'all';
  rating?: 1 | 2 | 3 | 4 | 5 | 'all';
  flagged?: 'all' | 'flagged' | 'unflagged';
  bookId?: string;
}

export type ReviewSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'rating'
  | 'reportCount';

export type ReviewSortDirection = 'asc' | 'desc';

export interface ReviewListQuery {
  filters?: ReviewListFilters;
  sortField?: ReviewSortField;
  sortDirection?: ReviewSortDirection;
  limit?: number;
}

export type ReviewServiceErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface AuditLogDocument {
  id?: string;
  actorUid: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  timestamp: Timestamp;
  // M4 optional extensions — absent on legacy documents
  schemaVersion?: number;
  actorType?: 'admin_user' | 'system';
  result?: 'success' | 'failure';
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// ---- Audit Log Query Types ----

export interface AuditLogFilters {
  resourceType?: ResourceType | 'all';
  action?: AuditAction | 'all';
  actorRole?: AdminRole | 'all';
  actorEmail?: string;   // client-side substring match
  dateFrom?: Date | null;
  dateTo?: Date | null;
}

export interface AuditLogPage {
  entries: AuditLogDocument[];
  nextCursor: DocumentSnapshot | null;
  hasNextPage: boolean;
}

// ---- Auth Context Shape ----
export interface AuthContextValue {
  firebaseUser: User | null;
  userDoc: UserDocument | null;
  role: AdminRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  /** Returns seconds elapsed since last sign-in, or null if not authenticated */
  getAuthAgeSeconds: () => number | null;
}

// ---- Navigation ----
export interface NavItem {
  label: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ElementType<any>;
  allowedRoles: AdminRole[];
}

// ---- Password Validation ----
export type PasswordStrengthLevel = 'very_weak' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordConstraint {
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  constraints: PasswordConstraint[];
}

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
  /** 0–100 for MUI LinearProgress `value` prop */
  value: number;
}

// ---- Actor (passed to service functions instead of importing AuthContext) ----
export interface Actor {
  uid: string;
  email: string;
  role: AdminRole;
}

// ---- Book Catalog ----

export type BookStatus = 'draft' | 'published' | 'archived';

export interface BookDocument {
  id?: string;
  title: string;
  author: string;
  narrator: string | null;
  description: string;
  language: string;              // ISO 639-1 e.g. 'en'
  genres: string[];
  tags: string[];
  status: BookStatus;
  coverImageUrl: string | null;  // Firebase Storage download URL
  coverImagePath: string | null; // Firebase Storage path (for deletion on replace)
  audioUrl: string | null;       // Book-level audio download URL
  audioPath: string | null;      // Book-level audio Storage path
  totalChapters: number;         // Denormalized count
  publishedAt: Timestamp | null;
  createdBy: string;             // actor uid
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;             // actor uid
}

export interface ChapterDocument {
  id?: string;
  bookId: string;
  title: string;
  order: number;                 // 1-based, unique per book
  audioUrl: string | null;
  audioPath: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---- Upload State ----

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'cancelled';

export interface UploadState {
  status: UploadStatus;
  progress: number;              // 0–100
  error: string | null;
  downloadUrl: string | null;
  storagePath: string | null;
}

// ---- Publish Readiness ----

export type PublishCheckId =
  | 'title'
  | 'author'
  | 'description'
  | 'language'
  | 'genres'
  | 'coverImage'
  | 'audio';

export interface PublishCheck {
  id: PublishCheckId;
  label: string;
  passed: boolean;
  detail?: string;               // e.g. "0 of 3 chapters have audio"
}

export interface PublishReadiness {
  ready: boolean;
  checks: PublishCheck[];
}

// ---- Book Form Values (subset of BookDocument for edit forms) ----

export interface BookFormValues {
  title: string;
  author: string;
  narrator: string;
  description: string;
  language: string;
  genres: string[];
  tags: string[];
}
