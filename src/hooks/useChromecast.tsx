import { useState, useEffect, useCallback, useRef } from 'react';

export interface ChromecastState {
  isAvailable: boolean;
  isConnected: boolean;
  deviceName: string | null;
  playbackState: 'IDLE' | 'PLAYING' | 'PAUSED' | 'BUFFERING';
  position: number;
  duration: number;
}

export interface ChromecastVideoInfo {
  url: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  contentType?: string;
}

/**
 * Custom hook for Chromecast integration on Qortal Android
 * Provides a complete interface for casting videos to Chromecast devices
 */
export const useChromecast = () => {
  const [state, setState] = useState<ChromecastState>({
    isAvailable: false,
    isConnected: false,
    deviceName: null,
    playbackState: 'IDLE',
    position: 0,
    duration: 0,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const monitorInterval = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if running on Qortal Android
   */
  const checkIfMobile = useCallback(async () => {
    try {
      const uiType = await qortalRequest({ action: 'WHICH_UI' });
      const isMobileDevice = uiType === 'QORTAL_GO_ANDROID';
      setIsMobile(isMobileDevice);
      return isMobileDevice;
    } catch (error) {
      console.warn('Failed to detect mobile platform:', error);
      return false;
    }
  }, []);

  /**
   * Initialize Chromecast framework
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return true;

    try {
      const result = await qortalRequest({
        action: 'CHROMECAST_INITIALIZE',
      });

      if (result?.success) {
        setIsInitialized(true);
        // Check if devices are available
        await checkAvailability();
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Chromecast initialization failed:', error);
      return false;
    }
  }, [isInitialized]);

  /**
   * Check if Chromecast devices are available on the network
   */
  const checkAvailability = useCallback(async () => {
    try {
      const result = await qortalRequest({
        action: 'CHROMECAST_IS_AVAILABLE',
      });

      setState((prev) => ({
        ...prev,
        isAvailable: result?.available || false,
      }));

      return result?.available || false;
    } catch (error) {
      console.error('Failed to check Chromecast availability:', error);
      return false;
    }
  }, []);

  /**
   * Check current connection status
   */
  const checkConnection = useCallback(async () => {
    try {
      const result = await qortalRequest({
        action: 'CHROMECAST_IS_CONNECTED',
      });

      setState((prev) => ({
        ...prev,
        isConnected: result?.connected || false,
        deviceName: result?.deviceName || null,
      }));

      return {
        connected: result?.connected || false,
        deviceName: result?.deviceName || null,
      };
    } catch (error) {
      console.error('Failed to check connection status:', error);
      return { connected: false, deviceName: null };
    }
  }, []);

  /**
   * Show device picker and connect to selected device
   */
  const connect = useCallback(async () => {
    try {
      await qortalRequest({
        action: 'CHROMECAST_CONNECT',
      });

      // Wait a moment for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const status = await checkConnection();
      return status.connected;
    } catch (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }
  }, [checkConnection]);

  /**
   * Disconnect from current Chromecast device
   */
  const disconnect = useCallback(async () => {
    try {
      // Stop playback first
      await qortalRequest({ action: 'CHROMECAST_STOP' });

      // Then disconnect
      await qortalRequest({
        action: 'CHROMECAST_DISCONNECT',
      });

      setState((prev) => ({
        ...prev,
        isConnected: false,
        deviceName: null,
        playbackState: 'IDLE',
      }));

      return true;
    } catch (error) {
      console.error('Disconnect failed:', error);
      return false;
    }
  }, []);

  /**
   * Cast a video to the connected Chromecast device
   */
  const castVideo = useCallback(
    async (videoInfo: ChromecastVideoInfo) => {
      try {
        await qortalRequest({
          action: 'CHROMECAST_CAST_VIDEO',
          url: videoInfo.url,
          title: videoInfo.title || 'Video',
          subtitle: videoInfo.subtitle || '',
          imageUrl: videoInfo.imageUrl || '',
          contentType: videoInfo.contentType || 'video/mp4',
        });

        // Start monitoring playback state
        startMonitoring();

        return true;
      } catch (error) {
        console.error('Failed to cast video:', error);
        return false;
      }
    },
    []
  );

  /**
   * Play/resume playback
   */
  const play = useCallback(async () => {
    try {
      await qortalRequest({ action: 'CHROMECAST_PLAY' });
      setState((prev) => ({ ...prev, playbackState: 'PLAYING' }));
      return true;
    } catch (error) {
      console.error('Play failed:', error);
      return false;
    }
  }, []);

  /**
   * Pause playback
   */
  const pause = useCallback(async () => {
    try {
      await qortalRequest({ action: 'CHROMECAST_PAUSE' });
      setState((prev) => ({ ...prev, playbackState: 'PAUSED' }));
      return true;
    } catch (error) {
      console.error('Pause failed:', error);
      return false;
    }
  }, []);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(async () => {
    if (state.playbackState === 'PLAYING') {
      return await pause();
    } else {
      return await play();
    }
  }, [state.playbackState, play, pause]);

  /**
   * Stop playback completely
   */
  const stop = useCallback(async () => {
    try {
      await qortalRequest({ action: 'CHROMECAST_STOP' });
      setState((prev) => ({ ...prev, playbackState: 'IDLE', position: 0 }));
      stopMonitoring();
      return true;
    } catch (error) {
      console.error('Stop failed:', error);
      return false;
    }
  }, []);

  /**
   * Seek to specific position (in seconds)
   */
  const seek = useCallback(async (position: number) => {
    try {
      await qortalRequest({
        action: 'CHROMECAST_SEEK',
        position,
      });
      return true;
    } catch (error) {
      console.error('Seek failed:', error);
      return false;
    }
  }, []);

  /**
   * Skip forward by specified seconds
   */
  const skipForward = useCallback(
    async (seconds: number = 10) => {
      const newPosition = state.position + seconds;
      return await seek(newPosition);
    },
    [state.position, seek]
  );

  /**
   * Skip backward by specified seconds
   */
  const skipBackward = useCallback(
    async (seconds: number = 10) => {
      const newPosition = Math.max(0, state.position - seconds);
      return await seek(newPosition);
    },
    [state.position, seek]
  );

  /**
   * Set volume (0.0 to 1.0)
   */
  const setVolume = useCallback(async (volume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      await qortalRequest({
        action: 'CHROMECAST_SET_VOLUME',
        volume: clampedVolume,
      });
      return true;
    } catch (error) {
      console.error('Volume change failed:', error);
      return false;
    }
  }, []);

  /**
   * Get current playback state
   */
  const getPlaybackState = useCallback(async () => {
    try {
      const result = await qortalRequest({
        action: 'CHROMECAST_GET_PLAYBACK_STATE',
      });

      if (result) {
        setState((prev) => ({
          ...prev,
          playbackState: result.state || 'IDLE',
          position: result.position || 0,
          duration: result.duration || 0,
        }));
      }

      return result;
    } catch (error) {
      console.error('Failed to get playback state:', error);
      return null;
    }
  }, []);

  /**
   * Start monitoring playback state (updates every second)
   */
  const startMonitoring = useCallback(() => {
    if (monitorInterval.current) {
      clearInterval(monitorInterval.current);
    }

    monitorInterval.current = setInterval(async () => {
      await getPlaybackState();
    }, 1000);
  }, [getPlaybackState]);

  /**
   * Stop monitoring playback state
   */
  const stopMonitoring = useCallback(() => {
    if (monitorInterval.current) {
      clearInterval(monitorInterval.current);
      monitorInterval.current = null;
    }
  }, []);

  /**
   * Format time in seconds to MM:SS or HH:MM:SS
   */
  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Initialize on mount if mobile
  useEffect(() => {
    const setup = async () => {
      const mobile = await checkIfMobile();
      if (mobile) {
        await initialize();
      }
    };

    setup();

    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, []);

  // Check connection status periodically when initialized
  useEffect(() => {
    if (!isInitialized || !isMobile) return;

    const checkInterval = setInterval(() => {
      checkConnection();
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [isInitialized, isMobile, checkConnection]);

  return {
    // State
    state,
    isInitialized,
    isMobile,

    // Connection methods
    initialize,
    checkAvailability,
    checkConnection,
    connect,
    disconnect,

    // Playback methods
    castVideo,
    play,
    pause,
    togglePlayPause,
    stop,
    seek,
    skipForward,
    skipBackward,
    setVolume,

    // Monitoring
    getPlaybackState,
    startMonitoring,
    stopMonitoring,

    // Utilities
    formatTime,
  };
};






