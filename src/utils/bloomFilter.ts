import { BloomFilter } from 'bloom-filters';
import { base64ToObject } from './base64';


export async function hashPublicKey(publicKeyString: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(publicKeyString);
  
    const digest = await crypto.subtle.digest("SHA-256", data);
    const hashBytes = new Uint8Array(digest);
    return Array.from(hashBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  

export async function generateBloomFilterBase64(publicKeys: string[]) {
  if (publicKeys.length > 100) throw new Error("Max 100 users allowed");

  const bloom = BloomFilter.create(100, 0.0004); // ~0.04% FPR

  for (const pk of publicKeys) {
    const hash = await hashPublicKey(pk);
    bloom.add(hash);
  }

  // Serialize to compact form
  const byteArray = new Uint8Array(bloom.saveAsJSON()._data);
  const base64 = btoa(String.fromCharCode(...byteArray));

  if (byteArray.length > 230) {
    throw new Error(`Bloom filter exceeds 230 bytes: ${byteArray.length}`);
  }

  return base64;
}


export async function userCanProbablyDecrypt(base64Bloom: string, userPublicKey: string) {
    const base64ToJson = base64ToObject(base64Bloom)
  
   const bloom = BloomFilter.fromJSON(base64ToJson)
  
    const hash = await hashPublicKey(userPublicKey);
    return bloom.has(hash);
  }
  