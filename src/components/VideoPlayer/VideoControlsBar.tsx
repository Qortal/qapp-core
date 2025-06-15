import { Box, IconButton } from "@mui/material";
import { ControlsContainer } from "./VideoPlayer-styles";
// import { MobileControlsBar } from "./MobileControlsBar";
import {
  FullscreenButton,
  ObjectFitButton,
  PictureInPictureButton,
  PlaybackRate,
  PlayButton,
  ProgressSlider,
  ReloadButton,
  VideoTime,
  VolumeControl,
} from "./VideoControls";
import { Ref } from "react";
import SubtitlesIcon from '@mui/icons-material/Subtitles';
interface VideoControlsBarProps {
  canPlay: boolean
  isScreenSmall: boolean
  controlsHeight?: string
  progress: number;
  duration: number
  isPlaying: boolean;
  togglePlay: ()=> void;
  reloadVideo: ()=> void;
  volume: number
  onVolumeChange: (_: any, val: number)=> void
  toggleFullscreen: ()=> void
  extractFrames: (time: number)=> void
  showControls: boolean;
  showControlsFullScreen: boolean;
  isFullScreen: boolean;
  playerRef: any
  increaseSpeed: ()=> void
  decreaseSpeed: ()=> void
  playbackRate: number
  openSubtitleManager: ()=> void
  subtitleBtnRef: any
}

export const VideoControlsBar = ({subtitleBtnRef, showControls, playbackRate, increaseSpeed,decreaseSpeed, isFullScreen, showControlsFullScreen, reloadVideo, onVolumeChange, volume, isPlaying, canPlay, isScreenSmall, controlsHeight, playerRef, duration, progress, togglePlay, toggleFullscreen, extractFrames, openSubtitleManager}: VideoControlsBarProps) => {

  const showMobileControls = isScreenSmall && canPlay;

  const controlGroupSX = {
    display: "flex",
    gap: "5px",
    alignItems: "center",
    height: controlsHeight,
  };

  let additionalStyles: React.CSSProperties = {}
  if(isFullScreen && showControlsFullScreen){
    additionalStyles = {
      opacity: 1,
      position: 'fixed',
      bottom: 0
    }
  }

  return (
    <ControlsContainer
      style={{
        padding: "0px",
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'auto' : 'none',
        transition: 'opacity 0.4s ease-in-out',
        width: '100%'
        // ...additionalStyles
        // height: controlsHeight,
      }}
    >
      {showMobileControls ? (
        null
        // <MobileControlsBar />
      ) : canPlay ? (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%'
        }}>
         
        <ProgressSlider  playerRef={playerRef} progress={progress} duration={duration} />
        <Box sx={{
          width: '100%',
          display: 'flex'
        }}>
          <Box sx={controlGroupSX}>
            <PlayButton isPlaying={isPlaying} togglePlay={togglePlay}/>
            <ReloadButton reloadVideo={reloadVideo} />

            

            <VolumeControl onVolumeChange={onVolumeChange} volume={volume} sliderWidth={"100px"} />
            <VideoTime  progress={progress} duration={duration}/>
          </Box>

          <Box sx={{...controlGroupSX, marginLeft: 'auto'}}>
            <PlaybackRate playbackRate={playbackRate} increaseSpeed={increaseSpeed} decreaseSpeed={decreaseSpeed} />
            <ObjectFitButton />
            <IconButton ref={subtitleBtnRef} onClick={openSubtitleManager}>
              <SubtitlesIcon />
            </IconButton>
            <PictureInPictureButton />
            <FullscreenButton toggleFullscreen={toggleFullscreen} />
          </Box>
          </Box>
        </Box>
      ) : null}
    </ControlsContainer>
  );
};
