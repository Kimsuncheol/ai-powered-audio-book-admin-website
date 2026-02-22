'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FileUploadPanel from './FileUploadPanel';
import {
  updateBookCover,
  updateBookAudio,
  removeBookCover,
  removeBookAudio,
} from '@/lib/books/bookService';
import { deleteAsset } from '@/lib/storage/assetService';
import type { Actor, BookDocument } from '@/lib/types';

interface MediaSectionProps {
  book: BookDocument;
  bookId: string;
  actor: Actor;
  onBookUpdate: (updates: Partial<BookDocument>) => void;
}

export default function MediaSection({
  book,
  bookId,
  actor,
  onBookUpdate,
}: MediaSectionProps) {
  // ---- Cover Image handlers ----

  const handleCoverUploadSuccess = async (url: string, path: string) => {
    await updateBookCover(bookId, url, path, actor);
    onBookUpdate({ coverImageUrl: url, coverImagePath: path });
  };

  const handleCoverRemove = async () => {
    if (book.coverImagePath) {
      await deleteAsset(book.coverImagePath);
    }
    await removeBookCover(bookId, actor);
    onBookUpdate({ coverImageUrl: null, coverImagePath: null });
  };

  // ---- Book Audio handlers ----

  const handleAudioUploadSuccess = async (url: string, path: string) => {
    await updateBookAudio(bookId, url, path, actor);
    onBookUpdate({ audioUrl: url, audioPath: path });
  };

  const handleAudioRemove = async () => {
    if (book.audioPath) {
      await deleteAsset(book.audioPath);
    }
    await removeBookAudio(bookId, actor);
    onBookUpdate({ audioUrl: null, audioPath: null });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
      {/* Cover Image */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Cover Image
        </Typography>
        <FileUploadPanel
          assetType="cover"
          bookId={bookId}
          existingUrl={book.coverImageUrl}
          existingPath={book.coverImagePath}
          accept="image/jpeg,image/png,image/webp"
          label="Cover Image"
          maxSizeLabel="Max 10 MB (JPG, PNG, WebP)"
          onUploadSuccess={handleCoverUploadSuccess}
          onRemove={handleCoverRemove}
        />
      </Paper>

      {/* Book-Level Audio */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={0.5}>
          Book-Level Audio
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Upload a single audio file for the entire book. Alternatively, add
          per-chapter audio files in the Chapters tab. Publishing requires at
          least one of the two.
        </Typography>
        <FileUploadPanel
          assetType="bookAudio"
          bookId={bookId}
          existingUrl={book.audioUrl}
          existingPath={book.audioPath}
          accept="audio/mpeg,audio/mp4,audio/aac,audio/x-m4a"
          label="Book Audio"
          maxSizeLabel="Max 1.5 GB (MP3, M4A, AAC)"
          onUploadSuccess={handleAudioUploadSuccess}
          onRemove={handleAudioRemove}
        />
      </Paper>
    </Box>
  );
}
