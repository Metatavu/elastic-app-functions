import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { timedCurationsService } from "src/database/services";

/**
 * Lambda for deleting timed curations
 *
 * @param event event
 */
const deleteTimedCuration: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
  const { pathParameters, headers: { Authorization, authorization } } = event;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!id) return {
    statusCode: 400,
    body: "Bad request"
  }

  const auth = await getElasticCredentialsForSession(authHeader);
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
    statusCode: 204,
    body: ""
  };
};

export const main = middyfy(deleteTimedCuration);
