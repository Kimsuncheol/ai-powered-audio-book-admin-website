# Software Requirements Specification (SRS)
## Admin Audit Logs for Admin Website

Version: 1.0  
Date: 2026-02-22  
Status: Draft (Extracted + Extended)

## 1. Introduction

### 1.1 Purpose
This document defines software requirements for audit logging and audit log viewing in the Admin Website for the AI-Powered Audiobook App, with focus on:
- immutable admin action logging
- audit log search/filter/detail views
- security, privacy, and RBAC for audit log access
- observability and operational integrity of audit records

This document extracts and extends audit logging requirements from `ADMIN_WEBSITE_SRS.md` into a standalone SRS.

### 1.2 Scope
In scope:
- audit event generation requirements for privileged admin actions
- audit log schema and integrity requirements
- audit log viewer/list/search/filter/detail UI in Admin Website
- RBAC and PII minimization for audit log access
- retention, export (optional), and operational monitoring requirements

Out of scope:
- business analytics/event tracking for product usage (non-audit telemetry)
- SIEM implementation details or vendor-specific integrations
- end-user-visible activity history
- low-level cloud infrastructure audit products configuration (unless explicitly integrated into app UI)

### 1.3 Intended Audience
- Product owner and stakeholders
- Frontend and backend engineers
- QA engineers
- Security reviewers
- Operations/compliance team

### 1.4 Definitions and Acronyms
- Audit log: Immutable record of a security-relevant or privileged action
- Audit event: A single logged action entry
- Actor: Authenticated principal performing the action (admin/system)
- Entity: Target object of the action (user, review, report, book, settings, etc.)
- RBAC: Role-Based Access Control
- PII: Personally Identifiable Information
- WORM: Write Once Read Many (append-only behavior target)

### 1.5 References
- `ADMIN_WEBSITE_SRS.md`
- `USER_MANAGEMENT_SRS.md`
- `ADMIN_REPORTS_SRS.md`
- `ADMIN_REVIEWS_SRS.md`
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
- Privileged admin writes are executed through server-side trusted code paths (e.g., Cloud Functions) or equivalent controlled backend paths.
- Some existing modules may currently write simplified audit entries and require schema migration/dual-write for expanded audit fields.
- Audit logging failures should not always block user actions, but critical actions may require configurable fail-open/fail-closed policy.

### 2.3 Audit Scope (v1)
Minimum auditable actions:
- authentication events (admin sign-in/sign-out, failed admin auth)
- privileged create/update/delete/publish/unpublish actions
- role/status changes for users/admins/authors/readers
- report triage/resolution actions
- review moderation actions
- settings and security-sensitive configuration changes

Minimum actor types:
- `admin_user`
- `system`

Notes:
- v1 focuses on application-level audit logs managed by the admin platform.
- Infrastructure/provider logs may be linked externally but are out of scope for direct ingestion unless approved.

## 3. Functional Requirements

## 3.1 Audit Event Generation
- FR-AUD-001: System shall generate audit events for privileged admin write actions.
- FR-AUD-002: System shall generate audit events for admin authentication events (sign-in, sign-out, failed admin authorization attempts).
- FR-AUD-003: Audit events shall include actor, action, entity type, entity ID (when applicable), timestamp, and context metadata.
- FR-AUD-004: For state-changing actions, audit events shall capture before/after snapshots or a comparable diff representation where practical.
- FR-AUD-005: Security-sensitive actions shall require reason/note capture and include that reason in the audit event.
- FR-AUD-006: Failed authorization attempts for privileged operations shall be audit logged.
- FR-AUD-007: Audit event writes shall use server-generated timestamps for ordering consistency.
- FR-AUD-008: System shall support audit logging for system-initiated actions (scheduled jobs, automations) with actor type `system`.

## 3.2 Audit Log Viewer (Admin UI)
- FR-AUD-UI-001: System shall provide a paginated audit log list view in the Admin Website.
- FR-AUD-UI-002: Audit log list shall support search by actor UID/email, entity ID, and action (exact or prefix depending backend capability).
- FR-AUD-UI-003: Audit log list shall support filters by actor role, action, entity type, date range, and success/failure status (if tracked).
- FR-AUD-UI-004: Audit log list shall support sorting by timestamp (default desc) and other indexed fields where supported.
- FR-AUD-UI-005: Audit log detail view shall display full event metadata, before/after payloads (redacted as needed), and timestamps.
- FR-AUD-UI-006: Audit log viewer shall support deep-linking to related entity/admin pages when available and permitted.
- FR-AUD-UI-007: Audit log viewer shall clearly label redacted or unavailable fields.

## 3.3 Authorization and RBAC (Audit Scope)
- FR-AUD-RBAC-001: UI shall conditionally render audit-log access based on admin role permissions.
- FR-AUD-RBAC-002: Backend shall enforce RBAC for audit log reads and exports independent of UI.
- FR-AUD-RBAC-003: Only authorized roles (minimum `super_admin`; optionally `analyst`) shall access audit log viewer.
- FR-AUD-RBAC-004: Access to sensitive audit payload fields shall be role-scoped and minimally exposed.
- FR-AUD-RBAC-005: Unauthorized audit log access attempts shall return explicit authorization errors and be logged.

## 3.4 Immutability and Integrity
- FR-AUD-INT-001: Audit log entries shall be append-only to trusted system writers.
- FR-AUD-INT-002: Audit log entries shall not be editable or deletable from the admin UI.
- FR-AUD-INT-003: System shall preserve event ordering by timestamp and unique identifier semantics within backend constraints.
- FR-AUD-INT-004: Audit logging libraries/services shall standardize normalized action/entity naming across modules.
- FR-AUD-INT-005: System shall support schema versioning or compatibility strategy for audit entries as fields evolve.

## 3.5 Operational Features (Optional / Configurable)
- FR-AUD-OPS-001: System may support export of filtered audit logs (CSV/JSON) for compliance/operations reporting.
- FR-AUD-OPS-002: Exports shall be restricted to authorized roles, require explicit confirmation, and be audit logged.
- FR-AUD-OPS-003: System may support saved filters/presets for common investigations.
- FR-AUD-OPS-004: System may support retention/archival workflows with policy-based storage tiering.

## 4. Data Requirements

### 4.1 Audit Log Data Model (Proposed / Extended)

#### `audit_logs/{logId}`
- `logId`: string (document ID)
- `schemaVersion`: number
- `timestamp`: timestamp (server-generated)
- `actorType`: enum (`admin_user`, `system`)
- `actorUid`: string?
- `actorEmail`: string?
- `actorRole`: string?
- `action`: string (normalized action code)
- `entityType`: string (e.g., `user`, `review`, `report`, `book`, `auth`, `settings`)
- `entityId`: string?
- `result`: enum (`success`, `failure`)?
- `reason`: string?
- `before`: map? (redacted/minimized snapshot)
- `after`: map? (redacted/minimized snapshot)
- `diff`: map? (optional alternative/complement to before/after)
- `metadata`: map? (request context and action-specific fields)
- `requestId`: string? (traceability/correlation)
- `sessionId`: string? (admin session correlation, if available)
- `ipHash`: string? (hashed client IP per privacy policy)
- `userAgent`: string? (optional, minimized/truncated per policy)

Examples of `metadata` (non-exhaustive):
- `targetFieldsChanged`: string[]
- `authFailureReason`: string
- `linkedReportIds`: string[]
- `sourceModule`: string (`user_management`, `reviews`, `reports`, etc.)

### 4.2 Data Integrity Rules
- DR-AUD-001: `timestamp` shall be written using server time.
- DR-AUD-002: `action` and `entityType` are required for all audit events.
- DR-AUD-003: `actorType=admin_user` should include `actorUid`; `actorRole` is required when available.
- DR-AUD-004: `result=failure` events shall include failure context in `reason` or `metadata`.
- DR-AUD-005: `before`/`after` payloads shall exclude restricted secrets and unnecessary PII.
- DR-AUD-006: `schemaVersion` shall be set for newly written audit entries.
- DR-AUD-007: Audit events shall be immutable after creation (except system-managed backfill/migration tooling under strict controls, if ever allowed).

### 4.3 Index Requirements (Initial, Audit Scope)
- IDX-AUD-001: `audit_logs` index on (`timestamp desc`)
- IDX-AUD-002: `audit_logs` index on (`entityType`, `timestamp desc`)
- IDX-AUD-003: `audit_logs` index on (`entityId`, `timestamp desc`)
- IDX-AUD-004: `audit_logs` index on (`actorUid`, `timestamp desc`)
- IDX-AUD-005: `audit_logs` index on (`actorRole`, `timestamp desc`)
- IDX-AUD-006: `audit_logs` index on (`action`, `timestamp desc`)
- IDX-AUD-007: `audit_logs` index on (`result`, `timestamp desc`) if result tracking is enabled

## 5. Validation Rules

- VAL-AUD-001: `action` shall be a normalized non-empty code from configured/recognized action set.
- VAL-AUD-002: `entityType` shall be a normalized non-empty code from configured/recognized entity set.
- VAL-AUD-003: `actorType` must be valid (`admin_user` or `system` in v1).
- VAL-AUD-004: Audit payloads (`before`, `after`, `metadata`) shall be size-limited to configured thresholds.
- VAL-AUD-005: Restricted fields (e.g., secrets, raw credentials, tokens) shall be rejected or redacted before persistence.
- VAL-AUD-006: Export filters (if enabled) shall validate date range bounds and authorized field scopes.

## 6. Security Requirements

### 6.1 Authentication and Access
- SEC-AUD-001: All audit-log pages and APIs require authenticated admin session.
- SEC-AUD-002: RBAC checks must run server-side for audit log reads/exports.
- SEC-AUD-003: Authorization errors shall not reveal sensitive role internals or hidden audit payload fields.
- SEC-AUD-004: Access to detailed payload fields shall be least-privilege and role-scoped.

### 6.2 Data Protection and Privacy
- SEC-AUD-005: Audit logs shall not store raw passwords, access tokens, refresh tokens, secret keys, or other credentials.
- SEC-AUD-006: PII in audit metadata and before/after snapshots shall be minimized and redacted per policy.
- SEC-AUD-007: `ipHash` (if stored) shall be hashed using approved method; raw client IP shall not be persisted unless explicitly approved.
- SEC-AUD-008: Audit log exports (if enabled) shall be restricted, logged, and watermarked or otherwise attributable where feasible.

### 6.3 Abuse and Operational Safety
- SEC-AUD-009: Audit log query/export APIs shall be rate-limited per user/session.
- SEC-AUD-010: Repeated unauthorized audit-log access attempts shall be logged and alertable.
- SEC-AUD-011: Audit logging pipeline failures shall be monitored and alertable.
- SEC-AUD-012: Security-sensitive admin actions may define fail-open vs fail-closed audit-write behavior explicitly by action category.

## 7. Non-Functional Requirements

### 7.1 Performance
- NFR-AUD-001: Audit log list view shall support server pagination with page size 25/50/100.
- NFR-AUD-002: Common filters and searches should return results within acceptable admin UX thresholds for typical dataset sizes.
- NFR-AUD-003: Audit event writing shall add minimal overhead to primary admin operations within acceptable service latency budgets.

### 7.2 Reliability
- NFR-AUD-004: Audit event writes shall be best-effort or guaranteed per configured policy, documented by action type.
- NFR-AUD-005: Partial enrichment failures (e.g., missing actor email) shall not block core audit event persistence if required minimum fields are present.
- NFR-AUD-006: Audit log viewer shall gracefully handle legacy entries with older schemas.

### 7.3 Accessibility and UX
- NFR-AUD-007: Audit log list/detail flows shall be keyboard-accessible.
- NFR-AUD-008: Screens shall meet WCAG 2.1 AA contrast and semantic labeling requirements.
- NFR-AUD-009: Large JSON payloads in detail view shall remain readable with collapsible sections and redaction labels (UI requirement).

### 7.4 Observability
- NFR-AUD-010: Structured logging shall be enabled for audit log read APIs and pipeline errors.
- NFR-AUD-011: Metrics shall track audit event write volume, failure rate, ingestion latency, query latency, and export counts.
- NFR-AUD-012: Alerts shall be configurable for audit write failures above threshold and suspicious access patterns.

## 8. System Interfaces

### 8.1 UI Modules (Audit Scope)
- Audit log list/viewer
- Audit log filter/search toolbar
- Audit log detail panel/page
- Payload viewer (`before`/`after`/`metadata`) with redaction indicators
- Export dialog (optional)

### 8.2 Backend Interfaces (Recommended)
- `writeAuditEvent(event)` (internal trusted use only)
- `listAuditLogs(filters, pagination, sort)`
- `getAuditLogDetail(logId)`
- `exportAuditLogs(filters, format)` (optional)
- `redactAuditPayload(payload)` (shared utility/internal)

Normalized error codes (minimum):
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `INTERNAL_ERROR`

## 9. Key Workflows (Use Cases)

### UC-AUD-01 View Recent User-Management Actions
1. Authorized admin opens Audit Logs page.
2. Filters by `entityType=user` and recent date range.
3. Reviews list entries and opens a specific event.
4. System displays event detail with before/after snapshot and redaction labels as applicable.

Failure paths:
- insufficient permissions
- invalid filter range
- log entry exists but payload partially unavailable/legacy format

### UC-AUD-02 Investigate Unauthorized Attempt
1. Super Admin filters logs by `action` and `result=failure` (if tracked).
2. Searches by target entity ID or actor UID.
3. Opens event details to inspect reason/metadata.
4. Uses deep links to navigate to related user/report/review entities where authorized.

### UC-AUD-03 Export Audit Logs for Compliance (Optional)
1. Authorized admin opens export dialog from Audit Logs page.
2. Selects filters/date range and output format.
3. System validates permissions and request constraints.
4. System generates export and records export action in audit logs.

Failure paths:
- export permission denied
- range too large
- export generation error

## 10. Error Handling Requirements

- ERR-AUD-001: All audit-log API errors shall map to user-friendly messages with machine-readable code.
- ERR-AUD-002: Validation errors shall identify filter/action-level issues (e.g., invalid date range).
- ERR-AUD-003: Permission errors shall not leak sensitive role internals or hidden payload fields.
- ERR-AUD-004: Missing audit log detail entry shall return `NOT_FOUND`.
- ERR-AUD-005: Legacy/unparseable payload sections shall render a non-blocking fallback in the UI.

## 11. Test Requirements

### 11.1 Unit Testing
- TEST-U-AUD-001: Audit payload redaction rules
- TEST-U-AUD-002: Audit event validation and normalized action/entity mapping
- TEST-U-AUD-003: Filter/query builder mapping for audit log viewer
- TEST-U-AUD-004: Schema compatibility parsing for legacy entries

### 11.2 Integration Testing
- TEST-I-AUD-001: Privileged actions write audit events with required fields
- TEST-I-AUD-002: Audit log list search/filter/sort/pagination
- TEST-I-AUD-003: Audit log detail loads and redacts restricted fields
- TEST-I-AUD-004: Unauthorized role cannot access audit log APIs
- TEST-I-AUD-005: Export action (if enabled) is permission-gated and audit logged

### 11.3 End-to-End Testing
- TEST-E-AUD-001: Admin performs a user/review/report action and corresponding audit entry appears in viewer
- TEST-E-AUD-002: Authorized admin filters audit logs and opens detailed payload view
- TEST-E-AUD-003: Unauthorized admin attempts to access audit logs and is denied

### 11.4 Security Testing
- TEST-S-AUD-001: Direct client attempts to mutate/delete audit log documents are denied
- TEST-S-AUD-002: Audit payloads do not persist raw credentials/secrets
- TEST-S-AUD-003: RBAC restricts audit viewer/detail/export access by role
- TEST-S-AUD-004: Repeated unauthorized audit access attempts are logged and alertable

## 12. Acceptance Criteria (MVP for Admin Audit Logs)

- AC-AUD-001: Privileged admin actions across key modules produce immutable audit entries with actor, action, entity, timestamp, and context.
- AC-AUD-002: Admin UI supports searching, filtering, and viewing audit log details for authorized roles.
- AC-AUD-003: Audit log payloads are redacted/minimized per security policy and do not expose secrets.
- AC-AUD-004: Backend RBAC enforcement blocks unauthorized audit log reads/exports.
- AC-AUD-005: Failed authorization attempts for privileged operations are audit logged.
- AC-AUD-006: Audit log viewer handles legacy or partial entries without blocking core visibility.

## 13. Open Decisions

- OD-AUD-001: Audit write policy by action category
  - Option A: fail-open for all actions if audit write fails
  - Option B: fail-open for most actions, fail-closed for security-critical actions
- OD-AUD-002: Payload representation strategy
  - Option A: store `before` + `after`
  - Option B: store normalized `diff` + minimal snapshots
  - Option C: store all three (size permitting)
- OD-AUD-003: Audit viewer access roles
  - Option A: `super_admin` only
  - Option B: `super_admin` + `analyst` (with redacted detail)
- OD-AUD-004: Retention and archival policy
  - Option A: retain in primary Firestore for fixed period then archive
  - Option B: indefinite retention in primary store (cost/performance permitting)
- OD-AUD-005: Export support in MVP
  - Option A: no export in MVP
  - Option B: CSV/JSON export for authorized roles with strict limits
