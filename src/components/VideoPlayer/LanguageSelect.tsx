// components/LanguageSelector.tsx
import React from "react";
import { Autocomplete, TextField } from "@mui/material";
import { languageOptions } from "./SubtitleManager";

export default function LanguageSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <Autocomplete
      size="small"
      options={languageOptions}
      getOptionLabel={(option) => `${option.name} (${option.code})`}
      value={languageOptions.find((opt) => opt.code === value) || null}
      onChange={(event, newValue) => onChange(newValue?.code || null)}
      renderInput={(params) => (
        <TextField
          required
          {...params}
          label="Subtitle Language"
          sx={{
            fontSize: "1rem", // Input text size
            "& .MuiInputBase-input": {
              fontSize: "1rem", // Inner input
            },
            "& .MuiInputLabel-root": {
              fontSize: "0.75rem", // Label text
            },
          }}
        />
      )}
      isOptionEqualToValue={(option, val) => option.code === val.code}
      sx={{
        width: "100%",
        fontSize: "1rem", // affects root font size
        "& .MuiAutocomplete-input": {
          fontSize: "1rem",
        },
      }}
      slotProps={{
        popper: {
          sx: {
            zIndex: 999991,
            "& .MuiAutocomplete-paper": {
              fontSize: "1rem", // dropdown font size
            },
          },
        },
      }}
    />
  );
}
