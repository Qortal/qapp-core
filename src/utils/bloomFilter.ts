import { base64ToObject } from './base64';
import { Buffer } from 'buffer'

// Polyfill Buffer first
if (!(globalThis as any).Buffer) {
  ;(globalThis as any).Buffer = Buffer
}

async function getBloomFilter() {
  const { BloomFilter } = await import('bloom-filters')
  return BloomFilter
}


  
 
  
  export async function generateBloomFilterBase64(values: string[]) {
    const maxItems = 100
    if (values.length > maxItems) {
      throw new Error(`Max ${maxItems} items allowed`)
    }
  
    // Create filter for the expected number of items and desired false positive rate
    const BloomFilter = await getBloomFilter()
    const bloom = BloomFilter.create(values.length, 0.025) // ~0.04% FPR
  
    for (const value of values) {
      bloom.add(value)
    }
  
    // Convert filter to JSON, then to base64
    const json = bloom.saveAsJSON()
    const jsonString = JSON.stringify(json)
    const base64 = Buffer.from(jsonString).toString('base64')
  
    const size = Buffer.byteLength(jsonString)
    if (size > 238) {
      throw new Error(`Bloom filter exceeds 230 bytes: ${size}`)
    }
  
    return base64
  }


export async function isInsideBloom(base64Bloom: string, userPublicKey: string) {
    const base64ToJson = base64ToObject(base64Bloom)
    const BloomFilter = await getBloomFilter()
   const bloom = BloomFilter.fromJSON(base64ToJson)
  
    
    return bloom.has(userPublicKey);
  }
  