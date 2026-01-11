import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryTransaction,
  base64ToUint8Array,
  uint8ArrayToObject,
  base64ToObject,
  createIvAndKey,
  createIvAndKeyBase64,
  objectToBase64ForPublish,
  base64ToObjectFromPublish,
  createEncryptionMetadataBase64,
  packDataForPublish,
  unpackDataFromPublish,
  EncryptionMetadata,
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

  describe('objectToBase64ForPublish', () => {
    it('should convert object to base64 UTF8 string', () => {
      const obj = { name: 'John', age: 30 };

      const result = objectToBase64ForPublish(obj);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle UTF8 characters', () => {
      const obj = { message: 'Hello 世界 🌍' };

      const result = objectToBase64ForPublish(obj);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle complex objects', () => {
      const obj = {
        user: { name: 'Jane', age: 25 },
        items: [1, 2, 3],
      };

      const result = objectToBase64ForPublish(obj);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it('should create encryption metadata with IV and key', () => {
    const result = createEncryptionMetadataBase64();

    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('key');
    expect(typeof result.iv).toBe('string');
    expect(typeof result.key).toBe('string');
  });

  it('should include additional data when provided', () => {
    const additionalData = { author: 'Alice', timestamp: 1234567890 };

    const result = createEncryptionMetadataBase64(additionalData);

    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('author');
    expect(result).toHaveProperty('timestamp');
    expect(result.author).toBe('Alice');
    expect(result.timestamp).toBe(1234567890);
  });

  it('should create unique values each time', () => {
    const result1 = createEncryptionMetadataBase64();
    const result2 = createEncryptionMetadataBase64();

    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.key).not.toBe(result2.key);
  });

  it('should merge additional data without overriding iv and key', () => {
    const additionalData = {
      iv: 'custom-iv',
      key: 'custom-key',
      extra: 'data',
    };

    const result = createEncryptionMetadataBase64(additionalData);

    // IV and key should be generated, not use the custom values
    expect(result.iv).not.toBe('custom-iv');
    expect(result.key).not.toBe('custom-key');
    expect(result.extra).toBe('data');
  });
});

describe('encryptDataForPublish', () => {
  it('should encrypt data and metadata into JSON string', () => {
    const data = { message: 'Secret message' };
    const metadata = createEncryptionMetadataBase64();

    const result = packDataForPublish(data, metadata);

    expect(typeof result).toBe('string');

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('data');
    expect(parsed).toHaveProperty('metadata');
    expect(typeof parsed.data).toBe('string');
    expect(typeof parsed.metadata).toBe('string');
  });

  it('should handle UTF8 characters in data', () => {
    const data = { message: 'Hello 世界 🌍' };
    const metadata = createEncryptionMetadataBase64({ author: 'Alice' });

    const result = packDataForPublish(data, metadata);

    expect(typeof result).toBe('string');

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('data');
    expect(parsed).toHaveProperty('metadata');
  });

  it('should handle complex data structures', () => {
    const data = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      config: { enabled: true },
    };
    const metadata = createEncryptionMetadataBase64();

    const result = packDataForPublish(data, metadata);

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('data');
    expect(parsed).toHaveProperty('metadata');
  });
});

describe('decryptDataFromPublish', () => {
  it('should decrypt data and metadata from encrypted string', () => {
    const originalData = { message: 'Secret message' };
    const originalMetadata = createEncryptionMetadataBase64();
    const encrypted = packDataForPublish(originalData, originalMetadata);

    const result = unpackDataFromPublish(encrypted);

    expect(result.data).toEqual(originalData);
    expect(result.metadata.iv).toBe(originalMetadata.iv);
    expect(result.metadata.key).toBe(originalMetadata.key);
  });

  it('should handle UTF8 characters in roundtrip', () => {
    const originalData = { message: 'Hello 世界 🌍 Café ñoño' };
    const originalMetadata = createEncryptionMetadataBase64({ author: 'José' });
    const encrypted = packDataForPublish(originalData, originalMetadata);

    const result = unpackDataFromPublish(encrypted);

    expect(result.data).toEqual(originalData);
    expect(result.metadata.iv).toBe(originalMetadata.iv);
    expect(result.metadata.key).toBe(originalMetadata.key);
    expect(result.metadata.author).toBe('José');
  });

  it('should handle complex data structures in roundtrip', () => {
    const originalData = {
      users: [
        { id: 1, name: 'Alice', tags: ['admin', 'user'] },
        { id: 2, name: 'Bob', tags: ['user'] },
      ],
      config: { enabled: true, settings: { theme: 'dark' } },
    };
    const originalMetadata = createEncryptionMetadataBase64({
      version: '1.0',
      timestamp: Date.now(),
    });
    const encrypted = packDataForPublish(originalData, originalMetadata);

    const result = unpackDataFromPublish(encrypted);

    expect(result.data).toEqual(originalData);
    expect(result.metadata.iv).toBe(originalMetadata.iv);
    expect(result.metadata.key).toBe(originalMetadata.key);
    expect(result.metadata.version).toBe('1.0');
  });

  it('should preserve additional metadata fields', () => {
    const data = { value: 42 };
    const metadata = createEncryptionMetadataBase64({
      author: 'Alice',
      timestamp: 1234567890,
      version: '2.0',
    });
    const encrypted = packDataForPublish(data, metadata);

    const result = unpackDataFromPublish(encrypted);

    expect(result.metadata.author).toBe('Alice');
    expect(result.metadata.timestamp).toBe(1234567890);
    expect(result.metadata.version).toBe('2.0');
  });
});

describe('integration tests', () => {
  it('should handle full publish workflow with UTF8 data', () => {
    // Create data to publish
    const publishData = {
      title: 'Article Title 文章标题',
      content: 'Content with émojis 🎉 and spëcial chars',
      author: 'José García',
    };

    // Create encryption metadata
    const encryptionMetadata = createEncryptionMetadataBase64({
      publishedAt: '2024-01-11',
      version: '1.0',
    });

    // Encrypt for publishing
    const encrypted = packDataForPublish(publishData, encryptionMetadata);

    // Decrypt
    const decrypted = unpackDataFromPublish(encrypted);

    // Verify roundtrip
    expect(decrypted.data).toEqual(publishData);
    expect(decrypted.metadata.iv).toBe(encryptionMetadata.iv);
    expect(decrypted.metadata.key).toBe(encryptionMetadata.key);
    expect(decrypted.metadata.publishedAt).toBe('2024-01-11');
    expect(decrypted.metadata.version).toBe('1.0');
  });

  it('should maintain data integrity through multiple roundtrips', () => {
    const original = { value: 'test 测试 🔒' };
    const metadata1 = createEncryptionMetadataBase64();

    const encrypted1 = packDataForPublish(original, metadata1);
    const decrypted1 = unpackDataFromPublish(encrypted1);

    const metadata2 = createEncryptionMetadataBase64();
    const encrypted2 = packDataForPublish(decrypted1.data, metadata2);
    const decrypted2 = unpackDataFromPublish(encrypted2);

    expect(decrypted2.data).toEqual(original);
  });
});
