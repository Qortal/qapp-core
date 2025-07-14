// GlobalVideoPlayer.tsx
import videojs from "video.js";
import { useGlobalPlayerStore } from "../state/pip";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Box, IconButton } from "@mui/material";
import { VideoContainer } from "../components/VideoPlayer/VideoPlayer-styles";
import { Rnd } from "react-rnd";
import { useProgressStore, useVideoStore } from "../state/video";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { GlobalContext } from "../context/GlobalProvider";
import { isTouchDevice } from "../components/VideoPlayer/VideoPlayer";
import { useNavigate } from "react-router-dom";
export const GlobalPipPlayer = () => {
  const {
    videoSrc,
    reset,
    isPlaying,
    location,
    type,
    currentTime,
    mode,
    videoId,
  } = useGlobalPlayerStore();
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
 const volume = useVideoStore(
    (state) => state.playbackSettings.volume
  );
  const context = useContext(GlobalContext);
  const navigate = useNavigate()
  const videoNode = useRef<HTMLVideoElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const { setProgress } = useProgressStore();

  const updateProgress = useCallback(() => {
    const player = playerRef?.current;
    if (!player || typeof player?.currentTime !== "function") return;

    const currentTime = player.currentTime();
    if (typeof currentTime === "number" && videoId && currentTime > 0.1) {
      setProgress(videoId, currentTime);
    }
  }, [videoId]);

  const rndRef = useRef<any>(null);
  useEffect(() => {
    if (!playerRef.current && videoNode.current) {
      playerRef.current = videojs(videoNode.current, {
        autoplay: true,
        controls: false,
        responsive: true,
        fluid: true,
      });
       playerRef.current?.on("error", () => {
            // Optional: display user-friendly message
          });

      // Resume playback if needed
      playerRef.current.on("ready", () => {
        if (videoSrc) {
          playerRef.current.src(videoSrc);
          playerRef.current.currentTime(currentTime);
          if (isPlaying) playerRef.current.play();
        }
      });
    }

    return () => {
      // optional: don't destroy, just hide
    };
  }, []);

  useEffect(() => {
    if (!videoSrc) {
      setHasStarted(false);
    }
  }, [videoSrc]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player) return;
   
    if (!videoSrc && player.src) {
      // Only pause the player and unload the source without re-triggering playback
      player.pause();

    
    // player.src({ src: '', type: '' }); // ⬅️ this is the safe way to clear it
  

  setPlaying(false);
  setHasStarted(false);

      // Optionally clear the poster and currentTime
      player.poster("");
      player.currentTime(0);

      return;
    }

    if (videoSrc) {
      // Set source and resume if needed
      player.src({ src: videoSrc, type: type });
      player.currentTime(currentTime);
      player.volume(volume)
      if (isPlaying) {
        const playPromise = player.play();

        if (playPromise?.catch) {
          playPromise.catch((err: any) => {
            console.warn("Unable to autoplay:", err);
          });
        }
      } else {
        player.pause();
      }
    }
  }, [videoSrc, type, isPlaying, currentTime, volume]);

  //   const onDragStart = () => {
  //     timer = Date.now();
  //     isDragging.current = true;
  //   };

  //   const handleStopDrag = async () => {
  //     const time = Date.now();
  //     if (timer && time - timer < 300) {
  //       isDragging.current = false;
  //     } else {
  //       isDragging.current = true;
  //     }
  //   };
  //   const onDragStop = () => {
  //     handleStopDrag();
  //   };

  //   const checkIfDrag = useCallback(() => {
  //     return isDragging.current;
  //   }, []);
  const margin = 50;

  const [height, setHeight] = useState(300);
  const [width, setWidth] = useState(400);
const savedHeightRef = useRef<null | number>(null)
const savedWidthRef = useRef<null | number>(null)

useEffect(() => {
  if (!videoSrc) return;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const aspectRatio = 0.75; // 300 / 400 = 3:4

  const maxWidthByScreen = screenWidth * 0.75;
  const maxWidthByHeight = (screenHeight * 0.3) / aspectRatio;

  const maxWidth = savedWidthRef.current || Math.min(maxWidthByScreen, maxWidthByHeight);
  const maxHeight = savedHeightRef.current || maxWidth * aspectRatio;

  setWidth(maxWidth);
  setHeight(maxHeight);
  
  rndRef.current.updatePosition({
    x: screenWidth - maxWidth - margin,
    y: screenHeight - maxHeight - margin,
    width: maxWidth,
    height: maxHeight,
  });
}, [videoSrc]);

  const [showControls, setShowControls] = useState(false);

  const handleMouseMove = () => {
    if (isTouchDevice) return;
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    if (isTouchDevice) return;
    setShowControls(false);
  };
  const startPlay = useCallback(() => {
    try {
      const player = playerRef.current;
      if (!player) return;

      try {
        player.play();
      } catch (err) {
        console.warn("Play failed:", err);
      }
    } catch (error) {
      console.error("togglePlay", error);
    }
  }, []);

  const stopPlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.pause();
    } catch (err) {
      console.warn("Play failed:", err);
    }
  }, []);

  const onPlayHandlerStart = useCallback(() => {
    setPlaying(true);
    setHasStarted(true);
  }, [setPlaying]);
  const onPlayHandlerStop = useCallback(() => {
    setPlaying(false);
  }, [setPlaying]);

  const resetHideTimeout = () => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!videoSrc || !container) return;

    const handleInteraction = () => {
      resetHideTimeout();
    };

    container.addEventListener("touchstart", handleInteraction, {
      passive: true,
      capture: true,
    });

    return () => {
      container.removeEventListener("touchstart", handleInteraction, {
        capture: true,
      });
    };
  }, [videoSrc]);


  return (
    <Rnd
      enableResizing={{
        top: false,
        right: false,
        bottom: false,
        left: false,
        topRight: true,
        bottomLeft: true,
        topLeft: true,
        bottomRight: true,
      }}
      ref={rndRef}
      //   onDragStart={onDragStart}
      //   onDragStop={onDragStop}
      style={{
        display: hasStarted ? "block" : "none",
        position: "fixed",
        zIndex: 999999999,

        cursor: "default",
      }}
      size={{ width, height }}
      onResize={(e, direction, ref, delta, position) => {
        setWidth(ref.offsetWidth);
        setHeight(ref.offsetHeight);
        savedHeightRef.current = ref.offsetHeight
        savedWidthRef.current = ref.offsetWidth
      }}
      //  default={{
      //     x: 500,
      //     y: 500,
      //     width: 350,
      //     height: "auto",
      //  }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onDrag={() => {}}
    >
      {/* <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        // width: '100px',
        // height: '100px',
        zIndex: 9999,
        display: videoSrc ? 'block' : 'none'
      }}
    > */}
      <Box
        ref={containerRef}
        sx={{
          height,
          pointerEvents: "auto",
          width,
          position: "relative",
          background: "black",
          overflow: "hidden",
          borderRadius: "10px",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* {backgroundColor: showControls ? 'rgba(0,0,0,.5)' : 'unset'} */}
        {showControls && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1,
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? "auto" : "none",
              transition: "opacity 0.5s ease-in-out",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                background: "rgba(0,0,0,.5)",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1,
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? "auto" : "none",
                transition: "opacity 0.5s ease-in-out",
              }}
            />
            <IconButton
              sx={{
                position: "absolute",
                top: 5,
                opacity: 1,
                right: 5,
                zIndex: 2,
                 background: 'rgba(0,0,0,0.3)',
            borderRadius: '50%',
            padding: '5px'
              }}
              onClick={reset}
              onTouchStart={reset}
            >
              <CloseIcon sx={{
            color: 'white',
          }} />
            </IconButton>
            {location && (
              <IconButton
                sx={{
                  position: "absolute",
                  top: 5,
                  left: 5,
                  zIndex: 2,
                  opacity: 1,
                 background: 'rgba(0,0,0,0.3)',
            borderRadius: '50%',
            padding: '5px'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (navigate) {
                    navigate(location);
                  }
                }}
                onTouchStart={(e) => {
                  e.stopPropagation()
                  if (navigate) {
                    navigate(location);
                  }
                }}
              >
                <OpenInFullIcon sx={{
            color: 'white',
          }} />
              </IconButton>
            )}
            {playing && (
              <IconButton
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  opacity: 1,
                  zIndex: 2,
                  background: 'rgba(0,0,0,0.3)',
            borderRadius: '50%',
            padding: '5px'
                }}
                onClick={stopPlay}
                onTouchStart={stopPlay}
              >
                <PauseIcon sx={{
            color: 'white',
          }} />
              </IconButton>
            )}
            {!playing && (
              <IconButton
                sx={{
                  position: "absolute",
                  opacity: 1,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 2,
                  background: 'rgba(0,0,0,0.3)',
            borderRadius: '50%',
            padding: '5px'
                }}
                onClick={startPlay}
                onTouchStart={startPlay}
              >
                <PlayArrowIcon sx={{
            color: 'white',
          }} />
              </IconButton>
            )}

            <Box />
          </Box>
        )}
        <VideoContainer>
          <video
            onPlay={onPlayHandlerStart}
            onPause={onPlayHandlerStop}
            onTimeUpdate={updateProgress}
            ref={videoNode}
            className="video-js"
            style={{}}
          />
        </VideoContainer>
      </Box>
      {/* </div> */}
    </Rnd>
  );
};
