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
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AiJobControlDialog from '@/components/aiOps/AiJobControlDialog';
import AiJobHistoryTimeline from '@/components/aiOps/AiJobHistoryTimeline';
import AiJobStatusChip from '@/components/aiOps/AiJobStatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { canControlAiJobs } from '@/lib/aiOps/aiOpsRbac';
import { getAiJob, getAiJobHistory } from '@/lib/aiOps/aiOpsService';
import { canCancelAiJob, canRetryAiJob } from '@/lib/aiOps/aiOpsValidation';
import type { Actor, AiJobDocument, AiJobHistoryEntry } from '@/lib/types';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

function formatJson(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type ActiveDialog = 'retry' | 'cancel' | null;

export default function AiJobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const { firebaseUser, role } = useAuth();

  const [job, setJob] = useState<AiJobDocument | null>(null);
  const [history, setHistory] = useState<AiJobHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const actor = useMemo<Actor | null>(
    () =>
      firebaseUser && role
        ? { uid: firebaseUser.uid, email: firebaseUser.email ?? '', role }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firebaseUser?.uid, firebaseUser?.email, role]
  );

  const jobId = typeof params.jobId === 'string' ? params.jobId : '';

  const loadData = useCallback(async () => {
    if (!actor || !jobId) return;

    setIsLoading(true);
    setLoadError(null);
    setHistoryError(null);
    try {
      const [jobData, historyData] = await Promise.all([
        getAiJob(jobId, actor),
        getAiJobHistory(jobId, actor),
      ]);
      if (!jobData) {
        setLoadError('AI job not found.');
        setJob(null);
        setHistory([]);
      } else {
        setJob(jobData);
        setHistory(historyData);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load AI job.');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [actor, jobId]);

  useEffect(() => {
    if (!actor || !jobId) return;
    loadData();
  }, [actor, jobId, loadData]);

  const canControl = role ? canControlAiJobs(role) : false;
  const retryEligible = !!job && canRetryAiJob(job);
  const cancelEligible = !!job && canCancelAiJob(job);

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

  if (loadError || !job) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/ai-ops')} sx={{ mb: 2 }}>
          Back to AI Ops
        </Button>
        <Alert severity="error">{loadError ?? 'AI job not found.'}</Alert>
      </Box>
    );
  }

  const failureInfoAvailable =
    !!job.errorCode ||
    !!job.errorMessage ||
    !!job.failureCategory ||
    !!job.fallbackUsed ||
    !!job.fallbackProvider ||
    !!job.fallbackModel;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => router.push('/ai-ops')} aria-label="Back to AI Ops">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 220 }}>
          <Typography variant="h4" fontWeight={700}>
            AI Job {job.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {job.workflowType} · {job.provider} / {job.model}
          </Typography>
        </Box>
        <AiJobStatusChip status={job.status} />
        <Tooltip title="Refresh">
          <IconButton onClick={loadData} aria-label="Refresh AI job">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Job Metadata
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.2}>
              <Typography variant="body2">
                <strong>Workflow:</strong> {job.workflowType}
              </Typography>
              <Typography variant="body2">
                <strong>Provider / Model:</strong> {job.provider} / {job.model}
              </Typography>
              <Typography variant="body2">
                <strong>Priority:</strong> {job.priority ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Initiated By:</strong> {job.initiatedByType ?? '—'}
                {job.initiatedByUid ? ` (${job.initiatedByUid})` : ''}
              </Typography>
              <Typography variant="body2">
                <strong>Target Entity:</strong>{' '}
                {job.targetEntityType && job.targetEntityId
                  ? `${job.targetEntityType}:${job.targetEntityId}`
                  : '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Request ID:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{job.requestId ?? '—'}</span>
              </Typography>
              <Typography variant="body2">
                <strong>Retries:</strong> {job.retryCount}
                {typeof job.maxRetries === 'number' ? ` / ${job.maxRetries}` : ''}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {formatDate(job.createdAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Updated:</strong> {formatDate(job.updatedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Started:</strong> {formatDate(job.startedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Completed:</strong> {formatDate(job.completedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Duration (ms):</strong> {job.durationMs ?? '—'}
              </Typography>
            </Stack>
          </Paper>

          {failureInfoAvailable && (
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Failure / Fallback Info
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.2}>
                <Typography variant="body2">
                  <strong>Error Code:</strong> {job.errorCode ?? '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Failure Category:</strong> {job.failureCategory ?? '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Error Message:</strong> {job.errorMessage ?? '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Fallback Used:</strong>{' '}
                  {typeof job.fallbackUsed === 'boolean' ? String(job.fallbackUsed) : '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Fallback Provider / Model:</strong>{' '}
                  {job.fallbackProvider || job.fallbackModel
                    ? `${job.fallbackProvider ?? '—'} / ${job.fallbackModel ?? '—'}`
                    : '—'}
                </Typography>
              </Stack>
            </Paper>
          )}

          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Input Summary (Sanitized)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography
              variant="caption"
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: 'action.hover',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
              }}
            >
              {formatJson(job.inputSummary)}
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Output Summary (Sanitized)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography
              variant="caption"
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: 'action.hover',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
              }}
            >
              {formatJson(job.outputSummary)}
            </Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <AiJobHistoryTimeline entries={history} loadError={historyError} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<ReplayIcon />}
                onClick={() => setActiveDialog('retry')}
                disabled={!canControl || !retryEligible}
              >
                Retry Job
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<StopCircleIcon />}
                onClick={() => setActiveDialog('cancel')}
                disabled={!canControl || !cancelEligible}
              >
                Cancel Job
              </Button>

              {!canControl && (
                <Alert severity="info">
                  Read-only AI Ops access: only Super Admin can retry/cancel AI jobs in MVP.
                </Alert>
              )}
              {canControl && !retryEligible && (
                <Typography variant="caption" color="text.secondary">
                  Retry is only available for failed or cancelled jobs (and when retry limit is not reached).
                </Typography>
              )}
              {canControl && !cancelEligible && (
                <Typography variant="caption" color="text.secondary">
                  Cancel is only available for queued or running jobs.
                </Typography>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Job Metadata (Raw Summary)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography
              variant="caption"
              component="pre"
              sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
            >
              {formatJson(job.metadata)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {job && activeDialog && (
        <AiJobControlDialog
          open={activeDialog !== null}
          mode={activeDialog}
          job={job}
          actor={actor}
          onClose={() => setActiveDialog(null)}
          onSuccess={async () => {
            setSuccessMessage(
              activeDialog === 'retry'
                ? 'AI job retry requested successfully.'
                : 'AI job cancel requested successfully.'
            );
            await loadData();
          }}
        />
      )}
    </Box>
  );
}
