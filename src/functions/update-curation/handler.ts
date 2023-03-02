import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService, documentService } from "src/database/services";
import schema from "src/schema/curation";
import { CurationType } from "@types";
import { updateExistingElasticCuration } from "@libs/curation-utils";
import Document from "src/database/models/document";
import CurationModel from "src/database/models/curation";
import isEqual from "lodash/isEqual";
import { parseDate } from "@libs/date-utils";
import { Curation } from "src/generated/app-functions-client";

/**
 * Lambda for updating custom and standard curations
 *
 * @param event event
 */
const updateCuration: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async event => {
  const { pathParameters, body, headers } = event;
  const { authorization, Authorization } = headers;
  const {
    queries,
    promoted,
    hidden,
    startTime,
    endTime,
    document,
    curationType,
    groupId
  } = body;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    }
  }

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

  const curation = await curationsService.findCuration(id);
  if (!curation) {
    return {
      statusCode: 404,
      body: `Curation ${id} not found`
    };
  }

  let elasticCurationId = curation.elasticCurationId;

  let documentResponse: Document | undefined = undefined;
  let curationResponse: CurationModel = curation;

  if (curationType === CurationType.CUSTOM && curation.documentId && document) {
    try {
      const foundDocument = await documentService.findDocument(curation.documentId);
      if (!foundDocument) {
        return {
          statusCode: 404,
          body: `Document ${curation.documentId} not found`
        };
      }

      const { title, description, links, language } = document;

      const updatesToDocument: Document = {
        id: curation.documentId,
        description: description,
        language: language,
        links: links,
        title: title,
        curationId: id
      };

      if (!isEqual(foundDocument, updatesToDocument)) {
        try {
          documentResponse = await documentService.updateDocument(updatesToDocument);
        } catch (error) {
          return {
            statusCode: 500,
            body: `Error updating document record with id ${curation.documentId}, ${error}`
          };
        }

        if (!startTime) {
          try {
            await elastic.updateDocuments({
              documents: [{
                id: curation.documentId,
                title: title,
                description: description,
                links: links,
                language: language
              }]
            });
          } catch (error) {
            return {
              statusCode: 500,
              body: `Error updating elastic document with id ${curation.documentId}, ${error}`
            };
          }
        }
      }
    } catch (error) {
      return {
        statusCode: 500,
        body: `Error finding document with id ${curation.documentId}`
      };
    }
  }

  const curationUpdates: CurationModel = {
    id: curation.id,
    elasticCurationId: curation.id,
    documentId: curation.documentId,
    queries: queries,
    promoted: curationType === CurationType.CUSTOM ? curation.promoted : promoted,
    hidden: curationType === CurationType.CUSTOM ? curation.hidden : hidden,
    startTime: startTime,
    endTime: endTime,
    curationType: curationType,
    groupId: groupId
  };

  if (!isEqual(curation, curationUpdates)) {
    if (!startTime) {
      try {
        elasticCurationId = elasticCurationId
        ? await updateExistingElasticCuration(
          elasticCurationId,
          curationUpdates,
          elastic
        )
        : await elastic.createCuration({
          curation: {
            hidden: curationUpdates.hidden,
            promoted: curationUpdates.promoted,
            queries: curationUpdates.queries
          }
        });
      } catch (error) {
        return {
          statusCode: 500,
          body: `Elastic curation error ${error}`
        }
      }
    }

    try {
      const updatedCuration = await curationsService.updateCuration({
        ...curationUpdates,
        elasticCurationId: elasticCurationId
      });

      curationResponse = updatedCuration;
    } catch (error) {
      return {
        statusCode: 500,
        body: `Error updating curation record with id ${elasticCurationId}, ${error}`
      }
    }
  }

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
};

export const main = middyfy(updateCuration);