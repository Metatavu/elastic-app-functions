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
 * Parses date object from hel.fi news format
 *
 * @param dateString date string
 * @returns parsed date
 */
export const parseHelFiNewsDate = (dateString: string) => {
  const format = "LLL d, yyyy, h:mm:s a";
  const offsetIndex = dateString.lastIndexOf(" ");
  const datePart = dateString.substring(0, offsetIndex);
  const zonePart = dateString.substring(offsetIndex + 1).replace("GMT", "UTC");
  return DateTime.fromFormat(datePart, format).setZone(zonePart);
};

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
  const timestampInMillis = Math.floor(date.ts / 1000);

  return timestampInMillis;
};

/**
 * Compare timestamp with current time
 *
 * @param expiry timestamp
 * @returns boolean value
 */
export const validateTimestamp = (expiry: number) => {
  const now = DateTime.now() as any;
  return expiry > now;
}