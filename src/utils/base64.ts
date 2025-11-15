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
      if (typeof dataUrl === "string") {
        resolve(dataUrl.split(",")[1]);
      } else {
        reject(new Error("Invalid data URL"));
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

export function objectToBase64(obj: object): Promise<string> {
  // Step 1: Convert the object to a JSON string
  const jsonString = JSON.stringify(obj);
  // Step 2: Create a Blob from the JSON string
  const blob = new Blob([jsonString], { type: "application/json" });
  // Step 3: Create a FileReader to read the Blob as a base64-encoded string
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Remove 'data:application/json;base64,' prefix
        const base64 = reader.result.replace(
          "data:application/json;base64,",
          "",
        );
        resolve(base64);
      } else {
        reject(new Error("Failed to read the Blob as a base64-encoded string"));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsDataURL(blob);
  });
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

export function uint8ArrayToBase64(uint8Array: Uint8Array) {
  const length = uint8Array.length;
  let binaryString = "";
  const chunkSize = 1024 * 1024; // Process 1MB at a time
  for (let i = 0; i < length; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, length);
    const chunk = uint8Array.subarray(i, chunkEnd);
    binaryString += Array.from(chunk, (byte) => String.fromCharCode(byte)).join(
      "",
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
  mimeType = "text/vtt",
): string => {
  const cleanedBase64 =
    base64.length % 4 === 0
      ? base64
      : base64 + "=".repeat(4 - (base64.length % 4));

  try {
    const binary = atob(cleanedBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("Failed to decode base64:", err);
    return "";
  }
};
