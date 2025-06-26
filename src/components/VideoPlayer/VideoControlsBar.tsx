import { Box, IconButton } from "@mui/material";
import { ControlsContainer } from "./VideoPlayer-styles";
import {
  FullscreenButton,
  PlaybackRate,
  PlayButton,
  ProgressSlider,
  ReloadButton,
  VideoTime,
  VolumeControl,
} from "./VideoControls";
import SubtitlesIcon from "@mui/icons-material/Subtitles";
import { CustomFontTooltip } from "./CustomFontTooltip";
interface VideoControlsBarProps {
  canPlay: boolean;
  isScreenSmall: boolean;
  controlsHeight?: string;
  progress: number;
  duration: number;
  isPlaying: boolean;
  togglePlay: () => void;
  reloadVideo: () => void;
  volume: number;
  onVolumeChange: (_: any, val: number) => void;
  toggleFullscreen: () => void;
  showControls: boolean;
  showControlsFullScreen: boolean;
  isFullScreen: boolean;
  playerRef: any;
  increaseSpeed: () => void;
  decreaseSpeed: () => void;
  playbackRate: number;
  openSubtitleManager: () => void;
  subtitleBtnRef: any;
  onSelectPlaybackRate: (rate: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  openPlaybackMenu: () => void;
  togglePictureInPicture: () => void;
  isVideoPlayerSmall: boolean;
  setLocalProgress: (val: number) => void;
}

export const VideoControlsBar = ({
  subtitleBtnRef,
  setLocalProgress,
  showControls,
  playbackRate,
  increaseSpeed,
  decreaseSpeed,
  isFullScreen,
  showControlsFullScreen,
  reloadVideo,
  onVolumeChange,
  volume,
  isPlaying,
  canPlay,
  isScreenSmall,
  controlsHeight,
  playerRef,
  duration,
  progress,
  togglePlay,
  toggleFullscreen,
  openSubtitleManager,
  onSelectPlaybackRate,
  isMuted,
  toggleMute,
  openPlaybackMenu,
  togglePictureInPicture,
  isVideoPlayerSmall,
}: VideoControlsBarProps) => {
  const showMobileControls = isScreenSmall && canPlay;

  const controlGroupSX = {
    display: "flex",
    gap: "5px",
    alignItems: "center",
    height: controlsHeight,
  };

  let additionalStyles: React.CSSProperties = {};
  if (isFullScreen && showControlsFullScreen) {
    additionalStyles = {
      opacity: 1,
      position: "fixed",
      bottom: 0,
    };
  }

  return (
    <ControlsContainer
      style={{
        padding: "0px",
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? "auto" : "none",
        transition: "opacity 0.4s ease-in-out",
        width: "100%",
      }}
    >
      {showMobileControls ? null : canPlay ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          <ProgressSlider
            setLocalProgress={setLocalProgress}
            playerRef={playerRef}
            progress={progress}
            duration={duration}
          />
          {!isVideoPlayerSmall && (
            <Box
              sx={{
                width: "100%",
                display: "flex",
              }}
            >
              <Box sx={controlGroupSX}>
                <PlayButton isPlaying={isPlaying} togglePlay={togglePlay} />
                <ReloadButton reloadVideo={reloadVideo} />

                <VolumeControl
                  onVolumeChange={onVolumeChange}
                  volume={volume}
                  sliderWidth={"100px"}
                  isMuted={isMuted}
                  toggleMute={toggleMute}
                />
                <VideoTime progress={progress} duration={duration} />
              </Box>

              <Box sx={{ ...controlGroupSX, marginLeft: "auto" }}>
                <PlaybackRate
                  openPlaybackMenu={openPlaybackMenu}
                  onSelect={onSelectPlaybackRate}
                  playbackRate={playbackRate}
                  increaseSpeed={increaseSpeed}
                  decreaseSpeed={decreaseSpeed}
                />
                {/* <ObjectFitButton /> */}
                <CustomFontTooltip title="Subtitles" placement="bottom" arrow>
                  <IconButton
                    ref={subtitleBtnRef}
                    onClick={openSubtitleManager}
                  >
                    <SubtitlesIcon
                      sx={{
                        color: "white",
                      }}
                    />
                  </IconButton>
                </CustomFontTooltip>
                {/* <PictureInPictureButton togglePictureInPicture={togglePictureInPicture} /> */}
                <FullscreenButton toggleFullscreen={toggleFullscreen} />
              </Box>
            </Box>
          )}
        </Box>
      ) : null}
    </ControlsContainer>
  );
};
