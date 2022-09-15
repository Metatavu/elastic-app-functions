/**
 * DynamoDB model for scheduled crawl
 */
interface ScheduledCrawl {
  id: string;
  previousCrawlId: string;
  name: string;
  seedURLs: string[];
  frequency: number;
  maxCrawlDepth: number;
}

export default ScheduledCrawl;