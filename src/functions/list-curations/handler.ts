import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService, documentService } from "src/database/services";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import Document from "src/database/models/document";
import { Curation } from "src/generated/app-functions-client";
import { parseDate } from "@libs/date-utils";

/**
 * Lambda for listing curations
 *
 * @param event event
 */
const listCurations: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
  const { headers: { authorization, Authorization } } = event;
  const authHeader = Authorization || authorization;

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

  const curations = await curationsService.listCurations();

  const combinedResponse: Curation[] = await Promise.all(curations.map(async curation => {
    let documentResponse: Document | null = null;
    if (curation.documentId) {
      documentResponse = await documentService.findDocument(curation.documentId);
    }

    const parsedDates = {
      startTime: curation.startTime ? parseDate(curation.startTime) : undefined,
      endTime: curation.endTime ? parseDate(curation.endTime) : undefined
    };

      return {
        ...curation,
        startTime: parsedDates.startTime,
        endTime: parsedDates.endTime,
        document: documentResponse ? {
          description: documentResponse.description,
          title: documentResponse.title,
          links: documentResponse.links,
          language: documentResponse.language
        } : undefined
      };
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(combinedResponse)
  };
};

export const main = middyfy(listCurations);