import { useEffect } from 'react';
import { AudioPlayerHandle } from './AudioPlayerControls';

export const useAudioPlayerHotkeys = (
  ref: React.RefObject<AudioPlayerHandle | null>,
  isAudioPlayerAvalable: boolean
) => {
  useEffect(() => {
    if (!ref?.current || !isAudioPlayerAvalable) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isTyping) return;
      if (e.ctrlKey || e.metaKey) return
      const audio = ref.current;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (audio?.isPlaying) {
            audio.pause();
          } else {
            audio?.play();
          }

          break;
        case 'ArrowLeft':
          audio?.seekTo((audio.audioEl?.currentTime || 0) - 5);
          break;
        case 'ArrowRight':
          audio?.seekTo((audio.audioEl?.currentTime || 0) + 5);
          break;
        case 'm':
        case 'M':
          audio?.toggleMute();
          break;
        case 'n':
        case 'N':
          audio?.next();
          break;
        case 'p':
        case 'P':
          audio?.prev();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ref, isAudioPlayerAvalable]);
};
