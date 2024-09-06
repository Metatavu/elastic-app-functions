import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { authenticationService } from "src/database/services";
import { generateToken, parseBasicAuth, parseBearerAuth, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import { generateExpiryTimestamp, validateTimestamp } from "@libs/date-utils";
import { v4 as uuid } from "uuid";
import { getElastic } from "src/elastic";

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

  if (!(isBearerAuth || isBasicAuth)) {
    console.warn("No authentication header provided");
    return returnUnauthorized();
  }

  if (isBearerAuth) {
    console.info("Bearer auth used");
    const token = parseBearerAuth(authHeader!);
    if (!token) {
      console.warn("Invalid bearer token");
      return returnUnauthorized();
    }

    const foundSession = await authenticationService.findSession(token);
    if (!foundSession) {
      console.warn("No previous session found");
      return returnUnauthorized()
    }

    if (!validateTimestamp(foundSession.expiresAt)) {
      console.warn("session already expired");
      await authenticationService.deleteSession(foundSession.token);

      return returnUnauthorized()
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

    console.info("Session refreshed");
    return {
      statusCode: 201,
      body: JSON.stringify(responseToken)
    }
  }

  if (isBasicAuth) {
    console.warn("Basic auth used");
    const auth = parseBasicAuth(authHeader);
    if (!auth) {
      console.warn("Invalid basic auth provided");
      return returnUnauthorized();
    }

    const elastic = getElastic(auth);
    if (!(await elastic.hasCurationsAccess())) {
      console.warn("User does not have access to curations");
      return returnForbidden();
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

    console.info("Session created");

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