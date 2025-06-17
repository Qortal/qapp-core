import {
  alpha,
  Box,
  ButtonBase,
  Divider,
  Fade,
  IconButton,
  Popover,
  Popper,
  Slider,
  Typography,
  useTheme,
} from "@mui/material";
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
import { useCallback, useEffect, useRef, useState } from "react";
import SlowMotionVideoIcon from "@mui/icons-material/SlowMotionVideo";
const buttonPaddingBig = "6px";
const buttonPaddingSmall = "4px";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import CheckIcon from "@mui/icons-material/Check";

export const PlayButton = ({ togglePlay, isPlaying, isScreenSmall }: any) => {
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

export const ReloadButton = ({ reloadVideo, isScreenSmall }: any) => {
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

export const ProgressSlider = ({ progress, duration, playerRef }: any) => {
  const sliderRef = useRef(null);

  const [hoverX, setHoverX] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showDuration, setShowDuration] = useState(0);
  const onProgressChange = (_: any, value: number | number[]) => {
    if (!playerRef.current) return;

    playerRef.current?.currentTime(value as number);
  };

  const THUMBNAIL_DEBOUNCE = 500;
  const THUMBNAIL_MIN_DIFF = 10;

  const lastRequestedTimeRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<any>(null);
  const previousBlobUrlRef = useRef<string | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = Math.min(Math.max(0, percent * duration), duration);
    console.log("hello100");
    setHoverX(e.clientX);

    setShowDuration(time);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    // debounceTimeoutRef.current = setTimeout(() => {
    //   debouncedExtract(time, e.clientX);
    // }, THUMBNAIL_DEBOUNCE);
  };

  const handleMouseLeave = () => {
    lastRequestedTimeRef.current = null;
    setThumbnailUrl(null);
    setHoverX(null);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    if (previousBlobUrlRef.current) {
      URL.revokeObjectURL(previousBlobUrlRef.current);
      previousBlobUrlRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (previousBlobUrlRef.current) {
        URL.revokeObjectURL(previousBlobUrlRef.current);
      }
    };
  }, []);

  const hoverAnchorRef = useRef<HTMLDivElement | null>(null);
  if (hoverX) {
    console.log("thumbnailUrl", thumbnailUrl, hoverX);
  }

  console.log("duration", duration);

  return (
    <Box
      position="relative"
      sx={{
        width: "100%",
        padding: "0px 10px",
      }}
    >
      <Box
        ref={hoverAnchorRef}
        sx={{
          position: "absolute",
          left: hoverX ?? -9999,
          top: 0,
          width: "1px",
          height: "1px",
          pointerEvents: "none",
        }}
      />
      <Slider
        ref={sliderRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        value={progress}
        onChange={onProgressChange}
        min={0}
        max={duration || 100}
        step={0.1}
        sx={{
          color: "#00abff",
          padding: "0px",
          borderRadius: "0px",
          height: "0px",
          "@media (pointer: coarse)": { padding: "0px" },
          "& .MuiSlider-thumb": {
            backgroundColor: "red",
            width: "14px",
            height: "14px",
          },
          "& .MuiSlider-thumb::after": {
            width: "14px",
            height: "14px",
            backgroundColor: "red",
          },
          "& .MuiSlider-rail": {
            opacity: 0.5,
            height: "6px",
            backgroundColor: "#73859f80",
          },
          "& .MuiSlider-track": {
            height: "6px",
            border: "0px",
            backgroundColor: "red",
          },
        }}
      />
      {hoverX !== null && (
        <Popper
          open
          anchorEl={hoverAnchorRef.current}
          placement="top"
          disablePortal
          modifiers={[{ name: "offset", options: { offset: [-10, 0] } }]}
          
 
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: alpha("#181818", 0.75),
              padding: '5px',
              borderRadius: '5px'
            }}
          >
            {/* <Box
            sx={{
              width: 250,
              height: 125,
              backgroundColor: "black",
              border: "1px solid white",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: '7px',
              background: '#444444',
              padding: '2px'
            }}
          >
            
            <img
              src={thumbnailUrl}
              alt="preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box> */}
            <Typography
              sx={{
                fontSize: "0.8rom",
                textShadow: "0 0 5px rgba(0, 0, 0, 0.7)",
                fontFamily: "sans-serif"
              }}
            >
              {formatTime(showDuration)}
            </Typography>
          </Box>
        </Popper>
      )}
    </Box>
  );
};

export const VideoTime = ({ progress, isScreenSmall, duration }: any) => {
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
          visibility: typeof duration !== "number" ? "hidden" : "visible",
          whiteSpace: "nowrap",
          fontFamily: "sans-serif"
        }}
      >
        {typeof duration === "number" ? formatTime(progress) : ""}
        {" / "}
        {typeof duration === "number" ? formatTime(duration) : ""}
      </Typography>
    </CustomFontTooltip>
  );
};

const VolumeButton = ({ isMuted, toggleMute }: any) => {
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

export const VolumeControl = ({ sliderWidth, onVolumeChange, volume , isMuted, toggleMute}: any) => {
  return (
    <Box
      sx={{ display: "flex", gap: "5px", alignItems: "center", width: "100%" }}
    >
      <VolumeButton isMuted={isMuted} toggleMute={toggleMute} />
      <VolumeSlider
        width={sliderWidth}
        onVolumeChange={onVolumeChange}
        volume={volume}
      />
    </Box>
  );
};

const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export const PlaybackRate = ({
  playbackRate,
  increaseSpeed,
  isScreenSmall,
  onSelect,
  openPlaybackMenu
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef(null);
  const theme = useTheme();
  const onBack = () => {
    setIsOpen(false);
  };

  return (
    <>
      <CustomFontTooltip
        title="Video Speed. Increase (+ or >), Decrease (- or <)"
        placement="bottom"
        arrow
      >
        <IconButton
        ref={btnRef}
          sx={{
            color: "white",
            fontSize: fontSizeSmall,
            padding: isScreenSmall ? buttonPaddingSmall : buttonPaddingBig,
          }}
          onClick={() => openPlaybackMenu()}
        >
          <SlowMotionVideoIcon />
        </IconButton>
      </CustomFontTooltip>

   
    </>
  );
};

export const ObjectFitButton = ({ toggleObjectFit, isScreenSmall }: any) => {
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

export const PictureInPictureButton = ({
  isFullscreen,
  toggleRef,
  togglePictureInPicture,
  isScreenSmall,
}: any) => {
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

export const FullscreenButton = ({ toggleFullscreen, isScreenSmall }: any) => {
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

interface PlayBackMenuProps {
  close: ()=> void
  isOpen: boolean
  onSelect: (speed: number)=> void;
  playbackRate: number
}
export const PlayBackMenu = ({close, onSelect, isOpen, playbackRate}: PlayBackMenuProps)=> {
  const theme = useTheme()
  const ref = useRef<any>(null)
  console.log('isOpen', isOpen)

  useEffect(()=> {
    if(isOpen){
      ref?.current?.focus()
    }
  }, [isOpen])

  const handleBlur = (e: React.FocusEvent) => {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    close();
  }
};
  if(!isOpen) return null
  return (

   <Box
   ref={ref}
   tabIndex={-1}
   onBlur={handleBlur}
                    bgcolor={alpha("#181818", 0.98)}

        sx={
          {
            position: 'absolute',
              bottom: 60,
              right: 5,
              color: "white",
              opacity: 0.9,
              borderRadius: 2,
              boxShadow: 5,
              p: 1,
              minWidth: 225,
              height: 300,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              zIndex: 10,
            }
        }
      >
        <Box
          sx={{
            padding: "5px 0px 10px 0px",
            display: "flex",
            gap: "10px",
            width: "100%",
          }}
        >
          <ButtonBase onClick={close}>
            <ArrowBackIosIcon
              sx={{
                fontSize: "1.15em",
              }}
            />
          </ButtonBase>
          <ButtonBase>
            <Typography
              onClick={close}
              sx={{
                fontSize: "0.85rem",
              }}
            >
              Playback speed
            </Typography>
          </ButtonBase>
        </Box>
        <Divider />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            overflow: "auto",
            "::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },

            "::-webkit-scrollbar": {
              width: "16px",
              height: "10px",
            },

            "::-webkit-scrollbar-thumb": {
              backgroundColor: theme.palette.primary.main,
              borderRadius: "8px",
              backgroundClip: "content-box",
              border: "4px solid transparent",
              transition: "0.3s background-color",
            },

            "::-webkit-scrollbar-thumb:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          {speeds?.map((speed) => {
            const isSelected = speed === playbackRate;
            return (
              <ButtonBase
                disabled={isSelected}
                key={speed}
                onClick={(e) => {
                  onSelect(speed)
                  close()
                }}
                sx={{
                  px: 2,
                  py: 1,
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <Typography>{speed}</Typography>
                {isSelected ? <CheckIcon /> : <ArrowForwardIosIcon />}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>
  )
}