import { Static, TSchema } from "@sinclair/typebox";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from "aws-lambda";

export type ValidatedAPIGatewayProxyEvent<S extends TSchema> = Omit<APIGatewayProxyEvent, "body"> & { body: Static<S> };
export type ValidatedEventAPIGatewayProxyEvent<S extends TSchema> = Handler<ValidatedAPIGatewayProxyEvent<S>, APIGatewayProxyResult>;