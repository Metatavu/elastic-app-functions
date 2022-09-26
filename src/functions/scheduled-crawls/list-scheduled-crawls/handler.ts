import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { getElastic } from '../../../elastic';
import { scheduledCrawlService } from "../../../database/services";
import { parseBasicAuth } from '@libs/auth-utils';

/**
 * Lambda for listing scheduled crawls
 * 
 * @param event event
 */
const listScheduledCrawls: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
  const { headers: { authorization, Authorization } } = event;

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

  // TODO: This should not return previousCrawlId.
  const scheduledCrawls = await scheduledCrawlService.listScheduledCrawls();

  const responseScheduledCrawls = scheduledCrawls.map(row => (
    {
      id: row.id,
      name: row.name,
      seedURLs: row.seedURLs,
      frequency: row.frequency,
    }
  ));
  
  return {
    statusCode: 200,
    body: JSON.stringify(responseScheduledCrawls)
  };
};

export const main = middyfy(listScheduledCrawls);
