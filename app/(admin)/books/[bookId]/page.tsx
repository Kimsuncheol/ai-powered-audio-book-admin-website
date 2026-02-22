'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import BookMetadataForm from '@/components/books/BookMetadataForm';
import MediaSection from '@/components/books/MediaSection';
import ChapterList from '@/components/books/ChapterList';
import PublishReadinessPanel from '@/components/books/PublishReadinessPanel';
import BookStatusChip from '@/components/books/BookStatusChip';
import { getBook, updateBook } from '@/lib/books/bookService';
import { listChapters } from '@/lib/books/chapterService';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Actor,
  BookDocument,
  BookFormValues,
  BookStatus,
  ChapterDocument,
} from '@/lib/types';

function bookToFormValues(book: BookDocument): BookFormValues {
  return {
    title: book.title,
    author: book.author,
    narrator: book.narrator ?? '',
    description: book.description,
    language: book.language,
    genres: book.genres,
    tags: book.tags,
  };
}

export default function EditBookPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = params.bookId;
  const router = useRouter();
  const { firebaseUser, role } = useAuth();

  // ---- Page state ----
  const [book, setBook] = useState<BookDocument | null>(null);
  const [chapters, setChapters] = useState<ChapterDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // ---- Metadata form state ----
  const [formValues, setFormValues] = useState<BookFormValues>({
    title: '',
    author: '',
    narrator: '',
    description: '',
    language: 'en',
    genres: [],
    tags: [],
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof BookFormValues, string>>
  >({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const actor: Actor | null =
    firebaseUser && role
      ? { uid: firebaseUser.uid, email: firebaseUser.email ?? '', role }
      : null;

  // ---- Load book + chapters ----
  const load = useCallback(async () => {
    if (!actor) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [bookData, chaptersData] = await Promise.all([
        getBook(bookId, actor),
        listChapters(bookId),
      ]);
      if (!bookData) {
        router.replace('/books');
        return;
      }
      setBook(bookData);
      setChapters(chaptersData);
      setFormValues(bookToFormValues(bookData));
      setIsDirty(false);
    } catch {
      setLoadError('Failed to load book. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  // FR-UP-003: Warn before leaving with unsaved metadata changes
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

  // ---- Metadata form handlers ----
  const handleFormChange = (
    field: keyof BookFormValues,
    value: string | string[]
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BookFormValues, string>> = {};
    if (!formValues.title.trim()) newErrors.title = 'Title is required';
    if (!formValues.author.trim()) newErrors.author = 'Author is required';
    if (!formValues.description.trim()) newErrors.description = 'Description is required';
    if (!formValues.language) newErrors.language = 'Language is required';
    if (formValues.genres.length === 0) newErrors.genres = 'At least one genre is required';
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveMetadata = async () => {
    if (!validateForm() || !actor || !book) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateBook(bookId, formValues, actor);
      setBook((prev) =>
        prev
          ? {
              ...prev,
              title: formValues.title.trim(),
              author: formValues.author.trim(),
              narrator: formValues.narrator.trim() || null,
              description: formValues.description.trim(),
              language: formValues.language,
              genres: formValues.genres,
              tags: formValues.tags,
            }
          : prev
      );
      setIsDirty(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardMetadata = () => {
    if (!book) return;
    setFormValues(bookToFormValues(book));
    setFormErrors({});
    setIsDirty(false);
    setSaveError(null);
  };

  // ---- Book + chapter update callbacks (for Media and Chapters tabs) ----
  const handleBookUpdate = (updates: Partial<BookDocument>) => {
    setBook((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleStatusChange = (newStatus: BookStatus) => {
    setBook((prev) => (prev ? { ...prev, status: newStatus } : prev));
  };

  // ---- Render ----
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !book || !actor) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {loadError ?? 'Book not found.'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
        <IconButton
          component={Link}
          href="/books"
          aria-label="Back to books"
          size="small"
          sx={{ mt: 0.5 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h4" fontWeight={700}>
              {book.title}
            </Typography>
            <BookStatusChip status={book.status} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            by {book.author}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Two-column layout */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Left: 3-tab form */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}
          >
            <Tab label="Metadata" />
            <Tab label="Media" />
            <Tab label="Chapters" />
          </Tabs>

          {/* Tab 0: Metadata */}
          {activeTab === 0 && (
            <Paper variant="outlined" sx={{ p: 3, mt: 0, borderTop: 0, borderRadius: '0 0 4px 4px' }}>
              {saveError && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  onClose={() => setSaveError(null)}
                >
                  {saveError}
                </Alert>
              )}
              <BookMetadataForm
                values={formValues}
                onChange={handleFormChange}
                errors={formErrors}
                disabled={isSaving}
              />
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 2,
                }}
              >
                <Button
                  onClick={handleDiscardMetadata}
                  disabled={!isDirty || isSaving}
                  startIcon={<UndoIcon />}
                >
                  Discard
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveMetadata}
                  disabled={!isDirty || isSaving}
                  startIcon={
                    isSaving ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </Box>
            </Paper>
          )}

          {/* Tab 1: Media */}
          {activeTab === 1 && (
            <MediaSection
              book={book}
              bookId={bookId}
              actor={actor}
              onBookUpdate={handleBookUpdate}
            />
          )}

          {/* Tab 2: Chapters */}
          {activeTab === 2 && (
            <ChapterList
              bookId={bookId}
              chapters={chapters}
              actor={actor}
              onChaptersChange={setChapters}
            />
          )}
        </Box>

        {/* Right: Publish readiness panel (sticky) */}
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <PublishReadinessPanel
            book={book}
            bookId={bookId}
            chapters={chapters}
            actor={actor}
            onStatusChange={handleStatusChange}
          />
        </Box>
      </Box>
    </Box>
  );
}
