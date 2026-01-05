import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Box } from '@mui/material';
import { QortalGetMetadata } from '../../types/interfaces/resources';
import { useResourceStatus } from '../../hooks/useResourceStatus';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../utils/base64';
import {
  setEncryptionConfig,
  removeEncryptionConfig,
  generateEncryptedVideoUrl,
  tryRegisterServiceWorker,
} from '../../utils/serviceWorkerEncryption';

export interface OnTrackChangeMeta {
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface EncryptionConfig {
  key: string; // base64 encoded key
  iv: string; // base64 encoded iv
  encryptionType: string;
  mimeType: string;
}

export interface AudioPlayerProps {
  srcs: QortalGetMetadata[];
  currentTrack?: QortalGetMetadata;
  controls?: boolean;
  style?: React.CSSProperties;
  className?: string;
  sx?: object;
  loopCurrentTrack?: boolean;
  shuffle?: boolean;
  onTrackChange?: (track: QortalGetMetadata, meta: OnTrackChangeMeta) => void;
  onEndedAll?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: React.ReactEventHandler<HTMLAudioElement>;
  onProgress?: (currentTime: number, duration: number) => void;
  onResourceStatus?: (
    resourceStatus: ReturnType<typeof useResourceStatus>
  ) => void;
  retryAttempts?: number;
  encryption?: EncryptionConfig;
}

export interface AudioPlayerHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  setTrack: (track: QortalGetMetadata) => void;
  seekTo: (seconds: number) => void;
  setVolume: (level: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  isPlaying: boolean;
  currentTrackIndex: number;
  audioEl: HTMLAudioElement | null;
}

/**
 * Play encrypted audio using Qortal native API with Node.js server (PRIMARY METHOD)
 * Returns streamUrl on success, null if not available
 */
async function playEncryptedAudioWithQortalRequest({
  keyBytes,
  ivBytes,
  qortalAudioResource,
}: {
  keyBytes: Uint8Array;
  ivBytes: Uint8Array;
  qortalAudioResource: any;
}): Promise<string | null> {
  try {
    const mediaId = `${qortalAudioResource.service}-${qortalAudioResource.name}-${qortalAudioResource.identifier}`;

    // Convert key and iv to base64 for qortalRequest
    const keyBase64 = uint8ArrayToBase64(keyBytes);
    const ivBase64 = uint8ArrayToBase64(ivBytes);

    const response = await qortalRequest({
      action: 'PLAY_ENCRYPTED_MEDIA',
      mediaId,
      key: keyBase64,
      iv: ivBase64,
      location: {
        service: qortalAudioResource.service,
        identifier: qortalAudioResource.identifier,
        name: qortalAudioResource.name,
      },
    });

    if (response && response.streamUrl) {
      return response.streamUrl;
    }

    console.warn('[Encrypted Audio] No streamUrl in response');
    return null;
  } catch (error) {
    console.warn(
      '[Encrypted Audio] Qortal native playback not available:',
      error
    );
    return null;
  }
}

/**
 * Play encrypted audio using Service Worker proxy (FALLBACK)
 * Returns audioId on success, null if Service Worker not available
 */
async function playEncryptedAudioWithServiceWorker({
  keyBytes,
  ivBytes,
  resourceUrl,
  mimeType,
}: {
  keyBytes: Uint8Array;
  ivBytes: Uint8Array;
  resourceUrl: string;
  mimeType?: string | null;
}): Promise<string | null> {
  // Try to register service worker
  const swAvailable = await tryRegisterServiceWorker();
  if (!swAvailable) {
    console.warn(
      '[Encrypted Audio] Service Worker not available, will use fallback'
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
    console.error('[Encrypted Audio] Failed to get file size:', error);
    throw error;
  }

  // Generate unique audio ID
  const audioId = `audio-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Send encryption config to service worker
  try {
    await setEncryptionConfig(audioId, {
      key: keyBytes,
      iv: ivBytes,
      resourceUrl,
      totalSize,
      mimeType: mimeType || 'audio/mpeg',
    });
  } catch (error) {
    console.error('[Encrypted Audio] Failed to set encryption config:', error);
    throw error;
  }

  return audioId; // Return audioId for cleanup later
}

async function getAudioMimeTypeFromUrl(
  qortalAudioResource: any
): Promise<string | null> {
  try {
    const metadataResponse = await fetch(
      `/arbitrary/metadata/${qortalAudioResource.service}/${qortalAudioResource.name}/${qortalAudioResource.identifier}`
    );
    const metadataData = await metadataResponse.json();
    return metadataData?.mimeType || null;
  } catch (error) {
    return null;
  }
}

const AudioPlayerComponent = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  (
    {
      srcs,
      currentTrack,
      style,
      className,
      sx,
      loopCurrentTrack = false,
      shuffle = false,
      onTrackChange,
      onEndedAll,
      onPlay,
      onPause,
      onEnded,
      onError,
      onProgress,
      onResourceStatus,
      retryAttempts = 50,
      encryption,
    },
    ref
  ) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
    const [shuffledIndex, setShuffledIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [encryptedAudioId, setEncryptedAudioId] = useState<string | null>(
      null
    );
    const setupAbortController = useRef<AbortController | null>(null);
    const lastSetupTrackRef = useRef<string | null>(null);

    const isControlled = currentTrack !== undefined;
    const [activeTrack, setActiveTrack] = useState<QortalGetMetadata>(
      currentTrack || srcs[0]
    );

    useEffect(() => {
      if (isControlled && currentTrack) {
        setActiveTrack(currentTrack);
      }
    }, [currentTrack, isControlled]);

    const resetShuffle = useCallback(() => {
      setShuffledOrder([]);
      setShuffledIndex(0);
    }, []);

    useEffect(() => {
      resetShuffle();
    }, [shuffle, resetShuffle, srcs]);

    useEffect(() => {
      if (shuffle) {
        const indices = srcs.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setShuffledOrder(indices);
        setShuffledIndex(0);
        setActiveTrack(srcs[indices[0]]);
      }
    }, [shuffle, srcs]);

    const trackIndex = srcs.findIndex(
      (t) =>
        t.identifier === activeTrack?.identifier &&
        t.service === activeTrack?.service &&
        t.name === activeTrack?.name
    );
    const resourceStatus = useResourceStatus({
      resource: activeTrack || null,
      retryAttempts,
    });
    const { isReady, resourceUrl } = resourceStatus;
    const hasNext = trackIndex < srcs.length - 1;
    const hasPrevious = trackIndex > 0;

    const setTrack = (track: QortalGetMetadata) => {
      setActiveTrack(track);
    };

    const play = () => audioRef.current?.play();
    const pause = () => audioRef.current?.pause();
    const stop = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    };

    const next = () => {
      if (shuffle) {
        const nextIndex = shuffledIndex + 1;
        if (nextIndex < shuffledOrder.length) {
          setShuffledIndex(nextIndex);
          setTrack(srcs[shuffledOrder[nextIndex]]);
        } else {
          onEndedAll?.();
        }
      } else if (hasNext) {
        setTrack(srcs[trackIndex + 1]);
      } else {
        onEndedAll?.();
      }
    };

    const prev = () => {
      if (shuffle) {
        const prevIndex = shuffledIndex - 1;
        if (prevIndex >= 0) {
          setShuffledIndex(prevIndex);
          setTrack(srcs[shuffledOrder[prevIndex]]);
        }
      } else if (hasPrevious) {
        setTrack(srcs[trackIndex - 1]);
      }
    };

    const seekTo = (seconds: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = seconds;
      }
    };

    const setVolume = (level: number) => {
      if (audioRef.current) {
        audioRef.current.volume = Math.min(1, Math.max(0, level));
      }
    };

    const setMuted = (muted: boolean) => {
      if (audioRef.current) {
        audioRef.current.muted = muted;
      }
    };

    const toggleMute = () => {
      if (audioRef.current) {
        audioRef.current.muted = !audioRef.current.muted;
      }
    };

    useEffect(() => {
      const audioElement = audioRef.current;
      if (!audioElement || !isReady || !resourceUrl) return;

      // Generate unique track identifier
      const trackId = `${activeTrack?.service}-${activeTrack?.name}-${activeTrack?.identifier}-${encryption?.key || 'none'}`;

      // Skip if we already set up this exact track
      if (lastSetupTrackRef.current === trackId) {
        return;
      }

      // Abort any previous setup
      if (setupAbortController.current) {
        setupAbortController.current.abort();
      }

      // Create new abort controller for this setup
      const abortController = new AbortController();
      setupAbortController.current = abortController;

      const setupAudio = async () => {
        try {
          // Check if encryption is enabled
          if (
            encryption?.key &&
            encryption?.iv &&
            encryption?.encryptionType &&
            encryption?.mimeType
          ) {
            // ENCRYPTED AUDIO PATH
            const keyBytes = base64ToUint8Array(encryption.key);
            const ivBytes = base64ToUint8Array(encryption.iv);

            // Try Qortal native playback first
            const qortalStreamUrl = await playEncryptedAudioWithQortalRequest({
              keyBytes,
              ivBytes,
              qortalAudioResource: activeTrack,
            });

            if (abortController.signal.aborted) return;

            if (qortalStreamUrl) {
              audioElement.src = qortalStreamUrl;
              audioElement.load();
              audioElement.play().catch(() => {
                /* auto-play prevented */
              });
              // Mark this track as set up
              lastSetupTrackRef.current = trackId;
              return;
            }

            // Fallback to Service Worker
            const swAudioId = await playEncryptedAudioWithServiceWorker({
              keyBytes,
              ivBytes,
              resourceUrl,
              mimeType: encryption.mimeType,
            });

            if (abortController.signal.aborted) return;

            if (swAudioId) {
              setEncryptedAudioId(swAudioId);
              const virtualUrl = generateEncryptedVideoUrl(swAudioId);
              audioElement.src = virtualUrl;
              audioElement.load();
              audioElement.play().catch(() => {
                /* auto-play prevented */
              });
              // Mark this track as set up
              lastSetupTrackRef.current = trackId;
              return;
            }
          } else {
            // NON-ENCRYPTED AUDIO PATH
            audioElement.src = resourceUrl;
            audioElement.load();
            audioElement.play().catch(() => {
              /* auto-play prevented */
            });
            // Mark this track as set up
            lastSetupTrackRef.current = trackId;
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            // Silent - errors are expected during cancellation
          }
        }
      };

      setupAudio();

      // Cleanup
      return () => {
        abortController.abort();
      };
    }, [resourceUrl, isReady, activeTrack, encryption]);

    useEffect(() => {
      const index = srcs.findIndex(
        (t) =>
          t.identifier === activeTrack?.identifier &&
          t.service === activeTrack?.service &&
          t.name === activeTrack?.name
      );
      if (index !== -1) {
        onTrackChange?.(activeTrack, {
          hasNext: index < srcs.length - 1,
          hasPrevious: index > 0,
        });
      }
    }, [activeTrack, srcs, onTrackChange]);

    useEffect(() => {
      if (onResourceStatus) {
        onResourceStatus(resourceStatus);
      }
    }, [onResourceStatus, resourceStatus]);

    // Cleanup encrypted audio Service Worker config on unmount
    useEffect(() => {
      return () => {
        if (encryptedAudioId) {
          removeEncryptionConfig(encryptedAudioId).catch((err) => {
            console.warn(
              '[Encrypted Audio] Failed to cleanup Service Worker config:',
              err
            );
          });
        }
      };
    }, [encryptedAudioId]);

    useImperativeHandle(ref, () => ({
      play,
      pause,
      stop,
      next,
      prev,
      setTrack,
      seekTo,
      setVolume,
      setMuted,
      toggleMute,
      isPlaying,
      currentTrackIndex: trackIndex,
      audioEl: audioRef.current,
    }));

    return (
      <Box className={className} sx={sx} style={style}>
        <audio
          ref={audioRef}
          loop={loopCurrentTrack}
          onPlay={() => {
            setIsPlaying(true);
            onPlay?.();
          }}
          onPause={() => {
            setIsPlaying(false);
            onPause?.();
          }}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
            if (!loopCurrentTrack) next();
          }}
          onError={onError}
          onTimeUpdate={() => {
            const audio = audioRef.current;
            if (audio && onProgress) {
              onProgress(audio.currentTime, audio.duration || 0);
            }
          }}
        />
      </Box>
    );
  }
);

export const AudioPlayerControls = React.memo(AudioPlayerComponent);
