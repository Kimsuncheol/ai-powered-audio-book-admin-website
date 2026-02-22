'use client';

import { useState, useRef, useCallback } from 'react';
import { getDownloadURL } from 'firebase/storage';
import type { UploadTask } from 'firebase/storage';
import type { UploadState } from '@/lib/types';
import {
  validateAsset,
  buildStoragePath,
  startUpload,
  deleteAsset,
  type AssetType,
} from '@/lib/storage/assetService';

// ---- Types ----

export interface UseUploadOptions {
  assetType: AssetType;
  bookId: string;
  chapterId?: string;
  /** OD-UP-003: deleted immediately after successful replacement upload */
  existingPath?: string | null;
  onSuccess: (downloadUrl: string, storagePath: string) => void;
}

export interface UseUploadReturn {
  state: UploadState;
  upload: (file: File) => void;
  cancel: () => void;
  retry: () => void;
  reset: () => void;
}

// ---- Initial state ----

const INITIAL_STATE: UploadState = {
  status: 'idle',
  progress: 0,
  error: null,
  downloadUrl: null,
  storagePath: null,
};

// ---- Hook ----

export function useUpload(options: UseUploadOptions): UseUploadReturn {
  const [state, setState] = useState<UploadState>(INITIAL_STATE);
  const taskRef = useRef<UploadTask | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const upload = useCallback(
    (file: File) => {
      lastFileRef.current = file;

      // 1. Validate MIME type and file size
      const validationError = validateAsset(file, options.assetType);
      if (validationError) {
        setState({
          ...INITIAL_STATE,
          status: 'error',
          error: validationError.message,
        });
        return;
      }

      // 2. Build unique storage path using timestamp to avoid collisions
      const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
      const uniqueName = `${Date.now()}${ext ? '.' + ext : ''}`;
      const path = buildStoragePath(
        options.assetType,
        options.bookId,
        uniqueName,
        options.chapterId
      );

      setState({
        status: 'uploading',
        progress: 0,
        error: null,
        downloadUrl: null,
        storagePath: path,
      });

      // 3. Start upload
      const task = startUpload(path, file);
      taskRef.current = task;

      // 4. Attach listeners
      task.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setState((prev) => ({ ...prev, progress: pct }));
        },
        (error) => {
          if (error.code === 'storage/canceled') {
            setState({ ...INITIAL_STATE, status: 'cancelled', error: 'Upload cancelled.' });
          } else {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: error.message || 'Upload failed. Please try again.',
            }));
          }
        },
        async () => {
          try {
            // 5. Get download URL
            const url = await getDownloadURL(task.snapshot.ref);

            // 6. OD-UP-003: Delete old file immediately after successful replacement
            if (options.existingPath && options.existingPath !== path) {
              await deleteAsset(options.existingPath);
            }

            // 7. Notify parent, update state
            options.onSuccess(url, path);
            setState((prev) => ({
              ...prev,
              status: 'success',
              downloadUrl: url,
              progress: 100,
            }));
          } catch (err) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: err instanceof Error ? err.message : 'Failed to complete upload.',
            }));
          }
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.assetType, options.bookId, options.chapterId, options.existingPath, options.onSuccess]
  );

  const cancel = useCallback(() => {
    taskRef.current?.cancel();
  }, []);

  const retry = useCallback(() => {
    if (lastFileRef.current) {
      upload(lastFileRef.current);
    }
  }, [upload]);

  const reset = useCallback(() => {
    taskRef.current?.cancel();
    taskRef.current = null;
    lastFileRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return { state, upload, cancel, retry, reset };
}
