import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { getElastic } from '../../../elastic';
import { scheduledCrawlService } from "../../../database/services";
import { parseBasicAuth } from '@libs/auth-utils';

/**
 * Lambda for find scheduled crawl
 * 
 * @param event event
 */
const findScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
  const { pathParameters, headers } = event;
  const { id } = pathParameters;
  const { authorization, Authorization } = headers;

  if (!id) {
    return {
      statusCode: 404,
      body: "Not found"
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

export const main = middyfy(findScheduledCrawl);
