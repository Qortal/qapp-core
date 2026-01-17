import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryTransaction,
  base64ToUint8Array,
  uint8ArrayToObject,
  base64ToObject,
  createIvAndKey,
  createIvAndKeyBase64,
} from './publish';

describe('publish utility functions', () => {
  describe('retryTransaction', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const args = ['arg1', 'arg2'];

      const result = await retryTransaction(mockFn, args, false);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      const args = ['test'];

      const promise = retryTransaction(mockFn, args, false);

      // Fast-forward through the retry delays
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should return null after max retries when throwError is false', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
      const args = ['test'];

      const promise = retryTransaction(mockFn, args, false, 3);

      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;

      expect(result).toBe(null);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries when throwError is true', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
      const args = ['test'];

      const promise = retryTransaction(mockFn, args, true, 3);

      // Add empty catch to prevent unhandled rejection warning
      promise.catch(() => {});

      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use default max retries of 3', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Fails'));
      const args = ['test'];

      const promise = retryTransaction(mockFn, args, false);

      // Fast-forward through default retry delays
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);

      await promise;

      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('base64ToUint8Array', () => {
    it('should convert base64 string to Uint8Array', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"

      const result = base64ToUint8Array(base64);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should correctly decode known base64', () => {
      const base64 = 'AQIDBA=='; // [1, 2, 3, 4]

      const result = base64ToUint8Array(base64);

      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });

    it('should handle empty base64 string', () => {
      const base64 = '';

      const result = base64ToUint8Array(base64);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
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

    it('should handle complex objects', () => {
      const obj = {
        nested: { data: 'value' },
        array: [1, 2, 3],
      };
      const jsonString = JSON.stringify(obj);
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonString);

      const result = uint8ArrayToObject(uint8Array);

      expect(result).toEqual(obj);
    });
  });

  describe('base64ToObject', () => {
    it('should convert base64 string to object', () => {
      const encoder = new TextEncoder();
      const jsonString = JSON.stringify({ name: 'Alice', age: 25 });
      const uint8Array = encoder.encode(jsonString);
      const binaryString = Array.from(uint8Array, (byte) =>
        String.fromCharCode(byte)
      ).join('');
      const base64 = btoa(binaryString);

      const result = base64ToObject(base64);

      expect(result).toEqual({ name: 'Alice', age: 25 });
    });
  });

  describe('createIvAndKey', () => {
    it('should create IV and key as Uint8Array', () => {
      const result = createIvAndKey();

      expect(result.iv).toBeInstanceOf(Uint8Array);
      expect(result.key).toBeInstanceOf(Uint8Array);
    });

    it('should create IV with 16 bytes', () => {
      const result = createIvAndKey();

      expect(result.iv.length).toBe(16);
    });

    it('should create key with 32 bytes', () => {
      const result = createIvAndKey();

      expect(result.key.length).toBe(32);
    });

    it('should generate different values each time', () => {
      const result1 = createIvAndKey();
      const result2 = createIvAndKey();

      expect(Array.from(result1.iv)).not.toEqual(Array.from(result2.iv));
      expect(Array.from(result1.key)).not.toEqual(Array.from(result2.key));
    });
  });

  describe('createIvAndKeyBase64', () => {
    it('should create IV and key as base64 strings', () => {
      const result = createIvAndKeyBase64();

      expect(typeof result.iv).toBe('string');
      expect(typeof result.key).toBe('string');
    });

    it('should create valid base64 strings', () => {
      const result = createIvAndKeyBase64();

      expect(result.iv.length).toBeGreaterThan(0);
      expect(result.key.length).toBeGreaterThan(0);

      // Should be valid base64 (can be decoded)
      expect(() => atob(result.iv)).not.toThrow();
      expect(() => atob(result.key)).not.toThrow();
    });

    it('should generate different values each time', () => {
      const result1 = createIvAndKeyBase64();
      const result2 = createIvAndKeyBase64();

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.key).not.toBe(result2.key);
    });
  });
});
