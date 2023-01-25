import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { timedCurationsService } from "src/database/services";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";

/**
 * Lambda for find timed curation
 *
 * @param event event
 */
const findTimedCuration: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
  const { pathParameters, headers } = event;
  const { authorization, Authorization } = headers;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

  const auth = await getElasticCredentialsForSession(authHeader);
  if (!auth) {
    return returnUnauthorized();
  }

  const elastic = getElastic(auth);
  if (!(await elastic.hasCurationsAccess())) {
    return returnForbidden();
  }

  const timedCuration = await timedCurationsService.findTimedCuration(id);
  if (!timedCuration) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(timedCuration)
  };
};

export const main = middyfy(findTimedCuration);
