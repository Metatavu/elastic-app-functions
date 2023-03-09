import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
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
  const authHeader = Authorization || authorization;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

  const auth = await getElasticCredentialsForSession(authHeader);
  if (!auth) {
    return returnUnauthorized();
  }

  const elastic = getElastic(auth);
  if (!(await elastic.hasScheduledCrawlAccess())) {
    return returnForbidden();
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