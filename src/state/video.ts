import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';

const EXPIRY_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const PROGRESS_UPDATE_INTERVAL = 5 * 1000;
const lastSavedTimestamps: Record<string, number> = {};

const indexedDBWithExpiry = {
  getItem: async (key: string) => {
    const value = await idbGet(key);
    if (!value) return null;

    const now = Date.now();
    const expired =
      typeof value === 'object' &&
      value !== null &&
      'expiresAt' in value &&
      typeof value.expiresAt === 'number' &&
      now > value.expiresAt;

    return expired ? null : value.data ?? value;
  },
  setItem: async (key: string, value: any) => {
    await idbSet(key, {
      data: value,
      expiresAt: Date.now() + EXPIRY_DURATION,
    });
  },
  removeItem: async (key: string) => {
    await idbDel(key);
  },
};

type PlaybackSettings = {
  playbackRate: number;
  volume: number;
};

type PlaybackStore = {
  playbackSettings: PlaybackSettings;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  getPersistedPlaybackRate: () => number;
  getPersistedVolume: () => number;
};

export const useVideoStore = create<PlaybackStore>()(
  persist(
    (set, get) => ({
      playbackSettings: {
        playbackRate: 1.0,
        volume: 1.0,
      },
      setPlaybackRate: (rate) =>
        set((state) => ({
          playbackSettings: { ...state.playbackSettings, playbackRate: rate },
        })),
      setVolume: (volume) =>
        set((state) => ({
          playbackSettings: { ...state.playbackSettings, volume },
        })),
      getPersistedPlaybackRate: () => get().playbackSettings.playbackRate,
      getPersistedVolume: () => get().playbackSettings.volume,
    }),
    {
      name: 'video-playback-settings',
      partialize: (state) => ({ playbackSettings: state.playbackSettings }),
    }
  )
);

type ProgressStore = {
  progressMap: Record<string, number>;
  setProgress: (id: string, time: number) => void;
  getProgress: (id: string) => number;
  clearOldProgress: () => Promise<void>;
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progressMap: {},
      setProgress: (id, time) => {
        const now = Date.now();
        if (now - (lastSavedTimestamps[id] || 0) >= PROGRESS_UPDATE_INTERVAL) {
          lastSavedTimestamps[id] = now;
          set((state) => ({
            progressMap: {
              ...state.progressMap,
              [id]: time,
            },
          }));
        }
      },
      getProgress: (id) => get().progressMap[id] || 0,
      clearOldProgress: async () => {
        const now = Date.now();
        const allKeys = await idbKeys();
        for (const key of allKeys) {
          const value = await idbGet(key as string);
          if (
            typeof value === 'object' &&
            value !== null &&
            'expiresAt' in value &&
            typeof value.expiresAt === 'number' &&
            now > value.expiresAt
          ) {
            await idbDel(key as string);
          }
        }
      },
    }),
    {
      name: 'video-progress-map',
      storage: indexedDBWithExpiry,
      partialize: (state) => ({ progressMap: state.progressMap }),
    }
  )
);


interface IsPlayingState {
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
}

export const useIsPlaying = create<IsPlayingState>((set) => ({
  isPlaying: false,
  setIsPlaying: (value) => set({ isPlaying: value }),
}));