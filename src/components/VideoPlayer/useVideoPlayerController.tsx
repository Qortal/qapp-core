import {
  useState,
  useEffect,
  RefObject,
  useMemo,
  useCallback,
  Ref,
  useRef,
  useImperativeHandle,
} from "react";
import { useProgressStore, useVideoStore } from "../../state/video";
import { QortalGetMetadata } from "../../types/interfaces/resources";
import { useResourceStatus } from "../../hooks/useResourceStatus";
import useIdleTimeout from "../../common/useIdleTimeout";

const controlsHeight = "42px";
const minSpeed = 0.25;
const maxSpeed = 4.0;
const speedChange = 0.25;

interface UseVideoControls {
  videoRef: Ref<HTMLVideoElement>;
  autoPlay?: boolean;
  qortalVideoResource: QortalGetMetadata;
  retryAttempts?: number;
}

export const useVideoPlayerController = (props: UseVideoControls) => {
  const { autoPlay, videoRef, qortalVideoResource, retryAttempts } = props;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControlsFullScreen, setShowControlsFullScreen] = useState(false)
  const [videoObjectFit, setVideoObjectFit] = useState<"contain" | "fill">(
    "contain"
  );
  const [alwaysShowControls, setAlwaysShowControls] = useState(false);
  const [startPlay, setStartPlay] = useState(false);
  const [startedFetch, setStartedFetch] = useState(false);
  const startedFetchRef = useRef(false);

  const { playbackSettings, setPlaybackRate, setVolume } = useVideoStore();
  const { getProgress } = useProgressStore();

  const { isReady, resourceUrl, status, percentLoaded } = useResourceStatus({
    resource: !startedFetch ? null : qortalVideoResource,
    retryAttempts,
  });

   const idleTime = 5000; // Time in milliseconds
    useIdleTimeout({
      onIdle: () => (setShowControlsFullScreen(false)),
      onActive: () => (setShowControlsFullScreen(true)),
      idleTime,
    });


  const videoLocation = useMemo(() => {
    if (!qortalVideoResource) return null;
    return `${qortalVideoResource.service}-${qortalVideoResource.name}-${qortalVideoResource.identifier}`;
  }, [qortalVideoResource]);

  useEffect(() => {
    if (videoLocation) {
      const ref = videoRef as React.RefObject<HTMLVideoElement>;
      if (!ref.current) return;

      const savedProgress = getProgress(videoLocation);
      if (typeof savedProgress === "number") {
        ref.current.currentTime = savedProgress;
      }
    }
  }, [videoLocation, getProgress]);

  const [playbackRate, _setLocalPlaybackRate] = useState(
    playbackSettings.playbackRate
  );

  const updatePlaybackRate = useCallback(
    (newSpeed: number) => {
      const ref = videoRef as React.RefObject<HTMLVideoElement>;
      if (!ref.current) return;

      if (newSpeed > maxSpeed || newSpeed < minSpeed) newSpeed = minSpeed;
      ref.current.playbackRate = newSpeed;
      _setLocalPlaybackRate(newSpeed);
      setPlaybackRate(newSpeed);
    },
    [setPlaybackRate, _setLocalPlaybackRate]
  );

  const increaseSpeed = useCallback(
    (wrapOverflow = true) => {
      const changedSpeed = playbackRate + speedChange;
      const newSpeed = wrapOverflow
        ? changedSpeed
        : Math.min(changedSpeed, maxSpeed);
      updatePlaybackRate(newSpeed);
    },
    [updatePlaybackRate, playbackRate]
  );

  const decreaseSpeed = useCallback(() => {
    updatePlaybackRate(playbackRate - speedChange);
  }, [updatePlaybackRate, playbackRate]);

  const toggleAlwaysShowControls = useCallback(() => {
    setAlwaysShowControls((prev) => !prev);
  }, [setAlwaysShowControls]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const onVolumeChange = useCallback(
    (_: any, value: number | number[]) => {
      const newVolume = value as number;
      const ref = videoRef as React.RefObject<HTMLVideoElement>;
      if (!ref.current) return;
      if (ref.current) ref.current.volume = newVolume;
    },
    []
  );

  const toggleMute = useCallback(() => {
    const ref = videoRef as React.RefObject<HTMLVideoElement>;
    if (!ref.current) return;
  
    ref.current.muted = !ref.current.muted;
  }, []);

  const changeVolume = useCallback(
    (delta: number) => {
      const ref = videoRef as React.RefObject<HTMLVideoElement>;
      if (!ref.current) return;
  
      // Get current volume directly from video element
      const currentVolume = ref.current.volume;
      let newVolume = Math.max(0, Math.min(currentVolume + delta, 1));
      newVolume = +newVolume.toFixed(2);
  
      ref.current.volume = newVolume;
      ref.current.muted = false;
  
    },
    []
  );
  

  const setProgressRelative = useCallback((seconds: number) => {
    const ref = videoRef as React.RefObject<HTMLVideoElement>;
    const current = ref.current.currentTime;
    const duration = ref.current.duration || 100;
    const newTime = Math.max(0, Math.min(current + seconds, duration));
    ref.current.currentTime = newTime;
  }, []);

  const setProgressAbsolute = useCallback((percent: number) => {
    const ref = videoRef as React.RefObject<HTMLVideoElement>;

    if (!ref.current) return;
    const finalTime =
      (ref.current.duration * Math.min(100, Math.max(0, percent))) / 100;
    ref.current.currentTime = finalTime;
  }, []);

  const toggleObjectFit = useCallback(() => {
    setVideoObjectFit(videoObjectFit === "contain" ? "fill" : "contain");
  }, [setVideoObjectFit]);

  const togglePlay = useCallback(async () => {
    const ref = videoRef as React.RefObject<HTMLVideoElement>;
    if (!ref.current) return;
    if (!startedFetchRef.current) {
      setStartedFetch(true);
      startedFetchRef.current = true;
      setStartPlay(true);
      return;
    }
    if (isReady && ref.current) {
      if (ref.current.paused) {
        ref.current.play();
      } else {
        ref.current.pause();
      }
    
    }
  }, [ setStartedFetch, isReady]);

  const reloadVideo = useCallback(async () => {
    const ref = videoRef as React.RefObject<HTMLVideoElement>;
    if (!ref?.current || !isReady || !resourceUrl) return;
    const currentTime = ref.current.currentTime;
    ref.current.src = resourceUrl;
    ref.current.load();
    ref.current.currentTime = currentTime;
    ref.current.play();
  }, [isReady, resourceUrl]);

  useEffect(() => {
    if (autoPlay) togglePlay();
  }, [autoPlay]);

  useEffect(() => {
    if (isReady) {
      togglePlay();
    }
  }, [togglePlay, isReady]);

  return {
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
    toggleAlwaysShowControls,
    changeVolume,
    setProgressAbsolute,
    setAlwaysShowControls,
    startedFetch,
    isReady,
    resourceUrl,
    startPlay,
    status, percentLoaded, showControlsFullScreen
  };
};
