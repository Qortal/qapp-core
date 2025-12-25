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
import {
  base64ToBlobUrl,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../../utils/base64';
import convert from 'srt-webvtt';
import { TimelineActionsComponent } from './TimelineActionsComponent';
import { PlayBackMenu } from './VideoControls';
import { useGlobalPlayerStore } from '../../state/pip';
import { alpha, ClickAwayListener, Drawer } from '@mui/material';
import { MobileControls } from './MobileControls';
import { useLocation } from 'react-router-dom';
// @ts-ignore - aes-js doesn't have type definitions
import * as aesjs from 'aes-js';
import {
  setEncryptionConfig,
  removeEncryptionConfig,
  generateEncryptedVideoUrl,
  tryRegisterServiceWorker,
} from '../../utils/serviceWorkerEncryption';

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
  const blockOffset = BigInt(nextStart >> 4);

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

// Create a ReadableStream that fetches and decrypts encrypted ranges on-demand
function createEncryptedVideoStream({
  resourceUrl,
  keyBytes,
  ivBytes,
  totalSize,
  chunkSize,
}: {
  resourceUrl: string;
  keyBytes: Uint8Array;
  ivBytes: Uint8Array;
  totalSize: number | null;
  chunkSize: number;
}): ReadableStream<Uint8Array> {
  let nextStart = 0;
  let firstChunkProcessed = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        // Check if we've reached the end
        if (totalSize && nextStart >= totalSize) {
          controller.close();
          return;
        }

        // Calculate next range
        const nextEnd = totalSize
          ? Math.min(nextStart + chunkSize - 1, totalSize - 1)
          : nextStart + chunkSize - 1;

        // Fetch encrypted range
        const encrypted = await fetchEncryptedRange(
          nextStart,
          nextEnd,
          resourceUrl
        );

        if (encrypted.length === 0) {
          controller.close();
          return;
        }

        // Decrypt with correct block offset
        const blockOffset = BigInt(nextStart >> 4);
        const decrypted = await decryptAesCtrChunk(
          keyBytes,
          ivBytes,
          blockOffset,
          encrypted
        );

        // Log first chunk info
        if (!firstChunkProcessed) {
          const firstBytes = Array.from(decrypted.slice(0, 12))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ');

          const firstFourBytes = String.fromCharCode(...decrypted.slice(4, 8));
          firstChunkProcessed = true;
        }

        // Enqueue decrypted data
        controller.enqueue(decrypted);

        nextStart += encrypted.length;

        const progress = totalSize
          ? `${((nextStart / totalSize) * 100).toFixed(1)}%`
          : '?';

        // Check if we've reached the end
        if (totalSize && nextStart >= totalSize) {
          controller.close();
        } else if (encrypted.length < nextEnd - nextStart + 1) {
          // Got less than requested, probably end of file
          controller.close();
        }
      } catch (error) {
        console.error('Error in encrypted video stream:', error);
        controller.error(error);
      }
    },
  });
}

/**
 * @deprecated This function is no longer used. Use playEncryptedVideoWithQortalRequest or playEncryptedVideoWithNodeServer instead.
 * Play encrypted video using in-memory blob approach (DEPRECATED - causes memory issues)
 * This loads the entire video into memory before playing, which can cause issues with large files
 */
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
  // Step 1: Get file size using HEAD request
  let totalSize: number | null = null;
  try {
    const headResponse = await fetch(resourceUrl, { method: 'HEAD' });
    const contentLength = headResponse.headers.get('content-length');
    if (contentLength) {
      totalSize = parseInt(contentLength, 10);
    } else {
      console.warn('Could not determine file size from HEAD request');
    }
  } catch (error) {
    console.warn(
      'HEAD request failed, will determine size from first range request:',
      error
    );
  }

  // Step 2: Create ReadableStream for fetching and decrypting
  const encryptedStream = createEncryptedVideoStream({
    resourceUrl,
    keyBytes,
    ivBytes,
    totalSize,
    chunkSize,
  });

  // Step 3: Try MediaSource approach with ReadableStream (works with fragmented MP4)
  try {
    const mediaSource = await createMediaSource(player);

    // Try different codec strings
    const codecOptions = [
      mimeType || 'video/mp4',
      'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4',
    ];

    let sourceBuffer: SourceBuffer | null = null;
    for (const codec of codecOptions) {
      try {
        sourceBuffer = mediaSource.addSourceBuffer(codec);
        break;
      } catch (error) {
        console.warn('Failed to create SourceBuffer with codec:', codec, error);
        continue;
      }
    }

    if (!sourceBuffer) {
      throw new Error('Failed to create SourceBuffer with any codec');
    }

    // Add error listeners
    sourceBuffer.addEventListener('error', (e) => {
      console.error('SourceBuffer error:', e);
    });

    // Read from stream and append to SourceBuffer with backpressure
    const reader = encryptedStream.getReader();
    let chunksAppended = 0;
    let hasBufferedData = false;

    try {
      while (true) {
        // Wait for SourceBuffer to be ready (backpressure)
        while (sourceBuffer.updating) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Read next chunk from stream
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Append to SourceBuffer
        await appendToBuffer(sourceBuffer, value);
        chunksAppended++;

        // Check if we have buffered data (indicates MediaSource is working)
        if (chunksAppended === 1) {
          // Wait a bit for first chunk to be processed
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (sourceBuffer.buffered.length > 0) {
            hasBufferedData = true;
          }
        }
      }

      // Wait for SourceBuffer to finish updating
      while (sourceBuffer.updating) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (sourceBuffer.buffered.length > 0) {
        for (let i = 0; i < sourceBuffer.buffered.length; i++) {}

        // If we have buffered data, MediaSource worked!
        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream();
          return; // Success with MediaSource!
        }
      } else {
        console.warn(
          'No buffered ranges - MediaSource may not work with this file format'
        );
        throw new Error(
          'SourceBuffer rejected data - file may not be fragmented MP4'
        );
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.warn(
      'MediaSource approach failed, trying ReadableStream Blob URL fallback:',
      error
    );
    // Fall through to ReadableStream Blob URL approach
  }

  // Step 4: Fallback to ReadableStream Blob URL approach
  // Uses the same stream but creates smaller Blob URLs incrementally
  // This is more memory-efficient than loading the entire file

  const decryptedChunks: Blob[] = [];
  const maxChunksInMemory = 10; // Smaller limit for better memory management
  let totalBytesProcessed = 0;
  let blobUrlCreated = false;

  try {
    // Create a new stream (the previous one was consumed)
    const fallbackStream = createEncryptedVideoStream({
      resourceUrl,
      keyBytes,
      ivBytes,
      totalSize,
      chunkSize,
    });

    const reader = fallbackStream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Create Blob from decrypted chunk
        const decryptedBuffer = new Uint8Array(value).buffer;
        decryptedChunks.push(
          new Blob([decryptedBuffer], { type: mimeType || 'video/mp4' })
        );

        totalBytesProcessed += value.length;

        const progress = totalSize
          ? `${((totalBytesProcessed / totalSize) * 100).toFixed(1)}%`
          : '?';

        // Create Blob URL periodically to limit memory usage
        if (
          decryptedChunks.length >= maxChunksInMemory ||
          (totalSize && totalBytesProcessed >= totalSize)
        ) {
          const blob = new Blob(decryptedChunks, {
            type: mimeType || 'video/mp4',
          });
          const blobUrl = URL.createObjectURL(blob);

          const videoEl = player.tech().el_;
          if (videoEl) {
            // Clean up any existing source
            if (videoEl.srcObject) {
              const existingMS = videoEl.srcObject as MediaSource;
              if (existingMS.readyState === 'open') {
                existingMS.endOfStream();
              }
            }
            if (videoEl.src && (player as any)._encryptedBlobUrl) {
              URL.revokeObjectURL((player as any)._encryptedBlobUrl);
            }

            videoEl.src = blobUrl;
            (player as any)._encryptedBlobUrl = blobUrl;
            blobUrlCreated = true;
          }

          // Clear chunks to free memory (if not at end)
          if (totalSize && totalBytesProcessed < totalSize) {
            decryptedChunks.length = 0;
          } else {
            // At the end, keep the chunks for final blob
            break;
          }
        }
      }

      // Create final blob URL if there are remaining chunks
      if (decryptedChunks.length > 0) {
        const blob = new Blob(decryptedChunks, {
          type: mimeType || 'video/mp4',
        });
        const blobUrl = URL.createObjectURL(blob);

        const videoEl = player.tech().el_;
        if (videoEl) {
          if (
            videoEl.src &&
            (player as any)._encryptedBlobUrl &&
            blobUrlCreated
          ) {
            URL.revokeObjectURL((player as any)._encryptedBlobUrl);
          }
          videoEl.src = blobUrl;
          (player as any)._encryptedBlobUrl = blobUrl;
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('ReadableStream Blob URL approach failed:', error);
    throw error;
  }
}

/**
 * Play encrypted video using Qortal native API with Node.js server (PRIMARY METHOD)
 * This uses qortalRequest with PLAY_ENCRYPTED_MEDIA which internally uses a Node.js decryption server
 * Returns streamUrl on success, null if not available
 */
async function playEncryptedVideoWithQortalRequest({
  player,
  keyBytes,
  ivBytes,
  qortalVideoResource,
}: {
  player: any;
  keyBytes: Uint8Array;
  ivBytes: Uint8Array;
  qortalVideoResource: any;
}): Promise<string | null> {
  try {
    const mediaId = `${qortalVideoResource.service}-${qortalVideoResource.name}-${qortalVideoResource.identifier}`;

    // Convert key and iv to base64 for qortalRequest
    const keyBase64 = uint8ArrayToBase64(keyBytes);
    const ivBase64 = uint8ArrayToBase64(ivBytes);

    const response = await qortalRequest({
      action: 'PLAY_ENCRYPTED_MEDIA',
      mediaId,
      key: keyBase64,
      iv: ivBase64,
      location: {
        service: qortalVideoResource.service,
        identifier: qortalVideoResource.identifier,
        name: qortalVideoResource.name,
      },
    });

    if (response && response.streamUrl) {
      return response.streamUrl;
    }

    console.warn('[Encrypted Video] No streamUrl in response');
    return null;
  } catch (error) {
    console.warn(
      '[Encrypted Video] Qortal native playback not available:',
      error
    );
    return null;
  }
}

/**
 * Play encrypted video using Service Worker proxy (FALLBACK)
 * This approach allows true streaming without loading everything into memory
 * Works with videos of any size
 * Returns videoId on success, null if Service Worker not available
 */
async function playEncryptedVideoWithServiceWorker({
  player,
  keyBytes,
  ivBytes,
  resourceUrl,
  mimeType,
}: {
  player: any;
  keyBytes: Uint8Array;
  ivBytes: Uint8Array;
  resourceUrl: string;
  mimeType?: string | null;
}): Promise<string | null> {
  // Try to register service worker
  const swAvailable = await tryRegisterServiceWorker();
  if (!swAvailable) {
    console.warn(
      '[Encrypted Video] Service Worker not available, will use fallback'
    );
    return null;
  }

  // Get file size using HEAD request
  let totalSize: number;
  try {
    const headResponse = await fetch(resourceUrl, { method: 'HEAD' });
    const contentLength = headResponse.headers.get('content-length');
    if (!contentLength) {
      throw new Error('Could not determine file size from HEAD request');
    }
    totalSize = parseInt(contentLength, 10);
  } catch (error) {
    console.error('[Encrypted Video] Failed to get file size:', error);
    throw error;
  }

  // Generate unique video ID
  const videoId = `video-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Send encryption config to service worker
  try {
    await setEncryptionConfig(videoId, {
      key: keyBytes,
      iv: ivBytes,
      resourceUrl,
      totalSize,
      mimeType: mimeType || 'video/mp4',
    });
  } catch (error) {
    console.error('[Encrypted Video] Failed to set encryption config:', error);
    throw error;
  }

  return videoId; // Return videoId for cleanup later
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
  key: string; // base64 encoded key
  iv: string; // base64 encoded iv
  encryptionType: string;
  mimeType: string;
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
  const [encryptedVideoId, setEncryptedVideoId] = useState<string | null>(null);
  const pendingPlayRef = useRef(false); // Track if user clicked play during setup

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

      // Cleanup encrypted video Service Worker config
      if (encryptedVideoId) {
        removeEncryptionConfig(encryptedVideoId).catch((err) => {
          console.warn(
            '[Encrypted Video] Failed to cleanup Service Worker config:',
            err
          );
        });
      }
    };
  }, [encryptedVideoId]);

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
          encryption.encryptionType &&
          encryption.mimeType
        ) {
          // Encrypted video playback path
          if (!playerRef.current && ref.current) {
            // Convert base64 encoded key and iv to Uint8Array
            const keyBytes = base64ToUint8Array(encryption.key);
            const ivBytes = base64ToUint8Array(encryption.iv);

            // Setup encrypted playback with new fallback chain
            try {
              // STEP 1: Try Qortal native playback with Node.js server (PRIMARY)
              console.log(
                '[Encrypted Video] Step 1: Trying Qortal native playback...'
              );
              const qortalStreamUrl = await playEncryptedVideoWithQortalRequest(
                {
                  player: playerRef.current,
                  keyBytes: keyBytes,
                  ivBytes: ivBytes,
                  qortalVideoResource: resource,
                }
              );

              if (qortalStreamUrl) {
                const options = {
                  autoplay: true,
                  controls: false,
                  responsive: true,
                  // fluid: true,
                  poster: startPlay ? '' : poster,
                  // aspectRatio: "16:9",
                  sources: [
                    {
                      src: qortalStreamUrl,
                      type: encryption.mimeType || 'video/mp4', // fallback
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
                        if (
                          track.kind === 'subtitles' ||
                          track.kind === 'captions'
                        ) {
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
                  return;
                }

                // Don't auto-play - let user control playback
              } else {
                // STEP 2: Try Service Worker as fallback
                console.log(
                  '[Encrypted Video] Step 2: Trying Service Worker fallback...'
                );
                const swVideoId = await playEncryptedVideoWithServiceWorker({
                  player: playerRef.current,
                  keyBytes: keyBytes,
                  ivBytes: ivBytes,
                  resourceUrl: resourceUrl || '',
                  mimeType: encryption.mimeType,
                });

                if (swVideoId) {
                  // Service Worker approach succeeded
                  console.log(
                    '[Encrypted Video] Using Service Worker for decryption'
                  );
                  setEncryptedVideoId(swVideoId);

                  // Generate virtual URL that service worker will intercept
                  const virtualUrl = generateEncryptedVideoUrl(swVideoId);

                  const options = {
                    autoplay: true,
                    controls: false,
                    responsive: true,
                    // fluid: true,
                    poster: startPlay ? '' : poster,
                    // aspectRatio: "16:9",
                    sources: [
                      {
                        src: virtualUrl,
                        type: encryption.mimeType || 'video/mp4', // fallback
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
                          if (
                            track.kind === 'subtitles' ||
                            track.kind === 'captions'
                          ) {
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
                    return;
                  }

                  // Don't auto-play - let user control playback
                } else {
                  // Both methods failed
                  console.error(
                    '[Encrypted Video] All playback methods failed'
                  );
                  throw new Error(
                    'No encrypted video playback method available'
                  );
                }
              }

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
