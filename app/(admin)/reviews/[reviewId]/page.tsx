'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReviewHistoryTimeline from '@/components/reviews/ReviewHistoryTimeline';
import ReviewModerationDialog from '@/components/reviews/ReviewModerationDialog';
import ReviewReportSummaryPanel from '@/components/reviews/ReviewReportSummaryPanel';
import ReviewStatusChip from '@/components/reviews/ReviewStatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { canModerateReviews } from '@/lib/reviews/reviewRbac';
import { getAllowedNextReviewStatuses } from '@/lib/reviews/reviewValidation';
import { getReview, getReviewHistory } from '@/lib/reviews/reviewService';
import type {
  Actor,
  ReviewDocument,
  ReviewModerationHistoryEntry,
  ReviewModerationStatus,
} from '@/lib/types';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

export default function ReviewDetailPage() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();
  const { firebaseUser, role } = useAuth();

  const [review, setReview] = useState<ReviewDocument | null>(null);
  const [history, setHistory] = useState<ReviewModerationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeNextStatus, setActiveNextStatus] =
    useState<ReviewModerationStatus | null>(null);

  const actor = useMemo<Actor | null>(
    () =>
      firebaseUser && role
        ? { uid: firebaseUser.uid, email: firebaseUser.email ?? '', role }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firebaseUser?.uid, firebaseUser?.email, role]
  );
  const reviewId = typeof params.reviewId === 'string' ? params.reviewId : '';

  const loadData = useCallback(async () => {
    if (!actor || !reviewId) return;

    setIsLoading(true);
    setLoadError(null);
    setHistoryError(null);
    try {
      const [reviewData, historyData] = await Promise.all([
        getReview(reviewId, actor),
        getReviewHistory(reviewId, actor),
      ]);

      if (!reviewData) {
        setLoadError('Review not found.');
        setReview(null);
      } else {
        setReview(reviewData);
      }
      setHistory(historyData);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load review.');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [actor, reviewId]);

  useEffect(() => {
    if (!actor || !reviewId) return;
    loadData();
  }, [actor, reviewId, loadData]);

  const allowedTransitions = useMemo(
    () => (review ? getAllowedNextReviewStatuses(review.status) : []),
    [review]
  );
  const canModerate = !!role && canModerateReviews(role);

  if (!actor) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !review) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/reviews')} sx={{ mb: 2 }}>
          Back to Reviews
        </Button>
        <Alert severity="error">{loadError ?? 'Review not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => router.push('/reviews')} aria-label="Back to reviews">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            Review {review.id}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Rating readOnly value={review.rating} size="small" />
            <Typography variant="body2" color="text.secondary">
              {review.rating}/5
            </Typography>
          </Box>
        </Box>
        <ReviewStatusChip status={review.status} />
        <Tooltip title="Refresh">
          <IconButton onClick={loadData} aria-label="Refresh review">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Review Content
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Title:</strong> {review.title?.trim() || '—'}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                <strong>Content:</strong> {` ${review.content || '—'}`}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {formatDate(review.createdAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Updated:</strong> {formatDate(review.updatedAt)}
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              References
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>User ID:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{review.userId}</span>
              </Typography>
              <Typography variant="body2">
                <strong>Book ID:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{review.bookId}</span>
              </Typography>
              <Alert severity="info">
                Reviewer/book metadata enrichment is not implemented in MVP. This detail page uses
                stable IDs and moderation fields only.
              </Alert>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Moderation History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ReviewHistoryTimeline entries={history} loadError={historyError} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Moderation
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Status:</strong> {review.status}
              </Typography>
              <Typography variant="body2">
                <strong>Moderated At:</strong> {formatDate(review.moderatedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Moderated By:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{review.moderatedBy ?? '—'}</span>
              </Typography>
              <Typography variant="body2">
                <strong>Reason:</strong> {review.moderationReason ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Source:</strong> {review.moderationSource ?? '—'}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 1 }}>
                {allowedTransitions.includes('hidden') && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => setActiveNextStatus('hidden')}
                    disabled={!canModerate}
                  >
                    Hide
                  </Button>
                )}
                {allowedTransitions.includes('removed') && (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => setActiveNextStatus('removed')}
                    disabled={!canModerate}
                  >
                    Remove
                  </Button>
                )}
                {allowedTransitions.includes('published') && (
                  <Button
                    variant="contained"
                    onClick={() => setActiveNextStatus('published')}
                    disabled={!canModerate}
                  >
                    Restore
                  </Button>
                )}
              </Box>
            </Stack>
          </Paper>

          <ReviewReportSummaryPanel
            reviewId={review.id ?? reviewId}
            reportCount={review.reportCount}
            lastReportedAt={review.lastReportedAt}
          />
        </Grid>
      </Grid>

      {activeNextStatus && (
        <ReviewModerationDialog
          open={!!activeNextStatus}
          review={review}
          nextStatus={activeNextStatus}
          actor={actor}
          onClose={() => setActiveNextStatus(null)}
          onSuccess={loadData}
        />
      )}
    </Box>
  );
}
