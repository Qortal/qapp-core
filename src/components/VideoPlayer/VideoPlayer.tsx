import { ReactEventHandler, Ref, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QortalGetMetadata } from "../../types/interfaces/resources";
import { VideoContainer, VideoElement } from "./VideoPlayer-styles";
import { useVideoPlayerHotKeys } from "./useVideoPlayerHotKeys";
import { useProgressStore, useVideoStore } from "../../state/video";
import { useVideoPlayerController } from "./useVideoPlayerController";
import { LoadingVideo } from "./LoadingVideo";
import { VideoControlsBar } from "./VideoControlsBar";
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

import Player from "video.js/dist/types/player";
import { SubtitleManager } from "./SubtitleManager";


type StretchVideoType = "contain" | "fill" | "cover" | "none" | "scale-down";


 interface VideoPlayerProps {
  qortalVideoResource: QortalGetMetadata;
  videoRef: Ref<HTMLVideoElement>;
  retryAttempts?: number;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
}

const videoStyles = {
  videoContainer: { },
  video: { },
};

async function loadMediaInfo(wasmPath = '/MediaInfoModule.wasm') {
  const mediaInfoModule = await import('mediainfo.js');
  return await mediaInfoModule.default({
    format: 'JSON',
    full: true,
    locateFile: () => wasmPath,
  });
}

async function getVideoMimeTypeFromUrl(qortalVideoResource: any): Promise<string | null> {

  try {
    const metadataResponse = await fetch(`/arbitrary/metadata/${qortalVideoResource.service}/${qortalVideoResource.name}/${qortalVideoResource.identifier}`)
  const metadataData = await metadataResponse.json()
  return metadataData?.mimeType || null
  } catch (error) {
    return null
  }
  // const mediaInfo = await loadMediaInfo();
  // const chunkCache = new Map<string, Uint8Array>();

  // let fileSize = 0;
  // try {
  //   const headResp = await fetch(videoUrl, { method: 'HEAD' });
  //   const lengthHeader = headResp.headers.get('Content-Length');
  //   if (!lengthHeader) throw new Error('Missing content length');
  //   fileSize = parseInt(lengthHeader, 10);
  // } catch (err) {
  //   console.error('Error fetching content length:', err);
  //   return null;
  // }

  // try {
  //   const rawResult = await mediaInfo.analyzeData(
  //     () => fileSize,
  //     async (chunkSize: number, offset: number): Promise<Uint8Array> => {
  //       const key = `${offset}:${chunkSize}`;
  //       if (chunkCache.has(key)) return chunkCache.get(key)!;

  //       const end = Math.min(fileSize - 1, offset + chunkSize - 1);
  //       const resp = await fetch(videoUrl, {
  //         headers: { Range: `bytes=${offset}-${end}` },
  //       });

  //       if (!resp.ok || (resp.status !== 206 && fileSize > chunkSize)) {
  //         console.warn(`Range request failed: ${resp.status}`);
  //         return new Uint8Array();
  //       }

  //       const blob = await resp.blob();
  //       const buffer = new Uint8Array(await blob.arrayBuffer());
  //       chunkCache.set(key, buffer);
  //       return buffer;
  //     }
  //   );

  //   const result = JSON.parse(rawResult);
  //   const tracks = result?.media?.track;

  //   const videoTrack = tracks?.find((t: any) => t['@type'] === 'Video');
  //   const format = videoTrack?.Format?.toLowerCase();

  //   switch (format) {
  //     case 'avc':
  //     case 'h264':
  //     case 'mpeg-4':
  //     case 'mp4':
  //       return 'video/mp4';
  //     case 'vp8':
  //     case 'vp9':
  //       return 'video/webm';
  //     case 'hevc':
  //     case 'h265':
  //       return 'video/mp4'; // still usually wrapped in MP4
  //     case 'matroska':
  //       return 'video/webm';
  //     default:
  //       return 'video/mp4'; // fallback
  //   }
  // } catch (err) {
  //   console.error('Error analyzing media info:', err);
  //   return null;
  // }
}

export const VideoPlayer = ({
  videoRef,
  qortalVideoResource,
  retryAttempts,
  poster,
  autoPlay,
  onEnded,
}: VideoPlayerProps) => {
  const containerRef = useRef<RefObject<HTMLDivElement> | null>(null);
  const [videoObjectFit] = useState<StretchVideoType>("contain");
  const [isPlaying, setIsPlaying] = useState(false);
  const { volume, setVolume, setPlaybackRate, playbackRate } = useVideoStore((state) => ({
    volume: state.playbackSettings.volume,
    setVolume: state.setVolume,
    setPlaybackRate: state.setPlaybackRate,
    playbackRate: state.playbackSettings.playbackRate
  }));
  const playerRef = useRef<Player | null>(null);
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false)
  const [videoCodec, setVideoCodec] = useState<null | false | string>(null)
  const [isMuted, setIsMuted] = useState(false);
  const { setProgress } = useProgressStore();
  const [localProgress, setLocalProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false)
  const [isOpenSubtitleManage, setIsOpenSubtitleManage] = useState(false)
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
    toggleAlwaysShowControls,
    changeVolume,
    startedFetch,
    isReady,
    resourceUrl,
    startPlay,
    setProgressAbsolute,
    setAlwaysShowControls,
    status, percentLoaded,
    showControlsFullScreen,
    
  } = useVideoPlayerController({
    autoPlay,
    playerRef,
    qortalVideoResource,
    retryAttempts,
    isPlayerInitialized
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





const closeSubtitleManager = useCallback(()=> {
  setIsOpenSubtitleManage(false)
}, [])
  const openSubtitleManager = useCallback(()=> {
  setIsOpenSubtitleManage(true)
}, [])

  const videoLocation = useMemo(() => {
    if (!qortalVideoResource) return null;
    return `${qortalVideoResource.service}-${qortalVideoResource.name}-${qortalVideoResource.identifier}`;
  }, [qortalVideoResource]);
  useVideoPlayerHotKeys(hotkeyHandlers);

  const updateProgress = useCallback(() => {
    console.log('currentTime2')
  const player = playerRef?.current;
  if (!player || typeof player?.currentTime !== 'function') return;

  const currentTime = player.currentTime();
  console.log('currentTime3', currentTime)
  if (typeof currentTime === 'number' && videoLocation && currentTime > 0.1) {
    setProgress(videoLocation, currentTime);
    setLocalProgress(currentTime);
  }
}, [videoLocation]);
  // useEffect(() => {
  //   const ref = videoRef as React.RefObject<HTMLVideoElement>;
  //   if (!ref.current) return;
  //   if (ref.current) {
  //     ref.current.volume = volume;
  //   }
  //   // Only run on mount
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
  }, [setIsPlaying]);

  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);
  const onVolumeChangeHandler = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      try {
        const video = e.currentTarget;
        console.log('onVolumeChangeHandler')
      setVolume(video.volume);
      setIsMuted(video.muted);
      } catch (error) {
        console.error('onVolumeChangeHandler', onVolumeChangeHandler)
      }
    },
    [setIsMuted, setVolume]
  );



  const videoStylesContainer = useMemo(() => {
    return {
      cursor: showControls ? 'auto' : 'none',
      aspectRatio: '16 / 9',
      ...videoStyles?.videoContainer,
    };
  }, [showControls]);

  console.log('isFullscreen', isFullscreen, showControlsFullScreen)

  const videoStylesVideo = useMemo(() => {
    return {
      ...videoStyles?.video,
      objectFit: videoObjectFit,
      backgroundColor: "#000000",
      height: isFullscreen  ? "calc(100vh - 40px)" : "100%",
      width: '100%'
    };
  }, [videoObjectFit, isFullscreen]);

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
  if(!isPlayerInitialized) return
  const player = playerRef.current;
  if (!player || typeof player.on !== 'function') return;

  const handleLoadedMetadata = () => {
    const duration = player.duration?.();
    if (typeof duration === 'number' && !isNaN(duration)) {
      setDuration(duration);
    }
  };

  player.on('loadedmetadata', handleLoadedMetadata);

  return () => {
    player.off('loadedmetadata', handleLoadedMetadata);
  };
}, [isPlayerInitialized]);


  const enterFullscreen = () => {
    const ref = containerRef?.current as any;
    console.log('refffff', ref)
    if (!ref) return;

    if (ref.requestFullscreen && !isFullscreen) {
      console.log('requset ')
      ref.requestFullscreen();
    }


  };

  const exitFullscreen = () => {
    if (isFullscreen) document.exitFullscreen();
  };

  const toggleFullscreen = () => {
    isFullscreen ? exitFullscreen() : enterFullscreen();
  };

const canvasRef = useRef(null)
const videoRefForCanvas = useRef<any>(null)
const extractFrames = useCallback( (time: number): void => {
  // const video = videoRefForCanvas?.current;
  // const canvas: any = canvasRef.current;

  // if (!video || !canvas) return null;

  // // Avoid unnecessary resize if already correct
  // if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
  //   canvas.width = video.videoWidth;
  //   canvas.height = video.videoHeight;
  // }

  // const context = canvas.getContext("2d");
  // if (!context) return null;

  // // If video is already near the correct time, don't seek again
  // const threshold = 0.01; // 10ms threshold
  // if (Math.abs(video.currentTime - time) > threshold) {
  //   await new Promise<void>((resolve) => {
  //     const onSeeked = () => resolve();
  //     video.addEventListener("seeked", onSeeked, { once: true });
  //     video.currentTime = time;
  //   });
  // }

  // context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // // Use a faster method for image export (optional tradeoff)
  // const blob = await new Promise<Blob | null>((resolve) => {
  //   canvas.toBlob((blob: any) => resolve(blob), "image/webp", 0.7);
  // });

  // if (!blob) return null;

  // return URL.createObjectURL(blob);
}, []);


  const hideTimeout = useRef<any>(null);
   

const resetHideTimer = () => {
  setShowControls(true);
  if (hideTimeout.current) clearTimeout(hideTimeout.current);
  hideTimeout.current = setTimeout(() => {
    setShowControls(false);
  }, 2500); // 3s of inactivity
};

const handleMouseMove = () => {
  resetHideTimer();
};

useEffect(() => {
  resetHideTimer(); // initial show
  return () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  };
}, []);



  const handleMouseLeave = useCallback(() => {
    setShowControls(false);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }, [setShowControls]);


  const videoLocactionStringified = useMemo(()=> {
    return JSON.stringify(qortalVideoResource)
  }, [qortalVideoResource])

useEffect(() => {
  if (!resourceUrl || !isReady || !videoLocactionStringified || !startPlay) return;
  console.log("EFFECT TRIGGERED", { isReady, resourceUrl, startPlay, poster, videoLocactionStringified });

  const resource = JSON.parse(videoLocactionStringified)
  let canceled = false;

 try {
   const setupPlayer = async () => {
    const type = await getVideoMimeTypeFromUrl(resource);
    if (canceled) return;

    const options = {
      autoplay: true,
      controls: false,
      responsive: true,
      fluid: true,
      poster: startPlay ? "" : poster,
      aspectRatio: '16:9' ,
      sources: [
        {
          src: resourceUrl,
          type: type || 'video/mp4', // fallback
        },
      ],
    };
    console.log('options', options)
    const ref = videoRef as any;
    if (!ref.current) return;

    if (!playerRef.current && ref.current) {
      playerRef.current = videojs(ref.current, options, () => {
        setIsPlayerInitialized(true)
        playerRef.current?.poster('');
        playerRef.current?.playbackRate(playbackRate)
        playerRef.current?.volume(volume);
        
        playerRef.current?.addRemoteTextTrack({
    kind: 'subtitles',
    src: 'http://127.0.0.1:22393/arbitrary/DOCUMENT/a-test/test-identifier',
    srclang: 'en',
    label: 'English',
    default: true
  }, true); 
        playerRef.current?.play();
    
      });
            playerRef.current?.on('error', () => {
    const error = playerRef.current?.error();
    console.error('Video.js playback error:', error);
    // Optional: display user-friendly message
  });
    }
  };

  setupPlayer();

 } catch (error) {
  console.error('useEffect start player', error)
 }
 return () => {
  console.log('canceled')
  canceled = true;
  const player = playerRef.current;

  if (player && typeof player.dispose === 'function') {
    try {
      player.dispose();
    } catch (err) {
      console.error('Error disposing Video.js player:', err);
    }
    playerRef.current = null;
  }
};
}, [isReady, resourceUrl, startPlay, poster, videoLocactionStringified]);

  useEffect(() => {
    if(!isPlayerInitialized) return
  const player = playerRef?.current;
  console.log('player rate', player)
  if (!player) return;

  const handleRateChange = () => {
    const newRate = player?.playbackRate();
    console.log('Playback rate changed:', newRate);
    if(newRate){
      setPlaybackRate(newRate); // or any other state/action
    }
  };

  player.on('ratechange', handleRateChange);

  return () => {
    player.off('ratechange', handleRateChange);
  };
}, [isPlayerInitialized]);

  return (
    <>
     {/* <video controls  src={"http://127.0.0.1:22393/arbitrary/VIDEO/a-test/MYTEST2_like_MYTEST2_vid_test-parallel_cSYmIk"} ref={videoRefForCanvas} ></video> */}
   
    <VideoContainer
      tabIndex={0}
      style={videoStylesContainer}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      <LoadingVideo togglePlay={togglePlay} isReady={isReady} status={status} percentLoaded={percentLoaded} isLoading={isLoading} />
      <VideoElement
        ref={videoRef}
        tabIndex={0}
          className="video-js"

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
        controls={false}
    
      />
            {/* <canvas ref={canvasRef} style={{ display: "none" }}></canvas> */}
           
          
        {isReady && (
             <VideoControlsBar  playbackRate={playbackRate}   increaseSpeed={hotkeyHandlers.increaseSpeed}
      decreaseSpeed={hotkeyHandlers.decreaseSpeed} playerRef={playerRef} isFullScreen={isFullscreen} showControlsFullScreen={showControlsFullScreen} showControls={showControls} extractFrames={extractFrames} toggleFullscreen={toggleFullscreen} onVolumeChange={onVolumeChange} volume={volume}  togglePlay={togglePlay} reloadVideo={hotkeyHandlers.reloadVideo} isPlaying={isPlaying} canPlay={true} isScreenSmall={false} controlsHeight={controlsHeight}  duration={duration} progress={localProgress} openSubtitleManager={openSubtitleManager} />
        )}       
  
          <SubtitleManager close={closeSubtitleManager} open={isOpenSubtitleManage} qortalMetadata={qortalVideoResource} />
    </VideoContainer>
     </>
  );
};
