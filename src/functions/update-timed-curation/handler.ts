import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { timedCurationsService } from "src/database/services";
import schema from "src/schema/timed-curation";

/**
 * Lambda for updating timed curations
 *
 * @param event event
 */
const updateTimedCuration: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async event => {
  const { pathParameters, body, headers } = event;
  const { authorization, Authorization } = headers;
  const { queries, promoted, hidden, startTime, endTime } = body;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    }
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

  const updatedCuration = await timedCurationsService.updateTimedCuration({
    ...timedCuration,
    promoted: promoted,
    hidden: hidden,
    queries: queries,
    startTime: startTime,
    endTime: endTime
  });

  return {
    statusCode: 200,
    body: JSON.stringify(updatedCuration)
  };
};

export const main = middyfy(updateTimedCuration);
