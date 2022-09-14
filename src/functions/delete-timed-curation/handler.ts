import { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { parseBasicAuth } from '@libs/auth-utils';
import { middyfy } from '@libs/lambda';
import { getElastic } from 'src/elastic';
import { timedCurationsService } from "../../database/services";

/**
 * Lambda for deleting timed curations
 * 
 * @param event event
 */
const deleteTimedCuration: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
  const { pathParameters: { id }, headers: { Authorization, authorization } } = event;

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
  if (timedCuration) {
    await timedCurationsService.deleteTimedCuration(id);
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

export const main = middyfy(deleteTimedCuration);
