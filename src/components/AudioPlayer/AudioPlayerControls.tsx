import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Box } from "@mui/material";
import { QortalGetMetadata } from "../../types/interfaces/resources";
import { useResourceStatus } from "../../hooks/useResourceStatus";

export interface OnTrackChangeMeta {
  hasNext: boolean;
  hasPrevious: boolean;
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
    resourceStatus: ReturnType<typeof useResourceStatus>,
  ) => void;
  retryAttempts?: number;
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
    },
    ref,
  ) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
    const [shuffledIndex, setShuffledIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const isControlled = currentTrack !== undefined;
    const [activeTrack, setActiveTrack] = useState<QortalGetMetadata>(
      currentTrack || srcs[0],
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
        t.name === activeTrack?.name,
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
      if (audioRef.current && isReady && resourceUrl) {
        audioRef.current.pause();
        audioRef.current.src = resourceUrl;

        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    }, [resourceUrl, isReady]);

    useEffect(() => {
      const index = srcs.findIndex(
        (t) =>
          t.identifier === activeTrack?.identifier &&
          t.service === activeTrack?.service &&
          t.name === activeTrack?.name,
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
          src={resourceUrl || undefined}
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
  },
);

export const AudioPlayerControls = React.memo(AudioPlayerComponent);
