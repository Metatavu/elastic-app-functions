import { formatJSONResponse, ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { getElastic } from '../../elastic';
import { timedCurationsService } from "../../database/services";
import { parseBasicAuth } from '@libs/auth-utils';

/**
 * Lambda for listing timed curations
 * 
 * @param event event
 */
const listTimedCurations: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
  const { headers: { authorization, Authorization } } = event;

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

  const timedCurations = await timedCurationsService.listTimedCurations();
  
  return formatJSONResponse(timedCurations);
};

export const main = middyfy(listTimedCurations);
