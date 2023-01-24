import { v4 as uuid } from "uuid";
import { SHA256 } from 'crypto-js';
import { authenticationService } from "src/database/services";
import { validateTimestamp } from "./date-utils";

/**
 * Interface for basic auth username and password pair
 */
export interface BasicAuth {
  username: string;
  password: string;
}

/**
 * Parses basic auth username and password from authentication header
 *
 * @param authorizationHeader authentication header
 * @returns basic auth username and password pair
 */
export const parseBasicAuth = (authorizationHeader?: string): BasicAuth | null => {
  if (!authorizationHeader?.toLocaleLowerCase().startsWith("basic ")) {
    return null;
  }

  const buffer = Buffer.from(authorizationHeader.substring(6), "base64");
  const decoded = buffer.toString();
  const parts = decoded.split(":");

  if (parts.length === 2) {
    return {
      username: parts[0],
      password: parts[1]
    };
  }

  return null;
}

/**
 * Parses bearer auth token from authentication header
 *
 * @param authorizationHeader authentication header
 * @returns bearer auth token
 */
export const parseBearerAuth = (authorizationHeader: string): string | null => {
  const buffer = authorizationHeader.split(" ");
  const token = buffer[1];

  if (token) return token;

  return null;
}

/**
 * Generates an access token
 *
 * @returns token string
 */
export const generateToken = () => {
  return SHA256(uuid()).toString();
}

/**
 * Get elastic credentials for session
 *
 * @param authHeader authorization token
 * @returns BasicAuth for elastic
 */
export const getElasticCredentialsForSession = async (authHeader: string | undefined) => {
  if (!authHeader) {
    return undefined;
  }

  const token = parseBearerAuth(authHeader);
  if (!token) {
    return undefined;
  };

  const authenticationSession = await authenticationService.findSession(token);
  if (!authenticationSession) {
    return undefined;
  }

  const isValid = validateTimestamp(authenticationSession.expiresAt);
  if (!isValid) {
    await authenticationService.deleteSession(authenticationSession.token);

    return undefined;
  }

  const auth: BasicAuth = {
    username: authenticationSession.username,
    password: authenticationSession.password
  };

  return auth;
}