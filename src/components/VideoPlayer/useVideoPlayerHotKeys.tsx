import { useEffect, useCallback } from 'react';

interface UseVideoControls {
  reloadVideo: () => void;
  togglePlay: () => void;
  setProgressRelative: (seconds: number) => void;
  toggleObjectFit: () => void;
  increaseSpeed: (wrapOverflow?: boolean) => void;
  decreaseSpeed: () => void;
  changeVolume: (delta: number) => void;
  toggleMute: () => void;
  setProgressAbsolute: (percent: number) => void;
  toggleFullscreen: ()=> void;
}

export const useVideoPlayerHotKeys = (props: UseVideoControls) => {
  const {
    reloadVideo,
    togglePlay,
    setProgressRelative,
    toggleObjectFit,
    increaseSpeed,
    decreaseSpeed,
    changeVolume,
    toggleMute,
    setProgressAbsolute,
    toggleFullscreen
  } = props;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toUpperCase();
    const role = target.getAttribute("role");
    const isTypingOrInteractive =
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag) ||
      target.isContentEditable ||
      role === "button";

    if (isTypingOrInteractive) return;

    if (e.ctrlKey || e.metaKey) return
    e.preventDefault();
    const key = e.key;
    const mod = (s: number) => setProgressRelative(s);

    switch (key) {
      case "o":
        toggleObjectFit();
        break;
       case "f":
        toggleFullscreen();
        break;
      case "+":
      case ">":
        increaseSpeed(false);
        break;
      case "-":
      case "<":
        decreaseSpeed();
        break;
      case "ArrowLeft":
        if (e.shiftKey) mod(-300);
        else if (e.ctrlKey) mod(-60);
        else if (e.altKey) mod(-10);
        else mod(-5);
        break;
      case "ArrowRight":
        if (e.shiftKey) mod(300);
        else if (e.ctrlKey) mod(60);
        else if (e.altKey) mod(10);
        else mod(5);
        break;
      case "ArrowDown":
        changeVolume(-0.05);
        break;
      case "ArrowUp":
        changeVolume(0.05);
        break;
      case " ":
        e.preventDefault(); // prevent scrolling
        togglePlay();
        break;
      case "m":
        toggleMute();
        break;
      case "r":
        reloadVideo();
        break;
      case "0":
        setProgressAbsolute(0);
        break;
      case "1":
        setProgressAbsolute(10);
        break;
      case "2":
        setProgressAbsolute(20);
        break;
      case "3":
        setProgressAbsolute(30);
        break;
      case "4":
        setProgressAbsolute(40);
        break;
      case "5":
        setProgressAbsolute(50);
        break;
      case "6":
        setProgressAbsolute(60);
        break;
      case "7":
        setProgressAbsolute(70);
        break;
      case "8":
        setProgressAbsolute(80);
        break;
      case "9":
        setProgressAbsolute(90);
        break;
    }
  }, [
    reloadVideo,
    togglePlay,
    setProgressRelative,
    toggleObjectFit,
    
    increaseSpeed,
    decreaseSpeed,
    changeVolume,
    toggleMute,
    setProgressAbsolute,
    toggleFullscreen
  ]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
};
