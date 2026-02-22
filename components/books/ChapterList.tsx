'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import MusicOffIcon from '@mui/icons-material/MusicOff';
import ChapterEditorDialog from './ChapterEditorDialog';
import FileUploadPanel from './FileUploadPanel';
import {
  deleteChapter,
  swapChapterOrder,
  updateChapterAudio,
} from '@/lib/books/chapterService';
import { deleteAsset } from '@/lib/storage/assetService';
import type { Actor, ChapterDocument } from '@/lib/types';

interface ChapterListProps {
  bookId: string;
  chapters: ChapterDocument[];
  actor: Actor;
  onChaptersChange: (chapters: ChapterDocument[]) => void;
}

export default function ChapterList({
  bookId,
  chapters,
  actor,
  onChaptersChange,
}: ChapterListProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterDocument | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  const openAddDialog = () => {
    setEditingChapter(null);
    setEditorOpen(true);
  };

  const openEditDialog = (chapter: ChapterDocument) => {
    setEditingChapter(chapter);
    setEditorOpen(true);
  };

  const handleSaved = (saved: ChapterDocument) => {
    const exists = chapters.find((c) => c.id === saved.id);
    if (exists) {
      onChaptersChange(
        chapters.map((c) => (c.id === saved.id ? saved : c))
      );
    } else {
      onChaptersChange([...chapters, saved]);
    }
  };

  const handleMoveUp = async (idx: number) => {
    const sorted = sortedChapters;
    if (idx === 0) return;
    const a = sorted[idx];
    const b = sorted[idx - 1];
    try {
      await swapChapterOrder(bookId, a.id!, a.order, b.id!, b.order, actor);
      // Optimistic update
      onChaptersChange(
        chapters.map((c) => {
          if (c.id === a.id) return { ...c, order: b.order };
          if (c.id === b.id) return { ...c, order: a.order };
          return c;
        })
      );
    } catch {
      setActionError('Failed to reorder chapters. Please try again.');
    }
  };

  const handleMoveDown = async (idx: number) => {
    const sorted = sortedChapters;
    if (idx === sorted.length - 1) return;
    const a = sorted[idx];
    const b = sorted[idx + 1];
    try {
      await swapChapterOrder(bookId, a.id!, a.order, b.id!, b.order, actor);
      onChaptersChange(
        chapters.map((c) => {
          if (c.id === a.id) return { ...c, order: b.order };
          if (c.id === b.id) return { ...c, order: a.order };
          return c;
        })
      );
    } catch {
      setActionError('Failed to reorder chapters. Please try again.');
    }
  };

  const handleDelete = async (chapter: ChapterDocument) => {
    if (!window.confirm(`Delete chapter "${chapter.title}"?`)) return;
    try {
      if (chapter.audioPath) {
        await deleteAsset(chapter.audioPath);
      }
      await deleteChapter(bookId, chapter.id!, actor);
      onChaptersChange(chapters.filter((c) => c.id !== chapter.id));
    } catch {
      setActionError('Failed to delete chapter. Please try again.');
    }
  };

  const handleChapterAudioUploadSuccess = async (
    chapter: ChapterDocument,
    url: string,
    path: string
  ) => {
    await updateChapterAudio(bookId, chapter.id!, url, path, actor);
    onChaptersChange(
      chapters.map((c) =>
        c.id === chapter.id ? { ...c, audioUrl: url, audioPath: path } : c
      )
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Chapters ({chapters.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAddDialog}
          size="small"
        >
          Add Chapter
        </Button>
      </Box>

      {actionError && (
        <Alert
          severity="error"
          onClose={() => setActionError(null)}
          sx={{ mb: 2 }}
        >
          {actionError}
        </Alert>
      )}

      {chapters.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No chapters yet. Click &ldquo;Add Chapter&rdquo; to get started.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={60}>Order</TableCell>
                <TableCell>Title</TableCell>
                <TableCell width={80} align="center">
                  Audio
                </TableCell>
                <TableCell width={280} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedChapters.map((chapter, idx) => (
                <TableRow key={chapter.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {chapter.order}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{chapter.title}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={
                        chapter.audioUrl ? 'Audio uploaded' : 'No audio'
                      }
                    >
                      {chapter.audioUrl ? (
                        <AudioFileIcon color="success" fontSize="small" />
                      ) : (
                        <MusicOffIcon color="disabled" fontSize="small" />
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                      }}
                    >
                      {/* NFR-UP-009: accessible up/down reorder buttons */}
                      <Tooltip title="Move up">
                        <span>
                          <IconButton
                            size="small"
                            disabled={idx === 0}
                            onClick={() => handleMoveUp(idx)}
                            aria-label={`Move chapter "${chapter.title}" up`}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Move down">
                        <span>
                          <IconButton
                            size="small"
                            disabled={idx === sortedChapters.length - 1}
                            onClick={() => handleMoveDown(idx)}
                            aria-label={`Move chapter "${chapter.title}" down`}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* Compact audio upload */}
                      <FileUploadPanel
                        assetType="chapterAudio"
                        bookId={bookId}
                        chapterId={chapter.id}
                        existingUrl={chapter.audioUrl}
                        existingPath={chapter.audioPath}
                        accept="audio/mpeg,audio/mp4,audio/aac,audio/x-m4a"
                        label="Chapter Audio"
                        maxSizeLabel="Max 1.5 GB"
                        onUploadSuccess={(url, path) =>
                          handleChapterAudioUploadSuccess(chapter, url, path)
                        }
                        compact
                      />

                      <Tooltip title="Edit chapter">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(chapter)}
                          aria-label={`Edit chapter "${chapter.title}"`}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete chapter">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(chapter)}
                          aria-label={`Delete chapter "${chapter.title}"`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ChapterEditorDialog
        open={editorOpen}
        mode={editingChapter ? 'edit' : 'add'}
        bookId={bookId}
        chapter={editingChapter}
        existingOrders={chapters.map((c) => c.order)}
        actor={actor}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
      />
    </Box>
  );
}
