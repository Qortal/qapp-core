import { create } from 'zustand';

type PlayerMode = 'embedded' | 'floating' | 'none';

interface GlobalPlayerState {
  videoSrc: string | null;
  videoId: string,
  isPlaying: boolean;
  currentTime: number;
  location: string;
  mode: PlayerMode;
  setVideoState: (state: Partial<GlobalPlayerState>) => void;
  type: string,
  reset: ()=> void;
}
  const initialState = {
    videoSrc: null,
    videoId: "",
    location: "",
    isPlaying: false,
    currentTime: 0,
    type: 'video/mp4',
    mode: 'embedded' as const,
  };
export const useGlobalPlayerStore = create<GlobalPlayerState>((set) => ({
  ...initialState,
  setVideoState: (state) => set((prev) => ({ ...prev, ...state })),
      reset: () => set(initialState),

}));
