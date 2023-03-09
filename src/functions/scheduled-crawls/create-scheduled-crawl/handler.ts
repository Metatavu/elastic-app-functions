import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import scheduledCrawlSchema from "src/schema/scheduled-crawl";
import { scheduledCrawlService } from "src/database/services";
import { v4 as uuid } from "uuid";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import { getElastic } from "src/elastic";

/**
 * Lambda for creating scheduled crawl
 *
 * @param event event
 */
const createScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<typeof scheduledCrawlSchema> = async (event) => {
  const { body, headers } = event;
  const { name, seedURLs, frequency } = body;
  const { Authorization, authorization } = headers;
  const authHeader = Authorization || authorization;

  const auth = await getElasticCredentialsForSession(authHeader);
  if (!auth) {
    return returnUnauthorized();
  }

  const elastic = getElastic(auth);
  if (!(await elastic.hasScheduledCrawlAccess())) {
    return returnForbidden();
  }

  const scheduledCrawl = await scheduledCrawlService.createScheduledCrawl({
    id: uuid(),
    previousCrawlId: "",
    name: name,
    seedURLs: seedURLs,
    frequency: frequency,
  });

  const responseScheduledCrawl = {
    id: scheduledCrawl.id,
    name: scheduledCrawl.name,
    seedURLs: scheduledCrawl.seedURLs,
    frequency: scheduledCrawl.frequency,
  };

  return {
    statusCode: 200,
    body: JSON.stringify(responseScheduledCrawl)
  };
};

export const main = middyfy(createScheduledCrawl);
