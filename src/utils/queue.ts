type RequestFunction<T> = () => Promise<T>;

interface QueueItem<T> {
  request: RequestFunction<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export class RequestQueueWithPromise<T = any> {
  private queue: QueueItem<T>[] = [];
  private maxConcurrent: number;
  private currentlyProcessing: number = 0;
  private isPaused: boolean = false;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  // Add a request to the queue and return a promise
  enqueue(request: RequestFunction<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.process();
    });
  }

  // Process requests in the queue
  private async process(): Promise<void> {
    // Process requests only if the queue is not paused
    if (this.isPaused) return;

    while (
      this.queue.length > 0 &&
      this.currentlyProcessing < this.maxConcurrent
    ) {
      this.currentlyProcessing++;

      const { request, resolve, reject } = this.queue.shift()!; // Non-null assertion because length > 0

      try {
        const response = await request();
        resolve(response);
      } catch (error) {
        reject(error);
      } finally {
        this.currentlyProcessing--;
        await this.process(); // Continue processing the queue
      }
    }
  }

  // Pause the queue processing
  pause(): void {
    this.isPaused = true;
  }

  // Resume the queue processing
  resume(): void {
    this.isPaused = false;
    this.process(); // Continue processing when resumed
  }

  // Clear pending requests in the queue
  clear(): void {
    this.queue.length = 0;
  }
}

export async function retryTransaction<T>(
  fn: (...args: any[]) => Promise<T>,
  args: any[],
  throwError: boolean,
  retries: number,
): Promise<T | null> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
      } else {
        console.error(`Attempt ${attempt + 1} failed: Unknown error`);
      }

      attempt++;
      if (attempt === retries) {
        console.error("Max retries reached. Skipping transaction.");
        if (throwError) {
          throw new Error(
            error instanceof Error
              ? error.message
              : "Unable to process transaction",
          );
        } else {
          return null;
        }
      }
      await new Promise((res) => setTimeout(res, 10000));
    }
  }
  return null;
}
