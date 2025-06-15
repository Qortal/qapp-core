// components/LanguageSelector.tsx
import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { languageOptions } from './SubtitleManager';


export default function LanguageSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <Autocomplete
      options={languageOptions}
      getOptionLabel={(option) => `${option.name} (${option.code})`}
      value={languageOptions.find((opt) => opt.code === value) || null}
      onChange={(event, newValue) => onChange(newValue?.code || null)}
      renderInput={(params) => <TextField {...params} label="Subtitle Language" />}
      isOptionEqualToValue={(option, val) => option.code === val.code}
      sx={{ width: 300 }}
     slotProps={{
    popper: {
      sx: {
        zIndex: 999991, // Must be higher than Dialog's default zIndex (1300)
      },
    },
  }}

    />
  );
}
