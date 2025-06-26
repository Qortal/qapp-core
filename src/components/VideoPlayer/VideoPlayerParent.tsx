import React, { useEffect, useRef } from "react";
import { TimelineAction, VideoPlayer, VideoPlayerProps } from "./VideoPlayer";
import { useGlobalPlayerStore } from "../../state/pip";
import Player from "video.js/dist/types/player";
import { useIsPlaying } from "../../state/video";
import { QortalGetMetadata } from "../../types/interfaces/resources";

export interface VideoPlayerParentProps {
  qortalVideoResource: QortalGetMetadata;
  videoRef: any;
  retryAttempts?: number;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  timelineActions?: TimelineAction[];
}
export const VideoPlayerParent = ({
  videoRef,
  qortalVideoResource,
  retryAttempts,
  poster,
  autoPlay,
  onEnded,
  timelineActions,
}: VideoPlayerParentProps) => {
  const playerRef = useRef<Player | null>(null);
  const locationRef = useRef<string | null>(null);
  const videoLocationRef = useRef<null | string>(null);
  const { isPlaying, setIsPlaying } = useIsPlaying();
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      const player = playerRef.current;

      const isPlaying = isPlayingRef.current;
      const currentSrc = player?.currentSrc();

      if (currentSrc && isPlaying && videoLocationRef.current) {
        const current = player?.currentTime?.();
        const currentSource = player?.currentType();

        useGlobalPlayerStore.getState().setVideoState({
          videoSrc: currentSrc,
          currentTime: current ?? 0,
          isPlaying: true,
          mode: "floating",
          videoId: videoLocationRef.current,
          location: locationRef.current || "",
          type: currentSource || "video/mp4",
        });
      }
    };
  }, []);
  useEffect(() => {
    return () => {
      const player = playerRef.current;

      setIsPlaying(false);

      if (player && typeof player.dispose === "function") {
        try {
          player.dispose();
        } catch (err) {
          console.error("Error disposing Video.js player:", err);
        }
        playerRef.current = null;
      }
    };
  }, [
    qortalVideoResource?.service,
    qortalVideoResource?.name,
    qortalVideoResource?.identifier,
  ]);

  return (
    <VideoPlayer
      key={`${qortalVideoResource.service}-${qortalVideoResource.name}-${qortalVideoResource.identifier}`}
      videoRef={videoRef}
      qortalVideoResource={qortalVideoResource}
      retryAttempts={retryAttempts}
      poster={poster}
      autoPlay={autoPlay}
      onEnded={onEnded}
      timelineActions={timelineActions}
      playerRef={playerRef}
      locationRef={locationRef}
      videoLocationRef={videoLocationRef}
    />
  );
};
