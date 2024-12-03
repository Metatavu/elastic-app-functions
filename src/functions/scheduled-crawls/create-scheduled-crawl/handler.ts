import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { ScheduledCrawl, scheduledCrawlSchema } from "src/schema/scheduled-crawl";
import { scheduledCrawlService } from "src/database/services";
import { v4 as uuid } from "uuid";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import { getElastic } from "src/elastic";
import { scheduledCrawlDtoToEntity, scheduledCrawlEntityToDto } from "../scheduled-crawl-translator";

/**
 * Lambda for creating scheduled crawl
 *
 * @param event event
 */
const createScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<typeof scheduledCrawlSchema> = async (event) => {
  const { body, headers } = event;
  const { Authorization, authorization } = headers;
  const authHeader = Authorization || authorization;

  const auth = await getElasticCredentialsForSession(authHeader);
  if (!auth) return returnUnauthorized();

  const elastic = getElastic(auth);
  if (!(await elastic.hasScheduledCrawlAccess())) return returnForbidden();

  let payload: ScheduledCrawl;
  try {
    payload = scheduledCrawlDtoToEntity(body);
  } catch (error) {
    console.error("Error parsing request body", error);
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

  const createdScheduledCrawl = await scheduledCrawlService.createScheduledCrawl({
    ...payload,
    id: uuid(),
  });

  return {
    statusCode: 200,
    body: JSON.stringify(scheduledCrawlEntityToDto(createdScheduledCrawl))
  };
};

export const main = middyfy(createScheduledCrawl);
