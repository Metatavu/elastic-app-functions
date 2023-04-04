import PQueue, { Options, QueueAddOptions } from "p-queue";
import PriorityQueue from "p-queue/dist/priority-queue";

/**
 * Options for queue
 */
interface QueueOptions extends Options<PriorityQueue, QueueAddOptions> {
  retryCount?: number;
};

/**
 * Checks if given error is rate limit exceeded error
 *
 * @param error error
 * @returns error is rate limit exceeded error
 */
const isRateExceededError = <T>(error: T): error is (T & { statusCode: 429 }) => {
  return typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 429;
};

/**
 * Queue wrapper for executing given operation
 *
 * If operation fails with 429 status code, pauses queue for 2 seconds to avoid rate limiting.
 *
 * @param queue queue
 * @param operation operation to execute
 * @param attemptsLeft attempts left to retry
 * @param previousError possible error from previous attempt
 * @returns awaited operation
 */
const executeOperation = async <T>(queue: PQueue, operation: () => Promise<T>, attemptsLeft: number, previousError?: unknown): Promise<T> => {
  if (!attemptsLeft) throw Error("Error in queue.", { cause: previousError });

  try {
    return await queue.add(() => operation()) as T;
  } catch (error) {
    if (isRateExceededError(error) && !queue.isPaused) {
      console.log("Rate limit exceeded, pausing queue for 2 seconds.");

      queue.pause();

      setTimeout(() => {
        console.log("Resuming queue.");
        queue.start();
      }, 2000);
    }

    return executeOperation(queue, operation, attemptsLeft - 1, error);
  }
};

/**
 * Runs requests in queue with given concurrency
 *
 * @param requests operations to execute
 * @param options options for queue
 * @returns list of results from given operations
 */
export const runInQueue = async <T>(
  requests: (() => Promise<T>)[],
  options: QueueOptions = {}
) => {
  const {
    retryCount = 5,
    autoStart = true,
    concurrency = 5,
    ...rest
  } = options;

  const queue = new PQueue({ autoStart, concurrency, ...rest });
  const promises = requests.map(operation => executeOperation(queue, operation, retryCount));
  return Promise.allSettled(promises);
};