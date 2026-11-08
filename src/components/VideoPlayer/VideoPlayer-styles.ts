import { styled, Theme } from '@mui/system';
import { Box } from '@mui/material';

export const VideoContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVideoPlayerSmall',
})<{ isVideoPlayerSmall?: boolean }>(({ theme, isVideoPlayerSmall }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  margin: 0,
  padding: 0,
  borderRadius: isVideoPlayerSmall ? '0px' : '12px',
  overflow: 'hidden',
  '&:focus': { outline: 'none' },
  // Fullscreen container styles for mobile WebView support
  '&:-webkit-full-screen': {
    width: '100% !important',
    height: '100dvh !important',
    display: 'flex !important',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  '&:fullscreen': {
    width: '100% !important',
    height: '100dvh !important',
    display: 'flex !important',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
}));

export const VideoElement = styled('video')(({ theme }) => ({
  background: 'rgb(33, 33, 33)',

  '&:focus': {
    outline: 'none !important',
    boxShadow: 'none !important',
  },
  '&:focus-visible': {
    outline: 'none !important',
    boxShadow: 'none !important',
  },
  '&::-webkit-media-controls': {
    display: 'none !important',
  },
  // Fullscreen video styles for mobile WebView support
  '&:-webkit-full-screen': {
    width: '100% !important',
    height: '100dvh !important',
    objectFit: 'cover',
  },
  '&:fullscreen': {
    width: '100% !important',
    height: '100dvh !important',
    objectFit: 'cover',
  },
}));

//1075 x 604
export const ControlsContainer = styled(Box)`
  width: 100%;
  position: absolute;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-image: linear-gradient(0deg, #000, #0000);
`;
