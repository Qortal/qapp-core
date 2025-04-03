import {
  Box,
  ButtonBase,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useIndexStore } from "../../state/indexes";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
export const IndexManager = () => {
  const open = useIndexStore((state) => state.open);
  const setOpen = useIndexStore((state) => state.setOpen);
  const [mode, setMode] = useState(1);

  const handleClose = () => {
    setOpen(null);
    setMode(1);
  };
  return (
    <Dialog
      open={!!open}
      fullWidth={true}
      maxWidth={"md"}
      sx={{
        zIndex: 999990,
      }}
    >
      <DialogTitle>Index manager</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={(theme) => ({
          position: "absolute",
          right: 8,
          top: 8,
        })}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            width: "100%",
            alignItems: 'flex-start'
          }}
        >
          <IconButton disabled={mode === 1} onClick={()=> setMode(1)}><ArrowBackIosIcon /></IconButton>
          {mode === 1 && (
            <>
              <ButtonBase
                sx={{
                  width: "100%",
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    border: "2px solid",
                    borderRadius: 2,
                    width: "100%",
                  }}
                >
                  <Typography>Create new index</Typography>
                </Box>
              </ButtonBase>
              <ButtonBase
                sx={{
                  width: "100%",
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    border: "2px solid",
                    borderRadius: 2,
                    width: "100%",
                  }}
                >
                  <Typography>Your indices</Typography>
                </Box>
              </ButtonBase>
              <ButtonBase
                sx={{
                  width: "100%",
                }}
                onClick={()=> setMode(4)}
              >
                <Box
                  sx={{
                    p: 2,
                    border: "2px solid",
                    borderRadius: 2,
                    width: "100%",
                  }}
                >
                  <Typography>Add metadata</Typography>
                </Box>
              </ButtonBase>
            </>
          )}

          {mode === 4 && <AddMetadata />}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const AddMetadata = () => {
  return <Box>hello</Box>;
};
