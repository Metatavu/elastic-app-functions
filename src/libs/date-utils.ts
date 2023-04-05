import { DateTime } from "luxon";
import config from "src/config";

/**
 * Parses date
 *
 * @param date date as string
 * @returns parsed date
 */
export const parseDate = (date: string): Date => {
  return new Date(Date.parse(date));
}

/**
 *
 * Calculates the difference between last crawl time and now
 *
 * @param lastCrawl date of last crawl
 * @returns difference in minutes
 */
export const calculateMinutesPassed = (lastCrawl: string): number => {
  const parsedCrawlDate = parseDate(lastCrawl).toISOString();
  const lastCrawlDate = DateTime.fromISO(parsedCrawlDate);
  const now = DateTime.now();

  const difference = now.diff(lastCrawlDate, "minutes");

  return difference.get("minutes") ?? 0;
};

/**
 * Create a timestamp with expiry
 *
 * @returns Timestamp
 */
export const generateExpiryTimestamp = () => {
  const date = DateTime.now().plus({minutes: config.AUTHENTICATION_EXPIRY_IN_MINS}) as any;
  const timestampInSeconds = Math.floor(date.ts / 1000);

  return timestampInSeconds;
};

/**
 * Compare timestamp with current time
 *
 * @param expiry timestamp
 * @returns boolean value
 */
export const validateTimestamp = (expiry: number) => {
  const nowInMillis = DateTime.now() as any;
  const nowInSeconds = Math.floor(nowInMillis / 1000);

  return expiry > nowInSeconds;
}