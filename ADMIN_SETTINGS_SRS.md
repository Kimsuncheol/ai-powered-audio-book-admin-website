# Software Requirements Specification (SRS)
## Admin Settings Management for Admin Website

Version: 1.0  
Date: 2026-02-22  
Status: Draft (Extracted + Extended)

## 1. Introduction

### 1.1 Purpose
This document defines software requirements for managing application and admin-operational settings in the Admin Website for the AI-Powered Audiobook App, with focus on:
- configuration viewing and editing for authorized admins
- settings validation, change safety, and rollback support
- audit logging and RBAC for settings changes
- secure handling of sensitive configuration values and references

This document extracts and extends settings/configuration-management requirements from `ADMIN_WEBSITE_SRS.md` into a standalone SRS.

### 1.2 Scope
In scope:
- admin UI for viewing/editing settings
- settings categorization, search, and detail/editor workflows
- validation and change confirmation for configuration updates
- settings versioning/history (minimum change history)
- audit logging and RBAC enforcement for settings access/changes
- feature flags and operational policy toggles (non-secret)

Out of scope:
- end-user preferences/settings in mobile app
- cloud infrastructure provisioning and IaC workflows
- secrets storage implementation (e.g., Secret Manager) beyond references/metadata handling in admin UI
- CI/CD deployment pipeline configuration management

### 1.3 Intended Audience
- Product owner and stakeholders
- Frontend and backend engineers
- QA engineers
- Security reviewers
- Operations team

### 1.4 Definitions and Acronyms
- Setting: Configurable system value used by the app or admin operations
- Feature flag: Config toggle controlling feature availability/behavior
- Config namespace: Group/category of related settings
- Rollback: Restoring a previous valid configuration state/version
- RBAC: Role-Based Access Control
- PII: Personally Identifiable Information

### 1.5 References
- `ADMIN_WEBSITE_SRS.md`
- `ADMIN_AUDIT_LOGS_SRS.md`
- `USER_MANAGEMENT_SRS.md`
- Firebase Authentication documentation
- Cloud Firestore documentation

## 2. Product Context

### 2.1 Technology Constraints
- Frontend: Next.js (App Router, TypeScript)
- UI: MUI (Material UI)
- Backend platform: Firebase
- Authentication: Firebase Authentication
- Database: Cloud Firestore
- Privileged backend operations: Firebase Cloud Functions (recommended)

### 2.2 Assumptions
- Authentication/session handling is implemented per `AUTH_SESSION_MANAGEMENT_SRS.md`.
- Settings writes are executed through server-side trusted code paths (recommended Cloud Functions).
- Some settings may be cached by clients/services and may require propagation delay documentation.
- Secrets are not stored directly in Firestore settings documents unless explicitly approved and encrypted; preferred approach is secret references only.

### 2.3 Settings Categories (v1 Proposed)
Core categories (minimum):
- `general_app`
- `feature_flags`
- `moderation_policy`
- `user_management_policy`
- `review_policy`
- `report_policy`
- `ai_ops_policy` (cross-reference to `ADMIN_AI_OPS_SRS.md`)
- `security_policy` (non-secret operational settings only)

Roles relevant to settings management (minimum):
- `super_admin` (full access)
- `analyst` (read-only or no access depending policy)
- Other roles may have category-scoped edit rights if approved (e.g., `community_admin` for moderation policy)

Notes:
- v1 should default to conservative permissions (few editors).
- High-risk settings changes may require reauthentication and explicit confirmation.

## 3. Functional Requirements

## 3.1 Settings Directory and Detail
- FR-SET-001: System shall provide a settings list/directory grouped by category/namespace.
- FR-SET-002: Settings directory shall support search by key/name/description.
- FR-SET-003: Settings directory shall support filtering by category, environment scope (if applicable), and changeability (read-only/editable).
- FR-SET-004: Setting detail/editor shall display key, description, current value (masked/redacted where required), type, last updated info, and validation constraints.
- FR-SET-005: Setting detail shall display change history/version history when available.
- FR-SET-006: System shall support viewing effective value and source (default vs override) where layered config is used.

## 3.2 Settings Editing and Change Control
- FR-SET-EDIT-001: Authorized admin shall update editable settings through validated forms/controls appropriate to value type (boolean, enum, number, string, JSON object, list).
- FR-SET-EDIT-002: Settings changes shall require confirmation before persistence.
- FR-SET-EDIT-003: Security-sensitive or high-impact settings changes shall require reason text and may require recent reauthentication.
- FR-SET-EDIT-004: System shall validate setting values against schema/type/range rules before saving.
- FR-SET-EDIT-005: System shall prevent editing of read-only/system-managed settings.
- FR-SET-EDIT-006: System shall support dry validation / preview of config changes before apply for complex settings (optional v1.1).
- FR-SET-EDIT-007: System shall support rollback to a previous valid version for eligible settings (minimum single-setting rollback; batch rollback optional).
- FR-SET-EDIT-008: System shall display propagation caveats (immediate vs delayed effect) for settings that are cached or require service refresh.

## 3.3 Authorization and RBAC (Settings Scope)
- FR-SET-RBAC-001: UI shall conditionally render settings categories/actions by admin role.
- FR-SET-RBAC-002: Backend shall enforce RBAC for settings reads (where sensitive) and all settings writes independent of UI.
- FR-SET-RBAC-003: Only authorized roles shall edit settings; category-scoped permissions may apply.
- FR-SET-RBAC-004: Sensitive values/fields shall be masked or hidden for roles without field-level access.
- FR-SET-RBAC-005: Unauthorized settings access/change attempts shall return explicit authorization errors and be logged.

## 3.4 Feature Flags and Operational Policies
- FR-SET-FF-001: System shall support feature-flag settings as boolean or rule-based values per configured schema.
- FR-SET-FF-002: Feature flags shall include metadata indicating rollout scope/owner/description where available.
- FR-SET-FF-003: System shall support enabling/disabling feature flags with audit logging and reason capture per policy.
- FR-SET-FF-004: Operational policy settings (e.g., moderation thresholds, rate limits, queue limits) shall enforce type/range validation.
- FR-SET-FF-005: System shall prevent invalid combinations of related settings when composite validation rules exist.

## 3.5 Change History and Audit Logging
- FR-SET-AUD-001: System shall generate immutable audit entries for settings changes, rollbacks, and sensitive settings reads/exports (if enabled).
- FR-SET-AUD-002: Audit entries shall include actor, setting key/category, before/after snapshot (redacted as needed), reason, and timestamp.
- FR-SET-AUD-003: System shall maintain settings change history/version records searchable by setting key and date range.
- FR-SET-AUD-004: Failed authorization attempts for settings operations shall be logged.

## 3.6 Operational Features (Optional / Configurable)
- FR-SET-OPS-001: System may support exporting non-sensitive settings snapshots (JSON) for review or backup.
- FR-SET-OPS-002: System may support importing validated settings changes through controlled admin workflow (not raw file overwrite).
- FR-SET-OPS-003: Import/export actions shall be restricted to authorized roles and audit logged.
- FR-SET-OPS-004: System may support scheduled configuration snapshots for rollback/disaster recovery support.

## 4. Data Requirements

### 4.1 Settings Data Model (Proposed / Extended)

#### `settings/{settingKey}`
- `key`: string (document ID or explicit field)
- `category`: string
- `label`: string
- `description`: string?
- `valueType`: enum (`boolean`, `number`, `string`, `enum`, `json`, `string_list`, `number_list`)
- `value`: boolean | number | string | map | array | null
- `allowedValues`: array? (for enum/list validation)
- `validation`: map? (e.g., `min`, `max`, regex, length limits)
- `editable`: boolean
- `sensitive`: boolean (indicates masking/restricted visibility)
- `secretRef`: string? (reference name/path if actual secret stored externally)
- `environmentScope`: enum (`global`, `dev`, `staging`, `prod`)? (if multi-env admin is supported)
- `version`: number
- `lastUpdatedAt`: timestamp
- `lastUpdatedBy`: string (uid)?
- `updatedByRole`: string?

#### `settings_history/{historyId}` or `settings/{settingKey}/history/{entryId}` (implementation choice)
- `settingKey`: string
- `category`: string
- `action`: string (`update`, `rollback`, `create`, `disable`)
- `before`: map?
- `after`: map?
- `reason`: string?
- `actorUid`: string
- `actorRole`: string
- `timestamp`: timestamp

#### `audit_logs/{logId}` (settings-management relevant fields)
- `actorUid`: string
- `actorRole`: string
- `action`: string
- `entityType`: string (`settings`)
- `entityId`: string (setting key or batch operation ID)
- `before`: map?
- `after`: map?
- `reason`: string?
- `timestamp`: timestamp

### 4.2 Data Integrity Rules
- DR-SET-001: `key`, `category`, `valueType`, and `editable` are required for all settings documents.
- DR-SET-002: `value` shall conform to `valueType` and configured validation rules.
- DR-SET-003: `version` shall increment on every successful settings update/rollback.
- DR-SET-004: Settings changes shall write `lastUpdatedAt` and `lastUpdatedBy`.
- DR-SET-005: `sensitive=true` settings shall not expose raw `value` to unauthorized roles.
- DR-SET-006: If `secretRef` is present, UI shall prefer displaying the reference metadata instead of secret contents.

### 4.3 Index Requirements (Initial, Settings Scope)
- IDX-SET-001: `settings` index on (`category`, `key`)
- IDX-SET-002: `settings` index on (`editable`, `category`, `key`)
- IDX-SET-003: `settings` index on (`sensitive`, `category`, `key`)
- IDX-SET-004: `settings_history` index on (`settingKey`, `timestamp desc`)
- IDX-SET-005: `settings_history` index on (`category`, `timestamp desc`)
- IDX-SET-006: `audit_logs` index on (`entityId`, `timestamp desc`) for `entityType=settings`

## 5. Validation Rules

- VAL-SET-001: Setting keys must be unique and follow configured naming pattern.
- VAL-SET-002: `value` must match `valueType`.
- VAL-SET-003: Enum settings must use one of `allowedValues`.
- VAL-SET-004: Numeric settings must satisfy configured min/max constraints where defined.
- VAL-SET-005: JSON settings must satisfy schema validation where schema is configured.
- VAL-SET-006: Reason text is required for high-risk or policy-defined settings changes.
- VAL-SET-007: System shall reject writes to read-only settings.
- VAL-SET-008: Composite validation rules shall reject inconsistent cross-setting combinations where configured.

## 6. Security Requirements

### 6.1 Authentication and Access
- SEC-SET-001: All settings pages and APIs require authenticated admin session.
- SEC-SET-002: RBAC checks must run server-side for all settings reads/writes that expose or change controlled values.
- SEC-SET-003: Authorization errors shall not reveal hidden values or sensitive role internals.
- SEC-SET-004: Security-sensitive settings changes may require recent reauthentication per auth/session policy.

### 6.2 Data Protection and Privacy
- SEC-SET-005: Secrets, credentials, tokens, and private keys shall not be stored in plaintext in general settings documents.
- SEC-SET-006: Sensitive setting values shall be masked/redacted in UI and logs unless role has explicit access.
- SEC-SET-007: Settings exports (if enabled) shall exclude sensitive values by default and be audit logged.
- SEC-SET-008: Audit/history payloads for settings shall redact sensitive fields.

### 6.3 Abuse and Operational Safety
- SEC-SET-009: Settings APIs shall be rate-limited per user/session.
- SEC-SET-010: Repeated unauthorized settings access/change attempts shall be logged and alertable.
- SEC-SET-011: High-impact settings changes shall require explicit confirmation UI with contextual warnings.
- SEC-SET-012: System shall support guardrails for settings known to degrade availability/security if misconfigured (e.g., threshold bounds).

## 7. Non-Functional Requirements

### 7.1 Performance
- NFR-SET-001: Settings list/detail loads shall meet acceptable admin UX thresholds for typical configuration volume.
- NFR-SET-002: Settings update validation and save operations should return promptly under normal load.

### 7.2 Reliability
- NFR-SET-003: Settings updates shall be idempotent where practical.
- NFR-SET-004: Failed settings updates shall not partially persist invalid state.
- NFR-SET-005: Settings viewer shall gracefully handle legacy settings without complete metadata/schema.

### 7.3 Accessibility and UX
- NFR-SET-006: Core settings browse/edit flows shall be keyboard-accessible.
- NFR-SET-007: Screens shall meet WCAG 2.1 AA contrast and semantic labeling requirements.
- NFR-SET-008: High-impact changes shall present warnings, summaries, and confirmation dialogs.

### 7.4 Observability
- NFR-SET-009: Structured logging shall be enabled for settings APIs and validation failures.
- NFR-SET-010: Metrics shall track settings changes, rollback events, authorization failures, validation failures, and error rates.

## 8. System Interfaces

### 8.1 UI Modules (Settings Scope)
- Settings directory/list
- Settings detail/editor
- Feature flag editor/panel
- Change confirmation dialog
- Settings history/version timeline
- Rollback dialog (optional in MVP if history exists)

### 8.2 Backend Interfaces (Recommended)
- `listSettings(filters)`
- `getSetting(key)`
- `updateSetting(key, value, reason?)`
- `validateSetting(key, value)` (optional dedicated endpoint)
- `rollbackSetting(key, version, reason)`
- `listSettingHistory(key, pagination)`
- `exportSettings(filters)` (optional)
- `importSettings(changes, reason)` (optional)

Normalized error codes (minimum):
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

## 9. Key Workflows (Use Cases)

### UC-SET-01 Update Feature Flag
1. Authorized admin opens Settings page and filters category `feature_flags`.
2. Opens a flag setting detail/editor.
3. Changes value (e.g., `false` -> `true`).
4. System validates the change and displays confirmation summary.
5. Admin confirms with reason if required.
6. System persists update, increments version, writes history and audit log.

Failure paths:
- insufficient permissions
- validation failure
- concurrent version conflict

### UC-SET-02 Update Moderation Policy Threshold
1. Authorized admin opens policy setting.
2. Edits numeric threshold.
3. System validates min/max and cross-setting constraints.
4. Admin confirms change with reason.
5. System saves and displays propagation notice (if delayed effect applies).

### UC-SET-03 Roll Back Misconfigured Setting
1. Authorized admin opens setting history.
2. Selects a previous version.
3. System previews target value and metadata.
4. Admin confirms rollback and provides reason.
5. System restores value as a new version and logs rollback action.

Failure paths:
- rollback permission denied
- target version missing
- rollback validation fails due to new constraints

## 10. Error Handling Requirements

- ERR-SET-001: All settings API errors shall map to user-friendly messages with machine-readable code.
- ERR-SET-002: Validation errors shall identify field-level or action-level issues.
- ERR-SET-003: Permission errors shall not reveal hidden setting values or sensitive role internals.
- ERR-SET-004: Conflict errors (e.g., version mismatch/stale editor data) shall instruct user to refresh and retry.
- ERR-SET-005: Legacy/unsupported setting metadata shall render non-blocking fallback UI when possible.

## 11. Test Requirements

### 11.1 Unit Testing
- TEST-U-SET-001: Setting type/range/enum/schema validators
- TEST-U-SET-002: Composite validation rules for related settings
- TEST-U-SET-003: Redaction/masking helpers for sensitive settings
- TEST-U-SET-004: Version increment and rollback logic

### 11.2 Integration Testing
- TEST-I-SET-001: Settings list/filter/search behavior
- TEST-I-SET-002: Setting update validation and persistence
- TEST-I-SET-003: Sensitive setting masking by role
- TEST-I-SET-004: Rollback writes history and audit logs
- TEST-I-SET-005: Unauthorized role cannot execute settings writes

### 11.3 End-to-End Testing
- TEST-E-SET-001: Super Admin updates a feature flag and change appears in settings detail/history
- TEST-E-SET-002: Invalid settings value is rejected with actionable error
- TEST-E-SET-003: Authorized admin rolls back a setting and audit/history entries are visible

### 11.4 Security Testing
- TEST-S-SET-001: Non-admin token cannot access settings routes/APIs
- TEST-S-SET-002: Unauthorized admin role cannot read hidden sensitive values or edit restricted categories
- TEST-S-SET-003: Direct client attempt to mutate protected settings fields is denied
- TEST-S-SET-004: Settings/audit history payloads redact secrets and sensitive values

## 12. Acceptance Criteria (MVP for Admin Settings)

- AC-SET-001: Authorized admins can browse and search settings by category/key.
- AC-SET-002: Authorized admins can update editable non-sensitive settings with validation, confirmation, and audit logging.
- AC-SET-003: Sensitive settings are masked/redacted and protected by backend RBAC.
- AC-SET-004: Settings changes create history/version records and immutable audit entries.
- AC-SET-005: Backend RBAC enforcement blocks unauthorized settings reads/writes.
- AC-SET-006: Invalid values and version conflicts are surfaced with user-friendly error messages.

## 13. Open Decisions

- OD-SET-001: Settings storage strategy
  - Option A: single `settings` collection with per-key documents
  - Option B: per-category documents/maps with nested keys
- OD-SET-002: Rollback support in MVP
  - Option A: include per-setting history + rollback in MVP
  - Option B: history only in MVP, rollback in v1.1
- OD-SET-003: Category-scoped edit permissions
  - Option A: `super_admin` only edits all settings in v1
  - Option B: allow scoped editors (e.g., moderation policies by `community_admin`)
- OD-SET-004: Secret handling in admin UI
  - Option A: secret references only (preferred)
  - Option B: limited secret value entry with secure backend proxy and strict masking
- OD-SET-005: Import/export in MVP
  - Option A: no import/export in MVP
  - Option B: export-only for non-sensitive settings in MVP
