import { useState } from 'react';
import { TextField, Button, Chip, Box, Stack } from '@mui/material';

interface PropsOptionsManager {
  items: string[];
  setItems: (items: string[]) => void;
  label?: string;
  maxLength: number;
  onlyStrings?: boolean;
}

export function OptionsManager({
  items,
  setItems,
  label = 'Keyword',
  maxLength,
  onlyStrings,
}: PropsOptionsManager) {
  const [inputValue, setInputValue] = useState<string>('');
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleAddOrUpdateItem = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    let value: string;
    if (onlyStrings) {
      value = trimmed;
    } else {
      value = isNaN(Number(trimmed)) ? trimmed : String(Number(trimmed));
    }

    if (editIndex !== null) {
      const updatedItems = [...items];
      updatedItems[editIndex] = value;
      setItems(updatedItems);
      setEditIndex(null);
    } else {
      if (maxLength && items.length >= maxLength) return;
      if (!items.includes(value)) {
        setItems([...items, value]);
      }
    }

    setInputValue('');
  };

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    setInputValue(items[index]);
    setEditIndex(index);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          size="small"
          label={editIndex !== null ? `Edit ${label}` : `Add ${label}`}
          variant="outlined"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddOrUpdateItem();
          }}
          sx={{ width: '240px' }}
        />
        <Button
          size="small"
          variant="contained"
          onClick={handleAddOrUpdateItem}
        >
          {editIndex !== null ? 'Update' : 'Add'}
        </Button>
      </Stack>

      <Box mt={2} sx={{ maxWidth: '400px', flexWrap: 'wrap', display: 'flex' }}>
        {items.map((item, index) => (
          <Chip
            key={index}
            label={item}
            onDelete={() => handleDeleteItem(index)}
            onClick={() => handleEditItem(index)}
            sx={{ margin: 0.5 }}
          />
        ))}
      </Box>
    </Box>
  );
}
