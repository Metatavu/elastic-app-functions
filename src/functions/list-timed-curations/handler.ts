import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { timedCurationsService } from "src/database/services";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";

/**
 * Lambda for listing timed curations
 *
 * @param event event
 */
const listTimedCurations: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
  const { headers: { authorization, Authorization } } = event;
  const authHeader = Authorization || authorization;

  const auth = await getElasticCredentialsForSession(authHeader);
  if (!auth) {
    return returnUnauthorized();
  }

  const elastic = getElastic(auth);
  if (!(await elastic.hasCurationsAccess())) {
    return returnForbidden();
  }

  const timedCurations = await timedCurationsService.listTimedCurations();

  return {
    statusCode: 200,
    body: JSON.stringify(timedCurations)
  };
};

export const main = middyfy(listTimedCurations);
