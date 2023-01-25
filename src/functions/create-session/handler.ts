import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { authenticationService } from "src/database/services";
import { generateToken, parseBasicAuth, parseBearerAuth } from "@libs/auth-utils";
import { generateExpiryTimestamp, validateTimestamp } from "@libs/date-utils";
import { v4 as uuid } from "uuid";

/**
 * Lambda for creating Authentication session
 *
 * @param event event
 */
const createAuthenticationSession: ValidatedEventAPIGatewayProxyEvent<any> = async (event) => {
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
  }

  if (isBearerAuth) {
    const token = parseBearerAuth(authHeader!);
    if (!token) {
      return {
        statusCode: 401,
        body: "Unauthorized"
      };
    }

    const foundSession = await authenticationService.findSession(token);
    if (!foundSession) {
      return {
        statusCode: 401,
        body: "Unauthorized"
      };
    }

    if (!validateTimestamp(foundSession.expiresAt)) {
      await authenticationService.deleteSession(foundSession.token);

      return {
        statusCode: 401,
        body: "Unauthorized"
      }
    }

    const tokenExpiry: number = generateExpiryTimestamp();

    const refreshedSession = await authenticationService.updateSession({
      ...foundSession,
      expiresAt: tokenExpiry
    });

    const responseToken = {
      token: refreshedSession.token,
      expiry: refreshedSession.expiresAt
    };

    return {
      statusCode: 201,
      body: JSON.stringify(responseToken)
    }
  }

  if (isBasicAuth) {
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
      id: uuid(),
      username: auth.username,
      password: auth.password,
      token: token,
      expiresAt: tokenExpiry
    });

    const responseToken = {
      token: authenticationToken.token,
      expiry: authenticationToken.expiresAt
    }

    return {
      statusCode: 201,
      body: JSON.stringify(responseToken)
    };
  }

  return {
    statusCode: 400,
    body:"Bad request"
  }
};

export const main = middyfy(createAuthenticationSession);