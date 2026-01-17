import { describe, it, expect, vi } from 'vitest';
import {
  fileToBase64,
  objectToBase64,
  base64ToUint8Array,
  uint8ArrayToBase64,
  uint8ArrayToObject,
  base64ToObject,
  base64ToBlobUrl,
} from './base64';

describe('base64 utility functions', () => {
  describe('fileToBase64', () => {
    it('should convert a File to base64 string', async () => {
      const content = 'Hello, World!';
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], 'test.txt', { type: 'text/plain' });

      const result = await fileToBase64(file);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should convert a Blob to base64 string', async () => {
      const content = 'Test blob content';
      const blob = new Blob([content], { type: 'text/plain' });

      const result = await fileToBase64(blob);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty file', async () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });

      const result = await fileToBase64(file);

      expect(typeof result).toBe('string');
    });

    it('should handle binary data', async () => {
      const binaryData = new Uint8Array([0, 1, 2, 3, 4, 5]);
      const blob = new Blob([binaryData], { type: 'application/octet-stream' });

      const result = await fileToBase64(blob);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('objectToBase64', () => {
    it('should convert a simple object to base64', async () => {
      const obj = { name: 'John', age: 30 };

      const result = await objectToBase64(obj);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should convert an empty object to base64', async () => {
      const obj = {};

      const result = await objectToBase64(obj);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should convert nested objects to base64', async () => {
      const obj = {
        user: {
          name: 'Jane',
          address: {
            city: 'New York',
            zip: '10001',
          },
        },
      };

      const result = await objectToBase64(obj);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should convert arrays to base64', async () => {
      const obj = { items: [1, 2, 3, 4, 5] };

      const result = await objectToBase64(obj);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('base64ToUint8Array', () => {
    it('should convert base64 string to Uint8Array', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"

      const result = base64ToUint8Array(base64);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty base64 string', () => {
      const base64 = '';

      const result = base64ToUint8Array(base64);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    it('should correctly decode known base64', () => {
      const base64 = 'AQIDBA=='; // [1, 2, 3, 4]

      const result = base64ToUint8Array(base64);

      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('uint8ArrayToBase64', () => {
    it('should convert Uint8Array to base64 string', () => {
      const uint8Array = new Uint8Array([1, 2, 3, 4]);

      const result = uint8ArrayToBase64(uint8Array);

      expect(typeof result).toBe('string');
      expect(result).toBe('AQIDBA==');
    });

    it('should handle empty Uint8Array', () => {
      const uint8Array = new Uint8Array([]);

      const result = uint8ArrayToBase64(uint8Array);

      expect(typeof result).toBe('string');
      expect(result).toBe('');
    });

    it('should handle large Uint8Array', () => {
      const size = 2 * 1024 * 1024; // 2MB
      const uint8Array = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        uint8Array[i] = i % 256;
      }

      const result = uint8ArrayToBase64(uint8Array);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should roundtrip with base64ToUint8Array', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50]);

      const base64 = uint8ArrayToBase64(original);
      const result = base64ToUint8Array(base64);

      expect(Array.from(result)).toEqual(Array.from(original));
    });
  });

  describe('uint8ArrayToObject', () => {
    it('should convert Uint8Array to object', () => {
      const obj = { name: 'Test', value: 123 };
      const jsonString = JSON.stringify(obj);
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonString);

      const result = uint8ArrayToObject(uint8Array);

      expect(result).toEqual(obj);
    });

    it('should handle UTF8 in Uint8Array', () => {
      const obj = { message: 'Hello 世界' };
      const jsonString = JSON.stringify(obj);
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonString);

      const result = uint8ArrayToObject(uint8Array);

      expect(result).toEqual(obj);
    });
  });

  describe('base64ToObject', () => {
    it('should convert base64 string to object', () => {
      const original = { name: 'Alice', age: 25 };
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(JSON.stringify(original));
      const binaryString = Array.from(uint8Array, (byte) =>
        String.fromCharCode(byte)
      ).join('');
      const base64 = btoa(binaryString);

      const result = base64ToObject(base64);

      expect(result).toEqual(original);
    });

    it('should handle complex objects', () => {
      const original = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        metadata: {
          count: 2,
        },
      };
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(JSON.stringify(original));
      const binaryString = Array.from(uint8Array, (byte) =>
        String.fromCharCode(byte)
      ).join('');
      const base64 = btoa(binaryString);

      const result = base64ToObject(base64);

      expect(result).toEqual(original);
    });
  });

  describe('base64ToBlobUrl', () => {
    it('should convert base64 to blob URL with default mime type', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"

      const result = base64ToBlobUrl(base64);

      expect(typeof result).toBe('string');
      expect(result.startsWith('blob:')).toBe(true);
    });

    it('should convert base64 to blob URL with custom mime type', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const mimeType = 'text/plain';

      const result = base64ToBlobUrl(base64, mimeType);

      expect(typeof result).toBe('string');
      expect(result.startsWith('blob:')).toBe(true);
    });

    it('should handle base64 without padding', () => {
      const base64 = 'SGVsbG8'; // Missing padding

      const result = base64ToBlobUrl(base64);

      expect(typeof result).toBe('string');
      expect(result.startsWith('blob:')).toBe(true);
    });

    it('should handle empty base64 string', () => {
      const base64 = '';

      const result = base64ToBlobUrl(base64);

      expect(typeof result).toBe('string');
    });

    it('should handle invalid base64 gracefully', () => {
      const invalidBase64 = '!!!invalid!!!';

      const result = base64ToBlobUrl(invalidBase64);

      expect(typeof result).toBe('string');
      expect(result).toBe('');
    });

    it('should handle different mime types', () => {
      const base64 = 'SGVsbG8gV29ybGQ=';
      const mimeTypes = ['application/json', 'image/png', 'video/mp4'];

      mimeTypes.forEach((mimeType) => {
        const result = base64ToBlobUrl(base64, mimeType);
        expect(typeof result).toBe('string');
        expect(result.startsWith('blob:')).toBe(true);
      });
    });
  });

  describe('integration tests', () => {
    it('should handle full roundtrip: Uint8Array -> base64 -> Uint8Array', () => {
      const original = new Uint8Array([0, 50, 100, 150, 200, 255]);

      const base64 = uint8ArrayToBase64(original);
      const recovered = base64ToUint8Array(base64);

      expect(Array.from(recovered)).toEqual(Array.from(original));
    });
  });
});
