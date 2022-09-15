import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { parseBasicAuth } from '@libs/auth-utils';
import { middyfy } from '@libs/lambda';
import { getElastic } from 'src/elastic';
import { scheduledCrawlService } from "../../../database/services";

/**
 * Lambda for deleting scheduled crawls
 * 
 * @param event event
 */
const deleteScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
  const { pathParameters: { id }, headers: { Authorization, authorization } } = event;

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
    statusCode: 200,
    body: "ok"
  };
};

export const main = middyfy(deleteScheduledCrawl);
