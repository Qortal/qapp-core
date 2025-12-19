/**
 * Service Worker utilities for encrypted video playback
 * Allows streaming large encrypted videos without loading everything into memory
 */

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let isRegistering = false;
let registrationAttempted = false;
let registrationFailed = false;

function toArbitraryPath(): string {
  const qdnBase = window._qdnBase;
  if (!qdnBase) return '/sw-video-decrypt.js';

  if (!qdnBase.startsWith('/render/')) {
    return '/sw-video-decrypt.js';
  }
  const origin = window.location.origin;
  return `${origin}${qdnBase}/sw-video-decrypt.js`;
}
/**
 * Register the video decryption service worker
 * Note: Requires sw-video-decrypt.js to be in the public folder of the consuming app
 */
export async function registerVideoDecryptionServiceWorker(): Promise<ServiceWorkerRegistration> {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser');
  }

  // Return existing registration if available
  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  // If registration previously failed, throw immediately
  if (registrationFailed) {
    throw new Error(
      'Service Worker registration previously failed - file may not exist'
    );
  }

  // Wait if currently registering
  if (isRegistering) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!isRegistering) {
          clearInterval(checkInterval);
          if (serviceWorkerRegistration) {
            resolve(serviceWorkerRegistration);
          } else {
            reject(new Error('Service Worker registration failed'));
          }
        }
      }, 100);
    });
  }

  try {
    isRegistering = true;
    registrationAttempted = true;

    serviceWorkerRegistration =
      await navigator.serviceWorker.register(toArbitraryPath());

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    return serviceWorkerRegistration;
  } catch (error) {
    registrationFailed = true;
    console.error('[SW] Service worker registration failed:', error);
    console.error(
      '[SW] Make sure sw-video-decrypt.js is in your public folder'
    );
    console.error(
      '[SW] Falling back to in-memory decryption (limited to smaller videos)'
    );
    throw error;
  } finally {
    isRegistering = false;
  }
}

/**
 * Send encryption configuration to the service worker
 */
export async function setEncryptionConfig(
  videoId: string,
  config: {
    key: Uint8Array;
    iv: Uint8Array;
    resourceUrl: string;
    totalSize: number;
    mimeType?: string;
  }
): Promise<void> {
  const registration = await registerVideoDecryptionServiceWorker();

  const activeWorker = registration.active;
  if (!activeWorker) {
    throw new Error('Service Worker is not active');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = async (event) => {
      if (event.data.success) {
        // Add a small delay to ensure the service worker has processed the config
        await new Promise((res) => setTimeout(res, 100));
        resolve();
      } else {
        reject(new Error('Failed to set encryption config'));
      }
    };

    activeWorker.postMessage(
      {
        type: 'SET_ENCRYPTION',
        videoId,
        key: Array.from(config.key),
        iv: Array.from(config.iv),
        resourceUrl: config.resourceUrl,
        totalSize: config.totalSize,
        mimeType: config.mimeType || 'video/mp4',
      },
      [messageChannel.port2]
    );
  });
}

/**
 * Remove encryption configuration from the service worker
 */
export async function removeEncryptionConfig(videoId: string): Promise<void> {
  const activeWorker = serviceWorkerRegistration?.active;
  if (!activeWorker) {
    return; // Service worker not active, nothing to clean up
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.success) {
        resolve();
      } else {
        reject(new Error('Failed to remove encryption config'));
      }
    };

    activeWorker.postMessage(
      {
        type: 'REMOVE_ENCRYPTION',
        videoId,
      },
      [messageChannel.port2]
    );
  });
}

/**
 * Generate a virtual URL for an encrypted video
 * This URL will be intercepted by the service worker
 */
export function generateEncryptedVideoUrl(videoId: string): string {
  // Use absolute URL for video.js compatibility
  return `/decrypt-video/${videoId}/video.mp4`;
}

/**
 * Check if service worker is supported and can be used
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Check if Service Worker is available (either already registered or can be registered)
 * This is a quick check that doesn't attempt registration
 */
export function isServiceWorkerAvailable(): boolean {
  return (
    serviceWorkerRegistration !== null ||
    (isServiceWorkerSupported() && !registrationFailed)
  );
}

/**
 * Try to register service worker without throwing
 * Returns true if successful, false otherwise
 */
export async function tryRegisterServiceWorker(): Promise<boolean> {
  if (registrationFailed) {
    return false;
  }

  try {
    await registerVideoDecryptionServiceWorker();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the current service worker registration
 */
export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return serviceWorkerRegistration;
}
