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
import { useGlobalPlayerStore } from "../../state/pip";

const controlsHeight = "42px";
const minSpeed = 0.25;
const maxSpeed = 4.0;
const speedChange = 0.25;

interface UseVideoControls {
  playerRef: any;
  autoPlay?: boolean;
  qortalVideoResource: QortalGetMetadata;
  retryAttempts?: number;
  isPlayerInitialized: boolean
  isMuted: boolean
  videoRef: any
}

export const useVideoPlayerController = (props: UseVideoControls) => {
  const { autoPlay, videoRef ,  playerRef, qortalVideoResource, retryAttempts, isPlayerInitialized, isMuted } = props;

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



  const [playbackRate, _setLocalPlaybackRate] = useState(
    playbackSettings.playbackRate
  );

  const updatePlaybackRate = useCallback(
  (newSpeed: number) => {
    try {
      const player = playerRef.current;
    if (!player) return;

    if (newSpeed > maxSpeed || newSpeed < minSpeed) newSpeed = minSpeed;

    const clampedSpeed = Math.min(Math.max(newSpeed, minSpeed), maxSpeed);
    player.playbackRate(clampedSpeed); // ✅ Video.js API

    // _setLocalPlaybackRate(clampedSpeed);
    // setPlaybackRate(clampedSpeed);
    } catch (error) {
      console.error('updatePlaybackRate', error)
    }
  },
  [setPlaybackRate, _setLocalPlaybackRate, minSpeed, maxSpeed]
);


  const increaseSpeed = useCallback(
    (wrapOverflow = true) => {
      try {
        const changedSpeed = playbackSettings.playbackRate + speedChange;
      const newSpeed = wrapOverflow
        ? changedSpeed
        : Math.min(changedSpeed, maxSpeed);
      updatePlaybackRate(newSpeed);
      } catch (error) {
        console.error('increaseSpeed', increaseSpeed)
      }
    },
    [updatePlaybackRate, playbackSettings.playbackRate]
  );

  const decreaseSpeed = useCallback(() => {
    updatePlaybackRate(playbackSettings.playbackRate - speedChange);
  }, [updatePlaybackRate, playbackSettings.playbackRate]);

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
      try {
        const newVolume = value as number;
      const ref = playerRef as any;
      if (!ref.current) return;
      if (ref.current) {
        playerRef.current?.volume(newVolume);

      }
      } catch (error) {
        console.error('onVolumeChange', error)
      }
    },
    []
  );

  const toggleMute = useCallback(() => {
    try {
       const ref = playerRef as any;
    if (!ref.current) return;
            

    ref.current?.muted(!isMuted)
    } catch (error) {
      console.error('toggleMute', toggleMute)
    }
  }, [isMuted]);

  const changeVolume = useCallback(
  (delta: number) => {
    try {
      const player = playerRef.current;
    if (!player || typeof player.volume !== 'function') return;

    const currentVolume = player.volume(); // Get current volume (0–1)
    let newVolume = Math.max(0, Math.min(currentVolume + delta, 1));
    newVolume = +newVolume.toFixed(2); // Round to 2 decimal places

    player.volume(newVolume);     // Set new volume
    player.muted(false);          // Ensure it's unmuted
    } catch (error) {
      console.error('changeVolume', error)
    }
  },
  []
);

  

const setProgressRelative = useCallback((seconds: number) => {
  try {
    const player = playerRef.current;
  if (!player || typeof player.currentTime !== 'function' || typeof player.duration !== 'function') return;

  const current = player.currentTime();
  const duration = player.duration() || 100;
  const newTime = Math.max(0, Math.min(current + seconds, duration));

  player.currentTime(newTime);
  } catch (error) {
    console.error('setProgressRelative', error)
  }
}, []);


 const setProgressAbsolute = useCallback((percent: number) => {
try {
    const player = playerRef.current;
  if (!player || typeof player.duration !== 'function' || typeof player.currentTime !== 'function') return;

  const duration = player.duration();
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const finalTime = (duration * clampedPercent) / 100;

  player.currentTime(finalTime);
} catch (error) {
  console.error('setProgressAbsolute', error)
}
}, []);

 const seekTo = useCallback((time: number) => {
try {
    const player = playerRef.current;
  if (!player || typeof player.duration !== 'function' || typeof player.currentTime !== 'function') return;

  player.currentTime(time);
} catch (error) {
  console.error('setProgressAbsolute', error)
}
}, []);


  const toggleObjectFit = useCallback(() => {
    setVideoObjectFit(videoObjectFit === "contain" ? "fill" : "contain");
  }, [setVideoObjectFit]);

const togglePlay = useCallback(async () => {
 

  try {
    if (!startedFetchRef.current) {
    setStartedFetch(true);
    startedFetchRef.current = true;
    setStartPlay(true);
    return;
  }
 const player = playerRef.current;
  if (!player) return;
  if (isReady) {
    if (player.paused()) {
      try {
        await player.play();
      } catch (err) {
        console.warn('Play failed:', err);
      }
    } else {
      player.pause();
    }
  }
  } catch (error) {
    console.error('togglePlay', error)
  }
}, [setStartedFetch, isReady]);


 const reloadVideo = useCallback(async () => {
  try {
    const player = playerRef.current;
  if (!player || !isReady || !resourceUrl) return;

  const currentTime = player.currentTime();

  player.src({ src: resourceUrl, type: 'video/mp4' }); // Adjust type if needed
  player.load();

  player.ready(() => {
    player.currentTime(currentTime);
    player.play().catch((err: any) => {
      console.warn('Playback failed after reload:', err);
    });
  });
  } catch (error) {
    console.error(error)
  }
}, [isReady, resourceUrl]);


  useEffect(() => {
    if (autoPlay) togglePlay();
  }, [autoPlay]);

  useEffect(() => {
    if (isReady) {
      togglePlay();
    }
  }, [togglePlay, isReady]);

//   videoRef?.current?.addEventListener("enterpictureinpicture", () => {
//     setPipVideoPath(window.location.pathname);

// });

// // when PiP ends (and you're on the wrong page), go back
// videoRef?.current?.addEventListener("leavepictureinpicture", () => {
//   const { pipVideoPath } = usePipStore.getState();
//   if (pipVideoPath && window.location.pathname !== pipVideoPath) {
//     navigate(pipVideoPath);
//   }
// });

 const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
     const player = playerRef.current;
  if (!player || typeof player.currentTime !== 'function' || typeof player.duration !== 'function') return;

  const current = player.currentTime();
     useGlobalPlayerStore.getState().setVideoState({
    videoSrc: videoRef.current.src,
    currentTime: current,
    isPlaying: true,
    mode: 'floating', // or 'floating'
  });
  };


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
    status, percentLoaded, showControlsFullScreen, onSelectPlaybackRate: updatePlaybackRate, seekTo, togglePictureInPicture
  };
};
