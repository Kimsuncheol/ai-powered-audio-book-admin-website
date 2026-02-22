import type {
  AuditAction,
  ReviewModerationAction,
  ReviewModerationStatus,
  ReviewServiceErrorCode,
} from '@/lib/types';

const REVIEW_STATUSES: ReviewModerationStatus[] = [
  'published',
  'hidden',
  'removed',
];

const ALLOWED_TRANSITIONS: Record<
  ReviewModerationStatus,
  ReviewModerationStatus[]
> = {
  published: ['hidden', 'removed'],
  hidden: ['published', 'removed'],
  removed: ['published'],
};

export class ReviewServiceError extends Error {
  code: ReviewServiceErrorCode;

  constructor(code: ReviewServiceErrorCode, message: string) {
    super(message);
    this.name = 'ReviewServiceError';
    this.code = code;
  }
}

export function isReviewModerationStatus(
  value: unknown
): value is ReviewModerationStatus {
  return typeof value === 'string' && REVIEW_STATUSES.includes(value as ReviewModerationStatus);
}

export function assertValidModerationReason(reason: string): void {
  if (reason.trim().length < 10) {
    throw new ReviewServiceError(
      'VALIDATION_ERROR',
      'Reason must be at least 10 characters.'
    );
  }
}

export function assertValidReviewRating(rating: unknown): void {
  if (
    typeof rating !== 'number' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new ReviewServiceError('INTERNAL_ERROR', 'Invalid review rating.');
  }
}

export function getAllowedNextReviewStatuses(
  currentStatus: ReviewModerationStatus
): ReviewModerationStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus];
}

export function canTransitionReviewStatus(
  currentStatus: ReviewModerationStatus,
  nextStatus: ReviewModerationStatus
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function assertValidReviewStatusTransition(
  currentStatus: ReviewModerationStatus,
  nextStatus: ReviewModerationStatus
): void {
  if (currentStatus === nextStatus) {
    throw new ReviewServiceError(
      'CONFLICT',
      'Review is already in the selected status.'
    );
  }
  if (!canTransitionReviewStatus(currentStatus, nextStatus)) {
    throw new ReviewServiceError(
      'CONFLICT',
      `Invalid review moderation transition from ${currentStatus} to ${nextStatus}.`
    );
  }
}

export function getReviewModerationActionForTransition(
  fromStatus: ReviewModerationStatus,
  toStatus: ReviewModerationStatus
): ReviewModerationAction {
  if (toStatus === 'hidden') return 'hide';
  if (toStatus === 'removed') return 'remove';
  if (toStatus === 'published' && (fromStatus === 'hidden' || fromStatus === 'removed')) {
    return 'restore';
  }

  throw new ReviewServiceError(
    'CONFLICT',
    `No moderation action mapping for transition ${fromStatus} -> ${toStatus}.`
  );
}

export function getAuditActionForReviewModeration(
  action: ReviewModerationAction
): Extract<AuditAction, 'hide_review' | 'remove_review' | 'restore_review'> {
  switch (action) {
    case 'hide':
      return 'hide_review';
    case 'remove':
      return 'remove_review';
    case 'restore':
      return 'restore_review';
  }
}

