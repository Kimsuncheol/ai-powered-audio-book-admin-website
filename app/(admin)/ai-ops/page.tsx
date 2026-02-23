'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import AiJobList from '@/components/aiOps/AiJobList';
import { useAuth } from '@/contexts/AuthContext';
import { listAiJobs } from '@/lib/aiOps/aiOpsService';
import type { Actor, AiJobDocument } from '@/lib/types';

export default function AiOpsPage() {
  const { firebaseUser, role } = useAuth();
  const [jobs, setJobs] = useState<AiJobDocument[]>([]);
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

  const loadData = useCallback(async () => {
    if (!actor) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listAiJobs(
        { limit: 200, sortField: 'updatedAt', sortDirection: 'desc' },
        actor
      );
      setJobs(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load AI jobs.');
    } finally {
      setIsLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    loadData();
  }, [actor, loadData]);

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
        AI Ops
      </Typography>
      <AiJobList jobs={jobs} isLoading={isLoading} loadError={loadError} />
    </Box>
  );
}
