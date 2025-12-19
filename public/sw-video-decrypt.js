// Service Worker for decrypting encrypted videos on-the-fly
// This allows streaming large encrypted videos without loading everything into memory

// Cache for storing encryption configurations
const ENCRYPTION_CACHE = new Map();

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'SET_ENCRYPTION') {
    const videoId = event.data.videoId;
    const config = {
      key: new Uint8Array(event.data.key),
      iv: new Uint8Array(event.data.iv),
      resourceUrl: event.data.resourceUrl,
      totalSize: event.data.totalSize,
      mimeType: event.data.mimeType || 'video/mp4',
    };

    ENCRYPTION_CACHE.set(videoId, config);

    // Respond back to confirm
    event.ports[0].postMessage({ success: true });
  } else if (event.data.type === 'REMOVE_ENCRYPTION') {
    const videoId = event.data.videoId;
    ENCRYPTION_CACHE.delete(videoId);
    event.ports[0].postMessage({ success: true });
  }
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if this is a request for an encrypted video
  if (url.pathname.startsWith('/decrypt-video/')) {
    const videoId = url.pathname.split('/')[2];
    event.respondWith(handleEncryptedVideo(event.request, videoId));
  }
});

// Handle encrypted video requests
async function handleEncryptedVideo(request, videoId) {
  try {
    const config = ENCRYPTION_CACHE.get(videoId);

    if (!config) {
      console.error('[SW] Video config not found for:', videoId);

      return new Response('Video configuration not found', { status: 404 });
    }

    const rangeHeader = request.headers.get('range');

    // Handle HEAD request or requests without range
    if (!rangeHeader) {
      return new Response(null, {
        status: 200,
        headers: {
          'Content-Length': String(config.totalSize),
          'Content-Type': config.mimeType || 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Parse range header: "bytes=start-end"
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!rangeMatch) {
      return new Response('Invalid range header', { status: 416 });
    }

    const start = parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2]
      ? parseInt(rangeMatch[2], 10)
      : Math.min(start + 5 * 1024 * 1024 - 1, config.totalSize - 1); // 5MB chunks

    // Fetch encrypted data from the actual resource
    const encryptedResponse = await fetch(config.resourceUrl, {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!encryptedResponse.ok && encryptedResponse.status !== 206) {
      console.error(
        '[SW] Failed to fetch encrypted data:',
        encryptedResponse.status
      );
      return new Response('Failed to fetch encrypted data', {
        status: encryptedResponse.status,
      });
    }

    const encrypted = new Uint8Array(await encryptedResponse.arrayBuffer());

    // Decrypt the chunk
    const blockOffset = BigInt(start >> 4);
    const decrypted = await decryptAesCtrChunk(
      config.key,
      config.iv,
      blockOffset,
      encrypted
    );

    // Calculate actual end based on what we got
    const actualEnd = start + decrypted.length - 1;

    // Return decrypted data as partial content
    return new Response(decrypted, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${actualEnd}/${config.totalSize}`,
        'Content-Length': String(decrypted.length),
        'Content-Type': config.mimeType || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[SW] Error handling encrypted video:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

// AES-CTR decryption utilities
function deriveCtrCounter(iv, blockOffset) {
  const counter = new Uint8Array(16);
  const ivArray = new Uint8Array(iv);
  counter.set(ivArray);
  let carry = blockOffset;

  for (let i = 15; i >= 0 && carry > 0n; i--) {
    const sum = BigInt(counter[i]) + (carry & 0xffn);
    counter[i] = Number(sum & 0xffn);
    carry = (carry >> 8n) + (sum >> 8n);
  }
  return counter;
}

async function decryptAesCtrChunk(keyBytes, ivBytes, blockOffset, ciphertext) {
  // Try WebCrypto API first (faster)
  if (self.crypto?.subtle) {
    try {
      const keyBuffer = new Uint8Array(keyBytes).buffer;
      const cryptoKey = await self.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-CTR' },
        false,
        ['decrypt']
      );

      const counter = deriveCtrCounter(ivBytes, blockOffset);
      const counterArray = new Uint8Array(counter);
      const ciphertextBuffer = new Uint8Array(ciphertext).buffer;

      const decrypted = await self.crypto.subtle.decrypt(
        {
          name: 'AES-CTR',
          counter: counterArray,
          length: 128,
        },
        cryptoKey,
        ciphertextBuffer
      );

      return new Uint8Array(decrypted);
    } catch (e) {
      console.warn('[SW] WebCrypto decrypt failed, using fallback:', e);
    }
  }

  // Fallback to aes-js (if available)
  // Note: In production, you might want to import aes-js into the service worker
  // For now, we'll rely on WebCrypto which should work in all modern browsers
  throw new Error('WebCrypto not available and no fallback configured');
}

// Service Worker installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
