import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService, documentService } from "src/database/services";
import { getElasticCredentialsForSession, returnForbidden, returnUnauthorized } from "@libs/auth-utils";
import Document from "src/database/models/document";
import { parseDate } from "@libs/date-utils";
import { Curation } from "src/generated/app-functions-client";

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
    return returnUnauthorized();
  }

  const elastic = getElastic(auth);
  if (!(await elastic.hasCurationsAccess())) {
    return returnForbidden();
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

  const parsedDates = {
    startTime: curation.startTime ? parseDate(curation.startTime) : undefined,
    endTime: curation.endTime ? parseDate(curation.endTime) : undefined
  };

  const combinedResponse: Curation = {
    ...curation,
    startTime: parsedDates.startTime,
    endTime: parsedDates.endTime,
    document: document ? {
      description: document.description,
      title: document.title,
      links: document.links,
      language: document.language
    } : undefined
  };

  return {
    statusCode: 200,
    body: JSON.stringify(combinedResponse)
  };
};

export const main = middyfy(findCuration);