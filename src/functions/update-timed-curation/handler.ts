import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { parseBasicAuth } from '@libs/auth-utils';
import { middyfy } from '@libs/lambda';
import { getElastic } from 'src/elastic';
import { timedCurationsService } from "../../database/services";
import schema from '../../schema/timed-curation';

/**
 * Lambda for updating timed curations
 * 
 * @param event event
 */
const updateTimedCuration: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { pathParameters: { id }, body: { queries, promoted, hidden, startTime, endTime}, headers: { authorization, Authorization } } = event;
  
  const auth = parseBasicAuth(authorization || Authorization);
  if (!auth) {
    return {
      statusCode: 401,
      body: "Unauthorized"
    };
  }

  const elastic = getElastic(auth);
  if (!(await elastic.hasCurationsAccess())) {
    return {
      statusCode: 403,
      body: "Forbidden"
    };
  }

  const timedCuration = await timedCurationsService.findTimedCuration(id);
  if (!timedCuration) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }
  
  const updatedCuration = await timedCurationsService.updateTimedCuration({ 
    ...timedCuration,
    "promoted": promoted,
    "hidden": hidden,
    "queries": queries,
    "startTime": startTime,
    "endTime": endTime
  });

  return formatJSONResponse(updatedCuration);
};

export const main = middyfy(updateTimedCuration);
