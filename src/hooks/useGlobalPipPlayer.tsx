// GlobalVideoPlayer.tsx
import videojs from 'video.js';
import { useGlobalPlayerStore } from '../state/pip';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { VideoContainer } from '../components/VideoPlayer/VideoPlayer-styles';
import { Rnd } from "react-rnd";
import { useProgressStore } from '../state/video';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { GlobalContext } from '../context/GlobalProvider';
export const GlobalPipPlayer = () => {
  const { videoSrc, reset, isPlaying, location, type, currentTime, mode, videoId } = useGlobalPlayerStore();
  const [playing , setPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const playerRef = useRef<any>(null);
  const {navigate} = useContext(GlobalContext)
 
  const videoNode = useRef<HTMLVideoElement>(null);
    const { setProgress } = useProgressStore();

      const updateProgress = useCallback(() => {
        const player = playerRef?.current;
        if (!player || typeof player?.currentTime !== "function") return;
    
        const currentTime = player.currentTime();
        console.log('videoId', videoId)
        if (typeof currentTime === "number" && videoId && currentTime > 0.1) {
          setProgress(videoId, currentTime);
        }
      }, [videoId]);
  
    const rndRef = useRef<any>(null)
  useEffect(() => {
    if (!playerRef.current && videoNode.current) {
      playerRef.current = videojs(videoNode.current, { autoplay: true, controls: false,
          responsive: true, fluid: true });

      // Resume playback if needed
      playerRef.current.on('ready', () => {
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

useEffect(()=> {
if(!videoSrc){
    setHasStarted(false)
}
}, [videoSrc])

useEffect(() => {
  const player = playerRef.current;

  if (!player) return;

if (!videoSrc && player.src) {
  // Only pause the player and unload the source without re-triggering playback
  player.pause();

  // Remove the video source safely
  const tech = player.tech({ IWillNotUseThisInPlugins: true });
  if (tech && tech.el_) {
    tech.setAttribute('src', '');
    setPlaying(false)
    setHasStarted(false)
  }

  // Optionally clear the poster and currentTime
  player.poster('');
  player.currentTime(0);

  return;
}


if(videoSrc){
  // Set source and resume if needed
  player.src({ src: videoSrc, type: type });
  player.currentTime(currentTime);

  if (isPlaying) {
    const playPromise = player.play();
        

    if (playPromise?.catch) {
      playPromise.catch((err: any) => {
        console.warn('Unable to autoplay:', err);
      });
    }
  } else {
    player.pause();
  }
}
}, [videoSrc, type, isPlaying, currentTime]);


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
  

  const [height, setHeight] = useState(300)
    const [width, setWidth] = useState(400)

  useEffect(() => {
    
       rndRef.current.updatePosition({
                x: window.innerWidth - (width || 400) - margin,
    y: window.innerHeight - (height || 300) - margin,
    width: width || 400,
    height: height || 300
            });
  }, [videoSrc]);

  const [showControls, setShowControls] = useState(false)

    const handleMouseMove = () => {
    setShowControls(true)
  };

  const handleMouseLeave = () => {
    setShowControls(false);
  };
  const startPlay = useCallback(() => {
   try {
   
 const player = playerRef.current;
  if (!player) return;

   
      try {
         player.play();
      } catch (err) {
        console.warn('Play failed:', err);
      }
    
  } catch (error) {
    console.error('togglePlay', error)
  }
  }, []);

  const stopPlay = useCallback(() => {
    const player = playerRef.current;
  if (!player) return;

      try {
         player.pause();
      } catch (err) {
        console.warn('Play failed:', err);
      }
    

  }, []);

  const onPlayHandlerStart = useCallback(() => {
    setPlaying(true)
    setHasStarted(true)
  }, [setPlaying]);
   const onPlayHandlerStop = useCallback(() => {
    setPlaying(false)
  }, [setPlaying]);
  
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

    cursor: 'default'
  }}
   size={{ width, height }}
  onResize={(e, direction, ref, delta, position) => {
    setWidth(ref.offsetWidth);
    setHeight(ref.offsetHeight);
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
        <Box sx={{height, width, position: 'relative' , background: 'black', overflow: 'hidden',     borderRadius: '10px' }}  onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}>
            {/* {backgroundColor: showControls ? 'rgba(0,0,0,.5)' : 'unset'} */}
            {showControls && (
                <Box sx={{
                    position: 'absolute',
                    top: 0, bottom: 0, left: 0, right: 0,
                    zIndex: 1,
                    opacity: 0,
                    transition: 'opacity 1s',
                    "&:hover": {
                        opacity: 1
                    }
                }}>
                <Box sx={{
                    position: 'absolute',
                    background: 'rgba(0,0,0,.5)',
                    top: 0, bottom: 0, left: 0, right: 0,
                    zIndex: 1,
                    opacity: 0,
                    transition: 'opacity 1s',
                    "&:hover": {
                        opacity: 1
                    }
                }} />
                                <IconButton sx={{
                                    position: 'absolute',
                                    top: 10,
                                     opacity: 1,
                                    right: 10,
                                    zIndex: 2,
                                     
                                }} onClick={reset}><CloseIcon /></IconButton>
                                {location && (
                                     <IconButton sx={{
                                    position: 'absolute',
                                    top: 10,
                                    left: 10,
                                    zIndex: 2,
                                    opacity: 1,
                                     
                                }} onClick={()=> {
                                    if(navigate){
                                        navigate(location)
                                    }
                                }}><OpenInFullIcon /></IconButton>
                                )}
                                {playing && (
                                     <IconButton sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                     opacity: 1,
                                    zIndex: 2,
                                     
                                }} onClick={stopPlay}><PauseIcon /></IconButton>
                                )}
                               {!playing && (
                                 <IconButton sx={{
                                    position: 'absolute',
                                     opacity: 1,
                                     top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 2,
                                     
                                }} onClick={startPlay}><PlayArrowIcon /></IconButton>
                               )}
                               
                                

                <Box/>
                </Box>
            )}
        <VideoContainer>
      <video     onPlay={onPlayHandlerStart} onPause={onPlayHandlerStop}      onTimeUpdate={updateProgress}
 ref={videoNode} className="video-js" style={{
    
        
      }}/>
      </VideoContainer>
      </Box>
    {/* </div> */}
    </Rnd>
  );
};
