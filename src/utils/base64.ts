class Semaphore {
  private count: number;
  private waiting: (() => void)[];

  constructor(count: number) {
    this.count = count;
    this.waiting = [];
  }

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.count > 0) {
        this.count--;
        resolve();
      } else {
        this.waiting.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      if (resolve) resolve();
    } else {
      this.count++;
    }
  }
}

const semaphore = new Semaphore(1);

export const fileToBase64 = (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader(); // Create a new instance
    semaphore.acquire();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result;
      semaphore.release();
      if (typeof dataUrl === 'string') {
        resolve(dataUrl.split(',')[1]);
      } else {
        reject(new Error('Invalid data URL'));
      }
      reader.onload = null; // Clear the handler
      reader.onerror = null; // Clear the handle
    };
    reader.onerror = (error) => {
      semaphore.release();
      reject(error);
      reader.onload = null; // Clear the handler
      reader.onerror = null; // Clear the handle
    };
  });

// manage only latin chars
export function objectToBase64(obj: object): Promise<string> {
  // Step 1: Convert the object to a JSON string
  const jsonString = JSON.stringify(obj);
  // Step 2: Create a Blob from the JSON string
  const blob = new Blob([jsonString], { type: 'application/json' });
  // Step 3: Create a FileReader to read the Blob as a base64-encoded string
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove 'data:application/json;base64,' prefix
        const base64 = reader.result.replace(
          'data:application/json;base64,',
          ''
        );
        resolve(base64);
      } else {
        reject(new Error('Failed to read the Blob as a base64-encoded string'));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsDataURL(blob);
  });
}

// manage UTF8 chars
export function objectToBase64UTF8(obj: object): string {
  const jsonString = JSON.stringify(obj);
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(jsonString);
  const base64Result = uint8ArrayToBase64(uint8Array);
  return base64Result;
}

export function base64UTF8ToObject(base64: string): object {
  const uint8Array = base64ToUint8Array(base64);
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(uint8Array);
  const result = JSON.parse(jsonString);
  return result;
}

export function base64ToUint8Array(base64: string) {
  // Normalize base64 string (handle URL-safe variants and cleanup)
  let normalized = base64.replace(/-/g, '+').replace(/_/g, '/').trim();

  // Add padding if needed
  while (normalized.length % 4 !== 0) {
    normalized += '=';
  }

  try {
    const binaryString = atob(normalized);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    // If atob fails, the base64 string might contain UTF-8 characters
    // Try decoding using TextEncoder/TextDecoder approach
    console.warn(
      'Standard base64 decode failed, attempting UTF-8-aware decode:',
      err
    );
    try {
      // First, encode the potentially UTF-8 string to bytes
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(normalized);

      // Then try to decode it as base64
      const binaryString = String.fromCharCode(...utf8Bytes);
      const decodedString = atob(binaryString);

      const len = decodedString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = decodedString.charCodeAt(i);
      }
      return bytes;
    } catch (fallbackErr) {
      throw new Error(
        `Failed to decode base64 string: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

export function uint8ArrayToBase64(uint8Array: Uint8Array) {
  const length = uint8Array.length;
  let binaryString = '';
  const chunkSize = 1024 * 1024; // Process 1MB at a time
  for (let i = 0; i < length; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, length);
    const chunk = uint8Array.subarray(i, chunkEnd);
    binaryString += Array.from(chunk, (byte) => String.fromCharCode(byte)).join(
      ''
    );
  }
  return btoa(binaryString);
}

export function uint8ArrayToObject(uint8Array: Uint8Array) {
  // Decode the byte array using TextDecoder
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(uint8Array);
  // Convert the JSON string back into an object
  return JSON.parse(jsonString);
}

export function base64ToObject(base64: string) {
  const toUint = base64ToUint8Array(base64);
  const toObject = uint8ArrayToObject(toUint);

  return toObject;
}

export const base64ToBlobUrl = (
  base64: string,
  mimeType = 'text/vtt'
): string => {
  const cleanedBase64 =
    base64.length % 4 === 0
      ? base64
      : base64 + '='.repeat(4 - (base64.length % 4));

  try {
    const bytes = base64ToUint8Array(cleanedBase64);
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to decode base64:', err);
    return '';
  }
};
