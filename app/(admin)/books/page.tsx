'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '@/contexts/AuthContext';
import BookList from '@/components/books/BookList';
import type { Actor } from '@/lib/types';

export default function BooksPage() {
  const { firebaseUser, role } = useAuth();

  if (!firebaseUser || !role) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const actor: Actor = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    role,
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Books
      </Typography>
      <BookList actor={actor} />
    </Box>
  );
}
