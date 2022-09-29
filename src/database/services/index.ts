import createDynamoDBClient from "../client";
import TimedCurationService from "./timed-curations";
import ScheduledCrawl from "./scheduled-crawl";

export const timedCurationsService = new TimedCurationService(createDynamoDBClient());
export const scheduledCrawlService = new ScheduledCrawl(createDynamoDBClient());