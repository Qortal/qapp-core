import {
  alpha,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';

import { PlayArrow, People, Download, Schedule } from '@mui/icons-material';
import { Status } from '../../state/publishes';

interface LoadingVideoProps {
  status: Status | null;
  percentLoaded: number;
  numberOfPeers?: number;
  estimatedTimeRemaining?: number;
  isReady: boolean;
  isLoading: boolean;
  togglePlay: () => void;
  startPlay: boolean;
  downloadResource: () => void;
  isStatusWrong: boolean;
}
export const LoadingVideo = ({
  status,
  percentLoaded,
  numberOfPeers,
  estimatedTimeRemaining,
  isReady,
  isLoading,
  togglePlay,
  startPlay,
  downloadResource,
  isStatusWrong,
}: LoadingVideoProps) => {
  const getDownloadProgress = (percentLoaded: number) => {
    const progress = percentLoaded;
    return Number.isNaN(progress) ? 0 : progress;
  };

  const formatTimeRemaining = (seconds: number | undefined) => {
    if (seconds === undefined || seconds <= 0) return null;

    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.ceil(seconds % 60);
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  const getStatusMessage = () => {
    if (status === 'NOT_PUBLISHED') {
      return 'Video file was not published. Please inform the publisher!';
    }
    if (status === 'DOWNLOADED' && !isStatusWrong) {
      return 'Download Completed: building video...';
    }
    if (status === 'FAILED_TO_DOWNLOAD') {
      return 'Unable to fetch video chunks from peers';
    }
    if (!isStatusWrong && status === 'DOWNLOADED') {
      return 'Fetching status: please wait.';
    }
    if (status === 'REFETCHING') {
      return 'Reconnecting to peers...';
    }
    if (status === 'SEARCHING') {
      return '';
    }
    if (status === 'DOWNLOADING') {
      return 'Downloading from network';
    }
    return 'Loading...';
  };

  const progress = getDownloadProgress(percentLoaded);
  const showProgress =
    status !== 'NOT_PUBLISHED' &&
    status !== 'FAILED_TO_DOWNLOAD' &&
    status !== 'DOWNLOADED' &&
    status !== 'SEARCHING';

  if (status === 'READY') return null;

  return (
    <>
      {isLoading && status !== 'INITIAL' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 500,
            bgcolor: alpha('#000000', !startPlay ? 0 : 0.95),
            flexDirection: 'column',
            gap: 2,
            padding: 3,
          }}
        >
          {/* Main content container */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              maxWidth: '400px',
              width: '100%',
            }}
          >
            {/* Spinner */}
            {status !== 'NOT_PUBLISHED' && status !== 'FAILED_TO_DOWNLOAD' && (
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  size={60}
                  thickness={4}
                  sx={{
                    color: 'white',
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    },
                  }}
                />
                {showProgress && (
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="div"
                      sx={{
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    >
                      {progress.toFixed(0)}%
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Status message */}
            <Typography
              component="div"
              sx={{
                color: 'white',
                fontSize: '16px',
                fontWeight: 500,
                textAlign: 'center',
                fontFamily: 'sans-serif',
                lineHeight: 1.5,
              }}
            >
              {getStatusMessage()}
            </Typography>

            {/* Progress bar for downloading */}
            {showProgress && (
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: alpha('#ffffff', 0.2),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: '#4caf50',
                      background:
                        'linear-gradient(90deg, #4caf50 0%, #81c784 100%)',
                    },
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 1,
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: alpha('#ffffff', 0.7),
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Download sx={{ fontSize: 16 }} />
                      {progress.toFixed(1)}%
                    </Typography>

                    {/* ETA */}
                    {formatTimeRemaining(estimatedTimeRemaining) && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: alpha('#ffffff', 0.6),
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <Schedule sx={{ fontSize: 14, marginBotton: '2px' }} />
                        {formatTimeRemaining(estimatedTimeRemaining)}
                      </Typography>
                    )}
                  </Box>

                  {/* Peer count chip */}
                  {numberOfPeers !== undefined && numberOfPeers > 0 && (
                    <Chip
                      icon={
                        <People sx={{ fontSize: 16, color: '#81c784 !important' }} />
                      }
                      label={`${numberOfPeers} peer${numberOfPeers !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{
                        height: 24,
                        backgroundColor: alpha('#4caf50', 0.2),
                        color: '#81c784',
                        fontWeight: 600,
                        fontSize: '12px',
                        border: `1px solid ${alpha('#4caf50', 0.3)}`,
                        '& .MuiChip-label': {
                          padding: '0 8px',
                        },
                      }}
                    />
                  )}
                </Box>
              </Box>
            )}

            {/* Peer count for non-downloading states */}
            {!showProgress &&
              numberOfPeers !== undefined &&
              numberOfPeers > 0 &&
              status !== 'NOT_PUBLISHED' &&
              status !== 'FAILED_TO_DOWNLOAD' && (
                <Chip
                  icon={
                    <People sx={{ fontSize: 18, color: '#81c784 !important' }} />
                  }
                  label={`${numberOfPeers} peer${numberOfPeers !== 1 ? 's' : ''} available`}
                  sx={{
                    backgroundColor: alpha('#4caf50', 0.2),
                    color: '#81c784',
                    fontWeight: 600,
                    fontSize: '13px',
                    border: `1px solid ${alpha('#4caf50', 0.3)}`,
                  }}
                />
              )}

            {/* Retry button */}
            {status === 'FAILED_TO_DOWNLOAD' && (
              <Button
                variant="contained"
                onClick={downloadResource}
                sx={{
                  mt: 1,
                  backgroundColor: alpha('#ffffff', 0.15),
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'none',
                  padding: '10px 24px',
                  borderRadius: 2,
                  border: `1px solid ${alpha('#ffffff', 0.3)}`,
                  '&:hover': {
                    backgroundColor: alpha('#ffffff', 0.25),
                  },
                }}
              >
                Try Again
              </Button>
            )}
          </Box>
        </Box>
      )}

      {status === 'INITIAL' && (
        <>
          <IconButton
            onClick={() => {
              togglePlay();
            }}
            sx={{
              cursor: 'pointer',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 501,
              background: 'rgba(0,0,0,0.3)',
              padding: '0px',
              borderRadius: '0px',
            }}
          >
            <PlayArrow
              sx={{
                width: '50px',
                height: '50px',
                color: 'white',
              }}
            />
          </IconButton>
        </>
      )}
    </>
  );
};
