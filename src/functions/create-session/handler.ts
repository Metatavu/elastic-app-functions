import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { authenticationService } from "src/database/services";
import { generateToken, parseBasicAuth, parseBearerAuth } from "@libs/auth-utils";
import authenticationSchema from "src/schema/authentication";
import { generateExpiryTimestamp } from "@libs/date-utils";

/**
 * Lambda for creating Authentication session
 *
 * @param event event
 */
const createAuthenticationSession: ValidatedEventAPIGatewayProxyEvent<typeof authenticationSchema> = async (event) => {
  const { headers } = event;
  const { Authorization, authorization } = headers;
  const authHeader = Authorization || authorization;
  const isBasicAuth = authHeader?.toLowerCase()?.startsWith("basic");
  const isBearerAuth = authHeader?.toLowerCase()?.startsWith("bearer");

  if (!isBearerAuth && !isBasicAuth) {
    return {
      statusCode: 401,
      body: "Unauthorized"
    };

  } else if (isBearerAuth) {
    const token = parseBearerAuth(authHeader);
    if (!token) {
      return {
        statusCode: 401,
        body: "Unauthorized"
      };
    }

    const foundSession = await authenticationService.findSession(token);
    if (!foundSession) {
      return {
        statusCode: 404,
        body: "Not found"
      };
    }

    const tokenExpiry: number = generateExpiryTimestamp();

    const refreshedSession = await authenticationService.updateSession({
      ...foundSession,
      expiry: tokenExpiry
    })

    if (!refreshedSession) {
      return {
        statusCode: 404,
        body: "Token not refreshed"
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(refreshedSession.expiry)
    }

  } else {
    const auth = parseBasicAuth(authHeader);

    if (!auth) {
      return {
        statusCode: 401,
        body: "Unauthorized"
      };
    }

    const token: string = generateToken();
    const tokenExpiry: number = generateExpiryTimestamp();

    const authenticationToken = await authenticationService.createSession({
      username: auth.username,
      password: auth.password,
      token: token,
      expiry: tokenExpiry
    });

    const responseToken = {
      token: authenticationToken.token,
      expiry: authenticationToken.expiry,
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseToken)
    };
  }
};

export const main = middyfy(createAuthenticationSession);