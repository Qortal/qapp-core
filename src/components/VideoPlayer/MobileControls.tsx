import { alpha, Box, IconButton } from "@mui/material";
import React from "react";
import { ProgressSlider } from "./VideoControls";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SubtitlesIcon from "@mui/icons-material/Subtitles";
import SlowMotionVideoIcon from "@mui/icons-material/SlowMotionVideo";
import Fullscreen from "@mui/icons-material/Fullscreen";
import Forward10Icon from "@mui/icons-material/Forward10";
import Replay10Icon from "@mui/icons-material/Replay10";

interface MobileControlsProps {
  showControlsMobile: boolean;
  progress: number;
  duration: number;
  playerRef: any;
  setShowControlsMobile: (val: boolean) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  openSubtitleManager: () => void;
  openPlaybackMenu: () => void;
  toggleFullscreen: () => void;
  setProgressRelative: (val: number) => void;
  setLocalProgress: (val: number)=> void;
}
export const MobileControls = ({
  showControlsMobile,
  togglePlay,
  isPlaying,
  setShowControlsMobile,
  playerRef,
  progress,
  duration,
  openSubtitleManager,
  openPlaybackMenu,
  toggleFullscreen,
  setProgressRelative,
  setLocalProgress
}: MobileControlsProps) => {
  return (
    <Box
      onClick={() => setShowControlsMobile(false)}
      sx={{
        position: "absolute",
        display: showControlsMobile ? "block" : "none",
        top: 0,
        bottom: 0,
        right: 0,
        left: 0,
        zIndex: 1,
        background: "rgba(0,0,0,.5)",
        opacity: 1,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "10px",
          right: "10px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            openSubtitleManager();
          }}
        >
          <SubtitlesIcon
            sx={{
              fontSize: "24px",
            }}
          />
        </IconButton>
        <IconButton
          sx={{
            fontSize: "24px",
          }}
          onClick={(e) => {
            e.stopPropagation();
            openPlaybackMenu();
          }}
        >
          <SlowMotionVideoIcon />
        </IconButton>
      </Box>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          gap: "50px",
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <IconButton
          sx={{
            opacity: 1,
            zIndex: 2,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setProgressRelative(-10);
          }}
        >
          <Replay10Icon
            sx={{
              fontSize: "36px",
            }}
          />
        </IconButton>
        {isPlaying && (
          <IconButton
            sx={{
              opacity: 1,
              zIndex: 2,
            }}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            <PauseIcon
              sx={{
                fontSize: "36px",
              }}
            />
          </IconButton>
        )}
        {!isPlaying && (
          <IconButton
            sx={{
              opacity: 1,
              zIndex: 2,
            }}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            <PlayArrowIcon
              sx={{
                fontSize: "36px",
              }}
            />
          </IconButton>
        )}
        <IconButton
          sx={{
            opacity: 1,
            zIndex: 2,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setProgressRelative(10);
          }}
        >
          <Forward10Icon
            sx={{
              fontSize: "36px",
            }}
          />
        </IconButton>
      </Box>

      <Box
        sx={{
          position: "absolute",
          bottom: "20px",
          right: "10px",
        }}
      >
        <IconButton
          sx={{
            fontSize: "24px",
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
        >
          <Fullscreen />
        </IconButton>
      </Box>
      <Box
        sx={{
          width: "100%",
          position: "absolute",
          bottom: 0,
        }}
      >
        <ProgressSlider
          playerRef={playerRef}
          progress={progress}
          duration={duration}
          setLocalProgress={setLocalProgress}
        />
      </Box>
    </Box>
  );
};
