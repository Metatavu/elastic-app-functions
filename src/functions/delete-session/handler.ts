import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { authenticationService } from "src/database/services";
import { parseBearerAuth, returnUnauthorized } from "@libs/auth-utils";
import authenticationSchema from "src/schema/authentication";

/**
 * Lambda for deleting Authentication session
 *
 * @param event event
 */
const deleteAuthenticationSession: ValidatedEventAPIGatewayProxyEvent<typeof authenticationSchema> = async (event) => {
  const { headers } = event;
  const { Authorization, authorization } = headers;
  
  if (!authorization || !Authorization) {
    return returnUnauthorized();
  }

  const token = parseBearerAuth(authorization || Authorization);
  if (!token) {
    return returnUnauthorized();
  };

  const authenticationSession = await authenticationService.findSession(token);
  if (authenticationSession) {
    await authenticationService.deleteSession(token);
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

export const main = middyfy(deleteAuthenticationSession);