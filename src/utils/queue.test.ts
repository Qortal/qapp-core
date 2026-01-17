import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestQueueWithPromise, retryTransaction } from './queue';

describe('queue utility functions', () => {
  describe('RequestQueueWithPromise', () => {
    it('should process a single request', async () => {
      const queue = new RequestQueueWithPromise();
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await queue.enqueue(mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should process multiple requests', async () => {
      const queue = new RequestQueueWithPromise();
      const results: number[] = [];

      const promise1 = queue.enqueue(async () => {
        results.push(1);
        return 1;
      });
      const promise2 = queue.enqueue(async () => {
        results.push(2);
        return 2;
      });
      const promise3 = queue.enqueue(async () => {
        results.push(3);
        return 3;
      });

      const allResults = await Promise.all([promise1, promise2, promise3]);

      expect(allResults).toEqual([1, 2, 3]);
      expect(results).toEqual([1, 2, 3]);
    });

    it('should respect max concurrent limit', async () => {
      const queue = new RequestQueueWithPromise(2);
      let concurrent = 0;
      let maxConcurrent = 0;

      const createRequest = (id: number) => async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrent--;
        return id;
      };

      const promises = [
        queue.enqueue(createRequest(1)),
        queue.enqueue(createRequest(2)),
        queue.enqueue(createRequest(3)),
        queue.enqueue(createRequest(4)),
      ];

      await Promise.all(promises);

      expect(maxConcurrent).toBe(2);
    });

    it('should handle request errors without affecting other requests', async () => {
      const queue = new RequestQueueWithPromise();

      const promise1 = queue.enqueue(async () => 'success1');
      const promise2 = queue.enqueue(async () => {
        throw new Error('test error');
      });
      const promise3 = queue.enqueue(async () => 'success2');

      const result1 = await promise1;
      await expect(promise2).rejects.toThrow('test error');
      const result3 = await promise3;

      expect(result1).toBe('success1');
      expect(result3).toBe('success2');
    });

    it('should pause and resume processing', async () => {
      const queue = new RequestQueueWithPromise(1);
      const executionOrder: number[] = [];

      queue.enqueue(async () => {
        executionOrder.push(1);
        return 1;
      });

      // Wait for first request to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      queue.pause();

      const promise2 = queue.enqueue(async () => {
        executionOrder.push(2);
        return 2;
      });

      // Give some time to verify it's paused
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should only have processed first request
      expect(executionOrder).toEqual([1]);

      queue.resume();

      await promise2;

      expect(executionOrder).toEqual([1, 2]);
    });

    it('should clear pending requests', async () => {
      const queue = new RequestQueueWithPromise(1);
      const executionOrder: number[] = [];

      // First request - will execute
      const promise1 = queue.enqueue(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        executionOrder.push(1);
        return 1;
      });

      // These should be cleared
      queue.enqueue(async () => {
        executionOrder.push(2);
        return 2;
      });
      queue.enqueue(async () => {
        executionOrder.push(3);
        return 3;
      });

      // Clear while first is processing
      queue.clear();

      await promise1;

      // Give time for any remaining to execute (they shouldn't)
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(executionOrder).toEqual([1]);
    });

    it('should use default maxConcurrent of 5', async () => {
      const queue = new RequestQueueWithPromise();
      let concurrent = 0;
      let maxConcurrent = 0;

      const createRequest = () => async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrent--;
        return true;
      };

      const promises = Array(10)
        .fill(null)
        .map(() => queue.enqueue(createRequest()));

      await Promise.all(promises);

      expect(maxConcurrent).toBe(5);
    });
  });

  describe('retryTransaction', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await retryTransaction(mockFn, ['arg1'], false, 3);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      const promise = retryTransaction(mockFn, [], false, 3);

      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should return null after max retries when throwError is false', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('always fails'));

      const promise = retryTransaction(mockFn, [], false, 3);

      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;

      expect(result).toBe(null);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries when throwError is true', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('always fails'));

      const promise = retryTransaction(mockFn, [], true, 3);
      promise.catch(() => {}); // Prevent unhandled rejection

      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow('always fails');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should pass multiple arguments to function', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      await retryTransaction(mockFn, ['arg1', 'arg2', 'arg3'], false, 3);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should handle non-Error exceptions', async () => {
      const mockFn = vi.fn().mockRejectedValue('string error');

      const promise = retryTransaction(mockFn, [], true, 2);
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(10000);
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow('Unable to process transaction');
    });

    it('should wait 10 seconds between retries', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const promise = retryTransaction(mockFn, [], false, 2);

      // Should have called once immediately
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Advance less than 10 seconds - should not retry yet
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Advance to 10 seconds - should retry
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      await promise;
    });
  });
});
