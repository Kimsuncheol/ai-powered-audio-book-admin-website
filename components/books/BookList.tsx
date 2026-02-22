'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BookStatusChip from './BookStatusChip';
import { listBooks, duplicateBook } from '@/lib/books/bookService';
import type { Actor, BookDocument, BookStatus } from '@/lib/types';

interface BookListProps {
  actor: Actor;
}

type StatusFilter = BookStatus | 'all';

function formatDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts) return '—';
  try {
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts as unknown as string);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function BookList({ actor }: BookListProps) {
  const [books, setBooks] = useState<BookDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listBooks(actor);
      setBooks(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load books'
      );
    } finally {
      setIsLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const filteredBooks = books.filter((b) => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleDuplicate = async (book: BookDocument) => {
    setDuplicatingId(book.id!);
    try {
      await duplicateBook(book.id!, actor);
      await loadBooks();
    } catch (err) {
      console.error('Failed to duplicate book', err);
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          placeholder="Search by title or author"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: 200 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          size="small"
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All statuses</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="published">Published</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </TextField>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/books/new"
        >
          New Book
        </Button>
      </Box>

      {/* Error */}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {/* Loading */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredBooks.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 6, textAlign: 'center' }}
        >
          <MenuBookIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {books.length === 0
              ? 'No books yet. Click "New Book" to get started.'
              : 'No books match your search or filter.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cover</TableCell>
                <TableCell>Title / Author</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Genres</TableCell>
                <TableCell align="center">Chapters</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBooks.map((book) => (
                <TableRow key={book.id} hover>
                  {/* Cover thumbnail */}
                  <TableCell sx={{ width: 60, py: 1 }}>
                    {book.coverImageUrl ? (
                      <Box
                        component="img"
                        src={book.coverImageUrl}
                        alt={`${book.title} cover`}
                        sx={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 0.5,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 0.5,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MenuBookIcon
                          fontSize="small"
                          sx={{ color: 'text.disabled' }}
                        />
                      </Box>
                    )}
                  </TableCell>

                  {/* Title / Author */}
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {book.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {book.author}
                    </Typography>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <BookStatusChip status={book.status} />
                  </TableCell>

                  {/* Genres */}
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {book.genres.slice(0, 2).join(', ')}
                      {book.genres.length > 2 ? ` +${book.genres.length - 2}` : ''}
                    </Typography>
                  </TableCell>

                  {/* Chapters count */}
                  <TableCell align="center">
                    <Typography variant="body2">{book.totalChapters}</Typography>
                  </TableCell>

                  {/* Updated */}
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(book.updatedAt as Parameters<typeof formatDate>[0])}
                    </Typography>
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    <Tooltip title="Edit book">
                      <IconButton
                        size="small"
                        component={Link}
                        href={`/books/${book.id}`}
                        aria-label={`Edit ${book.title}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate as draft">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleDuplicate(book)}
                          disabled={duplicatingId === book.id}
                          aria-label={`Duplicate ${book.title}`}
                        >
                          {duplicatingId === book.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <ContentCopyIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
