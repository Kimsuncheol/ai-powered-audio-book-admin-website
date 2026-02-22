'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { createChapter, updateChapter } from '@/lib/books/chapterService';
import type { Actor, ChapterDocument } from '@/lib/types';

interface ChapterEditorDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  bookId: string;
  chapter?: ChapterDocument | null;
  /** All current order values for uniqueness validation */
  existingOrders: number[];
  actor: Actor;
  onClose: () => void;
  onSaved: (chapter: ChapterDocument) => void;
}

export default function ChapterEditorDialog({
  open,
  mode,
  bookId,
  chapter,
  existingOrders,
  actor,
  onClose,
  onSaved,
}: ChapterEditorDialogProps) {
  // Compute the next available order for new chapters
  const nextOrder =
    existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;

  const [title, setTitle] = useState('');
  const [order, setOrder] = useState<string>('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Populate fields when dialog opens or chapter changes
  useEffect(() => {
    if (open) {
      setTitle(chapter?.title ?? '');
      setOrder(String(chapter?.order ?? nextOrder));
      setTitleError(null);
      setOrderError(null);
      setSaveError(null);
    }
  }, [open, chapter, nextOrder]);

  const validate = (): boolean => {
    let valid = true;

    if (!title.trim()) {
      setTitleError('Title is required');
      valid = false;
    } else {
      setTitleError(null);
    }

    const orderNum = parseInt(order, 10);
    if (isNaN(orderNum) || orderNum < 1) {
      setOrderError('Order must be a positive integer');
      valid = false;
    } else {
      // Check uniqueness (exclude this chapter's own current order in edit mode)
      const ownOrder = mode === 'edit' ? chapter?.order : undefined;
      const conflicting = existingOrders.filter((o) => o !== ownOrder);
      if (conflicting.includes(orderNum)) {
        setOrderError(`Order ${orderNum} is already used by another chapter`);
        valid = false;
      } else {
        setOrderError(null);
      }
    }

    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const orderNum = parseInt(order, 10);
    setIsSaving(true);
    setSaveError(null);

    try {
      if (mode === 'add') {
        const newId = await createChapter(
          bookId,
          { title: title.trim(), order: orderNum },
          actor
        );
        onSaved({
          id: newId,
          bookId,
          title: title.trim(),
          order: orderNum,
          audioUrl: null,
          audioPath: null,
          createdAt: null as never,
          updatedAt: null as never,
        });
      } else {
        await updateChapter(
          bookId,
          chapter!.id!,
          { title: title.trim(), order: orderNum },
          actor
        );
        onSaved({ ...chapter!, title: title.trim(), order: orderNum });
      }
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === 'ORDER_CONFLICT') {
        setOrderError(`Order ${orderNum} is already used by another chapter`);
      } else {
        setSaveError(
          err instanceof Error ? err.message : 'Failed to save chapter'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'add' ? 'Add Chapter' : 'Edit Chapter'}
      </DialogTitle>

      <DialogContent>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        <TextField
          label="Chapter Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={!!titleError}
          helperText={titleError}
          required
          fullWidth
          margin="normal"
          disabled={isSaving}
          autoFocus
        />

        <TextField
          label="Order"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          error={!!orderError}
          helperText={orderError ?? 'Position of this chapter (1 = first)'}
          required
          fullWidth
          margin="normal"
          type="number"
          disabled={isSaving}
          inputProps={{ min: 1, step: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
