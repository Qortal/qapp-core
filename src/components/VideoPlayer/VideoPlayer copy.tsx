import {
  CSSProperties,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { QortalGetMetadata } from '../../types/interfaces/resources';
import { VideoContainer, VideoElement } from './VideoPlayer-styles';
import { useVideoPlayerHotKeys } from './useVideoPlayerHotKeys';
import {
  useIsPlaying,
  useProgressStore,
  useVideoStore,
} from '../../state/video';
import { useVideoPlayerController } from './useVideoPlayerController';
import { useResourceStatus } from '../../hooks/useResourceStatus';
import { LoadingVideo } from './LoadingVideo';
import { VideoControlsBar } from './VideoControlsBar';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

import { SubtitleManager, SubtitlePublishedData } from './SubtitleManager';
import { base64ToBlobUrl } from '../../utils/base64';
import convert from 'srt-webvtt';
import { TimelineActionsComponent } from './TimelineActionsComponent';
import { PlayBackMenu } from './VideoControls';
import { useGlobalPlayerStore } from '../../state/pip';
import { alpha, ClickAwayListener, Drawer } from '@mui/material';
import { MobileControls } from './MobileControls';
import { useLocation } from 'react-router-dom';
// @ts-ignore - aes-js doesn't have type definitions
import * as aesjs from 'aes-js';

export async function srtBase64ToVttBlobUrl(
  base64Srt: string
): Promise<string | null> {
  try {
    // Step 1: Convert base64 string to a Uint8Array
    const binary = atob(base64Srt);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Step 2: Create a Blob from the Uint8Array with correct MIME type
    const srtBlob = new Blob([bytes], { type: 'application/x-subrip' });
    // Step 3: Use convert() with the Blob
    const vttBlobUrl: string = await convert(srtBlob);
    return vttBlobUrl;
  } catch (error) {
    console.error('Failed to convert SRT to VTT:', error);
    return null;
  }
}

// AES-CTR encryption utilities
function deriveCtrCounter(iv: Uint8Array, blockOffset: bigint): Uint8Array {
  // Create a new Uint8Array to ensure proper ArrayBuffer type
  const counter = new Uint8Array(16);
  const ivArray = new Uint8Array(iv);
  counter.set(ivArray);
  let carry = blockOffset;

  for (let i = 15; i >= 0 && carry > 0n; i--) {
    const sum = BigInt(counter[i]) + (carry & 0xffn);
    counter[i] = Number(sum & 0xffn);
    carry = (carry >> 8n) + (sum >> 8n);
  }
  return counter;
}

async function decryptAesCtrChunk(
  keyBytes: Uint8Array,
  ivBytes: Uint8Array,
  blockOffset: bigint,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  // Try WebCrypto first
  if (crypto?.subtle) {
    try {
      // Ensure we have proper ArrayBuffer for WebCrypto by creating new copies
      const keyBuffer = new Uint8Array(keyBytes).buffer;
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-CTR' },
        false,
        ['decrypt']
      );

      const counter = deriveCtrCounter(ivBytes, blockOffset);
      // Create a new Uint8Array to ensure proper ArrayBuffer type
      const counterArray = new Uint8Array(counter);

      const ciphertextBuffer = new Uint8Array(ciphertext).buffer;

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-CTR',
          counter: counterArray,
          length: 128,
        },
        cryptoKey,
        ciphertextBuffer
      );

      return new Uint8Array(decrypted);
    } catch (e) {
      console.warn('WebCrypto decrypt failed, using fallback:', e);
    }
  }

  // Fallback with aes-js
  const counterBytes = deriveCtrCounter(ivBytes, blockOffset);
  const aesCtr = new aesjs.ModeOfOperation.ctr(
    new Uint8Array(keyBytes),
    new aesjs.Counter(counterBytes)
  );
  return new Uint8Array(aesCtr.decrypt(new Uint8Array(ciphertext)));
}

function appendToBuffer(
  sourceBuffer: SourceBuffer,
  data: Uint8Array
): Promise<void> {
  return new Promise((resolve) => {
    const onUpdateEnd = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      resolve();
    };
    sourceBuffer.addEventListener('updateend', onUpdateEnd);
    // Ensure we pass a proper ArrayBuffer
    const buffer =
      data.buffer instanceof ArrayBuffer
        ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
        : new Uint8Array(data).buffer;
    sourceBuffer.appendBuffer(buffer);
  });
}

function createMediaSource(player: any): Promise<MediaSource> {
  return new Promise((resolve) => {
    const videoEl = player.tech().el_;
    const mediaSource = new MediaSource();
    videoEl.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', () => {
      resolve(mediaSource);
    });
  });
}

async function fetchEncryptedRange(
  start: number,
  end: number,
  url: string
): Promise<Uint8Array> {
  try {
    const res = await fetch(url, {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    });

    // 206 = Partial Content (successful range request)
    // 200 = Full content (if range not supported, but we got the data)
    if (!res.ok && res.status !== 206 && res.status !== 200) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error(`Range request failed: ${res.status}`, errorText);
      throw new Error(`Range request failed: ${res.status} - ${errorText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    return data;
  } catch (error) {
    console.error(`Error fetching range ${start}-${end}:`, error);
    throw error;
  }
}

async function appendNextRange(
  sourceBuffer: SourceBuffer,
  keyBytes: Uint8Array,
  ivBytes: Uint8Array,
  url: string,
  nextStart: number,
  chunkSize: number
): Promise<number> {
  const nextEnd = nextStart + chunkSize - 1;

  // 1. Fetch encrypted chunk via HTTP Range
  const encrypted = await fetchEncryptedRange(nextStart, nextEnd, url);

  // If we got less data than requested, we've reached the end
  if (encrypted.length === 0) {
    return nextStart; // Signal end of stream
  }

  // 2. Compute AES-CTR block offset (based on encrypted byte position)
  const blockOffset = BigInt(Math.floor(nextStart / 16));

  // 3. Decrypt
  const decrypted = await decryptAesCtrChunk(
    keyBytes,
    ivBytes,
    blockOffset,
    encrypted
  );

  // 4. Append to MediaSource
  try {
    await appendToBuffer(sourceBuffer, decrypted);
  } catch (error) {
    throw error;
  }

  // Return next start position (encrypted byte position + encrypted length)
  // For AES-CTR, encrypted and decrypted are same size
  return nextStart + encrypted.length;
}

async function playEncryptedVideo({
  player,
  keyBytes,
  ivBytes,
  resourceUrl,
  mimeType,
  chunkSize = 5 * 1024 * 1024, // 5MB chunks
}: {
  player: any;
  keyBytes: Uint8Array;
  ivBytes: Uint8Array;
  resourceUrl: string;
  mimeType?: string | null;
  chunkSize?: number;
}): Promise<void> {
  const mediaSource = await createMediaSource(player);

  // Use provided mimeType or default to a common MP4 codec
  // If mimeType is provided, use it; otherwise try to detect from first bytes
  let codecString = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"'; // Default H.264 + AAC

  if (mimeType) {
    // If mimeType includes codecs, use it directly
    if (mimeType.includes('codecs=')) {
      codecString = mimeType;
    } else {
      // Otherwise construct a codec string
      codecString = `${mimeType}; codecs="avc1.42E01E,mp4a.40.2"`;
    }
  }

  let sourceBuffer: SourceBuffer;
  try {
    sourceBuffer = mediaSource.addSourceBuffer(codecString);
  } catch (error) {
    console.error(
      'Failed to create SourceBuffer with codec:',
      codecString,
      error
    );
    // Try with a more generic codec string
    try {
      codecString = 'video/mp4';
      sourceBuffer = mediaSource.addSourceBuffer(codecString);
    } catch (fallbackError) {
      console.error(
        'Failed to create SourceBuffer with fallback codec:',
        fallbackError
      );
      mediaSource.endOfStream();
      throw new Error('Failed to create SourceBuffer. Codec not supported.');
    }
  }

  let nextStart = 0;
  let consecutiveNoProgress = 0;
  const maxNoProgress = 3; // Stop after 3 consecutive no-progress iterations

  try {
    // First, fetch a small chunk to verify decryption works
    const firstChunk = await fetchEncryptedRange(
      0,
      Math.min(chunkSize - 1, 1024 * 1024 - 1),
      resourceUrl
    );

    if (firstChunk.length === 0) {
      throw new Error('Failed to fetch initial data from encrypted resource');
    }

    // Decrypt first chunk to verify
    const blockOffset = BigInt(0);
    const decryptedFirst = await decryptAesCtrChunk(
      keyBytes,
      ivBytes,
      blockOffset,
      firstChunk
    );

    // Check if decrypted data looks like MP4 (should start with ftyp box)
    const firstBytes = Array.from(decryptedFirst.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');

    // Append first chunk
    await appendToBuffer(sourceBuffer, decryptedFirst);
    nextStart = decryptedFirst.length;

    // Continue with remaining chunks
    while (true) {
      const newStart = await appendNextRange(
        sourceBuffer,
        keyBytes,
        ivBytes,
        resourceUrl,
        nextStart,
        chunkSize
      );

      // Check if we made progress
      if (newStart === nextStart) {
        consecutiveNoProgress++;

        if (consecutiveNoProgress >= maxNoProgress) {
          // No more data or reached end
          break;
        }
        // Small delay before retry
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      // Reset no-progress counter on successful progress
      consecutiveNoProgress = 0;
      nextStart = newStart;

      // Optional: Add buffer length check to avoid buffering too much
      // You can pause fetching if sourceBuffer.buffered.length > some threshold
    }

    mediaSource.endOfStream();
  } catch (error) {
    console.error('Error during encrypted video playback:', error);
    try {
      if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream();
      }
    } catch (e) {
      console.error('Error ending MediaSource stream:', e);
    }
    throw error;
  }
}

type StretchVideoType = 'contain' | 'fill' | 'cover' | 'none' | 'scale-down';

export type TimelineAction =
  | {
      type: 'SEEK';
      time: number;
      duration: number;
      label: string;
      onClick?: () => void;
      seekToTime: number; // ✅ Required for SEEK
      placement?: 'TOP-RIGHT' | 'TOP-LEFT' | 'BOTTOM-LEFT' | 'BOTTOM-RIGHT';
    }
  | {
      type: 'CUSTOM';
      time: number;
      duration: number;
      label: string;
      onClick: () => void; // ✅ Required for CUSTOM
      placement?: 'TOP-RIGHT' | 'TOP-LEFT' | 'BOTTOM-LEFT' | 'BOTTOM-RIGHT';
    };
export interface EncryptionConfig {
  key: Uint8Array;
  iv: Uint8Array;
  encryptionType: string;
}

export interface VideoPlayerProps {
  qortalVideoResource: QortalGetMetadata;
  videoRef: any;
  retryAttempts?: number;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  timelineActions?: TimelineAction[];
  playerRef: any;
  locationRef: RefObject<string | null>;
  videoLocationRef: RefObject<string | null>;
  filename?: string;
  path?: string;
  encryption?: EncryptionConfig;
  styling?: {
    progressSlider?: {
      thumbColor?: CSSProperties['color'];
      railColor?: CSSProperties['color'];
      trackColor?: CSSProperties['color'];
    };
  };
}

const videoStyles = {
  videoContainer: {},
  video: {},
};

async function getVideoMimeTypeFromUrl(
  qortalVideoResource: any
): Promise<string | null> {
  try {
    const metadataResponse = await fetch(
      `/arbitrary/metadata/${qortalVideoResource.service}/${qortalVideoResource.name}/${qortalVideoResource.identifier}`
    );
    const metadataData = await metadataResponse.json();
    return metadataData?.mimeType || null;
  } catch (error) {
    return null;
  }
}
export const isTouchDevice =
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

export const VideoPlayer = ({
  videoRef,
  playerRef,
  qortalVideoResource,
  retryAttempts,
  poster,
  autoPlay,
  onEnded,
  onPlay: onPlayParent,
  onPause: onPauseParent,
  timelineActions,
  locationRef,
  videoLocationRef,
  path,
  filename,
  encryption,
  styling,
}: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [videoObjectFit] = useState<StretchVideoType>('contain');
  const { isPlaying, setIsPlaying } = useIsPlaying();
  const isOnTimeline = useRef(false);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const { volume, setVolume, setPlaybackRate, playbackRate } = useVideoStore(
    (state) => ({
      volume: state.playbackSettings.volume,
      setVolume: state.setVolume,
      setPlaybackRate: state.setPlaybackRate,
      playbackRate: state.playbackSettings.playbackRate,
    })
  );
  // const playerRef = useRef<Player | null>(null);
  const [drawerOpenSubtitles, setDrawerOpenSubtitles] = useState(false);
  const [drawerOpenPlayback, setDrawerOpenPlayback] = useState(false);
  const [showControlsMobile2, setShowControlsMobile] = useState(false);
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { setProgress } = useProgressStore();
  const [localProgress, setLocalProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isOpenSubtitleManage, setIsOpenSubtitleManage] = useState(false);
  const subtitleBtnRef = useRef(null);
  const [currentSubTrack, setCurrentSubTrack] = useState<null | string>(null);
  const location = useLocation();

  const [isOpenPlaybackMenu, setIsOpenPlaybackmenu] = useState(false);
  const isVideoPlayerSmall = width < 600 || isTouchDevice;
  const {
    reloadVideo,
    togglePlay,
    onVolumeChange,
    increaseSpeed,
    decreaseSpeed,
    toggleMute,
    isFullscreen,
    toggleObjectFit,
    controlsHeight,
    setProgressRelative,
    changeVolume,
    isReady,
    resourceUrl,
    startPlay,
    setProgressAbsolute,
    status,
    percentLoaded,
    showControlsFullScreen,
    onSelectPlaybackRate,
    seekTo,
    togglePictureInPicture,
    downloadResource,
    isStatusWrong,
  } = useVideoPlayerController({
    autoPlay,
    playerRef,
    qortalVideoResource,
    retryAttempts,
    isMuted,
    videoRef,
    filename,
    path,
  });

  const showControlsMobile =
    (showControlsMobile2 || !isPlaying) && isVideoPlayerSmall;

  useEffect(() => {
    if (location) {
      locationRef.current = location?.pathname;
    }
  }, [location]);

  const { getProgress } = useProgressStore();

  const enterFullscreen = useCallback(async () => {
    const ref = containerRef?.current as HTMLElement | null;
    if (!ref || document.fullscreenElement) return;

    try {
      // Wait for fullscreen to activate
      if (ref.requestFullscreen) {
        await ref.requestFullscreen();
      } else if ((ref as any).webkitRequestFullscreen) {
        await (ref as any).webkitRequestFullscreen(); // Safari fallback
      }

      if (
        typeof screen.orientation !== 'undefined' &&
        'lock' in screen.orientation &&
        typeof screen.orientation.lock === 'function'
      ) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch (err) {
          console.warn('Orientation lock failed:', err);
        }
      }
      await qortalRequest({
        action: 'SCREEN_ORIENTATION',
        mode: 'landscape',
      });
    } catch (err) {
      console.error('Failed to enter fullscreen or lock orientation:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      if (
        typeof screen.orientation !== 'undefined' &&
        'lock' in screen.orientation &&
        typeof screen.orientation.lock === 'function'
      ) {
        try {
          // Attempt to reset by locking to 'portrait' or 'any' (if supported)
          await screen.orientation.lock('portrait'); // or 'any' if supported
        } catch (err) {
          console.warn('Orientation lock failed:', err);
        }
      }
      await qortalRequest({
        action: 'SCREEN_ORIENTATION',
        mode: 'portrait',
      });
    } catch (err) {
      console.warn('Error exiting fullscreen or unlocking orientation:', err);
    }
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    setShowControls(false);
    setShowControlsMobile(false);
    isFullscreen ? exitFullscreen() : enterFullscreen();
  }, [isFullscreen]);

  const hotkeyHandlers = useMemo(
    () => ({
      reloadVideo,
      togglePlay,
      setProgressRelative,
      toggleObjectFit,
      increaseSpeed,
      decreaseSpeed,
      changeVolume,
      toggleMute,
      setProgressAbsolute,
      toggleFullscreen,
    }),
    [
      reloadVideo,
      togglePlay,
      setProgressRelative,
      toggleObjectFit,
      increaseSpeed,
      decreaseSpeed,
      changeVolume,
      toggleMute,
      setProgressAbsolute,
      toggleFullscreen,
    ]
  );

  const closeSubtitleManager = useCallback(() => {
    setIsOpenSubtitleManage(false);
    setDrawerOpenSubtitles(false);
  }, []);
  const openSubtitleManager = useCallback(() => {
    if (isVideoPlayerSmall) {
      setDrawerOpenSubtitles(true);
      return;
    }
    setIsOpenSubtitleManage(true);
  }, [isVideoPlayerSmall]);

  const videoLocation = useMemo(() => {
    if (!qortalVideoResource) return null;
    return `${qortalVideoResource.service}-${qortalVideoResource.name}-${qortalVideoResource.identifier}`;
  }, [qortalVideoResource]);
  useEffect(() => {
    videoLocationRef.current = videoLocation;
  }, [videoLocation]);
  useVideoPlayerHotKeys(hotkeyHandlers);

  const updateProgress = useCallback(() => {
    if (!isPlaying || !isPlayerInitialized) return;
    const player = playerRef?.current;
    if (!player || typeof player?.currentTime !== 'function') return;

    const currentTime = player.currentTime();
    if (typeof currentTime === 'number' && videoLocation && currentTime > 0.1) {
      setProgress(videoLocation, currentTime);
      setLocalProgress(currentTime);
    }
  }, [videoLocation, isPlaying, isPlayerInitialized]);

  useEffect(() => {
    if (videoLocation) {
      const vidId = useGlobalPlayerStore.getState().videoId;
      if (vidId === videoLocation) {
        togglePlay();
      }
    }
  }, [videoLocation]);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
    if (onPlayParent) {
      onPlayParent();
    }
  }, [setIsPlaying, onPlayParent]);

  const onPause = useCallback(() => {
    setIsPlaying(false);
    if (onPauseParent) {
      onPauseParent();
    }
  }, [setIsPlaying]);
  const onVolumeChangeHandler = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      try {
        const video = e.currentTarget;
        setVolume(video.volume);
        setIsMuted(video.muted);
      } catch (error) {
        console.error('onVolumeChangeHandler', onVolumeChangeHandler);
      }
    },
    [setIsMuted, setVolume]
  );

  const videoStylesContainer = useMemo(() => {
    return {
      cursor: 'auto',
      ...videoStyles?.videoContainer,
    };
  }, [showControls, isVideoPlayerSmall]);

  const videoStylesVideo = useMemo(() => {
    return {
      ...videoStyles?.video,
      objectFit: videoObjectFit,
      backgroundColor: '#000000',
      height: isFullscreen ? 'calc(100vh - 40px)' : '100%',
      width: '100%',
      cursor: showControls ? 'default' : 'none',
    };
  }, [videoObjectFit, isFullscreen, showControls]);

  const handleEnded = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      if (onEnded) {
        onEnded(e);
      }
    },
    [onEnded]
  );

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  useEffect(() => {
    if (!isPlayerInitialized) return;
    const player = playerRef.current;
    if (!player || typeof player.on !== 'function') return;

    const handleLoadedMetadata = () => {
      const duration = player.duration?.();

      if (typeof duration === 'number' && !isNaN(duration)) {
        setDuration(duration);
      }
    };

    player.on('loadedmetadata', handleLoadedMetadata);

    if (player?.readyState() >= 1) {
      handleLoadedMetadata();
    }
    return () => {
      player.off('loadedmetadata', handleLoadedMetadata);
    };
  }, [isPlayerInitialized]);

  const hideTimeout = useRef<any>(null);

  const resetHideTimer = () => {
    if (isVideoPlayerSmall) return;
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (isOnTimeline?.current) return;
      setShowControls(false);
    }, 2500); // 3s of inactivity
  };

  const handleMouseMove = () => {
    if (isVideoPlayerSmall) return;
    resetHideTimer();
  };

  const closePlaybackMenu = useCallback(() => {
    setIsOpenPlaybackmenu(false);
    setDrawerOpenPlayback(false);
  }, []);
  const openPlaybackMenu = useCallback(() => {
    if (isVideoPlayerSmall) {
      setDrawerOpenPlayback(true);
      return;
    }
    setIsOpenPlaybackmenu(true);
  }, [isVideoPlayerSmall]);

  useEffect(() => {
    if (isVideoPlayerSmall) return;
    resetHideTimer(); // initial show
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [isVideoPlayerSmall]);

  const previousSubtitleUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      // Component unmount cleanup
      if (previousSubtitleUrlRef.current) {
        URL.revokeObjectURL(previousSubtitleUrlRef.current);
        previousSubtitleUrlRef.current = null;
      }
    };
  }, []);

  const onSelectSubtitle = useCallback(
    async (subtitle: SubtitlePublishedData) => {
      if (subtitle === null) {
        setCurrentSubTrack(null);
        if (previousSubtitleUrlRef.current) {
          URL.revokeObjectURL(previousSubtitleUrlRef.current);
          previousSubtitleUrlRef.current = null;
        }
        const remoteTracksList = playerRef.current?.remoteTextTracks();

        if (remoteTracksList) {
          const toRemove: TextTrack[] = [];

          // Bypass TS restrictions safely
          const list = remoteTracksList as unknown as {
            length: number;
            [index: number]: TextTrack;
          };

          for (let i = 0; i < list.length; i++) {
            const track = list[i];
            if (track) toRemove.push(track);
          }

          toRemove.forEach((track) => {
            playerRef.current?.removeRemoteTextTrack(track);
          });
        }

        return;
      }
      const player = playerRef.current;
      if (!player || !subtitle.subtitleData || !subtitle.type) return;

      // Cleanup: revoke previous Blob URL
      if (previousSubtitleUrlRef.current) {
        URL.revokeObjectURL(previousSubtitleUrlRef.current);
        previousSubtitleUrlRef.current = null;
      }
      let blobUrl;
      if (subtitle?.type === 'application/x-subrip') {
        blobUrl = await srtBase64ToVttBlobUrl(subtitle.subtitleData);
      } else {
        blobUrl = base64ToBlobUrl(subtitle.subtitleData, subtitle.type);
      }

      previousSubtitleUrlRef.current = blobUrl;

      const remoteTracksList = playerRef.current?.remoteTextTracks();

      if (remoteTracksList) {
        const toRemove: TextTrack[] = [];

        // Bypass TS restrictions safely
        const list = remoteTracksList as unknown as {
          length: number;
          [index: number]: TextTrack;
        };

        for (let i = 0; i < list.length; i++) {
          const track = list[i];
          if (track) toRemove.push(track);
        }

        toRemove.forEach((track) => {
          playerRef.current?.removeRemoteTextTrack(track);
        });
      }
      playerRef.current?.addRemoteTextTrack(
        {
          kind: 'subtitles',
          src: blobUrl,
          srclang: subtitle.language,
          label: subtitle.language,
          default: true,
        },
        true
      );

      await new Promise((res) => {
        setTimeout(() => {
          res(null);
        }, 1000);
      });
      const tracksInfo = playerRef.current?.textTracks();
      if (!tracksInfo) return;

      const tracks = Array.from(
        { length: (tracksInfo as any).length },
        (_, i) => (tracksInfo as any)[i]
      );
      for (const track of tracks) {
        if (track.kind === 'subtitles') {
          track.mode = 'showing'; // force display
        }
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setShowControls(false);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }, [setShowControls]);

  const videoLocactionStringified = useMemo(() => {
    return JSON.stringify(qortalVideoResource);
  }, [qortalVideoResource]);

  const savedVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (startPlay) {
      useGlobalPlayerStore.getState().reset();
    }
  }, [startPlay]);

  useLayoutEffect(() => {
    // Save the video element while it's still mounted
    const video = videoRef as any;
    if (video.current) {
      savedVideoRef.current = video.current;
    }
  }, []);

  useEffect(() => {
    if (!resourceUrl || !isReady || !videoLocactionStringified || !startPlay)
      return;

    const resource = JSON.parse(videoLocactionStringified);

    try {
      const setupPlayer = async () => {
        const ref = videoRef as any;
        if (!ref.current) return;

        // Check if encryption is enabled
        if (
          encryption &&
          encryption.key &&
          encryption.iv &&
          encryption.encryptionType
        ) {
          // Encrypted video playback path
          if (!playerRef.current && ref.current) {
            // Initialize Video.js with empty source (MediaSource will be attached)
            playerRef.current = videojs(ref.current, {
              autoplay: false,
              controls: false,
              responsive: true,
              poster: startPlay ? '' : poster,
            });

            setIsPlayerInitialized(true);
            ref.current.tabIndex = -1;
            ref.current.style.outline = 'none';
            playerRef.current?.poster('');
            playerRef.current?.playbackRate(playbackRate);
            playerRef.current?.volume(volume);

            const key = `${resource.service}-${resource.name}-${resource.identifier}`;
            if (key) {
              const savedProgress = getProgress(key);
              if (typeof savedProgress === 'number') {
                playerRef.current?.currentTime(savedProgress);
              }
            }

            // Setup encrypted playback
            try {
              // Get mime type for proper codec string
              const type = await getVideoMimeTypeFromUrl(resource);

              await playEncryptedVideo({
                player: playerRef.current,
                keyBytes: encryption.key,
                ivBytes: encryption.iv,
                resourceUrl: resourceUrl || '',
                mimeType: type,
              });

              // Play after setup
              playerRef.current?.play().catch((err: any) => {
                console.warn('Encrypted video play failed:', err);
              });

              // Setup subtitle tracking
              const tracksInfo = playerRef.current?.textTracks();
              const checkActiveSubtitle = () => {
                let activeTrack = null;
                const tracks = Array.from(
                  { length: (tracksInfo as any).length },
                  (_, i) => (tracksInfo as any)[i]
                );
                for (const track of tracks) {
                  if (track.kind === 'subtitles' || track.kind === 'captions') {
                    if (track.mode === 'showing') {
                      activeTrack = track;
                      break;
                    }
                  }
                }
                if (activeTrack) {
                  setCurrentSubTrack(
                    activeTrack.language || activeTrack.srclang
                  );
                } else {
                  setCurrentSubTrack(null);
                }
              };
              checkActiveSubtitle();
              tracksInfo?.on('change', checkActiveSubtitle);
            } catch (err) {
              console.error('Failed to setup encrypted video:', err);
            }

            playerRef.current?.on('error', () => {
              const error = playerRef.current?.error();
              console.error('Video.js playback error:', error);
            });
          }
        } else {
          // Normal (non-encrypted) video playback path
          const type = await getVideoMimeTypeFromUrl(resource);

          const options = {
            autoplay: true,
            controls: false,
            responsive: true,
            // fluid: true,
            poster: startPlay ? '' : poster,
            // aspectRatio: "16:9",
            sources: [
              {
                src: resourceUrl,
                type: type || 'video/mp4', // fallback
              },
            ],
          };

          if (!playerRef.current && ref.current) {
            playerRef.current = videojs(ref.current, options, () => {
              setIsPlayerInitialized(true);
              ref.current.tabIndex = -1; // Prevents focus entirely
              ref.current.style.outline = 'none'; // Backup
              playerRef.current?.poster('');
              playerRef.current?.playbackRate(playbackRate);
              playerRef.current?.volume(volume);
              const key = `${resource.service}-${resource.name}-${resource.identifier}`;
              if (key) {
                const savedProgress = getProgress(key);
                if (typeof savedProgress === 'number') {
                  playerRef.current?.currentTime(savedProgress);
                }
              }

              playerRef.current?.play();

              const tracksInfo = playerRef.current?.textTracks();

              const checkActiveSubtitle = () => {
                let activeTrack = null;

                const tracks = Array.from(
                  { length: (tracksInfo as any).length },
                  (_, i) => (tracksInfo as any)[i]
                );
                for (const track of tracks) {
                  if (track.kind === 'subtitles' || track.kind === 'captions') {
                    if (track.mode === 'showing') {
                      activeTrack = track;
                      break;
                    }
                  }
                }

                if (activeTrack) {
                  setCurrentSubTrack(
                    activeTrack.language || activeTrack.srclang
                  );
                } else {
                  setCurrentSubTrack(null);
                }
              };

              // Initial check in case one is auto-enabled
              checkActiveSubtitle();

              // Use Video.js event system
              tracksInfo?.on('change', checkActiveSubtitle);
            });
            playerRef.current?.on('error', () => {
              const error = playerRef.current?.error();
              console.error('Video.js playback error:', error);
            });
          }
        }
      };

      setupPlayer();
    } catch (error) {
      console.error('useEffect start player', error);
    }
  }, [
    isReady,
    resourceUrl,
    startPlay,
    poster,
    videoLocactionStringified,
    encryption,
    playbackRate,
    volume,
    getProgress,
  ]);

  useEffect(() => {
    if (!isPlayerInitialized) return;
    const player = playerRef?.current;
    if (!player) return;

    const handleRateChange = () => {
      const newRate = player?.playbackRate();
      if (newRate) {
        setPlaybackRate(newRate); // or any other state/action
      }
    };

    player.on('ratechange', handleRateChange);

    return () => {
      player.off('ratechange', handleRateChange);
    };
  }, [isPlayerInitialized]);
  const hideTimeoutRef = useRef<number | null>(null);

  const resetHideTimeout = () => {
    setShowControlsMobile(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowControlsMobile(false);
    }, 3000);
  };

  useEffect(() => {
    const handleInteraction = () => resetHideTimeout();

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleInteraction);

    return () => {
      container.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const handleClickVideoElement = useCallback(() => {
    if (isVideoPlayerSmall) {
      resetHideTimeout();
      return;
    }
    togglePlay();
  }, [isVideoPlayerSmall, togglePlay]);

  return (
    <>
      <VideoContainer
        tabIndex={0}
        style={videoStylesContainer}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        ref={containerRef}
        isVideoPlayerSmall={isVideoPlayerSmall}
      >
        <LoadingVideo
          togglePlay={togglePlay}
          isReady={isReady}
          status={status}
          percentLoaded={percentLoaded}
          isLoading={isLoading}
          startPlay={startPlay}
          downloadResource={downloadResource}
          isStatusWrong={isStatusWrong}
        />
        <VideoElement
          ref={videoRef}
          tabIndex={-1}
          className="video-js"
          src={isReady && startPlay ? resourceUrl || undefined : undefined}
          poster={poster}
          onTimeUpdate={updateProgress}
          autoPlay={autoPlay}
          onClick={handleClickVideoElement}
          onEnded={handleEnded}
          onCanPlay={handleCanPlay}
          preload="metadata"
          style={videoStylesVideo}
          onPlay={onPlay}
          onPause={onPause}
          onVolumeChange={onVolumeChangeHandler}
          controls={false}
        />
        {!isVideoPlayerSmall && (
          <PlayBackMenu
            isFromDrawer={false}
            close={closePlaybackMenu}
            isOpen={isOpenPlaybackMenu}
            onSelect={onSelectPlaybackRate}
            playbackRate={playbackRate}
          />
        )}

        {isReady && showControls && (
          <VideoControlsBar
            isVideoPlayerSmall={isVideoPlayerSmall}
            subtitleBtnRef={subtitleBtnRef}
            playbackRate={playbackRate}
            increaseSpeed={hotkeyHandlers.increaseSpeed}
            decreaseSpeed={hotkeyHandlers.decreaseSpeed}
            playerRef={playerRef}
            isFullScreen={isFullscreen}
            showControlsFullScreen={showControlsFullScreen}
            showControls={showControls}
            toggleFullscreen={toggleFullscreen}
            onVolumeChange={onVolumeChange}
            volume={volume}
            togglePlay={togglePlay}
            reloadVideo={hotkeyHandlers.reloadVideo}
            isPlaying={isPlaying}
            canPlay={true}
            isScreenSmall={false}
            controlsHeight={controlsHeight}
            duration={duration}
            progress={localProgress}
            openSubtitleManager={openSubtitleManager}
            onSelectPlaybackRate={onSelectPlaybackRate}
            isMuted={isMuted}
            toggleMute={toggleMute}
            openPlaybackMenu={openPlaybackMenu}
            togglePictureInPicture={togglePictureInPicture}
            setLocalProgress={setLocalProgress}
            isOnTimeline={isOnTimeline}
            styling={styling}
          />
        )}
        {timelineActions && Array.isArray(timelineActions) && (
          <TimelineActionsComponent
            seekTo={seekTo}
            containerRef={containerRef}
            progress={localProgress}
            timelineActions={timelineActions}
            isVideoPlayerSmall={isVideoPlayerSmall}
          />
        )}
        {showControlsMobile && isReady && (
          <MobileControls
            setLocalProgress={setLocalProgress}
            setProgressRelative={setProgressRelative}
            toggleFullscreen={toggleFullscreen}
            openPlaybackMenu={openPlaybackMenu}
            openSubtitleManager={openSubtitleManager}
            togglePlay={togglePlay}
            isPlaying={isPlaying}
            setShowControlsMobile={setShowControlsMobile}
            resetHideTimeout={resetHideTimeout}
            duration={duration}
            progress={localProgress}
            playerRef={playerRef}
            showControlsMobile={showControlsMobile}
            styling={styling}
          />
        )}

        {!isVideoPlayerSmall && (
          <SubtitleManager
            subtitleBtnRef={subtitleBtnRef}
            close={closeSubtitleManager}
            open={isOpenSubtitleManage}
            qortalMetadata={qortalVideoResource}
            onSelect={onSelectSubtitle}
            currentSubTrack={currentSubTrack}
            setDrawerOpenSubtitles={setDrawerOpenSubtitles}
            isFromDrawer={false}
            exitFullscreen={exitFullscreen}
          />
        )}
        <ClickAwayListener onClickAway={() => setDrawerOpenSubtitles(false)}>
          <Drawer
            variant="persistent"
            anchor="bottom"
            open={drawerOpenSubtitles && isVideoPlayerSmall}
            sx={{}}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: alpha('#181818', 0.98),
                  borderRadius: 2,
                  width: '90%',
                  margin: '0 auto',
                  p: 1,
                  backgroundImage: 'none',
                  mb: 1,
                  position: 'absolute',
                },
              },
            }}
          >
            <SubtitleManager
              subtitleBtnRef={subtitleBtnRef}
              close={closeSubtitleManager}
              open={true}
              qortalMetadata={qortalVideoResource}
              onSelect={onSelectSubtitle}
              currentSubTrack={currentSubTrack}
              setDrawerOpenSubtitles={setDrawerOpenSubtitles}
              isFromDrawer={true}
              exitFullscreen={exitFullscreen}
            />
          </Drawer>
        </ClickAwayListener>
        <ClickAwayListener
          onClickAway={() => {
            setDrawerOpenPlayback(false);
          }}
        >
          <Drawer
            variant="persistent"
            anchor="bottom"
            open={drawerOpenPlayback && isVideoPlayerSmall}
            sx={{}}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: alpha('#181818', 0.98),
                  borderRadius: 2,
                  width: '90%',
                  margin: '0 auto',
                  p: 1,
                  backgroundImage: 'none',
                  mb: 1,
                  position: 'absolute',
                },
              },
            }}
          >
            <PlayBackMenu
              isFromDrawer
              close={closePlaybackMenu}
              isOpen={true}
              onSelect={onSelectPlaybackRate}
              playbackRate={playbackRate}
            />
          </Drawer>
        </ClickAwayListener>
      </VideoContainer>
    </>
  );
};
