import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { scheduledCrawlService } from "src/database/services";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import { scheduledCrawlEntityToDto } from "../scheduled-crawl-translator";

/**
 * Lambda for listing scheduled crawls
 *
 * @param event event
 */
const listScheduledCrawls: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
  const { headers: { authorization, Authorization } } = event;
  const authHeader = Authorization || authorization;

  const auth = await getElasticCredentialsForSession(authHeader);
  if (!auth) return returnUnauthorized();

  const elastic = getElastic(auth);
  if (!(await elastic.hasScheduledCrawlAccess())) return returnForbidden();

  const scheduledCrawls = await scheduledCrawlService.listScheduledCrawls();

  return {
    statusCode: 200,
    body: JSON.stringify(scheduledCrawls.map(scheduledCrawlEntityToDto))
  };
};

export const main = middyfy(listScheduledCrawls);
