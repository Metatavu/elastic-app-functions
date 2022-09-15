/**
 * DynamoDB model for scheduled crawl
 */
interface ScheduledCrawl {
  id: string;
  previousCrawlId: string;
  name: string;
  seedURLs: string[];
  frequency: string;
  maxCrawlDepth: number;
}

export default ScheduledCrawl;