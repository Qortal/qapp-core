import { useState, useEffect, useCallback } from 'react';

/**
 * Detects if running on Qortal Android (where Chromecast cast button is shown).
 * Casting is done via qortalRequest({ action: 'CHROMECAST_CAST', url, title?, ... }).
 */
export const useChromecast = () => {
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    checkIfMobile();
  }, [checkIfMobile]);

  return { isMobile };
};
