import type { AWS } from "@serverless/typescript";

/**
 * AWS function type
 */
export type AWSFunction = Exclude<AWS["functions"], undefined>[string];