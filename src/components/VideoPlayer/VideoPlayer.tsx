import {
  ReactEventHandler,
  Ref,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QortalGetMetadata } from "../../types/interfaces/resources";
import { VideoContainer, VideoElement } from "./VideoPlayer-styles";
import { useVideoPlayerHotKeys } from "./useVideoPlayerHotKeys";
import { useProgressStore, useVideoStore } from "../../state/video";
import { useVideoPlayerController } from "./useVideoPlayerController";
import { LoadingVideo } from "./LoadingVideo";
import { VideoControlsBar } from "./VideoControlsBar";
import videojs from "video.js";
import "video.js/dist/video-js.css";

import Player from "video.js/dist/types/player";
import {
  Subtitle,
  SubtitleManager,
  SubtitlePublishedData,
} from "./SubtitleManager";
import { base64ToBlobUrl } from "../../utils/base64";
import convert from "srt-webvtt";

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
    const srtBlob = new Blob([bytes], { type: "application/x-subrip" });
    console.log("srtBlob", srtBlob);
    // Step 3: Use convert() with the Blob
    const vttBlobUrl: string = await convert(srtBlob);
    return vttBlobUrl;
  } catch (error) {
    console.error("Failed to convert SRT to VTT:", error);
    return null;
  }
}
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
  videoContainer: {},
  video: {},
};

async function loadMediaInfo(wasmPath = "/MediaInfoModule.wasm") {
  const mediaInfoModule = await import("mediainfo.js");
  return await mediaInfoModule.default({
    format: "JSON",
    full: true,
    locateFile: () => wasmPath,
  });
}

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
  const { volume, setVolume, setPlaybackRate, playbackRate } = useVideoStore(
    (state) => ({
      volume: state.playbackSettings.volume,
      setVolume: state.setVolume,
      setPlaybackRate: state.setPlaybackRate,
      playbackRate: state.playbackSettings.playbackRate,
    })
  );
  const playerRef = useRef<Player | null>(null);
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [videoCodec, setVideoCodec] = useState<null | false | string>(null);
  const [isMuted, setIsMuted] = useState(false);
  const { setProgress } = useProgressStore();
  const [localProgress, setLocalProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isOpenSubtitleManage, setIsOpenSubtitleManage] = useState(false);
  const subtitleBtnRef = useRef(null);
  const [currentSubTrack, setCurrentSubTrack] = useState<null | string>(null)
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
    status,
    percentLoaded,
    showControlsFullScreen,
    onSelectPlaybackRate,
  } = useVideoPlayerController({
    autoPlay,
    playerRef,
    qortalVideoResource,
    retryAttempts,
    isPlayerInitialized,
    isMuted
  });

  console.log('isFullscreen', isFullscreen)

   const enterFullscreen = useCallback(() => {
    const ref = containerRef?.current as any;
    if (!ref) return;

    if (ref.requestFullscreen && !isFullscreen) {
      ref.requestFullscreen();
    }
  }, []);

  const exitFullscreen = useCallback(() => {
   document?.exitFullscreen();
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    console.log('togglefull', isFullscreen)
    isFullscreen ? exitFullscreen() : enterFullscreen();
  }, [isFullscreen]);


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
      toggleFullscreen
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
      toggleFullscreen
    ]
  );

  const closeSubtitleManager = useCallback(() => {
    setIsOpenSubtitleManage(false);
  }, []);
  const openSubtitleManager = useCallback(() => {
    setIsOpenSubtitleManage(true);
  }, []);

  const videoLocation = useMemo(() => {
    if (!qortalVideoResource) return null;
    return `${qortalVideoResource.service}-${qortalVideoResource.name}-${qortalVideoResource.identifier}`;
  }, [qortalVideoResource]);
  useVideoPlayerHotKeys(hotkeyHandlers);

  const updateProgress = useCallback(() => {
    const player = playerRef?.current;
    if (!player || typeof player?.currentTime !== "function") return;

    const currentTime = player.currentTime();
    if (typeof currentTime === "number" && videoLocation && currentTime > 0.1) {
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
        setVolume(video.volume);
        setIsMuted(video.muted);
      } catch (error) {
        console.error("onVolumeChangeHandler", onVolumeChangeHandler);
      }
    },
    [setIsMuted, setVolume]
  );

  const videoStylesContainer = useMemo(() => {
    return {
      cursor: showControls ? "auto" : "none",
      aspectRatio: "16 / 9",
      ...videoStyles?.videoContainer,
    };
  }, [showControls]);

  const videoStylesVideo = useMemo(() => {
    return {
      ...videoStyles?.video,
      objectFit: videoObjectFit,
      backgroundColor: "#000000",
      height: isFullscreen ? "calc(100vh - 40px)" : "100%",
      width: "100%",
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

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  useEffect(() => {
    if (!isPlayerInitialized) return;
    const player = playerRef.current;
    if (!player || typeof player.on !== "function") return;

    const handleLoadedMetadata = () => {
      const duration = player.duration?.();
      if (typeof duration === "number" && !isNaN(duration)) {
        setDuration(duration);
      }
    };

    player.on("loadedmetadata", handleLoadedMetadata);

    return () => {
      player.off("loadedmetadata", handleLoadedMetadata);
    };
  }, [isPlayerInitialized]);

 
  const canvasRef = useRef(null);
  const videoRefForCanvas = useRef<any>(null);
  const extractFrames = useCallback((time: number): void => {
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
      if(subtitle === null){
        setCurrentSubTrack(null)
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

        return
      }
      console.log("onSelectSubtitle", subtitle);
      const player = playerRef.current;
      if (!player || !subtitle.subtitleData || !subtitle.type) return;

      // Cleanup: revoke previous Blob URL
      if (previousSubtitleUrlRef.current) {
        URL.revokeObjectURL(previousSubtitleUrlRef.current);
        previousSubtitleUrlRef.current = null;
      }
      let blobUrl;
      if (subtitle?.type === "application/x-subrip") {
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
          kind: "subtitles",
          src: blobUrl,
          srclang: subtitle.language,
          label: subtitle.language,
          default: true,
        },
        true
      );

      // Remove all existing remote text tracks
      //  try {
      //    const remoteTracks = playerRef.current?.remoteTextTracks()?.tracks_
      //   if (remoteTracks && remoteTracks?.length) {
      //     const toRemove: TextTrack[] = [];
      //     for (let i = 0; i < remoteTracks.length; i++) {
      //       const track = remoteTracks[i];
      //       toRemove.push(track);
      //     }
      //     toRemove.forEach((track) => {
      //       console.log('removing track')
      //       playerRef.current?.removeRemoteTextTrack(track);
      //     });
      //   }
      //  } catch (error) {
      //   console.log('error2', error)
      //  }

      await new Promise((res) => {
        setTimeout(() => {
          res(null);
        }, 1000);
      });
      const tracksInfo = playerRef.current?.textTracks();
      console.log("tracksInfo", tracksInfo);
      if (!tracksInfo) return;

      const tracks = Array.from(
        { length: (tracksInfo as any).length },
        (_, i) => (tracksInfo as any)[i]
      );
      console.log("tracks", tracks);
      for (const track of tracks) {
        console.log("track", track);

        if (track.kind === "subtitles") {
          track.mode = "showing"; // force display
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

  useEffect(() => {
    if (!resourceUrl || !isReady || !videoLocactionStringified || !startPlay)
      return;

    const resource = JSON.parse(videoLocactionStringified);
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
          aspectRatio: "16:9",
          sources: [
            {
              src: resourceUrl,
              type: type || "video/mp4", // fallback
            },
          ],
        };
        const ref = videoRef as any;
        if (!ref.current) return;

        if (!playerRef.current && ref.current) {
          playerRef.current = videojs(ref.current, options, () => {
            setIsPlayerInitialized(true);
            ref.current.tabIndex = -1; // Prevents focus entirely
    ref.current.style.outline = 'none'; // Backup
            playerRef.current?.poster("");
            playerRef.current?.playbackRate(playbackRate);
            playerRef.current?.volume(volume);

            playerRef.current?.play();

            const tracksInfo = playerRef.current?.textTracks();

            const checkActiveSubtitle = () => {
              let activeTrack = null;

              const tracks = Array.from(
                { length: (tracksInfo as any).length },
                (_, i) => (tracksInfo as any)[i]
              );
              console.log("tracks", tracks);
              for (const track of tracks) {

      if (track.kind === 'subtitles' || track.kind === 'captions') {
        if (track.mode === 'showing') {
          activeTrack = track;
          break;
        }
      }
              }

              if (activeTrack) {
                console.log("Subtitle active:", {
                  label: activeTrack.label,
                  srclang: activeTrack.language || activeTrack.srclang, // srclang for native, language for VTT
                });
                setCurrentSubTrack(activeTrack.language || activeTrack.srclang)
              } else {
                setCurrentSubTrack(null)
                console.log("No subtitle is currently showing");
              }
            };

            // Initial check in case one is auto-enabled
            checkActiveSubtitle();

            // Use Video.js event system
            tracksInfo?.on("change", checkActiveSubtitle);
          });
          playerRef.current?.on("error", () => {
            const error = playerRef.current?.error();
            console.error("Video.js playback error:", error);
            // Optional: display user-friendly message
          });
        }
      };

      setupPlayer();
    } catch (error) {
      console.error("useEffect start player", error);
    }
    return () => {
      canceled = true;
      const player = playerRef.current;

      if (player && typeof player.dispose === "function") {
        try {
          player.dispose();
        } catch (err) {
          console.error("Error disposing Video.js player:", err);
        }
        playerRef.current = null;
      }
    };
  }, [isReady, resourceUrl, startPlay, poster, videoLocactionStringified]);

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

    player.on("ratechange", handleRateChange);

    return () => {
      player.off("ratechange", handleRateChange);
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
        <LoadingVideo
          togglePlay={togglePlay}
          isReady={isReady}
          status={status}
          percentLoaded={percentLoaded}
          isLoading={isLoading}
        />
        <VideoElement
          ref={videoRef}
          tabIndex={-1}
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
          <VideoControlsBar
            subtitleBtnRef={subtitleBtnRef}
            playbackRate={playbackRate}
            increaseSpeed={hotkeyHandlers.increaseSpeed}
            decreaseSpeed={hotkeyHandlers.decreaseSpeed}
            playerRef={playerRef}
            isFullScreen={isFullscreen}
            showControlsFullScreen={showControlsFullScreen}
            showControls={showControls}
            extractFrames={extractFrames}
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
          />
        )}

        <SubtitleManager
          subtitleBtnRef={subtitleBtnRef}
          close={closeSubtitleManager}
          open={isOpenSubtitleManage}
          qortalMetadata={qortalVideoResource}
          onSelect={onSelectSubtitle}
          currentSubTrack={currentSubTrack}
        />
      </VideoContainer>
    </>
  );
};
