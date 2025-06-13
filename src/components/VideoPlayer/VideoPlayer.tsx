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
  videoContainer: { aspectRatio: "16 / 9" },
  video: { aspectRatio: "16 / 9" },
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
  const { volume, setVolume } = useVideoStore((state) => ({
    volume: state.playbackSettings.volume,
    setVolume: state.setVolume,
  }));
  const playerRef = useRef<Player | null>(null);

  const [videoCodec, setVideoCodec] = useState<null | false | string>(null)
  const [isMuted, setIsMuted] = useState(false);
  const { setProgress } = useProgressStore();
  const [localProgress, setLocalProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false)
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
    showControlsFullScreen
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



  const videoStylesContainer = useMemo(() => {
    return {
      cursor: !showControls && isFullscreen ? "none" : "auto",
      ...videoStyles?.videoContainer,
    };
  }, [showControls, isFullscreen]);

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
const extractFrames = useCallback(async (time: number): Promise<string | null> => {
  const video = videoRefForCanvas?.current;
  const canvas: any = canvasRef.current;

  if (!video || !canvas) return null;

  // Avoid unnecessary resize if already correct
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) return null;

  // If video is already near the correct time, don't seek again
  const threshold = 0.01; // 10ms threshold
  if (Math.abs(video.currentTime - time) > threshold) {
    await new Promise<void>((resolve) => {
      const onSeeked = () => resolve();
      video.addEventListener("seeked", onSeeked, { once: true });
      video.currentTime = time;
    });
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Use a faster method for image export (optional tradeoff)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob: any) => resolve(blob), "image/webp", 0.7);
  });

  if (!blob) return null;

  return URL.createObjectURL(blob);
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

  const onLoadedMetadata= (e: any)=> {
    console.log('eeeeeeeeeee', e)
        const ref = videoRef as any;
    if (!ref.current) return;
    console.log('datataa', ref.current.audioTracks ,     // List of available audio tracks
ref.current.textTracks     ,  // Subtitles/closed captions
ref.current.videoTracks )
  }

  const videoLocactionStringified = useMemo(()=> {
    return JSON.stringify(qortalVideoResource)
  }, [qortalVideoResource])

useEffect(() => {
  if (!resourceUrl || !isReady || !videoLocactionStringified) return;
  const resource = JSON.parse(videoLocactionStringified)
  let canceled = false;

  const setupPlayer = async () => {
    const type = await getVideoMimeTypeFromUrl(resource);
    if (canceled) return;

    const options = {
      autoplay: true,
      controls: false,
      responsive: true,
      fluid: true,
      poster: startPlay ? "" : poster,
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
        playerRef.current?.poster('');
        playerRef.current?.play();
      });
    }
  };

  setupPlayer();

  return () => {
    canceled = true;
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
  };
}, [isReady, resourceUrl, startPlay, poster, videoLocactionStringified]);

  
  return (
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

        // src={isReady && startPlay ? resourceUrl || undefined : undefined}
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
        onLoadedMetadata={onLoadedMetadata}
    
      />
            <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
            <video  src={isReady && startPlay ? resourceUrl || undefined : undefined} ref={videoRefForCanvas} style={{ display: "none" }}></video>
          
        {isReady && (
             <VideoControlsBar playerRef={playerRef} isFullScreen={isFullscreen} showControlsFullScreen={showControlsFullScreen} showControls={showControls} extractFrames={extractFrames} toggleFullscreen={toggleFullscreen} onVolumeChange={onVolumeChange} volume={volume}  togglePlay={togglePlay} reloadVideo={hotkeyHandlers.reloadVideo} isPlaying={isPlaying} canPlay={true} isScreenSmall={false} controlsHeight={controlsHeight}  videoRef={videoRef} duration={duration} progress={localProgress} />
        )}       
  
          
    </VideoContainer>
  );
};
