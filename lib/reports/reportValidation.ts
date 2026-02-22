import type {
  ReportResolutionOutcome,
  ReportServiceErrorCode,
  ReportStatus,
  ReportTargetEntityType,
} from '@/lib/types';

const TARGET_ENTITY_TYPES: ReportTargetEntityType[] = [
  'review',
  'user',
  'book',
  'author_profile',
];

const REPORT_STATUSES: ReportStatus[] = [
  'open',
  'in_review',
  'resolved_action_taken',
  'resolved_no_action',
  'dismissed',
];

const REPORT_RESOLUTION_OUTCOMES: ReportResolutionOutcome[] = [
  'action_taken',
  'no_action',
  'dismissed',
];

const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  open: [
    'in_review',
    'resolved_action_taken',
    'resolved_no_action',
    'dismissed',
  ],
  in_review: ['resolved_action_taken', 'resolved_no_action', 'dismissed'],
  resolved_action_taken: [],
  resolved_no_action: [],
  dismissed: [],
};

export class ReportServiceError extends Error {
  code: ReportServiceErrorCode;

  constructor(code: ReportServiceErrorCode, message: string) {
    super(message);
    this.name = 'ReportServiceError';
    this.code = code;
  }
}

export function isReportTargetEntityType(
  value: unknown
): value is ReportTargetEntityType {
  return typeof value === 'string' && TARGET_ENTITY_TYPES.includes(value as ReportTargetEntityType);
}

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === 'string' && REPORT_STATUSES.includes(value as ReportStatus);
}

export function isReportResolutionOutcome(
  value: unknown
): value is ReportResolutionOutcome {
  return (
    typeof value === 'string' &&
    REPORT_RESOLUTION_OUTCOMES.includes(value as ReportResolutionOutcome)
  );
}

export function assertValidReason(reason: string, fieldLabel = 'Reason'): void {
  if (reason.trim().length < 10) {
    throw new ReportServiceError(
      'VALIDATION_ERROR',
      `${fieldLabel} must be at least 10 characters.`
    );
  }
}

export function mapOutcomeToStatus(
  outcome: ReportResolutionOutcome
): ReportStatus {
  switch (outcome) {
    case 'action_taken':
      return 'resolved_action_taken';
    case 'no_action':
      return 'resolved_no_action';
    case 'dismissed':
      return 'dismissed';
  }
}

export function getAllowedNextReportStatuses(
  currentStatus: ReportStatus
): ReportStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus];
}

export function canTransitionReportStatus(
  currentStatus: ReportStatus,
  nextStatus: ReportStatus
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function assertValidStatusTransition(
  currentStatus: ReportStatus,
  nextStatus: ReportStatus
): void {
  if (currentStatus === nextStatus) {
    throw new ReportServiceError(
      'CONFLICT',
      'Report is already in the selected status.'
    );
  }
  if (!canTransitionReportStatus(currentStatus, nextStatus)) {
    throw new ReportServiceError(
      'CONFLICT',
      `Invalid report status transition from ${currentStatus} to ${nextStatus}.`
    );
  }
}

