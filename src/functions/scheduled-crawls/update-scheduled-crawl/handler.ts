import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { scheduledCrawlService } from "src/database/services";
import { ScheduledCrawl, scheduledCrawlSchema } from "src/schema/scheduled-crawl";
import { scheduledCrawlDtoToEntity, scheduledCrawlEntityToDto } from "../scheduled-crawl-translator";

/**
 * Lambda for updating scheduled crawls
 *
 * @param event event
 */
const updateScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<typeof scheduledCrawlSchema> = async event => {
  const { pathParameters, body, headers, requestContext: { requestTimeEpoch } } = event;
  const { authorization, Authorization } = headers;
  const idFromPath = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!idFromPath) {
    console.error("No id in path");
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

  const auth = await getElasticCredentialsForSession(authHeader);
  if (!auth) return returnUnauthorized();

  const elastic = getElastic(auth);
  if (!(await elastic.hasScheduledCrawlAccess())) return returnForbidden();

  const scheduledCrawl = await scheduledCrawlService.findScheduledCrawl(idFromPath);
  if (!scheduledCrawl) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }

  let payload: ScheduledCrawl;
  try {
    payload = scheduledCrawlDtoToEntity({
      ...body,
      updatedAt: new Date(requestTimeEpoch).toISOString()
    });
    if (payload.id !== idFromPath) throw new Error("Id in path does not match id in body");
  } catch (error) {
    console.error("Error parsing request body", error);
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

  const updatedScheduledCrawl = await scheduledCrawlService.updateScheduledCrawl({
    ...scheduledCrawl,
    ...payload,
  });

  return {
    statusCode: 200,
    body: JSON.stringify(scheduledCrawlEntityToDto(updatedScheduledCrawl))
  };
};

export const main = middyfy(updateScheduledCrawl);