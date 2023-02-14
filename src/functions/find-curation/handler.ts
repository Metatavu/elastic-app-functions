import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService, documentService } from "src/database/services";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { CustomCurationResponse } from "@types";
import Document from "src/database/models/document";

/**
 * Lambda for find curation
 *
 * @param event event
 */
const findCuration: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
  const { pathParameters, headers } = event;
  const { authorization, Authorization } = headers;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    };
  }

  const auth = await getElasticCredentialsForSession(authHeader);
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

  const curation = await curationsService.findCuration(id);
  if (!curation) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }

  let document: Document | null = null;
  if (curation.documentId) {
    document = await documentService.findDocument(curation.documentId);
  }

  const combinedResponse: CustomCurationResponse = { ...curation, ...document };

  return {
    statusCode: 200,
    body: JSON.stringify(combinedResponse)
  };
};

export const main = middyfy(findCuration);