import {
  uint8ArrayToBase64,
  base64ToUint8Array as base64ToUint8ArrayFromBase64,
  uint8ArrayToObject as uint8ArrayToObjectFromBase64,
  base64ToObject as base64ToObjectFromBase64,
  objectToBase64UTF8,
  base64UTF8ToObject,
} from './base64';

const MAX_RETRIES = 3; // Define your max retries constant

export async function retryTransaction<T>(
  fn: (...args: any[]) => Promise<T>, // Function that returns a promise
  args: any[], // Arguments for the function
  throwError: boolean,
  retries: number = MAX_RETRIES
): Promise<T | null> {
  let attempt = 0;

  while (attempt < retries) {
    try {
      return await fn(...args); // Attempt to execute the function
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
      attempt++;

      if (attempt === retries) {
        console.error('Max retries reached. Skipping transaction.');
        if (throwError) {
          throw new Error(error?.message || 'Unable to process transaction');
        } else {
          return null;
        }
      }

      // Wait before retrying
      await new Promise((res) => setTimeout(res, 10000));
    }
  }

  return null; // This should never be reached, but added for type safety
}

// Re-export from base64.ts for backwards compatibility
export function base64ToUint8Array(base64: string) {
  return base64ToUint8ArrayFromBase64(base64);
}

export function uint8ArrayToObject(uint8Array: Uint8Array) {
  return uint8ArrayToObjectFromBase64(uint8Array);
}

export function base64ToObject(base64: string) {
  return base64ToObjectFromBase64(base64);
}

// Encryption key generation functions
export function createIvAndKey() {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = crypto.getRandomValues(new Uint8Array(32));
  return { iv, key };
}

export function createIvAndKeyBase64() {
  const { iv, key } = createIvAndKey();
  return { iv: uint8ArrayToBase64(iv), key: uint8ArrayToBase64(key) };
}

// UTF8 versions for publishing with metadata
export function objectToBase64ForPublish(obj: object): string {
  return objectToBase64UTF8(obj);
}

export function base64ToObjectFromPublish(base64: string): object {
  return base64UTF8ToObject(base64);
}

// Create IV and Key with metadata object support
export interface EncryptionMetadata {
  iv: string;
  key: string;
  [key: string]: any;
}

export function createEncryptionMetadataBase64(
  additionalData?: object
): EncryptionMetadata {
  const { iv, key } = createIvAndKeyBase64();
  return {
    ...additionalData,
    iv,
    key,
  };
}

export function packDataForPublish(
  data: object,
  encryptionMetadata: EncryptionMetadata
): string {
  const dataBase64 = objectToBase64ForPublish(data);
  const metadataBase64 = objectToBase64ForPublish(encryptionMetadata);
  return JSON.stringify({ data: dataBase64, metadata: metadataBase64 });
}

export function unpackDataFromPublish(encryptedString: string): {
  data: object;
  metadata: EncryptionMetadata;
} {
  const parsed = JSON.parse(encryptedString);
  return {
    data: base64ToObjectFromPublish(parsed.data),
    metadata: base64ToObjectFromPublish(parsed.metadata) as EncryptionMetadata,
  };
}
