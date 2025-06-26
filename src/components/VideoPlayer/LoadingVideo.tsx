import {
  alpha,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";

import { PlayArrow } from "@mui/icons-material";
import { Status } from "../../state/publishes";

interface LoadingVideoProps {
  status: Status | null;
  percentLoaded: number;
  isReady: boolean;
  isLoading: boolean;
  togglePlay: () => void;
  startPlay: boolean;
  downloadResource: () => void;
}
export const LoadingVideo = ({
  status,
  percentLoaded,
  isReady,
  isLoading,
  togglePlay,
  startPlay,
  downloadResource,
}: LoadingVideoProps) => {
  const getDownloadProgress = (percentLoaded: number) => {
    const progress = percentLoaded;
    return Number.isNaN(progress) ? "" : progress.toFixed(0) + "%";
  };
  if (status === "READY") return null;

  return (
    <>
      {isLoading && status !== "INITIAL" && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          justifyContent="center"
          alignItems="center"
          zIndex={500}
          bgcolor={alpha("#000000", !startPlay ? 0 : 0.95)}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            height: "100%",
          }}
        >
          {status !== "NOT_PUBLISHED" && status !== "FAILED_TO_DOWNLOAD" && (
            <CircularProgress
              sx={{
                color: "white",
              }}
            />
          )}
          {status && (
            <Typography
              component="div"
              sx={{
                color: "white",
                fontSize: "15px",
                textAlign: "center",
                fontFamily: "sans-serif",
              }}
            >
              {status === "NOT_PUBLISHED" ? (
                <>Video file was not published. Please inform the publisher!</>
              ) : status === "REFETCHING" ? (
                <>
                  <>{getDownloadProgress(percentLoaded)}</>

                  <> Refetching in 25 seconds</>
                </>
              ) : status === "DOWNLOADED" ? (
                <>Download Completed: building video...</>
              ) : status === "FAILED_TO_DOWNLOAD" ? (
                <>Unable to fetch video chunks from peers</>
              ) : (
                <>{getDownloadProgress(percentLoaded)}</>
              )}
            </Typography>
          )}
          {status === "FAILED_TO_DOWNLOAD" && (
            <Button
              variant="outlined"
              onClick={downloadResource}
              sx={{
                color: "white",
              }}
            >
              Try again
            </Button>
          )}
        </Box>
      )}

      {status === "INITIAL" && (
        <>
          <IconButton
            onClick={() => {
              togglePlay();
            }}
            sx={{
              cursor: "pointer",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 501,
              background: "rgba(0,0,0,0.3)",
              padding: "0px",
              borderRadius: "0px",
            }}
          >
            <PlayArrow
              sx={{
                width: "50px",
                height: "50px",
                color: "white",
              }}
            />
          </IconButton>
        </>
      )}
    </>
  );
};
