# Software Requirements Specification (SRS)
## Admin AI Ops for Admin Website

Version: 1.0  
Date: 2026-02-22  
Status: Draft (Extracted + Extended)

## 1. Introduction

### 1.1 Purpose
This document defines software requirements for AI operations (AI Ops) management in the Admin Website for the AI-Powered Audiobook App, with focus on:
- AI job monitoring and operational control
- AI configuration/prompt/template visibility and governance
- failure handling, retries, and safety oversight
- audit logging, RBAC, and observability for AI-related admin actions

This document extracts and extends AI-operations-related requirements from `ADMIN_WEBSITE_SRS.md` into a standalone SRS.

### 1.2 Scope
In scope:
- AI job queue/list, status, detail, and retry/cancel operations
- AI provider/model configuration visibility (non-secret) and policy controls
- prompt/template/version management visibility and approval workflows (if enabled)
- AI run logs/metrics visibility for admin operations
- audit logging and RBAC enforcement for AI Ops actions

Out of scope:
- core ML model training pipelines
- provider account billing portals and external vendor console management
- full prompt engineering IDE features beyond admin operational needs
- client-facing AI feature UX implementation

### 1.3 Intended Audience
- Product owner and stakeholders
- Frontend and backend engineers
- QA engineers
- Security/safety reviewers
- Operations/ML platform support team

### 1.4 Definitions and Acronyms
- AI Ops: Operational management of AI services, jobs, configurations, prompts, and reliability controls
- AI job/run: A discrete execution request to an AI workflow (e.g., narration generation, metadata generation, moderation assistance)
- Provider: External AI service vendor or internal model service
- Prompt template: Versioned instruction template used in AI workflows
- Guardrail: Safety/quality constraint or pre/post-processing policy for AI outputs
- RBAC: Role-Based Access Control
- SLA: Service Level Agreement / response-time objective

### 1.5 References
- `ADMIN_WEBSITE_SRS.md`
- `ADMIN_SETTINGS_SRS.md`
- `ADMIN_AUDIT_LOGS_SRS.md`
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
- AI workflows are orchestrated by backend services/jobs and expose operational metadata to the admin platform.
- Secret credentials for AI providers are stored outside general Firestore settings (e.g., Secret Manager); admin UI primarily manages references and non-secret parameters.
- Some AI job data may be high-volume and require summarized list payloads + paginated details.

### 2.3 AI Ops Scope (v1 Proposed)
AI workflow categories (examples):
- `audiobook_generation`
- `chapter_audio_generation`
- `metadata_enrichment`
- `content_moderation_assist`
- `transcription` (if applicable)

AI job statuses (minimum):
- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

AI Ops roles (minimum):
- `super_admin`
- `content_admin` (operational controls for content generation workflows)
- `analyst` (read-only monitoring/metrics, no control actions)

Notes:
- v1 prioritizes operational observability and safe admin controls over advanced model experimentation features.
- Prompt/template editing may be read-only in MVP if approval/governance is not yet implemented.

## 3. Functional Requirements

## 3.1 AI Job Monitoring and Triage
- FR-AIOPS-001: System shall provide a paginated AI job/run list in the Admin Website.
- FR-AIOPS-002: Job list shall support search by job ID, correlation/request ID, target entity ID, workflow type, and initiator where available.
- FR-AIOPS-003: Job list shall support filters by status, workflow type, provider, model, date range, and retry count.
- FR-AIOPS-004: Job list shall support sorting by created timestamp, updated timestamp, duration, and status.
- FR-AIOPS-005: Job detail page shall display job metadata, status timeline, provider/model info, input/output metadata summary, and error details (if failed).
- FR-AIOPS-006: Job detail page shall display links to related entities (book/chapter/user/report) when available and permitted.
- FR-AIOPS-007: System shall display retry count, last error code/message, and failure classification when available.

## 3.2 AI Operational Control Actions
- FR-AIOPS-CTL-001: Authorized admin shall cancel eligible running/queued AI jobs.
- FR-AIOPS-CTL-002: Authorized admin shall retry eligible failed/cancelled AI jobs subject to policy and guardrails.
- FR-AIOPS-CTL-003: Control actions (cancel/retry) shall require confirmation and reason text for high-impact workflows.
- FR-AIOPS-CTL-004: System shall prevent invalid control actions based on current job status (e.g., retry running job).
- FR-AIOPS-CTL-005: System shall support idempotent control requests where practical (e.g., repeated cancel request on same job).
- FR-AIOPS-CTL-006: Control actions shall be audit logged with actor, action, target job, reason, and timestamp.

## 3.3 AI Configuration and Prompt/Template Governance
- FR-AIOPS-CFG-001: System shall display AI provider/model configuration metadata relevant to operations (provider, model name, limits, timeout, fallback policy).
- FR-AIOPS-CFG-002: Sensitive credentials/secrets shall not be displayed; only secret references or masked metadata may be shown.
- FR-AIOPS-CFG-003: If AI settings are editable via AI Ops UI, changes shall route through settings/config governance with validation and audit logging.
- FR-AIOPS-CFG-004: System shall support prompt/template list and version visibility for configured AI workflows.
- FR-AIOPS-CFG-005: Prompt/template detail shall show version metadata, status (draft/active/deprecated if used), and change history where available.
- FR-AIOPS-CFG-006: If prompt/template editing is enabled, changes shall require versioned save and optional approval workflow.
- FR-AIOPS-CFG-007: Active prompt/template version changes shall require explicit confirmation and audit logging.

## 3.4 Safety, Quality, and Guardrails
- FR-AIOPS-SAFE-001: System shall display configured guardrail/safety policy metadata relevant to each AI workflow.
- FR-AIOPS-SAFE-002: System shall display failure/error classifications (e.g., provider error, timeout, validation error, safety block) where available.
- FR-AIOPS-SAFE-003: System may support quarantining or flagging AI outputs requiring manual review before publish/use.
- FR-AIOPS-SAFE-004: System shall record and surface whether fallback models/providers were used for a job when applicable.
- FR-AIOPS-SAFE-005: AI Ops actions that could increase safety risk (e.g., bypassing checks, if supported) shall be restricted to highest privilege roles and require reason capture.

## 3.5 Authorization and RBAC (AI Ops Scope)
- FR-AIOPS-RBAC-001: UI shall conditionally render AI Ops pages, data, and actions by admin role.
- FR-AIOPS-RBAC-002: Backend shall enforce RBAC for AI Ops reads/writes independent of UI.
- FR-AIOPS-RBAC-003: Only authorized roles shall perform control actions (cancel/retry) on AI jobs.
- FR-AIOPS-RBAC-004: Analyst role access (if enabled) shall be read-only for AI Ops monitoring and metrics.
- FR-AIOPS-RBAC-005: Unauthorized AI Ops access/action attempts shall return explicit authorization errors and be logged.

## 3.6 Audit Logging and Operational History
- FR-AIOPS-AUD-001: System shall generate immutable audit entries for privileged AI Ops actions (job control, config changes, prompt version changes, exports).
- FR-AIOPS-AUD-002: Audit logs shall include actor, action, target job/config/template, before/after (where applicable), reason, and timestamp.
- FR-AIOPS-AUD-003: AI job status transitions shall be recorded in job history/timeline for operational debugging.
- FR-AIOPS-AUD-004: Failed authorization attempts for AI Ops actions shall be logged.

## 3.7 Operational Features (Optional / Configurable)
- FR-AIOPS-OPS-001: System may support bulk retry or bulk cancel for selected jobs with safeguards, confirmation, and reason.
- FR-AIOPS-OPS-002: System may support AI job export (metadata only) for troubleshooting/analysis.
- FR-AIOPS-OPS-003: System may support queue presets and dashboards (e.g., failed jobs, long-running jobs, provider outage view).
- FR-AIOPS-OPS-004: Bulk actions and exports shall be restricted to authorized roles and audit logged.

## 4. Data Requirements

### 4.1 AI Job and Config Data Model (Proposed / Admin-Relevant Fields)

#### `ai_jobs/{jobId}`
- `jobId`: string (document ID)
- `workflowType`: string
- `status`: enum (`queued`, `running`, `succeeded`, `failed`, `cancelled`)
- `provider`: string
- `model`: string
- `priority`: string? (`low`, `normal`, `high`)
- `initiatedByType`: enum (`system`, `admin`, `user`, `pipeline`)?
- `initiatedByUid`: string?
- `targetEntityType`: string? (e.g., `book`, `chapter`, `review`, `report`)
- `targetEntityId`: string?
- `requestId`: string? (correlation ID)
- `retryCount`: number
- `maxRetries`: number?
- `startedAt`: timestamp?
- `completedAt`: timestamp?
- `durationMs`: number?
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `errorCode`: string?
- `errorMessage`: string? (sanitized)
- `failureCategory`: string? (`provider_error`, `timeout`, `validation`, `safety`, `internal`)
- `fallbackUsed`: boolean?
- `fallbackProvider`: string?
- `fallbackModel`: string?
- `inputSummary`: map? (sanitized/minimized)
- `outputSummary`: map? (sanitized/minimized)
- `metadata`: map?

#### `ai_job_history/{entryId}` or `ai_jobs/{jobId}/history/{entryId}` (implementation choice)
- `jobId`: string
- `eventType`: string (`status_change`, `retry_requested`, `cancel_requested`, `worker_update`)
- `before`: map?
- `after`: map?
- `actorType`: string (`system`, `admin`)
- `actorUid`: string?
- `reason`: string?
- `timestamp`: timestamp

#### `ai_prompt_templates/{templateId}` (if prompt/template governance tracked in-app)
- `templateId`: string
- `workflowType`: string
- `name`: string
- `version`: number
- `status`: enum (`draft`, `active`, `deprecated`)?
- `content`: string | map (may be hidden/restricted)
- `variablesSchema`: map?
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `updatedBy`: string?
- `approvedBy`: string?
- `approvedAt`: timestamp?

#### `audit_logs/{logId}` (AI Ops relevant fields)
- `actorUid`: string
- `actorRole`: string
- `action`: string
- `entityType`: string (`ai_job`, `ai_config`, `ai_prompt_template`)
- `entityId`: string
- `before`: map?
- `after`: map?
- `reason`: string?
- `timestamp`: timestamp

### 4.2 Data Integrity Rules
- DR-AIOPS-001: `status` must be a valid AI job lifecycle state.
- DR-AIOPS-002: `retryCount` shall be non-negative and not exceed `maxRetries` where enforced.
- DR-AIOPS-003: `completedAt` and `durationMs` shall be set for terminal statuses when available.
- DR-AIOPS-004: Job status transitions shall write `updatedAt` and append a history entry.
- DR-AIOPS-005: Stored `errorMessage`, `inputSummary`, and `outputSummary` shall be sanitized to exclude secrets and restricted data.
- DR-AIOPS-006: Prompt/template version changes shall preserve version history and not mutate previously published versions in place.

### 4.3 Index Requirements (Initial, AI Ops Scope)
- IDX-AIOPS-001: `ai_jobs` index on (`status`, `createdAt desc`)
- IDX-AIOPS-002: `ai_jobs` index on (`workflowType`, `status`, `createdAt desc`)
- IDX-AIOPS-003: `ai_jobs` index on (`provider`, `status`, `createdAt desc`)
- IDX-AIOPS-004: `ai_jobs` index on (`targetEntityId`, `createdAt desc`)
- IDX-AIOPS-005: `ai_jobs` index on (`requestId`, `createdAt desc`)
- IDX-AIOPS-006: `ai_jobs` index on (`retryCount`, `status`, `createdAt desc`)
- IDX-AIOPS-007: `audit_logs` index on (`entityId`, `timestamp desc`) for AI Ops entity types

## 5. Validation Rules

- VAL-AIOPS-001: AI job control actions must target valid job IDs and permitted terminal/non-terminal states.
- VAL-AIOPS-002: Retry actions shall be rejected when retry limit has been reached or policy prohibits retry.
- VAL-AIOPS-003: Cancel actions shall be rejected for terminal jobs.
- VAL-AIOPS-004: Reason text is required for policy-defined AI Ops control/config actions.
- VAL-AIOPS-005: AI config/prompt updates (if enabled) shall satisfy schema/version validation.
- VAL-AIOPS-006: Bulk control actions (if enabled) shall validate each job and follow declared atomic or partial-success API contract.

## 6. Security Requirements

### 6.1 Authentication and Access
- SEC-AIOPS-001: All AI Ops pages and APIs require authenticated admin session.
- SEC-AIOPS-002: RBAC checks must run server-side for AI Ops reads/writes and control actions.
- SEC-AIOPS-003: Authorization errors shall not reveal sensitive operational internals beyond necessary error semantics.
- SEC-AIOPS-004: High-impact AI Ops actions may require recent reauthentication per auth/session policy.

### 6.2 Data Protection and Privacy
- SEC-AIOPS-005: AI provider credentials/secrets shall not be displayed in AI Ops UI or stored in plaintext in Firestore documents.
- SEC-AIOPS-006: Input/output summaries and error payloads shown in AI Ops UI shall be sanitized/redacted to prevent leakage of secrets/PII.
- SEC-AIOPS-007: Prompt/template content visibility may be role-scoped if prompts contain sensitive internal logic.
- SEC-AIOPS-008: AI Ops exports (if enabled) shall be restricted to authorized roles and audit logged.

### 6.3 Abuse and Operational Safety
- SEC-AIOPS-009: AI Ops control APIs shall be rate-limited per user/session.
- SEC-AIOPS-010: Repeated unauthorized AI Ops access/action attempts shall be logged and alertable.
- SEC-AIOPS-011: Bulk retries/cancels (if enabled) shall enforce guardrails to prevent runaway cost or service degradation.
- SEC-AIOPS-012: Provider outage/failure spikes shall be detectable via metrics/alerts and visible in AI Ops dashboards or logs.

## 7. Non-Functional Requirements

### 7.1 Performance
- NFR-AIOPS-001: AI job list pages shall support server pagination with page size 25/50/100.
- NFR-AIOPS-002: Common AI Ops filters and searches should return results within acceptable admin UX thresholds for typical dataset sizes.
- NFR-AIOPS-003: AI Ops control actions (retry/cancel) should acknowledge requests promptly, even if underlying job termination/restart is asynchronous.

### 7.2 Reliability
- NFR-AIOPS-004: AI job control actions shall be idempotent where practical.
- NFR-AIOPS-005: Partial enrichment failures (e.g., missing linked entity metadata) shall not block job detail rendering.
- NFR-AIOPS-006: AI Ops UI shall handle eventual consistency between worker updates and displayed job state.

### 7.3 Accessibility and UX
- NFR-AIOPS-007: Core AI Ops monitoring and control workflows shall be keyboard-accessible.
- NFR-AIOPS-008: Screens shall meet WCAG 2.1 AA contrast and semantic labeling requirements.
- NFR-AIOPS-009: High-impact control actions shall require confirmation dialogs with clear cost/safety implications where applicable.

### 7.4 Observability
- NFR-AIOPS-010: Structured logging shall be enabled for AI Ops APIs and backend worker/control errors.
- NFR-AIOPS-011: Metrics shall track job throughput, success/failure rates, retry rates, queue depth, latency, provider/model error rates, and control-action counts.
- NFR-AIOPS-012: Alerts shall be configurable for failure spikes, queue backlog growth, and elevated latency.

## 8. System Interfaces

### 8.1 UI Modules (AI Ops Scope)
- AI job list/queue monitor
- AI job detail/timeline
- Control action dialog (retry/cancel + reason)
- Provider/model configuration viewer (and editor if enabled)
- Prompt/template list and detail (read-only or editable)
- AI Ops dashboard/preset views (optional)

### 8.2 Backend Interfaces (Recommended)
- `listAiJobs(filters, pagination, sort)`
- `getAiJobDetail(jobId)`
- `retryAiJob(jobId, reason?)`
- `cancelAiJob(jobId, reason?)`
- `listAiPromptTemplates(filters?)`
- `getAiPromptTemplate(templateId, version?)`
- `updateAiPromptTemplate(...)` (optional; if enabled)
- `setActiveAiPromptVersion(...)` (optional; if enabled)
- `exportAiJobs(filters)` (optional)

Normalized error codes (minimum):
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

## 9. Key Workflows (Use Cases)

### UC-AIOPS-01 Investigate Failed AI Job
1. Authorized admin opens AI Ops job list.
2. Filters by `status=failed` and relevant workflow type/provider.
3. Opens failed job detail.
4. Reviews status timeline, error classification, retry count, and sanitized input/output summaries.
5. Determines whether retry is appropriate or escalation is needed.

Failure paths:
- insufficient permissions
- job detail partially unavailable due to retention/legacy schema

### UC-AIOPS-02 Retry Failed AI Job
1. Authorized admin opens a failed job detail.
2. Selects `Retry`.
3. System validates retry eligibility (status, retry limits, policy).
4. Admin confirms action and provides reason if required.
5. System enqueues retry request, records job history and audit log, and updates UI status.

Failure paths:
- retry not allowed by policy
- job already retried/concurrently updated
- backend queue unavailable

### UC-AIOPS-03 Cancel Long-Running Job
1. Authorized admin identifies long-running or stuck job.
2. Opens job detail and selects `Cancel`.
3. System shows confirmation and impact warning.
4. Admin confirms with reason.
5. System issues cancel request and records audit/history entries.

Failure paths:
- job already terminal
- worker cannot cancel safely
- insufficient permissions

### UC-AIOPS-04 Switch Active Prompt Template Version (Optional)
1. Authorized admin opens prompt/template detail.
2. Reviews draft and active versions plus change history.
3. Selects `Set Active Version`.
4. System validates compatibility/approval policy and requests confirmation.
5. System activates selected version and writes audit log.

## 10. Error Handling Requirements

- ERR-AIOPS-001: All AI Ops API errors shall map to user-friendly messages with machine-readable code.
- ERR-AIOPS-002: Validation errors shall identify field-level or action-level issues (e.g., invalid status for retry).
- ERR-AIOPS-003: Permission errors shall not leak sensitive provider/prompt internals.
- ERR-AIOPS-004: Conflict errors (e.g., stale job state/concurrent control action) shall instruct user to refresh and retry.
- ERR-AIOPS-005: Sanitized placeholder/fallback UI shall be shown when raw error or payload fields are unavailable or redacted.

## 11. Test Requirements

### 11.1 Unit Testing
- TEST-U-AIOPS-001: AI job control eligibility validators (retry/cancel)
- TEST-U-AIOPS-002: AI job filter/query builder mapping
- TEST-U-AIOPS-003: Payload sanitization/redaction helpers for AI job details
- TEST-U-AIOPS-004: Prompt/template version transition validators (if enabled)

### 11.2 Integration Testing
- TEST-I-AIOPS-001: AI job list search/filter/sort/pagination
- TEST-I-AIOPS-002: AI job detail loads timeline, provider/model metadata, and sanitized error summaries
- TEST-I-AIOPS-003: Retry/cancel actions validate state, persist history, and write audit logs
- TEST-I-AIOPS-004: Unauthorized role cannot execute AI Ops control actions
- TEST-I-AIOPS-005: Prompt/template activation/change writes audit logs (if enabled)

### 11.3 End-to-End Testing
- TEST-E-AIOPS-001: Admin filters failed jobs, opens job detail, and retries an eligible job
- TEST-E-AIOPS-002: Admin cancels a running job and sees status/history updates
- TEST-E-AIOPS-003: Unauthorized admin cannot access or operate AI Ops controls

### 11.4 Security Testing
- TEST-S-AIOPS-001: Non-admin token cannot access AI Ops routes/APIs
- TEST-S-AIOPS-002: Unauthorized admin role cannot retry/cancel jobs
- TEST-S-AIOPS-003: AI Ops UI/API do not expose provider secrets or restricted prompt content
- TEST-S-AIOPS-004: Direct client attempts to mutate protected AI job state fields are denied

## 12. Acceptance Criteria (MVP for Admin AI Ops)

- AC-AIOPS-001: Authorized admins can view AI job lists and details with status, workflow, provider/model, timestamps, and error summaries.
- AC-AIOPS-002: Authorized admins can retry/cancel eligible jobs with confirmation, policy validation, and audit logging.
- AC-AIOPS-003: Backend RBAC enforcement blocks unauthorized AI Ops reads/writes and control actions.
- AC-AIOPS-004: AI Ops data shown in admin is sanitized and does not expose secrets.
- AC-AIOPS-005: AI job status history/timeline is available for operational debugging.
- AC-AIOPS-006: Audit entries are created for privileged AI Ops actions.

## 13. Open Decisions

- OD-AIOPS-001: AI Ops MVP scope
  - Option A: job monitoring + retry/cancel only (prompt/config read-only)
  - Option B: include prompt/template version activation in MVP
- OD-AIOPS-002: Prompt/template governance model
  - Option A: read-only visibility in AI Ops; edits via Settings/deployment pipeline
  - Option B: in-app versioned editing with approval workflow
- OD-AIOPS-003: Job payload storage depth
  - Option A: metadata summaries only (preferred for security/cost)
  - Option B: store richer sanitized input/output excerpts
- OD-AIOPS-004: Bulk controls in MVP
  - Option A: no bulk retry/cancel in MVP
  - Option B: bulk retry/cancel with strict limits and safeguards
- OD-AIOPS-005: `content_admin` AI Ops permissions
  - Option A: read + control for content-generation workflows only
  - Option B: read-only; `super_admin` controls all AI Ops actions
