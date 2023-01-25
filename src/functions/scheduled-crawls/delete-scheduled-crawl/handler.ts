import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { scheduledCrawlService } from "src/database/services";

/**
 * Lambda for deleting scheduled crawls
 *
 * @param event event
 */
const deleteScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
  const { pathParameters, headers: { Authorization, authorization } } = event;
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
  if (scheduledCrawl) {
    await scheduledCrawlService.deleteScheduledCrawl(id);
  } else {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }

  return {
    statusCode: 204,
    body: ""
  };
};

export const main = middyfy(deleteScheduledCrawl);
