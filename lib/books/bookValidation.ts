import type {
  BookDocument,
  ChapterDocument,
  PublishCheck,
  PublishCheckId,
  PublishReadiness,
} from '@/lib/types';

/**
 * Pure function — no Firestore calls, no React hooks.
 * Evaluates all publish readiness checks for a given book and its chapters.
 *
 * OD-UP-001 audio rule: audio check passes if:
 *   book.audioUrl !== null  OR  chapters.some(c => c.audioUrl !== null)
 */
export function validatePublishReadiness(
  book: BookDocument,
  chapters: ChapterDocument[]
): PublishReadiness {
  const chaptersWithAudio = chapters.filter((c) => c.audioUrl !== null).length;

  const checks: PublishCheck[] = [
    {
      id: 'title' as PublishCheckId,
      label: 'Title is required',
      passed: book.title.trim().length > 0,
    },
    {
      id: 'author' as PublishCheckId,
      label: 'Author is required',
      passed: book.author.trim().length > 0,
    },
    {
      id: 'description' as PublishCheckId,
      label: 'Description is required',
      passed: book.description.trim().length > 0,
    },
    {
      id: 'language' as PublishCheckId,
      label: 'Language is required',
      passed: book.language.trim().length > 0,
    },
    {
      id: 'genres' as PublishCheckId,
      label: 'At least one genre is required',
      passed: book.genres.length > 0,
    },
    {
      id: 'coverImage' as PublishCheckId,
      label: 'Cover image is required',
      passed: book.coverImageUrl !== null,
    },
    {
      id: 'audio' as PublishCheckId,
      label: 'Book-level audio or at least one chapter with audio is required',
      passed: book.audioUrl !== null || chaptersWithAudio > 0,
      detail:
        book.audioUrl === null
          ? `${chaptersWithAudio} of ${chapters.length} chapter(s) have audio`
          : undefined,
    },
  ];

  return {
    ready: checks.every((c) => c.passed),
    checks,
  };
}
