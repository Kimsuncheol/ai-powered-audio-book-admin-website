'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ReportList from '@/components/reports/ReportList';
import { useAuth } from '@/contexts/AuthContext';
import { listReports } from '@/lib/reports/reportService';
import type { Actor, ReportDocument } from '@/lib/types';

export default function ReportsPage() {
  const { firebaseUser, role } = useAuth();
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const actor = useMemo<Actor | null>(
    () =>
      firebaseUser && role
        ? { uid: firebaseUser.uid, email: firebaseUser.email ?? '', role }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firebaseUser?.uid, firebaseUser?.email, role]
  );

  const loadReports = useCallback(async () => {
    if (!actor) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listReports(
        { limit: 200, sortField: 'updatedAt', sortDirection: 'desc' },
        actor
      );
      setReports(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    loadReports();
  }, [actor, loadReports]);

  if (!actor) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Reports
      </Typography>
      <ReportList reports={reports} isLoading={isLoading} loadError={loadError} />
    </Box>
  );
}
