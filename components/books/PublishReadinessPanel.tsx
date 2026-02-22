'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import BookStatusChip from './BookStatusChip';
import { validatePublishReadiness } from '@/lib/books/bookValidation';
import { updateBookStatus } from '@/lib/books/bookService';
import type { Actor, BookDocument, BookStatus, ChapterDocument } from '@/lib/types';

interface PublishReadinessPanelProps {
  book: BookDocument;
  bookId: string;
  chapters: ChapterDocument[];
  actor: Actor;
  onStatusChange: (newStatus: BookStatus) => void;
}

export default function PublishReadinessPanel({
  book,
  bookId,
  chapters,
  actor,
  onStatusChange,
}: PublishReadinessPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const readiness = validatePublishReadiness(book, chapters);

  const handleStatusChange = async (newStatus: BookStatus) => {
    setIsUpdating(true);
    setActionError(null);
    try {
      await updateBookStatus(bookId, newStatus, actor);
      onStatusChange(newStatus);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to update status'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2.5, position: 'sticky', top: 80 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
          Publish Status
        </Typography>
        <BookStatusChip status={book.status} />
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* Readiness checklist */}
      <List dense disablePadding>
        {readiness.checks.map((check) => (
          <ListItem key={check.id} disablePadding sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {check.passed ? (
                <CheckCircleIcon color="success" fontSize="small" />
              ) : (
                <ErrorIcon color="error" fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={check.label}
              secondary={check.detail}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>

      {actionError && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Draft → Publish */}
        {book.status === 'draft' && (
          <Button
            variant="contained"
            color="success"
            fullWidth
            disabled={!readiness.ready || isUpdating}
            onClick={() => handleStatusChange('published')}
            startIcon={
              isUpdating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PublishIcon />
              )
            }
          >
            {isUpdating ? 'Publishing…' : 'Publish'}
          </Button>
        )}

        {/* Published → Archive */}
        {book.status === 'published' && (
          <>
            <Button
              variant="outlined"
              color="warning"
              fullWidth
              disabled={isUpdating}
              onClick={() => handleStatusChange('archived')}
              startIcon={
                isUpdating ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <ArchiveIcon />
                )
              }
            >
              Archive
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              disabled={isUpdating}
              onClick={() => handleStatusChange('draft')}
              startIcon={<UnpublishedIcon />}
              size="small"
            >
              Revert to Draft
            </Button>
          </>
        )}

        {/* Archived → Return to Draft */}
        {book.status === 'archived' && (
          <Button
            variant="outlined"
            fullWidth
            disabled={isUpdating}
            onClick={() => handleStatusChange('draft')}
            startIcon={
              isUpdating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <UnarchiveIcon />
              )
            }
          >
            Return to Draft
          </Button>
        )}
      </Box>
    </Paper>
  );
}
