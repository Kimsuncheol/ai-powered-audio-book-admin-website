'use client';

import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import type { BookFormValues } from '@/lib/types';

// ---- Constants ----

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'pt', label: 'Portuguese' },
];

const GENRE_OPTIONS = [
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Thriller',
  'Romance',
  'Science Fiction',
  'Fantasy',
  'Horror',
  'Biography',
  'Autobiography',
  'Self-Help',
  'History',
  'Business',
  'Science',
  'Technology',
  'Children',
  'Young Adult',
  'Poetry',
  'Philosophy',
  'Religion',
  'Health',
  'Travel',
  'Humor',
  'Sports',
  'Music',
  'Art',
  'Politics',
  'True Crime',
];

// ---- Props ----

interface BookMetadataFormProps {
  values: BookFormValues;
  onChange: (field: keyof BookFormValues, value: string | string[]) => void;
  errors: Partial<Record<keyof BookFormValues, string>>;
  disabled?: boolean;
}

export default function BookMetadataForm({
  values,
  onChange,
  errors,
  disabled = false,
}: BookMetadataFormProps) {
  return (
    <>
      <TextField
        label="Title"
        value={values.title}
        onChange={(e) => onChange('title', e.target.value)}
        error={!!errors.title}
        helperText={errors.title}
        required
        fullWidth
        margin="normal"
        disabled={disabled}
        inputProps={{ maxLength: 200 }}
      />

      <TextField
        label="Author"
        value={values.author}
        onChange={(e) => onChange('author', e.target.value)}
        error={!!errors.author}
        helperText={errors.author}
        required
        fullWidth
        margin="normal"
        disabled={disabled}
        inputProps={{ maxLength: 120 }}
      />

      <TextField
        label="Narrator"
        value={values.narrator}
        onChange={(e) => onChange('narrator', e.target.value)}
        error={!!errors.narrator}
        helperText={errors.narrator ?? 'Optional'}
        fullWidth
        margin="normal"
        disabled={disabled}
        inputProps={{ maxLength: 120 }}
      />

      <TextField
        label="Description"
        value={values.description}
        onChange={(e) => onChange('description', e.target.value)}
        error={!!errors.description}
        helperText={errors.description}
        required
        fullWidth
        multiline
        rows={5}
        margin="normal"
        disabled={disabled}
        inputProps={{ maxLength: 5000 }}
      />

      <TextField
        select
        label="Language"
        value={values.language}
        onChange={(e) => onChange('language', e.target.value)}
        error={!!errors.language}
        helperText={errors.language}
        required
        fullWidth
        margin="normal"
        disabled={disabled}
      >
        {LANGUAGES.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            {lang.label}
          </MenuItem>
        ))}
      </TextField>

      <Autocomplete
        multiple
        freeSolo
        options={GENRE_OPTIONS}
        value={values.genres}
        onChange={(_, newValue) => onChange('genres', newValue as string[])}
        disabled={disabled}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option}
              size="small"
              {...getTagProps({ index })}
              key={option}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Genres"
            required
            margin="normal"
            error={!!errors.genres}
            helperText={errors.genres ?? 'Select or type to add genres'}
          />
        )}
      />

      <Autocomplete
        multiple
        freeSolo
        options={[]}
        value={values.tags}
        onChange={(_, newValue) => onChange('tags', newValue as string[])}
        disabled={disabled}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option}
              size="small"
              {...getTagProps({ index })}
              key={option}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Tags"
            margin="normal"
            helperText="Optional. Press Enter to add a tag."
          />
        )}
      />
    </>
  );
}
