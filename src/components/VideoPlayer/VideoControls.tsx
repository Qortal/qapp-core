import { Box, IconButton, Slider, Typography } from "@mui/material";
export const fontSizeExSmall = "60%";
export const fontSizeSmall = "80%";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import {
  Fullscreen,
  Pause,
  PictureInPicture,
  PlayArrow,
  Refresh,
  VolumeOff,
  VolumeUp,
} from "@mui/icons-material";
import { formatTime } from "../../utils/time.js";
import { CustomFontTooltip } from "./CustomFontTooltip.js";

const buttonPaddingBig = "6px";
const buttonPaddingSmall = "4px";

export const PlayButton = ({togglePlay, isPlaying , isScreenSmall}: any) => {
  return (
    <CustomFontTooltip title="Pause/Play (Spacebar)" placement="bottom" arrow>
      <IconButton
        sx={{
          color: "white",
          padding: isScreenSmall ? buttonPaddingSmall : buttonPaddingBig,
        }}
        onClick={() => togglePlay()}
      >
        {isPlaying ? <Pause /> : <PlayArrow />}
      </IconButton>
    </CustomFontTooltip>
  );
};

export const ReloadButton = ({reloadVideo, isScreenSmall}: any) => {
  return (
    <CustomFontTooltip title="Reload Video (R)" placement="bottom" arrow>
      <IconButton
        sx={{
          color: "white",
          padding: isScreenSmall ? buttonPaddingSmall : buttonPaddingBig,
        }}
        onClick={reloadVideo}
      >
        <Refresh />
      </IconButton>
    </CustomFontTooltip>
  );
};

export const ProgressSlider = ({progress,  duration, videoRef}: any) => {
  const onProgressChange = async (_: any, value: number | number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value as number;
  };
  return (
    <Slider
      value={progress}
      onChange={onProgressChange}
      min={0}
      max={duration || 100}
      step={0.1}
      sx={{
        position: "absolute",
        bottom: "42px",
        color: "#00abff",
        padding: "0px",
        // prevents the slider from jumping up 20px in certain mobile conditions
        "@media (pointer: coarse)": { padding: "0px" },

        "& .MuiSlider-thumb": {
          backgroundColor: "#fff",
          width: "16px",
          height: "16px",
        },
        "& .MuiSlider-thumb::after": { width: "20px", height: "20px" },
        "& .MuiSlider-rail": { opacity: 0.5, height: "6px" },
        "& .MuiSlider-track": { height: "6px", border: "0px" },
      }}
    />
  );
};

export const VideoTime = ({videoRef, progress, isScreenSmall}: any) => {

  return (
    <CustomFontTooltip
      title="Seek video in 10% increments (0-9)"
      placement="bottom"
      arrow
    >
      <Typography
        sx={{
          fontSize: isScreenSmall ? fontSizeExSmall : fontSizeSmall,
          color: "white",
          visibility: !videoRef.current?.duration ? "hidden" : "visible",
          whiteSpace: "nowrap",
        }}
      >
        {videoRef.current?.duration ? formatTime(progress) : ""}
        {" / "}
        {videoRef.current?.duration
          ? formatTime(videoRef.current?.duration)
          : ""}
      </Typography>
    </CustomFontTooltip>
  );
};

const VolumeButton = ({isMuted, toggleMute}: any) => {
  return (
    <CustomFontTooltip
      title="Toggle Mute (M), Raise (UP), Lower (DOWN)"
      placement="bottom"
      arrow
    >
      <IconButton
        sx={{
          color: "white",
        }}
        onClick={toggleMute}
      >
        {isMuted ? <VolumeOff /> : <VolumeUp />}
      </IconButton>
    </CustomFontTooltip>
  );
};

const VolumeSlider = ({ width, volume, onVolumeChange }: any) => {
  let color = "";
  if (volume <= 0.5) color = "green";
  else if (volume <= 0.75) color = "yellow";
  else color = "red";

  return (
    <Slider
      value={volume}
      onChange={onVolumeChange}
      min={0}
      max={1}
      step={0.01}
      sx={{
        width,
        marginRight: "10px",
        color,
        "& .MuiSlider-thumb": {
          backgroundColor: "#fff",
          width: "16px",
          height: "16px",
        },
        "& .MuiSlider-thumb::after": { width: "16px", height: "16px" },
        "& .MuiSlider-rail": { opacity: 0.5, height: "6px" },
        "& .MuiSlider-track": { height: "6px", border: "0px" },
      }}
    />
  );
};

export const VolumeControl = ({ sliderWidth, onVolumeChange, volume }: any) => {
  return (
    <Box
      sx={{ display: "flex", gap: "5px", alignItems: "center", width: "100%" }}
    >
      <VolumeButton />
      <VolumeSlider width={sliderWidth} onVolumeChange={onVolumeChange} volume={volume} />
    </Box>
  );
};

export const PlaybackRate = ({playbackRate, increaseSpeed, isScreenSmall}: any) => {
  return (
    <CustomFontTooltip
      title="Video Speed. Increase (+ or >), Decrease (- or <)"
      placement="bottom"
      arrow
    >
      <IconButton
        sx={{
          color: "white",
          fontSize: fontSizeSmall,
          padding: isScreenSmall ? buttonPaddingSmall : buttonPaddingBig,
        }}
        onClick={() => increaseSpeed()}
      >
        {playbackRate}x
      </IconButton>
    </CustomFontTooltip>
  );
};

export const ObjectFitButton = ({toggleObjectFit, isScreenSmall}: any) => {
  return (
    <CustomFontTooltip title="Toggle Aspect Ratio (O)" placement="bottom" arrow>
      <IconButton
        sx={{
          color: "white",
          padding: isScreenSmall ? buttonPaddingSmall : buttonPaddingBig,
        }}
        onClick={() => toggleObjectFit()}
      >
        <AspectRatioIcon />
      </IconButton>
    </CustomFontTooltip>
  );
};

export const PictureInPictureButton = ({isFullscreen, toggleRef, togglePictureInPicture, isScreenSmall}: any) => {
  
  return (
    <>
      {!isFullscreen && (
        <CustomFontTooltip
          title="Picture in Picture (P)"
          placement="bottom"
          arrow
        >
          <IconButton
            sx={{
              color: "white",
              padding: isScreenSmall ? buttonPaddingSmall : buttonPaddingBig,
            }}
            ref={toggleRef}
            onClick={togglePictureInPicture}
          >
            <PictureInPicture />
          </IconButton>
        </CustomFontTooltip>
      )}
    </>
  );
};

export const FullscreenButton = ({toggleFullscreen, isScreenSmall}: any) => {

  return (
    <CustomFontTooltip title="Toggle Fullscreen (F)" placement="bottom" arrow>
      <IconButton
        sx={{
          color: "white",
          padding: isScreenSmall ? buttonPaddingSmall : buttonPaddingBig,
        }}
        onClick={() => toggleFullscreen()}
      >
        <Fullscreen />
      </IconButton>
    </CustomFontTooltip>
  );
};
