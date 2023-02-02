import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService, documentService } from "src/database/services";
import schema from "src/schema/curation";
import { CurationType } from "@types";

/**
 * Lambda for updating custom and standard curations
 *
 * @param event event
 */
const updateCuration: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async event => {
  const { pathParameters, body, headers } = event;
  const { authorization, Authorization } = headers;
  const { queries, promoted, hidden, startTime, endTime, title, description, links, language, curationType } = body;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  const hasDocumentAttributes = !!(title && description && links && language);
  const isCustomCuration = (curationType === CurationType.CUSTOM_PERMANENT || curationType === CurationType.CUSTOM_TIMED) && hasDocumentAttributes;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    }
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

  if (isCustomCuration && curation.documentId) {
    // Fixed custom curation
    if (!startTime) {
      await elastic.updateDocuments({
        documents: [{
          id: curation.documentId,
          title: title,
          description: description,
          links: links,
          language: language
        }]
      });

      const elasticCurationId = await elastic.createCuration({
        curation: {
          hidden: hidden,
          promoted: promoted,
          queries: queries
        }
      });

      const updatedCuration = await curationsService.updateCuration({
        ...curation,
        promoted: promoted,
        hidden: hidden,
        queries: queries,
        endTime: endTime,
        curationType: curationType,
        elasticCurationId: elasticCurationId
      });

      const foundDocument = await documentService.findDocument(curation.documentId);
      if (!foundDocument) {
        return {
          statusCode: 404,
          body: `Document ${curation.documentId} not found`
        };
      }

      const updatedDocument = await documentService.updateDocument({
        ...foundDocument,
        curationId: updatedCuration.id
      });

      const updatedCurationAndDocument = {
        curation: updatedCuration,
        document: updatedDocument
      };

      return {
        statusCode: 200,
        body: JSON.stringify(updatedCurationAndDocument)
      };
      // Timed custom curation, not starting yet
    } else {
      const updatedCuration = await curationsService.updateCuration({
        ...curation,
        promoted: promoted,
        hidden: hidden,
        queries: queries,
        startTime: startTime,
        endTime: endTime,
        curationType: curationType,
        elasticCurationId: ""
      });

      const foundDocument = await documentService.findDocument(curation.documentId);
      if (!foundDocument) {
        return {
          statusCode: 404,
          body: `Document ${curation.documentId} not found`
        };
      }

      const updatedDocument = await documentService.updateDocument({
        ...foundDocument,
        curationId: updatedCuration.id
      });

      const updatedCurationAndDocument = {
        curation: updatedCuration,
        document: updatedDocument
      };

      return {
        statusCode: 200,
        body: JSON.stringify(updatedCurationAndDocument)
      };
    }
  }

  // Standard timed curation
  const updatedCuration = await curationsService.updateCuration({
    ...curation,
    promoted: promoted,
    hidden: hidden,
    queries: queries,
    startTime: startTime,
    endTime: endTime
  });

  return {
    statusCode: 200,
    body: JSON.stringify(updatedCuration)
  };
};

export const main = middyfy(updateCuration);