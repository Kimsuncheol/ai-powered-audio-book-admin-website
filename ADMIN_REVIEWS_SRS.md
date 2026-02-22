# Software Requirements Specification (SRS)
## Admin Reviews Management for Admin Website

Version: 1.0  
Date: 2026-02-22  
Status: Draft (Extracted + Extended)

## 1. Introduction

### 1.1 Purpose
This document defines software requirements for managing reader reviews in the Admin Website for the AI-Powered Audiobook App, with focus on:
- review directory/list and detail visibility
- moderation status and enforcement actions
- integration points with reports and audit logging
- RBAC and security controls for review-management operations

This document extracts and extends review moderation/operations requirements from `ADMIN_WEBSITE_SRS.md` into a standalone SRS.

### 1.2 Scope
In scope:
- review list, search, filter, sort, and detail views
- review moderation statuses and actions (hide/remove/restore, etc.)
- flagged/reported review handling from review-management perspective
- audit logging for review-management actions
- RBAC enforcement for review-management read/write operations

Out of scope:
- consumer review submission/editing UI in mobile app
- recommendation/ranking algorithms using reviews
- report queue management UI/workflows (covered in `ADMIN_REPORTS_SRS.md`)
- book rating aggregation algorithm details (except admin-visible effects/consistency requirements)

### 1.3 Intended Audience
- Product owner and stakeholders
- Frontend and backend engineers
- QA engineers
- Security reviewers
- Operations/community moderation team

### 1.4 Definitions and Acronyms
- Review: User-generated rating and text feedback on a book/audiobook
- Moderation: Admin actions to evaluate and enforce policy on reviews
- Flagged review: Review with one or more reports or policy indicators
- Soft delete: Review hidden from consumers but retained for audit/ops purposes
- RBAC: Role-Based Access Control
- PII: Personally Identifiable Information

### 1.5 References
- `ADMIN_WEBSITE_SRS.md`
- `USER_MANAGEMENT_SRS.md`
- `ADMIN_REPORTS_SRS.md`
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
- Review writes from consumers already exist or will be implemented in the mobile/backend stack.
- Admin review-management write actions are enforced server-side.
- Reviews may be referenced by report records and other engagement aggregates.

### 2.3 Review Moderation Model (v1)
Review visibility/moderation statuses (minimum):
- `published`
- `hidden`
- `removed`

Optional extended statuses (deferred unless approved):
- `pending_moderation`
- `under_review`

Admin roles relevant to review management:
- `super_admin`
- `community_admin`
- `content_admin` (policy-dependent)
- `analyst` (read-only/reporting only)

Notes:
- v1 assumes one review per user per book unless product policy specifies otherwise.
- Admin actions shall not edit original review content text except via redaction tooling if separately approved.

## 3. Functional Requirements

## 3.1 Core Review Directory and Detail
- FR-REV-001: System shall provide a paginated review list for admins.
- FR-REV-002: Review list shall support search by review ID, reviewer email/display name, book ID/title, and text keywords (if indexing/search backend supports it).
- FR-REV-003: Review list shall support filters by moderation status, rating, date range, report/flag status, and book.
- FR-REV-004: Review list shall support sorting by created timestamp, updated timestamp, rating, and report count.
- FR-REV-005: Review detail page shall display review content, rating, reviewer reference, book reference, and timestamps.
- FR-REV-006: Review detail page shall display moderation status, moderation reason, and moderation history when available.
- FR-REV-007: Review detail page shall display report summary/count and linked reports when applicable and permitted.

## 3.2 Review Moderation Actions
- FR-REV-MOD-001: Authorized admin shall update review moderation status (minimum actions: hide, remove, restore/publish).
- FR-REV-MOD-002: Moderation actions shall require reason text.
- FR-REV-MOD-003: Moderation actions shall write audit logs with before/after state.
- FR-REV-MOD-004: System shall prevent invalid moderation transitions per configured policy.
- FR-REV-MOD-005: Hidden/removed reviews shall be excluded or marked appropriately in consumer-facing surfaces per platform policy.
- FR-REV-MOD-006: System shall support internal moderation notes for reviews where permitted.
- FR-REV-MOD-007: System may support linking moderation action to originating report(s).

## 3.3 Authorization and RBAC (Review Scope)
- FR-REV-RBAC-001: UI shall conditionally render review-management actions by admin role.
- FR-REV-RBAC-002: Backend shall enforce RBAC for all review-management writes independent of UI.
- FR-REV-RBAC-003: Unauthorized review-management attempts shall return explicit authorization errors.
- FR-REV-RBAC-004: Reviewer PII visibility in review detail shall be role-scoped and minimal.
- FR-REV-RBAC-005: Analyst role access (if enabled) shall be read-only and shall not permit moderation writes.

## 3.4 Review Quality and Operations (Optional / Configurable)
- FR-REV-OPS-001: System may support bulk moderation actions on selected reviews (e.g., bulk hide) with confirmation and reason.
- FR-REV-OPS-002: System may support export of filtered review lists for quality analysis/reporting.
- FR-REV-OPS-003: Bulk actions and exports shall be restricted to authorized roles and audit logged.
- FR-REV-OPS-004: System may support queue presets (e.g., `Reported`, `Recent 1-star`, `High-report-count`) for moderator efficiency.

## 3.5 Audit Logging for Review Management
- FR-REV-AUD-001: System shall generate immutable audit entries for privileged review-management writes.
- FR-REV-AUD-002: Audit logs shall include actor, action, target review, before/after snapshot, reason, and timestamp.
- FR-REV-AUD-003: Failed authorization attempts for review-management writes shall be logged.
- FR-REV-AUD-004: Review-detail views may be audit logged for sensitive moderation cases per policy.

## 4. Data Requirements

### 4.1 Review Data Model (Proposed / Admin-Relevant Fields)

#### `reviews/{reviewId}`
- `reviewId`: string (document ID)
- `bookId`: string
- `userId`: string (reviewer uid)
- `rating`: number (e.g., 1–5)
- `title`: string?
- `content`: string
- `status`: enum (`published`, `hidden`, `removed`)
- `reportCount`: number (denormalized, optional but recommended)
- `lastReportedAt`: timestamp?
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `updatedBy`: string (uid)? (system/admin on moderation updates)
- `moderatedAt`: timestamp?
- `moderatedBy`: string?
- `moderationReason`: string?
- `moderationSource`: string? (e.g., `manual`, `report_resolution`, `automated`)

#### `review_moderation_history/{entryId}` or `reviews/{reviewId}/history/{entryId}` (implementation choice)
- `reviewId`: string
- `action`: string (`hide`, `remove`, `restore`, `note_add`)
- `actorUid`: string
- `before`: map?
- `after`: map?
- `reason`: string?
- `linkedReportIds`: string[]?
- `timestamp`: timestamp

#### `audit_logs/{logId}` (review-management relevant fields)
- `actorUid`: string
- `actorRole`: string
- `action`: string
- `entityType`: string (`review`)
- `entityId`: string (`reviewId`)
- `before`: map?
- `after`: map?
- `reason`: string?
- `timestamp`: timestamp
- `ipHash`: string?

### 4.2 Data Integrity Rules
- DR-REV-001: `rating` shall be within configured range (default 1–5).
- DR-REV-002: `status` must be one of supported review moderation states.
- DR-REV-003: Moderation state changes shall write `moderatedAt`, `moderatedBy`, `updatedAt`, and `updatedBy`.
- DR-REV-004: Moderation actions shall record `moderationReason`.
- DR-REV-005: `reportCount`, if denormalized, shall not be negative and shall remain consistent with report aggregation process within defined tolerance/eventual consistency.
- DR-REV-006: Review removal/hide actions shall preserve original review content for audit/ops unless retention policy dictates purge.

### 4.3 Index Requirements (Initial, Review Scope)
- IDX-REV-001: `reviews` index on (`status`, `createdAt desc`)
- IDX-REV-002: `reviews` index on (`rating`, `createdAt desc`)
- IDX-REV-003: `reviews` index on (`bookId`, `createdAt desc`)
- IDX-REV-004: `reviews` index on (`userId`, `createdAt desc`)
- IDX-REV-005: `reviews` index on (`reportCount`, `createdAt desc`) if report count filter/sort is enabled
- IDX-REV-006: `audit_logs` index on (`entityId`, `timestamp desc`) for `entityType=review`

## 5. Validation Rules

- VAL-REV-001: `rating` must be a valid integer within configured range.
- VAL-REV-002: `status` must be a valid moderation status.
- VAL-REV-003: Moderation actions require non-empty reason text.
- VAL-REV-004: System shall reject invalid moderation transitions per configured policy.
- VAL-REV-005: Bulk moderation inputs (if enabled) shall validate each target review and follow declared partial-success or atomic contract.
- VAL-REV-006: Linked report IDs (if provided) must reference existing accessible report records.

## 6. Security Requirements

### 6.1 Authentication and Access
- SEC-REV-001: All review-management pages and APIs require authenticated admin session.
- SEC-REV-002: RBAC checks must run server-side for all review-management write actions.
- SEC-REV-003: Authorization errors shall not reveal sensitive role internals.
- SEC-REV-004: Sensitive reviewer fields displayed in admin shall be role-scoped and minimal.

### 6.2 Data Protection and Privacy
- SEC-REV-005: Direct client attempts to mutate protected moderation fields (`status`, `moderatedBy`, `moderationReason`, etc.) shall be denied.
- SEC-REV-006: Review exports (if enabled) shall be restricted to authorized roles and logged.
- SEC-REV-007: Audit logs and moderation history shall be append-only to system writers.
- SEC-REV-008: Reviewer PII exposure in review list/detail shall follow least-privilege policy.

### 6.3 Abuse and Operational Safety
- SEC-REV-009: Review-management APIs shall be rate-limited per user/session.
- SEC-REV-010: Repeated authorization failures for moderation endpoints shall be logged and alertable.
- SEC-REV-011: Destructive moderation actions (e.g., remove) shall require explicit confirmation UI and reason entry.
- SEC-REV-012: Security-sensitive moderation actions may require recent reauthentication per auth/session policy.

## 7. Non-Functional Requirements

### 7.1 Performance
- NFR-REV-001: Review list pages shall support server pagination with page size 25/50/100.
- NFR-REV-002: Search/filter/sort updates should return results within acceptable admin UX thresholds for typical dataset sizes.

### 7.2 Reliability
- NFR-REV-003: Moderation status updates shall be idempotent where practical.
- NFR-REV-004: Partial enrichment failures (e.g., missing book/user display metadata) shall not block core review detail rendering.
- NFR-REV-005: Consumer-facing rating aggregates impacted by moderation changes shall converge within documented consistency window.

### 7.3 Accessibility and UX
- NFR-REV-006: Core review-management and moderation flows shall be keyboard-accessible.
- NFR-REV-007: Screens shall meet WCAG 2.1 AA contrast and semantic labeling requirements.
- NFR-REV-008: Destructive/restrictive actions shall require confirmation dialogs with clear contextual information.

### 7.4 Observability
- NFR-REV-009: Structured logging shall be enabled for review-management APIs and critical UI errors.
- NFR-REV-010: Metrics shall track moderation action counts, authorization failures, error rates, and queue composition (e.g., reported review volume).

## 8. System Interfaces

### 8.1 UI Modules (Review Scope)
- Review list/directory
- Review detail
- Moderation action dialog (hide/remove/restore + reason)
- Review moderation history/timeline panel
- Linked reports panel (summary/list)
- Audit log viewer (review action filters)

### 8.2 Backend Interfaces (Recommended)
- `listReviews(filters, pagination, sort)`
- `getReviewDetail(reviewId)`
- `updateReviewStatus(reviewId, status, reason, options?)`
- `addReviewModerationNote(reviewId, note)` (optional)
- `bulkUpdateReviewStatus(reviewIds, status, reason)` (optional)
- `exportReviews(filters)` (optional)

Normalized error codes (minimum):
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

## 9. Key Workflows (Use Cases)

### UC-REV-01 Review Moderation (Hide Review)
1. Authorized admin opens review list or linked report.
2. Opens review detail and inspects content/context.
3. Selects `Hide review`.
4. System requires reason and confirmation.
5. System updates `status=hidden`, writes moderation history and audit log.
6. Review visibility changes in consumer surfaces per platform policy.

Failure paths:
- insufficient permissions
- invalid transition
- concurrent update conflict

### UC-REV-02 Remove Review (Soft Delete)
1. Authorized admin opens a policy-violating review.
2. Selects `Remove review`.
3. System requires reason and confirmation.
4. System applies `status=removed` and stores moderation metadata.
5. Audit log records before/after and reason.

### UC-REV-03 Restore Review
1. Authorized admin opens a hidden/removed review.
2. Selects `Restore` (publish).
3. System validates restore policy and requires reason.
4. System updates `status=published` and records audit/history.

### UC-REV-04 Moderate from Report Context (Linked)
1. Moderator opens report detail targeting a review.
2. Reviews report evidence and review content.
3. Executes review moderation action with reason.
4. System records linked report reference in moderation history (if supported).
5. Moderator resolves/dismisses the report through report workflow.

## 10. Error Handling Requirements

- ERR-REV-001: All review-management API errors shall map to user-friendly messages with machine-readable code.
- ERR-REV-002: Validation errors shall identify field-level or action-level issues.
- ERR-REV-003: Permission errors shall not leak sensitive role internals.
- ERR-REV-004: Conflict errors (e.g., stale review state) shall instruct user to refresh and retry.
- ERR-REV-005: Missing linked user/book metadata in review detail shall render non-blocking fallback UI.

## 11. Test Requirements

### 11.1 Unit Testing
- TEST-U-REV-001: Review moderation transition validators
- TEST-U-REV-002: Review filter mapping and query builders
- TEST-U-REV-003: Reason validation for moderation actions
- TEST-U-REV-004: Moderation history/audit payload builders

### 11.2 Integration Testing
- TEST-I-REV-001: Review list search/filter/sort/pagination
- TEST-I-REV-002: Review detail loads review content and related metadata
- TEST-I-REV-003: Hide/remove/restore actions require reason and write audit log
- TEST-I-REV-004: Unauthorized role cannot execute moderation writes
- TEST-I-REV-005: Report-linked moderation action stores link metadata (if supported)

### 11.3 End-to-End Testing
- TEST-E-REV-001: Moderator hides a reported review from review detail workflow
- TEST-E-REV-002: Moderator restores a hidden review and status updates are visible
- TEST-E-REV-003: Report-to-review moderation workflow completes with linked audit/history entries

### 11.4 Security Testing
- TEST-S-REV-001: Non-admin token cannot access review-management routes/APIs
- TEST-S-REV-002: Unauthorized admin role cannot perform review moderation writes
- TEST-S-REV-003: Direct client attempt to mutate protected moderation fields is denied
- TEST-S-REV-004: Reviewer PII exposure is restricted by role

## 12. Acceptance Criteria (MVP for Admin Reviews)

- AC-REV-001: Admin UI supports searching, filtering, sorting, and viewing review details.
- AC-REV-002: Authorized admins can hide/remove/restore reviews with required reason capture and audit logging.
- AC-REV-003: Backend RBAC enforcement blocks unauthorized review-management writes.
- AC-REV-004: Review moderation actions produce immutable audit entries and moderation history entries.
- AC-REV-005: Review list/detail supports flagged/reported review visibility indicators (or linked report summary) for moderator workflows.
- AC-REV-006: Security rules and backend checks prevent direct unauthorized moderation field updates.

## 13. Open Decisions

- OD-REV-001: Review moderation status model
  - Option A: minimal (`published`, `hidden`, `removed`)
  - Option B: expanded (`pending_moderation`, `under_review`, etc.)
- OD-REV-002: Review content retention on `removed`
  - Option A: soft delete only (retain full content for audit)
  - Option B: redact content after retention period
- OD-REV-003: Report linkage behavior
  - Option A: show aggregate report count + link to reports
  - Option B: embed lightweight report timeline in review detail
- OD-REV-004: Text search implementation for review content
  - Option A: Firestore prefix/field-limited search only
  - Option B: external search service for keyword search
- OD-REV-005: `content_admin` moderation permissions
  - Option A: allowed to moderate reviews
  - Option B: read-only for reviews; `community_admin` only for moderation
