'use client';

import { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import { useUpload } from '@/hooks/useUpload';
import type { AssetType } from '@/lib/storage/assetService';

interface FileUploadPanelProps {
  assetType: AssetType;
  bookId: string;
  chapterId?: string;
  existingUrl: string | null;
  existingPath: string | null;
  accept: string;
  label: string;
  maxSizeLabel: string;
  onUploadSuccess: (url: string, path: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  /** Compact mode hides the preview — used inline in chapter table rows */
  compact?: boolean;
}

export default function FileUploadPanel({
  assetType,
  bookId,
  chapterId,
  existingUrl,
  existingPath,
  accept,
  label,
  maxSizeLabel,
  onUploadSuccess,
  onRemove,
  disabled = false,
  compact = false,
}: FileUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state, upload, cancel, retry, reset } = useUpload({
    assetType,
    bookId,
    chapterId,
    existingPath,
    onSuccess: onUploadSuccess,
  });

  // Auto-reset success/cancelled states after 3 seconds
  useEffect(() => {
    if (state.status === 'success' || state.status === 'cancelled') {
      const timer = setTimeout(reset, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.status, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      upload(file);
      // Reset input so the same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const isCover = assetType === 'cover';
  const isUploading = state.status === 'uploading';

  return (
    <Box>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label={`Select ${label} file`}
      />

      {/* Current asset preview (hidden in compact mode) */}
      {!compact && existingUrl && state.status === 'idle' && (
        <Box sx={{ mb: 1.5 }}>
          {isCover ? (
            <Box
              component="img"
              src={existingUrl}
              alt={`${label} preview`}
              sx={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                display: 'block',
                mb: 1,
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AudioFileIcon color="action" />
              <Typography
                variant="body2"
                component="a"
                href={existingUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Current audio file
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              Replace
            </Button>
            {onRemove && (
              <Tooltip title={`Remove ${label}`}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={onRemove}
                  disabled={disabled || isUploading}
                  aria-label={`Remove ${label}`}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* Upload button (shown when no existing asset OR in compact mode) */}
      {((!existingUrl && state.status === 'idle') || compact) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size={compact ? 'small' : 'medium'}
            variant={compact ? 'text' : 'outlined'}
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {compact ? 'Upload' : `Select ${label}`}
          </Button>
          {!compact && (
            <Typography variant="caption" color="text.secondary">
              {maxSizeLabel}
            </Typography>
          )}
        </Box>
      )}

      {/* Upload progress */}
      {state.status === 'uploading' && (
        <Box sx={{ mt: compact ? 0.5 : 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
              Uploading… {state.progress}%
            </Typography>
            <Button
              size="small"
              color="inherit"
              startIcon={<CancelIcon />}
              onClick={cancel}
              sx={{ minWidth: 0, p: '2px 6px' }}
            >
              Cancel
            </Button>
          </Box>
          <LinearProgress
            variant="determinate"
            value={state.progress}
            sx={{ height: 6, borderRadius: 1 }}
            aria-label={`${label} upload progress`}
          />
        </Box>
      )}

      {/* Error state */}
      {state.status === 'error' && (
        <Alert
          severity="error"
          sx={{ mt: compact ? 0.5 : 1 }}
          action={
            <Button
              size="small"
              color="inherit"
              startIcon={<RefreshIcon />}
              onClick={retry}
            >
              Retry
            </Button>
          }
        >
          {state.error}
        </Alert>
      )}

      {/* Success state */}
      {state.status === 'success' && (
        <Alert severity="success" sx={{ mt: compact ? 0.5 : 1 }}>
          Upload complete.
        </Alert>
      )}

      {/* Cancelled state */}
      {state.status === 'cancelled' && (
        <Alert severity="warning" sx={{ mt: compact ? 0.5 : 1 }}>
          Upload cancelled.
        </Alert>
      )}
    </Box>
  );
}
