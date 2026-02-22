'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import SettingsList from '@/components/settings/SettingsList';
import { useAuth } from '@/contexts/AuthContext';
import { listSettings } from '@/lib/settings/settingsService';
import type { Actor, SettingDocument } from '@/lib/types';

export default function SettingsPage() {
  const { firebaseUser, role } = useAuth();
  const [settings, setSettings] = useState<SettingDocument[]>([]);
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
      const data = await listSettings(
        { limit: 300, sortField: 'lastUpdatedAt', sortDirection: 'desc' },
        actor
      );
      setSettings(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings.');
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
        Settings
      </Typography>
      <SettingsList settings={settings} isLoading={isLoading} loadError={loadError} />
    </Box>
  );
}
