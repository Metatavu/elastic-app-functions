import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "../../elastic";
import { timedCurationsService } from "../../database/services";
import { parseBasicAuth } from "@libs/auth-utils";

/**
 * Lambda for find timed curation
 *
 * @param event event
 */
const findTimedCuration: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
  const { pathParameters, headers } = event;
  const { authorization, Authorization } = headers;
  const id = pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

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

  return {
    statusCode: 200,
    body: JSON.stringify(timedCuration)
  };
};

export const main = middyfy(findTimedCuration);
