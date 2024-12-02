import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { scheduledCrawlService } from "src/database/services";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import { scheduledCrawlEntityToDto } from "../scheduled-crawl-translator";

/**
 * Lambda for find scheduled crawl
 *
 * @param event event
 */
const findScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
  const { pathParameters, headers } = event;
  const { authorization, Authorization } = headers;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

  const auth = await getElasticCredentialsForSession(authHeader);
  if (!auth) return returnUnauthorized();

  const elastic = getElastic(auth);
  if (!(await elastic.hasScheduledCrawlAccess())) return returnForbidden();

  const scheduledCrawl = await scheduledCrawlService.findScheduledCrawl(id);
  if (!scheduledCrawl) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(scheduledCrawlEntityToDto(scheduledCrawl))
  };
};

export const main = middyfy(findScheduledCrawl);
