import { Ref, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QortalGetMetadata } from "../../types/interfaces/resources";
import { VideoContainer, VideoElement } from "./VideoPlayer-styles";
import { useVideoPlayerHotKeys } from "./useVideoPlayerHotKeys";
import { useProgressStore, useVideoStore } from "../../state/video";
import { useVideoPlayerController } from "./useVideoPlayerController";
import { LoadingVideo } from "./LoadingVideo";
import { VideoControlsBar } from "./VideoControlsBar";

type StretchVideoType = "contain" | "fill" | "cover" | "none" | "scale-down";

export interface VideoPlayerProps {
  qortalVideoResource: QortalGetMetadata;
  videoRef: Ref<HTMLVideoElement>;
  retryAttempts?: number;
  showControls?: boolean;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
}

const videoStyles = {
  videoContainer: { aspectRatio: "16 / 9" },
  video: { aspectRatio: "16 / 9" },
};
export const VideoPlayer = ({
  videoRef,
  qortalVideoResource,
  retryAttempts,
  showControls,
  poster,
  autoPlay,
  onEnded,
}: VideoPlayerProps) => {
  const containerRef = useRef<RefObject<HTMLDivElement> | null>(null);
  const [videoObjectFit] = useState<StretchVideoType>("contain");
  const [isPlaying, setIsPlaying] = useState(false);
  const { volume, setVolume } = useVideoStore((state) => ({
    volume: state.playbackSettings.volume,
    setVolume: state.setVolume,
  }));

  const [isMuted, setIsMuted] = useState(false);
  const { setProgress } = useProgressStore();
  const [localProgress, setLocalProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true);


  const {
    reloadVideo,
    togglePlay,
    onVolumeChange,
    increaseSpeed,
    decreaseSpeed,
    toggleMute,
    showControlsFullScreen,
    setShowControlsFullScreen,
    isFullscreen,
    toggleObjectFit,
    controlsHeight,
    setProgressRelative,
    toggleAlwaysShowControls,
    changeVolume,
    startedFetch,
    isReady,
    resourceUrl,
    startPlay,
    setProgressAbsolute,
    setAlwaysShowControls,
    status, percentLoaded
  } = useVideoPlayerController({
    autoPlay,
    videoRef,
    qortalVideoResource,
    retryAttempts
  });

  const hotkeyHandlers = useMemo(
    () => ({
      reloadVideo,
      togglePlay,
      setProgressRelative,
      toggleObjectFit,
      toggleAlwaysShowControls,
      increaseSpeed,
      decreaseSpeed,
      changeVolume,
      toggleMute,
      setProgressAbsolute,
      setAlwaysShowControls,
    }),
    [
      reloadVideo,
      togglePlay,
      setProgressRelative,
      toggleObjectFit,
      toggleAlwaysShowControls,
      increaseSpeed,
      decreaseSpeed,
      changeVolume,
      toggleMute,
      setProgressAbsolute,
      setAlwaysShowControls,
    ]
  );

  const videoLocation = useMemo(() => {
    if (!qortalVideoResource) return null;
    return `${qortalVideoResource.service}-${qortalVideoResource.name}-${qortalVideoResource.identifier}`;
  }, [qortalVideoResource]);
  useVideoPlayerHotKeys(hotkeyHandlers);

  const updateProgress = () => {
    const ref = videoRef as React.RefObject<HTMLVideoElement>;
    if (!ref.current || !videoLocation) return;
    if (typeof ref.current.currentTime === "number") {
      setProgress(videoLocation, ref.current.currentTime);
      setLocalProgress(ref.current.currentTime)
    }
  };
  useEffect(() => {
    const ref = videoRef as React.RefObject<HTMLVideoElement>;
    if (!ref.current) return;
    if (ref.current) {
      ref.current.volume = volume;
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
  }, [setIsPlaying]);

  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);
  const onVolumeChangeHandler = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = e.currentTarget;
      setVolume(video.volume);
      setIsMuted(video.muted);
    },
    [setIsMuted, setVolume]
  );

  const handleMouseEnter = useCallback(() => {
    setShowControlsFullScreen(true);
  }, [setShowControlsFullScreen]);

  const handleMouseLeave = useCallback(() => {
    setShowControlsFullScreen(false);
  }, [setShowControlsFullScreen]);

  const videoStylesContainer = useMemo(() => {
    return {
      cursor: !showControlsFullScreen && isFullscreen ? "none" : "auto",
      ...videoStyles?.videoContainer,
    };
  }, [showControlsFullScreen, isFullscreen]);

  const videoStylesVideo = useMemo(() => {
    return {
      ...videoStyles?.video,
      objectFit: videoObjectFit,
      backgroundColor: "#000000",
      height: isFullscreen && showControls ? "calc(100vh - 40px)" : "100%",
    };
  }, [videoObjectFit, showControls, isFullscreen]);

  const handleEnded = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      if (onEnded) {
        onEnded(e);
      }
    },
    [onEnded]
  );

  const handleCanPlay = useCallback(()=> {
    setIsLoading(false);
  }, [setIsLoading])

  useEffect(() => {
    const ref = videoRef as React.RefObject<HTMLVideoElement>;
    if (!ref.current) return;
    const video = ref.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
        if(video?.duration){
            setDuration(video.duration)
        }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  return (
    <VideoContainer
      tabIndex={0}
      style={videoStylesContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      <LoadingVideo togglePlay={togglePlay} isReady={isReady} status={status} percentLoaded={percentLoaded} isLoading={isLoading} />
      <VideoElement
        id={qortalVideoResource?.identifier}
        ref={videoRef}
        tabIndex={0}
        src={isReady && startPlay ? resourceUrl || undefined : undefined}
        poster={startPlay ? "" : poster}
        onTimeUpdate={updateProgress}
        autoPlay={autoPlay}
        onClick={togglePlay}
        onEnded={handleEnded}
        onCanPlay={handleCanPlay}
        preload="metadata"
        style={videoStylesVideo}
        onPlay={onPlay}
        onPause={onPause}
        onVolumeChange={onVolumeChangeHandler}
      />
     <VideoControlsBar onVolumeChange={onVolumeChange} volume={volume}  togglePlay={togglePlay} reloadVideo={hotkeyHandlers.reloadVideo} isPlaying={isPlaying} canPlay={true} isScreenSmall={false} controlsHeight={controlsHeight} videoRef={videoRef} duration={duration} progress={localProgress} />
    </VideoContainer>
  );
};
