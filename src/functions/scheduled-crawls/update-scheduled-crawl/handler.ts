import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { parseBasicAuth } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { scheduledCrawlService } from "src/database/services";
import scheduledCrawlsSchema from "src/schema/scheduled-crawl";

/**
 * Lambda for updating scheduled crawls
 *
 * @param event event
 */
const updateScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<typeof scheduledCrawlsSchema> = async event => {
  const { pathParameters, body, headers } = event;
  const { authorization, Authorization } = headers;
  const { name, previousCrawlId, seedURLs, frequency } = body;
  const id = pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

  const auth = parseBasicAuth(authorization || Authorization);
  if (!auth) {
    return {
      statusCode: 401,
      body: "Unauthorized"
    };
  }

  const elastic = getElastic(auth);
  if (!(await elastic.hasScheduledCrawlAccess())) {
    return {
      statusCode: 403,
      body: "Forbidden"
    };
  }

  const scheduledCrawl = await scheduledCrawlService.findScheduledCrawl(id);
  if (!scheduledCrawl) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }

  const updatedScheduledCrawl = await scheduledCrawlService.updateScheduledCrawl({
    ...scheduledCrawl,
    name: name,
    previousCrawlId: previousCrawlId,
    seedURLs: seedURLs,
    frequency: frequency,
  });

  const responseUpdatedScheduledCrawl = {
    id: updatedScheduledCrawl.id,
    name: updatedScheduledCrawl.name,
    seedURLs: updatedScheduledCrawl.seedURLs,
    frequency: updatedScheduledCrawl.frequency,
  };

  return {
    statusCode: 200,
    body: JSON.stringify(responseUpdatedScheduledCrawl)
  };
};

export const main = middyfy(updateScheduledCrawl);