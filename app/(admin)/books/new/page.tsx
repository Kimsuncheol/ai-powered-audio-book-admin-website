'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import BookMetadataForm from '@/components/books/BookMetadataForm';
import { createBook } from '@/lib/books/bookService';
import { useAuth } from '@/contexts/AuthContext';
import type { Actor, BookFormValues } from '@/lib/types';

const EMPTY_FORM: BookFormValues = {
  title: '',
  author: '',
  narrator: '',
  description: '',
  language: 'en',
  genres: [],
  tags: [],
};

export default function NewBookPage() {
  const router = useRouter();
  const { firebaseUser, role } = useAuth();

  const [values, setValues] = useState<BookFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormValues, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // FR-UP-003: Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleChange = (
    field: keyof BookFormValues,
    value: string | string[]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BookFormValues, string>> = {};
    if (!values.title.trim()) newErrors.title = 'Title is required';
    if (!values.author.trim()) newErrors.author = 'Author is required';
    if (!values.description.trim()) newErrors.description = 'Description is required';
    if (!values.language) newErrors.language = 'Language is required';
    if (values.genres.length === 0) newErrors.genres = 'At least one genre is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!firebaseUser || !role) return;

    const actor: Actor = {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      role,
    };

    setIsSaving(true);
    setSaveError(null);

    try {
      const bookId = await createBook(
        {
          title: values.title.trim(),
          author: values.author.trim(),
          narrator: values.narrator.trim() || null,
          description: values.description.trim(),
          language: values.language,
          genres: values.genres,
          tags: values.tags,
          coverImageUrl: null,
          coverImagePath: null,
          audioUrl: null,
          audioPath: null,
        },
        actor
      );

      setIsDirty(false);
      router.push(`/books/${bookId}`);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    router.push('/books');
  };

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton
          component={Link}
          href="/books"
          aria-label="Back to books"
          size="small"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={700}>
          New Book
        </Typography>
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Fill in the book metadata and save as a draft. You can upload cover
          images, audio, and manage chapters after saving.
        </Typography>

        <BookMetadataForm
          values={values}
          onChange={handleChange}
          errors={errors}
          disabled={isSaving}
        />
      </Paper>

      <Box
        sx={{
          mt: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
        }}
      >
        <Button onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={
            isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
        >
          {isSaving ? 'Saving…' : 'Save Draft'}
        </Button>
      </Box>
    </Box>
  );
}
