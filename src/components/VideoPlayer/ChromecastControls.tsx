import React, { useState, useEffect } from 'react';
import { Box, IconButton } from '@mui/material';
import CastIcon from '@mui/icons-material/Cast';
import { Status } from '../../state/publishes';

interface ChromecastControlsProps {
  url: string;
  title: string;
  qortalRequest: (params: any) => Promise<any>;
  status: Status | null;
  service: string;
  name: string;
  identifier: string;
}

/**
 * Simple Chromecast button that casts video to Chromecast device
 * Only shows when video status is READY
 */
export const ChromecastControls: React.FC<ChromecastControlsProps> = ({
  url,
  title,
  qortalRequest,
  status,
  service,
  name,
  identifier,
}) => {
  const [localStatus, setLocalStatus] = useState<Status | null>(null);

  // Check status on mount to see if video is already ready (cached)
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await qortalRequest({
          action: 'GET_QDN_RESOURCE_STATUS',
          service,
          name,
          identifier,
        });

        if (result?.status) {
          setLocalStatus(result.status);
        }
      } catch (error) {
        console.error('Failed to check video status:', error);
      }
    };

    checkStatus();
  }, [service, name, identifier, qortalRequest]);

  const castMyVideo = async () => {
    try {
      const result = await qortalRequest({
        action: 'CHROMECAST_CAST',
        url: url,
        title: title,
      });

      if (result.result?.success) {
        //  Success!
        console.log(`Now casting to ${result.result.deviceName}`);
        // Mini-player appears automatically
      } else if (result.error) {
        //  Failed
        console.error('Cast failed:', result.error);

        // Handle specific errors:
        if (result.error.includes('No device selected')) {
          alert('Please select a Chromecast device');
        } else if (result.error.includes('Failed to cast')) {
          alert('Could not load video - check URL and format');
        } else {
          alert('Chromecast error: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Failed to cast video:', error);
    }
  };

  // Show the cast button if either local status or parent status is READY
  const isReady = localStatus === 'READY' || status === 'READY';

  if (!isReady) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 600,
      }}
    >
      <IconButton
        onClick={castMyVideo}
        sx={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '50%',
          padding: '10px',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            background: 'rgba(0,0,0,0.5)',
          },
        }}
      >
        <CastIcon
          sx={{
            fontSize: '28px',
            color: 'white',
          }}
        />
      </IconButton>
    </Box>
  );
};
