import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService, documentService } from "src/database/services";
import schema from "src/schema/curation";
import { CurationType, CustomCurationResponse } from "@types";
import { updateExistingElasticCuration } from "@libs/curation-utils";
import Document from "src/database/models/document";

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
    title,
    description,
    links,
    language,
    curationType
  } = body;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!id) {
    return {
      statusCode: 400,
      body: "Bad request"
    }
  }

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

  const curation = await curationsService.findCuration(id);
  if (!curation) {
    return {
      statusCode: 404,
      body: "Not found"
    };
  }

  let elasticCurationId = curation.elasticCurationId;
  let response: CustomCurationResponse = {};

  if (curationType === CurationType.CUSTOM && curation.documentId && hasDocumentAttributes) {
    if (!startTime) {
      const foundDocument = await documentService.findDocument(curation.documentId);
      if (!foundDocument) {
        return {
          statusCode: 404,
          body: `Document ${curation.documentId} not found`
        };
      }

      const updatesToDocument: Document = {
        id: curation.documentId,
        description: description,
        language: language,
        links: links,
        title: title,
        curationId: id
      }

      if (foundDocument !== updatesToDocument) {
        const updatedDocument = await documentService.updateDocument(updatesToDocument)
        await elastic.updateDocuments({
          documents: [{
            id: curation.documentId,
            title: title,
            description: description,
            links: links,
            language: language
          }]
        });
        response.document = updatedDocument;
      }

      if (curation.elasticCurationId) {
        updateExistingElasticCuration(curation.elasticCurationId, elastic);
      } else {
        elasticCurationId = await elastic.createCuration({
          curation: {
            hidden: hidden,
            promoted: promoted,
            queries: queries
          }
        });
      }
    }
  }

  const updatedCuration = await curationsService.updateCuration({
    ...curation,
    promoted: promoted,
    hidden: hidden,
    queries: queries,
    startTime: startTime,
    endTime: endTime,
    elasticCurationId: elasticCurationId
  });
  response.curation = updatedCuration;

  if (updatedCuration.elasticCurationId) {
    updateExistingElasticCuration(updatedCuration.elasticCurationId, elastic);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
};

export const main = middyfy(updateCuration);