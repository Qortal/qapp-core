import { uint8ArrayToBase64 } from './base64';

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

export function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

export function createIvAndKey() {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = crypto.getRandomValues(new Uint8Array(32));
  return { iv, key };
}

export function createIvAndKeyBase64() {
  const { iv, key } = createIvAndKey();
  return { iv: uint8ArrayToBase64(iv), key: uint8ArrayToBase64(key) };
}
