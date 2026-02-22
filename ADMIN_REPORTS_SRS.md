# Software Requirements Specification (SRS)
## Admin Reports Management for Admin Website

Version: 1.0  
Date: 2026-02-22  
Status: Draft (Extracted + Extended)

## 1. Introduction

### 1.1 Purpose
This document defines software requirements for managing reports in the Admin Website for the AI-Powered Audiobook App, with focus on:
- report intake visibility in admin
- report triage, assignment, and resolution workflows
- audit logging and RBAC for report-handling actions

This document extracts and extends reports/moderation-related requirements from `ADMIN_WEBSITE_SRS.md` into a standalone SRS.

### 1.2 Scope
In scope:
- report queue/list, search, filter, and detail views
- report lifecycle/status management
- assignment and triage workflows
- linking reports to target entities (e.g., review/user/book) and resolution actions
- admin notes, reason capture, and audit logging for report actions
- RBAC enforcement for report-management operations

Out of scope:
- end-user report submission UI/UX in mobile app
- review/content moderation action implementation details beyond admin interfaces (covered in domain SRSs such as `ADMIN_REVIEWS_SRS.md`)
- consumer notification templates and delivery mechanics
- legal/compliance escalation workflows outside admin operations

### 1.3 Intended Audience
- Product owner and stakeholders
- Frontend and backend engineers
- QA engineers
- Security reviewers
- Operations/moderation team

### 1.4 Definitions and Acronyms
- Report: A user-submitted or system-generated moderation/safety issue record targeting an entity
- Target entity: The object being reported (e.g., review, user, book, author profile)
- Triage: Initial moderation assessment and routing/assignment of a report
- Resolution: Final report outcome and closing action
- RBAC: Role-Based Access Control
- PII: Personally Identifiable Information
- SLA: Service Level Agreement / target response time

### 1.5 References
- `ADMIN_WEBSITE_SRS.md`
- `USER_MANAGEMENT_SRS.md`
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
- Admin role checks are enforced server-side for report-management write operations.
- Report records may reference entities owned by other domains (reviews/users/books) and some linked entities may be deleted or unavailable.

### 2.3 Report Domain Model (v1)
Report target entity types (minimum):
- `review`
- `user`
- `book`
- `author_profile` (optional if author profile is distinct)

Report lifecycle statuses (minimum):
- `open`
- `in_review`
- `resolved_action_taken`
- `resolved_no_action`
- `dismissed`

Moderation roles (aligned with admin role model):
- `super_admin`
- `community_admin`
- `content_admin`
- `analyst` (read-only/report analytics depending on policy)

Notes:
- v1 supports a single assignee (`assignedToUid`) per report.
- Report resolution may trigger separate domain actions (e.g., hide review, suspend user) via linked workflows.

## 3. Functional Requirements

## 3.1 Core Report Queue and Triage
- FR-REP-001: System shall provide a paginated report list/queue for admins.
- FR-REP-002: Report list shall support search by report ID, target entity ID, reporter ID/email (where visible), and assignee.
- FR-REP-003: Report list shall support filters by status, target entity type, severity/priority (if configured), assignee, and date range.
- FR-REP-004: Report list shall support sorting by created timestamp, updated timestamp, and priority/severity (if configured).
- FR-REP-005: Report detail page shall display report metadata, target entity references, reason/category, description, and timestamps.
- FR-REP-006: Report detail page shall display target entity snapshot/details when available and permitted.
- FR-REP-007: Authorized admin shall assign or reassign a report to an admin user with optional note/reason.
- FR-REP-008: Authorized admin shall transition report status through valid lifecycle states.
- FR-REP-009: Status/assignment changes shall require reason or note capture per policy and be audit logged.
- FR-REP-010: System shall support internal moderation notes/comments on a report (if enabled).

## 3.2 Authorization and RBAC (Report Scope)
- FR-REP-RBAC-001: UI shall conditionally render report actions by admin role.
- FR-REP-RBAC-002: Backend shall enforce RBAC for all report-management writes independent of UI.
- FR-REP-RBAC-003: Only authorized moderation roles shall assign/reassign reports.
- FR-REP-RBAC-004: Only authorized moderation roles shall resolve or dismiss reports.
- FR-REP-RBAC-005: PII in report details shall be role-scoped and minimally exposed.
- FR-REP-RBAC-006: Unauthorized report-management attempts shall return explicit authorization errors and be logged.

## 3.3 Report Detail and Evidence Handling
- FR-REP-DET-001: Report detail shall show immutable identifiers (`reportId`, target `entityId`) and key timestamps (`createdAt`, `updatedAt`).
- FR-REP-DET-002: System shall retain and display report reason/category and free-text description submitted by reporter (subject to moderation redaction policy).
- FR-REP-DET-003: System shall display current assignee and assignment timestamp when assigned.
- FR-REP-DET-004: System shall display status history and resolution history when available.
- FR-REP-DET-005: If target content is deleted/unavailable, system shall still render report metadata and indicate target state as unavailable.
- FR-REP-DET-006: If evidence snapshoting is enabled, system shall display stored snapshot metadata (and content preview where allowed).

## 3.4 Resolution Actions and Outcomes
- FR-REP-RES-001: Authorized admin shall resolve a report with one of configured outcomes (`action_taken`, `no_action`, `dismissed` mapping to status values).
- FR-REP-RES-002: Resolution actions shall require reason text.
- FR-REP-RES-003: Resolution record shall capture actor, timestamp, outcome, and notes.
- FR-REP-RES-004: System shall support linking a report to downstream moderation action records (e.g., review hidden, user suspended) when applicable.
- FR-REP-RES-005: System shall prevent invalid status transitions (e.g., resolve already-dismissed report without reopen policy).
- FR-REP-RES-006: System may support reopening resolved/dismissed reports subject to permissions and audit logging.

## 3.5 Operational Features (Optional / Configurable)
- FR-REP-OPS-001: System may support bulk assignment of selected reports to an admin.
- FR-REP-OPS-002: System may support bulk status updates for reports with confirmation and reason.
- FR-REP-OPS-003: System may support CSV export of filtered report lists for operational reporting.
- FR-REP-OPS-004: Bulk actions and exports shall be restricted to authorized roles and audit logged.

## 3.6 Audit Logging for Report Management
- FR-REP-AUD-001: System shall generate immutable audit entries for privileged report-management writes.
- FR-REP-AUD-002: Audit logs shall include actor, action, target report, before/after snapshot (where applicable), reason/note, and timestamp.
- FR-REP-AUD-003: Failed authorization attempts for report-management operations shall be logged.
- FR-REP-AUD-004: Report-detail views may be audit logged per policy for sensitive cases.

## 4. Data Requirements

### 4.1 Report Data Model (Proposed / Extended)

#### `reports/{reportId}`
- `reportId`: string (document ID)
- `targetEntityType`: enum (`review`, `user`, `book`, `author_profile`)
- `targetEntityId`: string
- `reporterUid`: string?
- `reporterEmail`: string? (role-scoped visibility)
- `category`: string (configured report reason code)
- `description`: string?
- `status`: enum (`open`, `in_review`, `resolved_action_taken`, `resolved_no_action`, `dismissed`)
- `severity`: enum (`low`, `medium`, `high`, `critical`)? (optional)
- `priority`: enum (`low`, `normal`, `high`)? (optional)
- `assignedToUid`: string?
- `assignedAt`: timestamp?
- `resolutionOutcome`: enum (`action_taken`, `no_action`, `dismissed`)? 
- `resolutionNote`: string?
- `resolvedBy`: string?
- `resolvedAt`: timestamp?
- `targetSnapshot`: map? (optional, minimized snapshot for deleted/mutated targets)
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `updatedBy`: string (uid)?

#### `report_history/{historyId}` or `reports/{reportId}/history/{entryId}` (implementation choice)
- `reportId`: string
- `action`: string (`assign`, `status_change`, `resolve`, `reopen`, `note_add`)
- `actorUid`: string
- `before`: map?
- `after`: map?
- `note`: string?
- `timestamp`: timestamp

#### `audit_logs/{logId}` (report-management relevant fields)
- `actorUid`: string
- `actorRole`: string
- `action`: string
- `entityType`: string (`report`)
- `entityId`: string (`reportId`)
- `before`: map?
- `after`: map?
- `reason`: string?
- `timestamp`: timestamp
- `ipHash`: string?

### 4.2 Data Integrity Rules
- DR-REP-001: `targetEntityType` and `targetEntityId` are required for all reports.
- DR-REP-002: `status` must be one of configured lifecycle states.
- DR-REP-003: `resolvedAt` and `resolvedBy` shall be present when status is a resolved/dismissed state.
- DR-REP-004: `assignedAt` shall be written when `assignedToUid` is set/changed.
- DR-REP-005: Report state transitions shall write `updatedAt` and `updatedBy`.
- DR-REP-006: Resolution transitions shall require `resolutionOutcome` and reason/note per policy.
- DR-REP-007: If `targetSnapshot` is stored, it shall exclude restricted PII fields per policy.

### 4.3 Index Requirements (Initial, Report Scope)
- IDX-REP-001: `reports` index on (`status`, `createdAt desc`)
- IDX-REP-002: `reports` index on (`targetEntityType`, `status`, `createdAt desc`)
- IDX-REP-003: `reports` index on (`assignedToUid`, `status`, `updatedAt desc`)
- IDX-REP-004: `reports` index on (`targetEntityId`, `createdAt desc`)
- IDX-REP-005: `reports` index on (`severity`, `status`, `createdAt desc`) if severity enabled
- IDX-REP-006: `audit_logs` index on (`entityId`, `timestamp desc`) for `entityType=report`

## 5. Validation Rules

- VAL-REP-001: `targetEntityType` must be one of supported entity types.
- VAL-REP-002: `status` must be a valid report lifecycle value.
- VAL-REP-003: Assignment target (`assignedToUid`) must reference an active admin account with report-management permission.
- VAL-REP-004: Resolution actions require non-empty reason/note text.
- VAL-REP-005: System shall reject invalid status transitions per configured policy.
- VAL-REP-006: Bulk actions (if enabled) shall validate each target report and produce per-item results or fail atomically per API contract.

## 6. Security Requirements

### 6.1 Authentication and Access
- SEC-REP-001: All report-management pages and APIs require authenticated admin session.
- SEC-REP-002: RBAC checks must run server-side for all report-management write actions.
- SEC-REP-003: Authorization errors shall not reveal sensitive role internals.
- SEC-REP-004: Report detail access to sensitive reporter data shall be role-scoped.

### 6.2 Data Protection and Privacy
- SEC-REP-005: Reporter and target PII fields displayed shall be minimal and role-scoped.
- SEC-REP-006: Report exports (if enabled) shall be restricted to authorized roles and logged.
- SEC-REP-007: Audit logs and report history shall be append-only to system writers; no client updates/deletes.
- SEC-REP-008: Stored evidence snapshots shall exclude secrets and non-essential sensitive data.

### 6.3 Abuse and Operational Safety
- SEC-REP-009: Report-management APIs shall be rate-limited per user/session.
- SEC-REP-010: Repeated authorization failures for report-management operations shall be logged and alertable.
- SEC-REP-011: Destructive or high-impact moderation actions linked from reports shall require explicit confirmation and reason entry.

## 7. Non-Functional Requirements

### 7.1 Performance
- NFR-REP-001: Report queue shall support server pagination with page size 25/50/100.
- NFR-REP-002: Filter/sort updates should return results within acceptable admin UX thresholds for typical dataset sizes.

### 7.2 Reliability
- NFR-REP-003: Assignment and status update operations shall be idempotent where practical.
- NFR-REP-004: Partial target-entity lookup failure shall not block report detail rendering.

### 7.3 Accessibility and UX
- NFR-REP-005: Core report triage and resolution flows shall be keyboard-accessible.
- NFR-REP-006: Screens shall meet WCAG 2.1 AA contrast and semantic labeling requirements.
- NFR-REP-007: Restrictive/destructive actions shall require confirmation dialogs with clear context.

### 7.4 Observability
- NFR-REP-008: Structured logging shall be enabled for report-management APIs and critical UI errors.
- NFR-REP-009: Metrics shall track queue size, aging, action counts, authorization failures, and error rates.
- NFR-REP-010: Metrics may track SLA compliance (time-to-first-triage, time-to-resolution).

## 8. System Interfaces

### 8.1 UI Modules (Report Scope)
- Report queue/list
- Report detail
- Assignment and status change controls
- Resolution dialog (outcome + reason)
- Report history/timeline panel
- Audit log viewer (report action filters)

### 8.2 Backend Interfaces (Recommended)
- `listReports(filters, pagination, sort)`
- `getReportDetail(reportId)`
- `assignReport(reportId, assigneeUid, reason)`
- `updateReportStatus(reportId, status, reason)`
- `resolveReport(reportId, outcome, reason)`
- `reopenReport(reportId, reason)` (optional)
- `addReportNote(reportId, note)` (optional)
- `exportReports(filters)` (optional)

Normalized error codes (minimum):
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

## 9. Key Workflows (Use Cases)

### UC-REP-01 Triage and Assign Report
1. Authorized admin opens report queue.
2. Filters reports by `status=open`.
3. Opens report detail and reviews target metadata/snapshot.
4. Assigns report to self or another moderator with note.
5. System updates assignment fields and writes audit/history records.

Failure paths:
- insufficient permissions
- assignee is invalid/inactive
- report was updated concurrently

### UC-REP-02 Resolve Report with Action Taken
1. Assigned moderator opens report detail.
2. Reviews evidence and linked target entity.
3. Executes or confirms linked moderation action (e.g., hide review) through appropriate flow.
4. Selects `Resolve` with outcome `action_taken` and enters reason.
5. System stores resolution details and writes audit/history records.

Failure paths:
- linked moderation action fails
- invalid transition (already resolved)
- missing required reason

### UC-REP-03 Dismiss Report (No Violation)
1. Moderator opens report detail.
2. Selects `Dismiss` (or resolve with `no_action`) and enters reason.
3. System updates status to configured dismissal/no-action state and logs the event.

### UC-REP-04 Reopen Resolved Report (Optional)
1. Authorized admin opens a resolved report.
2. Selects `Reopen` and enters reason.
3. System validates reopen policy and transitions status to `open` or `in_review`.
4. Audit/history records are written.

## 10. Error Handling Requirements

- ERR-REP-001: All report-management API errors shall map to user-friendly messages with machine-readable code.
- ERR-REP-002: Validation errors shall identify field-level or action-level issues.
- ERR-REP-003: Permission errors shall not leak sensitive role internals.
- ERR-REP-004: Conflict errors (e.g., stale report state) shall instruct user to refresh and retry.
- ERR-REP-005: Missing/unavailable target entity in report detail shall render a non-blocking warning state.

## 11. Test Requirements

### 11.1 Unit Testing
- TEST-U-REP-001: Report status transition validators
- TEST-U-REP-002: Filter mapping and query builder behavior
- TEST-U-REP-003: Assignment validation (assignee eligibility)
- TEST-U-REP-004: Resolution payload validation and reason requirements

### 11.2 Integration Testing
- TEST-I-REP-001: Report list search/filter/sort/pagination
- TEST-I-REP-002: Report detail loads metadata plus target snapshot/fallback state
- TEST-I-REP-003: Assignment updates report and writes audit/history
- TEST-I-REP-004: Resolve/dismiss actions require reason and write audit records
- TEST-I-REP-005: Unauthorized role cannot execute report-management writes

### 11.3 End-to-End Testing
- TEST-E-REP-001: Moderator triages and assigns a report from open queue
- TEST-E-REP-002: Moderator resolves a report with action taken and sees updated status
- TEST-E-REP-003: Moderator dismisses a report with no action and audit entry is visible

### 11.4 Security Testing
- TEST-S-REP-001: Non-admin token cannot access report-management routes/APIs
- TEST-S-REP-002: Unauthorized admin role cannot assign/resolve reports
- TEST-S-REP-003: Direct client attempt to mutate protected report fields is denied
- TEST-S-REP-004: Reporter PII exposure is restricted by role

## 12. Acceptance Criteria (MVP for Admin Reports)

- AC-REP-001: Admin UI supports searching, filtering, sorting, and viewing report details.
- AC-REP-002: Authorized admins can assign/reassign reports with reason/note capture and audit logging.
- AC-REP-003: Authorized admins can resolve/dismiss reports with required reason capture and audit logging.
- AC-REP-004: Backend RBAC enforcement blocks unauthorized report-management writes.
- AC-REP-005: Report-management actions produce immutable audit entries and report history entries.
- AC-REP-006: Report detail remains usable even when linked target entity is unavailable.

## 13. Open Decisions

- OD-REP-001: Report status model granularity
  - Option A: minimal statuses (`open`, `in_review`, `resolved_*`, `dismissed`)
  - Option B: expanded workflow statuses (e.g., `escalated`, `waiting_external`, `duplicate`)
- OD-REP-002: Report history storage model
  - Option A: subcollection under each report
  - Option B: centralized `report_history` collection
- OD-REP-003: Evidence snapshot strategy
  - Option A: no snapshot (live target lookup only)
  - Option B: lightweight snapshot on report creation
- OD-REP-004: Assignment policy
  - Option A: single assignee only (v1)
  - Option B: assignee + watcher/collaborator list
- OD-REP-005: Analyst permissions
  - Option A: read-only queue/detail access
  - Option B: analytics-only aggregate views, no report detail access
