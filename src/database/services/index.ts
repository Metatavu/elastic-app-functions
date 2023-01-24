import createDynamoDBClient from "../client";
import TimedCurationService from "./timed-curations";
import ScheduledCrawl from "./scheduled-crawl";
import AuthenticationService from "./authentication";

export const timedCurationsService = new TimedCurationService(createDynamoDBClient());
export const scheduledCrawlService = new ScheduledCrawl(createDynamoDBClient());
export const authenticationService = new AuthenticationService(createDynamoDBClient());