import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTask,
  type StorageReference,
} from 'firebase/storage';
import storage from '@/lib/firebase/storage';

// ---- Asset types ----

export type AssetType = 'cover' | 'bookAudio' | 'chapterAudio';

// ---- File constraints (SRS §3.4) ----

export const COVER_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'] as const;

export const COVER_IMAGE_MAX_BYTES = 10 * 1024 * 1024;          // 10 MB
export const AUDIO_MAX_BYTES = 1.5 * 1024 * 1024 * 1024;        // 1.5 GB

// ---- Validation ----

export interface AssetValidationError {
  code: 'INVALID_MIME' | 'FILE_TOO_LARGE';
  message: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function validateAsset(
  file: File,
  assetType: AssetType
): AssetValidationError | null {
  const allowedMimes: readonly string[] =
    assetType === 'cover' ? COVER_IMAGE_MIME_TYPES : AUDIO_MIME_TYPES;
  const maxBytes =
    assetType === 'cover' ? COVER_IMAGE_MAX_BYTES : AUDIO_MAX_BYTES;

  if (!allowedMimes.includes(file.type)) {
    return {
      code: 'INVALID_MIME',
      message: `Unsupported file type. Allowed: ${allowedMimes.join(', ')}`,
    };
  }

  if (file.size > maxBytes) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File too large. Maximum size is ${formatBytes(maxBytes)}.`,
    };
  }

  return null;
}

// ---- Storage paths (SRS §4.2) ----

export function buildStoragePath(
  assetType: AssetType,
  bookId: string,
  filename: string,
  chapterId?: string
): string {
  switch (assetType) {
    case 'cover':
      return `admin/books/${bookId}/cover/${filename}`;
    case 'bookAudio':
      return `admin/books/${bookId}/audio/${filename}`;
    case 'chapterAudio':
      if (!chapterId) throw new Error('chapterId is required for chapterAudio');
      return `admin/books/${bookId}/chapters/${chapterId}/${filename}`;
  }
}

// ---- Upload task ----

export function startUpload(path: string, file: File): UploadTask {
  const storageRef = ref(storage, path);
  return uploadBytesResumable(storageRef, file);
}

export async function getAssetUrl(storageRef: StorageReference): Promise<string> {
  return getDownloadURL(storageRef);
}

// ---- Delete (best-effort — never throws) ----

export async function deleteAsset(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (err) {
    console.error('[AssetService] Failed to delete asset at path:', path, err);
  }
}
