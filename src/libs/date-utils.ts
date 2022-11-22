import { DateTime } from "luxon";

/**
 * Parses date
 *
 * @param date date as string
 * @returns parsed date
 */
export const parseDate = (date?: string): Date | undefined => {
  if (!date) {
    return null;
  }

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
 export const calculateMinutesPassed = (lastCrawl: string ): number => {
  const parsedCrawlDate = parseDate(lastCrawl).toISOString();
  const lastCrawlDate = DateTime.fromISO(parsedCrawlDate);
  const now = DateTime.now();

  const difference = now.diff(lastCrawlDate, "minutes");

  return difference.toObject().minutes;
};