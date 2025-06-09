import { Box } from "@mui/material";
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

interface VideoControlsBarProps {
  canPlay: boolean
  isScreenSmall: boolean
  controlsHeight?: string
  videoRef:Ref<HTMLVideoElement>;
  progress: number;
  duration: number
  isPlaying: boolean;
  togglePlay: ()=> void;
  reloadVideo: ()=> void;
  volume: number
  onVolumeChange: (_: any, val: number)=> void
}

export const VideoControlsBar = ({reloadVideo, onVolumeChange, volume, isPlaying, canPlay, isScreenSmall, controlsHeight, videoRef, duration, progress, togglePlay}: VideoControlsBarProps) => {

  const showMobileControls = isScreenSmall && canPlay;

  const controlGroupSX = {
    display: "flex",
    gap: "5px",
    alignItems: "center",
    height: controlsHeight,
  };

  return (
    <ControlsContainer
      style={{
        padding: "0px",
        height: controlsHeight,
      }}
    >
      {showMobileControls ? (
        null
        // <MobileControlsBar />
      ) : canPlay ? (
        <>
          <Box sx={controlGroupSX}>
            <PlayButton isPlaying={isPlaying} togglePlay={togglePlay}/>
            <ReloadButton reloadVideo={reloadVideo} />

            <ProgressSlider videoRef={videoRef} progress={progress} duration={duration} />

            <VolumeControl onVolumeChange={onVolumeChange} volume={volume} sliderWidth={"100px"} />
            <VideoTime videoRef={videoRef} progress={progress}/>
          </Box>

          <Box sx={controlGroupSX}>
            <PlaybackRate />
            <ObjectFitButton />
            <PictureInPictureButton />
            <FullscreenButton />
          </Box>
        </>
      ) : null}
    </ControlsContainer>
  );
};
