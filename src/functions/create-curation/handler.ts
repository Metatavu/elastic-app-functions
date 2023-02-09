import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import schema from "src/schema/curation";
import { documentService, curationsService } from "src/database/services";
import { v4 as uuid } from "uuid";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { getElastic } from "src/elastic";
import { CurationType, CustomCurationResponse } from "@types";
import { validateDocumentIds } from "@libs/curation-utils";
import { parseDate } from "@libs/date-utils";

/**
 * Lambda for creating custom and standard curations
 *
 * @param event event
 */
const createCuration: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async event => {
  const { body, headers } = event;
  const {
    queries,
    promoted,
    hidden,
    startTime,
    endTime,
    title,
    description,
    links,
    language,
    curationType
  } = body;
  const { Authorization, authorization } = headers;
  const authHeader = Authorization || authorization;

  const hasDocumentAttributes = !!(title && description && links && language);
  if (curationType === CurationType.CUSTOM && !hasDocumentAttributes) {
    return {
      statusCode: 400,
      body: "Bad request, missing document values"
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

  const curationId = uuid();
  let newDocumentId: string | undefined = undefined;
  let elasticCurationId = "";
  let response: CustomCurationResponse = {};
  const now = new Date();

  if (curationType === CurationType.CUSTOM && hasDocumentAttributes) {
    newDocumentId = uuid();
    promoted.push(newDocumentId);

    const document = await documentService.createDocument({
      id: newDocumentId,
      title: title,
      description: description,
      links: links,
      language: language,
      curationId: curationId
    });
    if (!document) {
      return {
        statusCode: 500,
        body: "Failed to create document record"
      }
    }
    response.document = document;
  }

  if (!startTime && (!endTime || parseDate(endTime) > now)) {
    try {
      if (curationType === CurationType.CUSTOM) {
        await elastic.updateDocuments({
          documents: [{
            id: newDocumentId,
            title: title,
            description: description,
            links: links,
            language: language,
          }]
        });
      }

      elasticCurationId = await elastic.createCuration({
        curation: {
          queries: queries,
          promoted: [newDocumentId],
          hidden: hidden
        }
      });
    } catch (error) {
      return {
        statusCode: 500,
        body: `Elastic error ${error}`
      }
    }
  }

  if (curationType === CurationType.STANDARD) {
    try {
      await validateDocumentIds(promoted, hidden, elastic);
    } catch (error) {
      return {
        statusCode: 404,
        body: JSON.stringify(error)
      }
    }
  }

  const curation = await curationsService.createCuration({
    id: curationId,
    promoted: promoted,
    hidden: hidden,
    queries: queries,
    startTime: startTime,
    endTime: endTime,
    documentId: newDocumentId,
    elasticCurationId: elasticCurationId,
    curationType: curationType
  });
  response.curation = curation;

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
};

export const main = middyfy(createCuration);