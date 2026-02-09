import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  IconButton,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  Close,
  Speed,
  Link as LinkIcon,
  CloudOff,
  Download,
} from '@mui/icons-material';
import { PeerDetail } from '../../state/publishes';
import { useMemo } from 'react';

interface PeerDetailsModalProps {
  open: boolean;
  onClose: () => void;
  peers: PeerDetail[];
  percentLoaded?: number;
}

export const PeerDetailsModal = ({
  open,
  onClose,
  peers,
  percentLoaded,
}: PeerDetailsModalProps) => {
  // Sort peers: HIGH > LOW > IDLE
  const sortedPeers = useMemo(() => {
    const speedOrder = { HIGH: 0, LOW: 1, IDLE: 2 };
    return [...peers].sort((a, b) => speedOrder[a.speed] - speedOrder[b.speed]);
  }, [peers]);

  const getSpeedColor = (speed: 'HIGH' | 'LOW' | 'IDLE') => {
    switch (speed) {
      case 'HIGH':
        return { bg: '#4caf50', text: '#81c784' };
      case 'LOW':
        return { bg: '#ff9800', text: '#ffb74d' };
      case 'IDLE':
        return { bg: '#757575', text: '#bdbdbd' };
    }
  };

  const getSpeedIcon = (speed: 'HIGH' | 'LOW' | 'IDLE') => {
    const colors = getSpeedColor(speed);
    return <Speed sx={{ fontSize: 20, color: colors.text }} />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: alpha('#181818', 0.98),
          backgroundImage: 'none',
          borderRadius: 2,
          border: `1px solid ${alpha('#ffffff', 0.1)}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          color: 'white',
          pb: 1,
        }}
      >
        <Box
          sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Peers Preparing for Download Request
            </Typography>
            <Chip
              label={`${sortedPeers.length} peer${sortedPeers.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                height: 24,
                backgroundColor: alpha('#4caf50', 0.2),
                color: '#81c784',
                fontWeight: 600,
                fontSize: '12px',
                border: `1px solid ${alpha('#4caf50', 0.3)}`,
              }}
            />
            {percentLoaded !== undefined && percentLoaded < 100 && (
              <Chip
                icon={
                  <Download
                    sx={{ fontSize: 14, color: '#64b5f6 !important' }}
                  />
                }
                label={`${percentLoaded.toFixed(1)}%`}
                size="small"
                sx={{
                  height: 24,
                  backgroundColor: alpha('#2196f3', 0.2),
                  color: '#64b5f6',
                  fontWeight: 700,
                  fontSize: '12px',
                  border: `1px solid ${alpha('#2196f3', 0.3)}`,
                }}
              />
            )}
          </Box>
          <Typography
            sx={{
              color: alpha('#ffffff', 0.6),
              fontSize: '13px',
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            These peers are going to be used to fetch pending chunks for this
            file.
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: alpha('#ffffff', 0.7),
            '&:hover': {
              color: 'white',
              backgroundColor: alpha('#ffffff', 0.1),
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {/* Progress bar when downloading */}
        {percentLoaded !== undefined && percentLoaded < 100 && (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
            >
              <Typography
                sx={{
                  color: alpha('#ffffff', 0.7),
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                DOWNLOAD PROGRESS
              </Typography>
              <Typography
                sx={{
                  color: '#64b5f6',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {percentLoaded.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentLoaded}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: alpha('#ffffff', 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: '#2196f3',
                  background:
                    'linear-gradient(90deg, #2196f3 0%, #64b5f6 100%)',
                },
              }}
            />
          </Box>
        )}
        {sortedPeers.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              gap: 2,
            }}
          >
            <CloudOff sx={{ fontSize: 48, color: alpha('#ffffff', 0.3) }} />
            <Typography
              sx={{
                color: alpha('#ffffff', 0.6),
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              No peers preparing for download request.
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {sortedPeers.map((peer, index) => {
              const colors = getSpeedColor(peer.speed);
              return (
                <ListItem
                  key={`${peer.id}-${index}`}
                  sx={{
                    backgroundColor: alpha('#ffffff', 0.03),
                    borderRadius: 1.5,
                    mb: 1,
                    border: `1px solid ${alpha('#ffffff', 0.08)}`,
                    '&:hover': {
                      backgroundColor: alpha('#ffffff', 0.06),
                    },
                    '&:last-child': {
                      mb: 0,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getSpeedIcon(peer.speed)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography
                          sx={{
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 500,
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                          }}
                        >
                          {peer.id}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          mt: 0.5,
                          alignItems: 'center',
                        }}
                      >
                        <Chip
                          label={peer.speed}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: alpha(colors.bg, 0.2),
                            color: colors.text,
                            border: `1px solid ${alpha(colors.bg, 0.3)}`,
                            '& .MuiChip-label': {
                              padding: '0 6px',
                            },
                          }}
                        />
                        <Chip
                          icon={
                            <LinkIcon
                              sx={{
                                fontSize: 12,
                                color: peer.isDirect
                                  ? '#64b5f6 !important'
                                  : alpha('#ffffff', 0.5) + ' !important',
                              }}
                            />
                          }
                          label={peer.isDirect ? 'Direct' : 'Relayed'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: peer.isDirect
                              ? alpha('#2196f3', 0.2)
                              : alpha('#ffffff', 0.05),
                            color: peer.isDirect
                              ? '#64b5f6'
                              : alpha('#ffffff', 0.6),
                            border: `1px solid ${
                              peer.isDirect
                                ? alpha('#2196f3', 0.3)
                                : alpha('#ffffff', 0.1)
                            }`,
                            '& .MuiChip-label': {
                              padding: '0 6px',
                            },
                          }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}

        {/* Legend */}
        {sortedPeers.length > 0 && (
          <Box
            sx={{
              mt: 3,
              pt: 2,
              borderTop: `1px solid ${alpha('#ffffff', 0.1)}`,
            }}
          >
            <Typography
              sx={{
                color: alpha('#ffffff', 0.5),
                fontSize: '12px',
                fontWeight: 600,
                mb: 1,
              }}
            >
              LEGEND
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography
                sx={{ color: alpha('#ffffff', 0.6), fontSize: '11px' }}
              >
                <strong style={{ color: '#81c784' }}>HIGH:</strong> Fast
                download speed
              </Typography>
              <Typography
                sx={{ color: alpha('#ffffff', 0.6), fontSize: '11px' }}
              >
                <strong style={{ color: '#ffb74d' }}>LOW:</strong> Slower
                download speed
              </Typography>
              <Typography
                sx={{ color: alpha('#ffffff', 0.6), fontSize: '11px' }}
              >
                <strong style={{ color: '#bdbdbd' }}>IDLE:</strong> Currently in
                pause state
              </Typography>
              <Typography
                sx={{ color: alpha('#ffffff', 0.6), fontSize: '11px', mt: 0.5 }}
              >
                <strong style={{ color: '#64b5f6' }}>Direct:</strong> Direct
                download •{' '}
                <strong style={{ color: '#bdbdbd' }}>Relayed:</strong> Download
                via relay
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
