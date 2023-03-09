import createDynamoDBClient from "../client";
import CurationService from "./curations";
import ScheduledCrawl from "./scheduled-crawl";
import AuthenticationService from "./authentication";
import DocumentService from "./documents";

export const curationsService = new CurationService(createDynamoDBClient());
export const scheduledCrawlService = new ScheduledCrawl(createDynamoDBClient());
export const authenticationService = new AuthenticationService(createDynamoDBClient());
export const documentService = new DocumentService(createDynamoDBClient());