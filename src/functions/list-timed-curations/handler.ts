import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { timedCurationsService } from "src/database/services";
import { parseBasicAuth } from "@libs/auth-utils";

/**
 * Lambda for listing timed curations
 *
 * @param event event
 */
const listTimedCurations: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
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

  return {
    statusCode: 200,
    body: JSON.stringify(timedCurations)
  };
};

export const main = middyfy(listTimedCurations);
