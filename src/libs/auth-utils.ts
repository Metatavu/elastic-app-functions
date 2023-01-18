import { v4 as uuid } from "uuid";
import { SHA256 } from 'crypto-js';

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
export const parseBearerAuth = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader?.toLocaleLowerCase().startsWith("bearer ")) {
    return null;
  }

  const buffer = Buffer.from(authorizationHeader.substring(7), "base64");
  const token = buffer.toString();

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