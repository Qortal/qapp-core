import React, { useCallback, useMemo, useState } from "react";
import { TimelineAction } from "./VideoPlayer";
import { alpha, ButtonBase, Typography } from "@mui/material";

interface TimelineActionsComponentProps {
  timelineActions: TimelineAction[];
  progress: number;
  containerRef: any;
  seekTo: (time: number) => void;
  isVideoPlayerSmall: boolean;
}

const placementStyles: Record<
  NonNullable<TimelineAction["placement"]>,
  React.CSSProperties
> = {
  "TOP-RIGHT": { top: 16, right: 16 },
  "TOP-LEFT": { top: 16, left: 16 },
  "BOTTOM-LEFT": { bottom: 60, left: 16 },
  "BOTTOM-RIGHT": { bottom: 60, right: 16 },
};

export const TimelineActionsComponent = ({
  timelineActions,
  progress,
  containerRef,
  seekTo,
  isVideoPlayerSmall,
}: TimelineActionsComponentProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleClick = useCallback((action: TimelineAction) => {
    if (action?.type === "SEEK") {
      if (!action?.seekToTime) return;
      seekTo(action.seekToTime);
    } else if (action?.type === "CUSTOM") {
      if (action.onClick) {
        action.onClick();
      }
    }
  }, []);

  // Find the current matching action(s)
  const activeActions = useMemo(() => {
    return timelineActions.filter((action) => {
      return (
        progress >= action.time && progress <= action.time + action.duration
      );
    });
  }, [timelineActions, progress]);

  const hasActive = activeActions.length > 0;

  if (!hasActive) return null; // Don’t render unless active
  return (
    <>
      {activeActions?.map((action, index) => {
        const placement = (action.placement ??
          "TOP-RIGHT") as keyof typeof placementStyles;

        return (
          <ButtonBase
            key={index}
            sx={{
              position: "absolute",
              bgcolor: alpha("#181818", 0.95),
              p: 1,
              borderRadius: 1,
              boxShadow: 3,
              zIndex: 10,
              outline: "1px solid white",
              ...placementStyles[placement || "TOP-RIGHT"],
            }}
          >
            <Typography
              key={index}
              sx={{
                fontSize: isVideoPlayerSmall ? "16px" : "18px",
              }}
              onClick={() => handleClick(action)}
            >
              {action.label}
            </Typography>
          </ButtonBase>
        );
      })}
    </>
  );
};
