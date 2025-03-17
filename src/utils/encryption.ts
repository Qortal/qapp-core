import { Buffer } from "buffer";

export enum EnumCollisionStrength {
    LOW = 8,
    MEDIUM = 11,
    HIGH = 14
  }

export async function hashWord(word: string, collisionStrength: number, publicSalt: string) {
    const saltedWord = publicSalt + word; // Use public salt directly
    const encoded = new TextEncoder().encode(saltedWord);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);

    return Buffer.from(hashBuffer).toString("base64").slice(0, collisionStrength);
}
