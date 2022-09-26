import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { parseBasicAuth } from '@libs/auth-utils';
import { middyfy } from '@libs/lambda';
import { getElastic } from 'src/elastic';
import { scheduledCrawlService } from "../../../database/services";
import schema from '../../../schema/scheduled-crawl';

/**
 * Lambda for updating scheduled crawls
 * 
 * @param event event
 */
const updateScheduledCrawl: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { pathParameters, body, headers } = event;
  const { id } = pathParameters;
  const { name, previousCrawlId, seedURLs, frequency } = body;
  const { authorization, Authorization } = headers;
  
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
  
  // TODO: This should not allow updating or return of previousCrawlId
  const updatedScheduledCrawl = await scheduledCrawlService.updateScheduledCrawl({ 
    ...scheduledCrawl,
    name: name,
    previousCrawlId: previousCrawlId,
    seedURLs: seedURLs,
    frequency: frequency,
  });

  return {
    statusCode: 200,
    body: JSON.stringify(updatedScheduledCrawl)
  };
};

export const main = middyfy(updateScheduledCrawl);