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
import AssignReportDialog from '@/components/reports/AssignReportDialog';
import ReportHistoryTimeline from '@/components/reports/ReportHistoryTimeline';
import ReportStatusChip from '@/components/reports/ReportStatusChip';
import ReportStatusDialog from '@/components/reports/ReportStatusDialog';
import ReportTargetTypeChip from '@/components/reports/ReportTargetTypeChip';
import ResolveReportDialog from '@/components/reports/ResolveReportDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAssignReport,
  canResolveReport,
  canUpdateReportStatus,
  canViewReporterEmail,
} from '@/lib/reports/reportRbac';
import { getAllowedNextReportStatuses } from '@/lib/reports/reportValidation';
import { getReport, getReportHistory } from '@/lib/reports/reportService';
import type { Actor, ReportDocument, ReportHistoryEntry } from '@/lib/types';

function formatDate(value: { toDate?: () => Date } | null | undefined): string {
  if (!value) return '—';
  try {
    return (typeof value.toDate === 'function' ? value.toDate() : new Date()).toLocaleString();
  } catch {
    return '—';
  }
}

type ActiveDialog = 'assign' | 'status' | 'resolve' | null;

export default function ReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const router = useRouter();
  const { firebaseUser, role } = useAuth();

  const [report, setReport] = useState<ReportDocument | null>(null);
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  const actor = useMemo<Actor | null>(
    () =>
      firebaseUser && role
        ? { uid: firebaseUser.uid, email: firebaseUser.email ?? '', role }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firebaseUser?.uid, firebaseUser?.email, role]
  );

  const reportId = typeof params.reportId === 'string' ? params.reportId : '';

  const loadData = useCallback(async () => {
    if (!actor || !reportId) return;

    setIsLoading(true);
    setLoadError(null);
    setHistoryError(null);
    try {
      const [reportData, historyData] = await Promise.all([
        getReport(reportId, actor),
        getReportHistory(reportId, actor),
      ]);
      if (!reportData) {
        setLoadError('Report not found.');
        setReport(null);
      } else {
        setReport(reportData);
      }
      setHistory(historyData);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load report.');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [actor, reportId]);

  useEffect(() => {
    if (!actor || !reportId) return;
    loadData();
  }, [actor, reportId, loadData]);

  const actionPermissions = useMemo(() => {
    const hasAnyStatusTransitions = report
      ? getAllowedNextReportStatuses(report.status).length > 0
      : false;
    const canResolveFromCurrentStatus =
      report?.status === 'open' || report?.status === 'in_review';

    return {
      canAssign: role ? canAssignReport(role) : false,
      canUpdateStatus:
        !!report && !!role && canUpdateReportStatus(role) && hasAnyStatusTransitions,
      canResolve:
        !!report && !!role && canResolveReport(role) && canResolveFromCurrentStatus,
      canSeeReporterEmail: role ? canViewReporterEmail(role) : false,
    };
  }, [report, role]);

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

  if (loadError || !report) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/reports')} sx={{ mb: 2 }}>
          Back to Reports
        </Button>
        <Alert severity="error">{loadError ?? 'Report not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => router.push('/reports')} aria-label="Back to reports">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            Report {report.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Target {report.targetEntityType}:{' '}
            <span style={{ fontFamily: 'monospace' }}>{report.targetEntityId}</span>
          </Typography>
        </Box>
        <ReportStatusChip status={report.status} />
        <ReportTargetTypeChip targetEntityType={report.targetEntityType} />
        <Tooltip title="Refresh">
          <IconButton onClick={loadData} aria-label="Refresh report">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Report Metadata
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Category:</strong> {report.category}
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {report.description?.trim() || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Reporter UID:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{report.reporterUid ?? '—'}</span>
              </Typography>
              <Typography variant="body2">
                <strong>Reporter Email:</strong>{' '}
                {actionPermissions.canSeeReporterEmail ? report.reporterEmail ?? '—' : 'Hidden'}
              </Typography>
              <Typography variant="body2">
                <strong>Severity:</strong> {report.severity ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Priority:</strong> {report.priority ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {formatDate(report.createdAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Updated:</strong> {formatDate(report.updatedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Updated By:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{report.updatedBy ?? '—'}</span>
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Target Reference
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Target Type:</strong> {report.targetEntityType}
              </Typography>
              <Typography variant="body2">
                <strong>Target ID:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{report.targetEntityId}</span>
              </Typography>
              <Alert severity="info" sx={{ mt: 1 }}>
                Live target lookup and evidence snapshots are not implemented in MVP. This report
                view intentionally remains usable with metadata only.
              </Alert>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ReportHistoryTimeline entries={history} loadError={historyError} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Assignment
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Assignee UID:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{report.assignedToUid ?? '—'}</span>
              </Typography>
              <Typography variant="body2">
                <strong>Assigned At:</strong> {formatDate(report.assignedAt)}
              </Typography>
              <Button
                variant="contained"
                onClick={() => setActiveDialog('assign')}
                disabled={!actionPermissions.canAssign}
              >
                {report.assignedToUid ? 'Reassign Report' : 'Assign Report'}
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Status & Resolution
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.25}>
              <Typography variant="body2">
                <strong>Status:</strong> {report.status}
              </Typography>
              <Typography variant="body2">
                <strong>Resolution Outcome:</strong> {report.resolutionOutcome ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Resolved By:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>{report.resolvedBy ?? '—'}</span>
              </Typography>
              <Typography variant="body2">
                <strong>Resolved At:</strong> {formatDate(report.resolvedAt)}
              </Typography>
              <Typography variant="body2">
                <strong>Resolution Note:</strong> {report.resolutionNote ?? '—'}
              </Typography>

              <Button
                variant="outlined"
                onClick={() => setActiveDialog('status')}
                disabled={!actionPermissions.canUpdateStatus}
              >
                Change Status
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={() => setActiveDialog('resolve')}
                disabled={!actionPermissions.canResolve}
              >
                Resolve / Dismiss
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <AssignReportDialog
        open={activeDialog === 'assign'}
        report={report}
        actor={actor}
        onClose={() => setActiveDialog(null)}
        onSuccess={loadData}
      />
      <ReportStatusDialog
        open={activeDialog === 'status'}
        report={report}
        actor={actor}
        onClose={() => setActiveDialog(null)}
        onSuccess={loadData}
      />
      <ResolveReportDialog
        open={activeDialog === 'resolve'}
        report={report}
        actor={actor}
        onClose={() => setActiveDialog(null)}
        onSuccess={loadData}
      />
    </Box>
  );
}
