import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import schema from "src/schema/curation";
import { documentService, curationsService } from "src/database/services";
import { v4 as uuid } from "uuid";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { getElastic } from "src/elastic";
import { CurationType } from "@types";
import { validateDocumentIds } from "@libs/curation-utils";
import { parseDate } from "@libs/date-utils";
import Document from "src/database/models/document";
import CurationModel from "src/database/models/curation";
import { Curation } from "src/generated/app-functions-client";

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
    document,
    curationType,
    groupId,
    language
  } = body;
  const { Authorization, authorization } = headers;
  const authHeader = Authorization || authorization;

  if (curationType === CurationType.CUSTOM && !document) {
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
      statusCode: 401,
      body: "Unauthorized"
    };
  }

  const curationId = uuid();
  let newDocumentId: string | undefined = undefined;
  let elasticCurationId: string | undefined = undefined;

  let documentResponse: Document | undefined = undefined;
  let curationResponse: CurationModel | undefined = undefined;

  const now = new Date();

  if (curationType === CurationType.CUSTOM && document) {
    const { title, description, links, language } = document;

    newDocumentId = uuid();
    promoted.push(newDocumentId);

    try {
      const createdDocument = await documentService.createDocument({
        id: newDocumentId,
        title: title,
        description: description,
        links: links,
        language: language,
        curationId: curationId
      });

      documentResponse = createdDocument;
    } catch (error) {
      return {
        statusCode: 500,
        body: `Failed to create document record with id ${newDocumentId}, ${error}`
      }
    }
  }

  if (!startTime && (!endTime || parseDate(endTime) > now)) {
    try {
      if (curationType === CurationType.CUSTOM && document) {
        const { title, description, links, language } = document;

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
          promoted: newDocumentId ? [newDocumentId] : promoted,
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

  try {
    const curation = await curationsService.createCuration({
      id: curationId,
      promoted: promoted,
      hidden: hidden,
      queries: queries,
      startTime: startTime,
      endTime: endTime,
      documentId: newDocumentId,
      elasticCurationId: elasticCurationId,
      curationType: curationType,
      groupId: groupId,
      language: language
    });
    curationResponse = curation;
    const parsedDates = {
      startTime: curationResponse.startTime ? parseDate(curationResponse.startTime) : undefined,
      endTime: curationResponse.endTime ? parseDate(curationResponse.endTime) : undefined
    };

    const combinedResponse: Curation = {
      ...curationResponse,
      startTime: parsedDates.startTime,
      endTime: parsedDates.endTime,
      document: documentResponse ? {
        description: documentResponse.description,
        title: documentResponse.title,
        links: documentResponse.links,
        language: documentResponse.language
      } : undefined
    };

    return {
      statusCode: 200,
      body: JSON.stringify(combinedResponse)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Failed to create curation record ${error}`
    }
  }
};

export const main = middyfy(createCuration);