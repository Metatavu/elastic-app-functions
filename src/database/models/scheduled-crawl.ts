/**
 * DynamoDB model for scheduled crawl
 */
interface ScheduledCrawl {
  id: string;
  previousCrawlId: string;
  name: string;
  seedURLs: string[];
  frequency: number;
}

export default ScheduledCrawl;