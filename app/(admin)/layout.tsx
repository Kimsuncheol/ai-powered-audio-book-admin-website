'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/layout/AdminLayout';

/**
 * AuthGuard layout for all admin routes.
 *
 * Three-state pattern to prevent flash of unauthorized content:
 * 1. isLoading=true  → render spinner (auth state not yet resolved)
 * 2. !isAuthenticated → redirect to /login + render null
 * 3. isAuthenticated  → render AdminLayout with protected content
 */
export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isDashboardRoute = pathname === '/';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    if (isDashboardRoute) {
      return <AdminLayout>{children}</AdminLayout>;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect is in progress via useEffect; render nothing to avoid flash
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
