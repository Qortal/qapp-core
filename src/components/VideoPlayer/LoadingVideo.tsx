import { Box, CircularProgress, Typography } from "@mui/material";

import { PlayArrow } from "@mui/icons-material";
import { Status } from "../../state/publishes";


interface LoadingVideoProps {
  status: Status | null
  percentLoaded: number
  isReady: boolean
  isLoading: boolean
  togglePlay: ()=> void
}
export const LoadingVideo = ({
  status, percentLoaded, isReady, isLoading, togglePlay
}: LoadingVideoProps) => {

  const getDownloadProgress = (percentLoaded: number) => {
    const progress = percentLoaded;
    return Number.isNaN(progress) ? "" : progress.toFixed(0) + "%";
  };
  if(status === 'READY') return null

  return (
    <>
      {isLoading && status !== 'INITIAL' && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={status === "READY" ? "55px " : 0}
          display="flex"
          justifyContent="center"
          alignItems="center"
          zIndex={25}
          bgcolor="rgba(0, 0, 0, 0.6)"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            height: "100%",
          }}
        >
          <CircularProgress color="secondary" />
          {status && (
            <Typography
              variant="subtitle2"
              component="div"
              sx={{
                color: "white",
                fontSize: "15px",
                textAlign: "center",
              }}
            >
              {status === "NOT_PUBLISHED" && (
                <>Video file was not published. Please inform the publisher!</>
              )}
              {status === "REFETCHING" ? (
                <>
                  <>
                    {getDownloadProgress(
                      percentLoaded
                    )}
                  </>

                  <> Refetching in 25 seconds</>
                </>
              ) : status === "DOWNLOADED" ? (
                <>Download Completed: building video...</>
              ) : status !== "READY" ? (
                <>
                  {getDownloadProgress(
                    percentLoaded
                  )}
                </>
              ) : (
                <>Fetching video...</>
              )}
            </Typography>
          )}
        </Box>
      )}

      {(status === 'INITIAL') && (
        <>
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
            bgcolor="rgba(0, 0, 0, 0.6)"
            onClick={() => {
              togglePlay();
            }}
            sx={{
              cursor: "pointer",
            }}
          >
            <PlayArrow
              sx={{
                width: "50px",
                height: "50px",
                color: "white",
              }}
            />
          </Box>
        </>
      )}
    </>
  );
};
