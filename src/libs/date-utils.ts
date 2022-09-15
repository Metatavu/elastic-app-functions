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
 * 
 * Calculates the difference between last crawl time and now
 * 
 * @param lastCrawl date of last crawl
 * @returns difference in minutes
 */
export const calculateMinutesPassed = (lastCrawl: string ) => {
  const lastCrawlDate = parseDate(lastCrawl);
  const now = new Date();

  const difference = now.getTime() - lastCrawlDate?.getTime();
  // TODO: +180 accounting for GMT+3, will need improving
  return Math.round(difference / 60000) + 180;
}