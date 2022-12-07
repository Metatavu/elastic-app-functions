import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { parseBasicAuth } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { scheduledCrawlService } from "../../../database/services";

/**
 * Lambda for deleting scheduled crawls
 *
 * @param event event
 */
const deleteScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
  const { pathParameters, headers: { Authorization, authorization } } = event;
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
