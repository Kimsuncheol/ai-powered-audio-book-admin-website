import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import db from '@/lib/firebase/firestore';
import { logAuditAction } from '@/lib/auth/auditLog';
import { canModerateReviews, canViewReviews } from '@/lib/reviews/reviewRbac';
import {
  ReviewServiceError,
  assertValidModerationReason,
  assertValidReviewRating,
  assertValidReviewStatusTransition,
  getAuditActionForReviewModeration,
  getReviewModerationActionForTransition,
  isReviewModerationStatus,
} from '@/lib/reviews/reviewValidation';
import type {
  Actor,
  ReviewDocument,
  ReviewListQuery,
  ReviewModerationHistoryEntry,
  ReviewModerationSource,
  ReviewModerationStatus,
  ReviewSortField,
} from '@/lib/types';

const REVIEWS_COLLECTION = 'reviews';
const DEFAULT_LIST_LIMIT = 200;

type ServiceAction = 'view' | 'moderate';

function requirePermission(actor: Actor, action: ServiceAction): void {
  const allowed = action === 'view' ? canViewReviews(actor.role) : canModerateReviews(actor.role);
  if (!allowed) {
    throw new ReviewServiceError(
      'FORBIDDEN',
      'You do not have permission to manage reviews.'
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

function docToReview(id: string, data: Record<string, unknown>): ReviewDocument {
  const review = { ...(data as Omit<ReviewDocument, 'id'>), id };

  if (!isReviewModerationStatus(review.status)) {
    throw new ReviewServiceError(
      'INTERNAL_ERROR',
      `Invalid review status for review ${id}.`
    );
  }
  assertValidReviewRating(review.rating);
  if (typeof review.bookId !== 'string' || !review.bookId) {
    throw new ReviewServiceError('INTERNAL_ERROR', `Invalid bookId for review ${id}.`);
  }
  if (typeof review.userId !== 'string' || !review.userId) {
    throw new ReviewServiceError('INTERNAL_ERROR', `Invalid userId for review ${id}.`);
  }
  if (typeof review.content !== 'string') {
    throw new ReviewServiceError('INTERNAL_ERROR', `Invalid content for review ${id}.`);
  }
  if (
    review.reportCount !== undefined &&
    review.reportCount !== null &&
    (typeof review.reportCount !== 'number' || review.reportCount < 0)
  ) {
    throw new ReviewServiceError(
      'INTERNAL_ERROR',
      `Invalid reportCount for review ${id}.`
    );
  }

  return review;
}

function docToReviewHistory(
  id: string,
  data: Record<string, unknown>
): ReviewModerationHistoryEntry {
  return { ...(data as Omit<ReviewModerationHistoryEntry, 'id'>), id };
}

function getReviewHistoryCollection(reviewId: string) {
  return collection(db, REVIEWS_COLLECTION, reviewId, 'history');
}

function pickReviewModerationSnapshot(review: ReviewDocument): Record<string, unknown> {
  return {
    status: review.status,
    moderationReason: review.moderationReason ?? null,
    moderationSource: review.moderationSource ?? null,
    moderatedBy: review.moderatedBy ?? null,
    moderatedAt: review.moderatedAt ?? null,
    updatedBy: review.updatedBy ?? null,
    updatedAt: review.updatedAt ?? null,
  };
}

async function writeReviewHistory(
  reviewId: string,
  action: ReviewModerationHistoryEntry['action'],
  actor: Actor,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  reason: string
): Promise<void> {
  await addDoc(getReviewHistoryCollection(reviewId), {
    reviewId,
    action,
    actorUid: actor.uid,
    before,
    after,
    reason,
    timestamp: serverTimestamp(),
  });
}

function applyClientFilters(
  reviews: ReviewDocument[],
  queryInput: ReviewListQuery | undefined
): ReviewDocument[] {
  const filters = queryInput?.filters;
  let filtered = [...reviews];

  if (filters?.status && filters.status !== 'all') {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters?.rating && filters.rating !== 'all') {
    filtered = filtered.filter((r) => r.rating === filters.rating);
  }
  if (filters?.flagged && filters.flagged !== 'all') {
    filtered = filtered.filter((r) =>
      filters.flagged === 'flagged'
        ? (r.reportCount ?? 0) > 0
        : (r.reportCount ?? 0) === 0
    );
  }
  if (filters?.bookId?.trim()) {
    const q = filters.bookId.trim().toLowerCase();
    filtered = filtered.filter((r) => r.bookId.toLowerCase().includes(q));
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter((r) => {
      return (
        (r.id ?? '').toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q) ||
        r.bookId.toLowerCase().includes(q) ||
        (r.title ?? '').toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      );
    });
  }

  const sortField = queryInput?.sortField ?? 'updatedAt';
  const sortDirection = queryInput?.sortDirection ?? 'desc';
  filtered.sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sortField) {
      case 'createdAt':
        aValue = timestampToMillis(a.createdAt);
        bValue = timestampToMillis(b.createdAt);
        break;
      case 'updatedAt':
        aValue = timestampToMillis(a.updatedAt);
        bValue = timestampToMillis(b.updatedAt);
        break;
      case 'rating':
        aValue = a.rating;
        bValue = b.rating;
        break;
      case 'reportCount':
        aValue = a.reportCount ?? 0;
        bValue = b.reportCount ?? 0;
        break;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  return filtered;
}

function getFirestoreOrderField(sortField: ReviewSortField | undefined): 'createdAt' | 'updatedAt' {
  if (sortField === 'createdAt') return 'createdAt';
  return 'updatedAt';
}

export async function listReviews(
  queryInput: ReviewListQuery,
  actor: Actor
): Promise<ReviewDocument[]> {
  requirePermission(actor, 'view');

  const cappedLimit = Math.min(
    Math.max(queryInput.limit ?? DEFAULT_LIST_LIMIT, 1),
    DEFAULT_LIST_LIMIT
  );
  const sortDirection = queryInput.sortDirection ?? 'desc';

  let snap;
  try {
    snap = await getDocs(
      query(
        collection(db, REVIEWS_COLLECTION),
        orderBy(getFirestoreOrderField(queryInput.sortField), sortDirection),
        limit(cappedLimit)
      )
    );
  } catch {
    snap = await getDocs(
      query(
        collection(db, REVIEWS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(cappedLimit)
      )
    );
  }

  const reviews = snap.docs.map((d) => docToReview(d.id, d.data()));
  const filtered = applyClientFilters(reviews, queryInput);

  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'review',
    resourceId: null,
    metadata: {
      count: filtered.length,
      filters: queryInput.filters ?? {},
      sortField: queryInput.sortField ?? 'updatedAt',
      sortDirection,
    },
  });

  return filtered;
}

export async function getReview(
  reviewId: string,
  actor: Actor
): Promise<ReviewDocument | null> {
  requirePermission(actor, 'view');

  const snap = await getDoc(doc(db, REVIEWS_COLLECTION, reviewId));
  if (!snap.exists()) return null;

  const review = docToReview(snap.id, snap.data());
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'view',
    resourceType: 'review',
    resourceId: reviewId,
  });
  return review;
}

export async function getReviewHistory(
  reviewId: string,
  actor: Actor
): Promise<ReviewModerationHistoryEntry[]> {
  requirePermission(actor, 'view');

  const snap = await getDocs(
    query(getReviewHistoryCollection(reviewId), orderBy('timestamp', 'desc'), limit(100))
  );
  return snap.docs.map((d) => docToReviewHistory(d.id, d.data()));
}

export async function updateReviewStatus(
  reviewId: string,
  nextStatus: ReviewModerationStatus,
  reason: string,
  actor: Actor,
  options?: { moderationSource?: ReviewModerationSource }
): Promise<void> {
  requirePermission(actor, 'moderate');
  assertValidModerationReason(reason);

  const snap = await getDoc(doc(db, REVIEWS_COLLECTION, reviewId));
  if (!snap.exists()) {
    throw new ReviewServiceError('NOT_FOUND', 'Review not found.');
  }

  const review = docToReview(snap.id, snap.data());
  assertValidReviewStatusTransition(review.status, nextStatus);

  const moderationAction = getReviewModerationActionForTransition(
    review.status,
    nextStatus
  );
  const moderationSource = options?.moderationSource ?? 'manual';
  const before = pickReviewModerationSnapshot(review);

  await updateDoc(doc(db, REVIEWS_COLLECTION, reviewId), {
    status: nextStatus,
    moderatedAt: serverTimestamp(),
    moderatedBy: actor.uid,
    moderationReason: reason.trim(),
    moderationSource,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  const after = {
    ...before,
    status: nextStatus,
    moderatedBy: actor.uid,
    moderationReason: reason.trim(),
    moderationSource,
    updatedBy: actor.uid,
  };

  await writeReviewHistory(
    reviewId,
    moderationAction,
    actor,
    before,
    after,
    reason.trim()
  );
  await logAuditAction({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: getAuditActionForReviewModeration(moderationAction),
    resourceType: 'review',
    resourceId: reviewId,
    metadata: {
      reviewId,
      fromStatus: review.status,
      toStatus: nextStatus,
      moderationSource,
      reason: reason.trim(),
      before,
      after,
    },
  });
}

