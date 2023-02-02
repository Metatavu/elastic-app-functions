import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import schema from "src/schema/curation";
import { documentService, curationsService } from "src/database/services";
import { v4 as uuid } from "uuid";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { getElastic } from "src/elastic";
import { CurationType } from "@types";

/**
 * Lambda for creating custom fixed, custom timed, and standard curations
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

  const isCustomCuration = curationType === CurationType.CUSTOM_PERMANENT || curationType === CurationType.CUSTOM_TIMED;
  const hasDocumentAttributes = !!(title && description && links && language);

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

  if (promoted.length === 0 && isCustomCuration) {
    if (!hasDocumentAttributes) {
      return {
        statusCode: 400,
        body: "Missing document properties"
      };
    }

    const newDocumentId = uuid();
    promoted.push(newDocumentId);

    const createdDocument = await documentService.createDocument({
      id: newDocumentId,
      title: title,
      description: description,
      links: links,
      language: language
    });

    // Permanent curations, create in elastic
    if (!startTime) {
      await elastic.updateDocuments({
        documents: [{
          id: newDocumentId,
          title: title,
          description: description,
          links: links,
          language: language,
        }]
      });

      const payload = {
        hidden: hidden,
        promoted: promoted,
        queries: queries
      };

      const elasticCurationId = await elastic.createCuration({
        curation: payload
      });

      const customFixedCuration = await curationsService.createCuration({
        id: uuid(),
        documentId: newDocumentId,
        promoted: promoted,
        hidden: hidden,
        queries: queries,
        endTime: endTime,
        elasticCurationId: elasticCurationId,
        curationType: CurationType.CUSTOM_PERMANENT
      });

      const foundDocument = await documentService.findDocument(newDocumentId);

      if (!foundDocument) {
        return {
          statusCode: 404,
          body: `Document ${newDocumentId} not found`
        };
      }

      documentService.updateDocument({
        ...foundDocument,
        curationId: customFixedCuration.id
      })

      return {
        statusCode: 200,
        body: JSON.stringify(customFixedCuration)
      };
      // Timed curations, not yet in elastic
    } else {
      const customTimedCuration = await curationsService.createCuration({
        id: uuid(),
        documentId: newDocumentId,
        promoted: promoted,
        hidden: hidden,
        queries: queries,
        startTime: startTime,
        endTime: endTime,
        elasticCurationId: "",
        curationType: CurationType.CUSTOM_TIMED
      });

      documentService.updateDocument({
        ...createdDocument,
        curationId: customTimedCuration.id
      })

      return {
        statusCode: 200,
        body: JSON.stringify(customTimedCuration)
      };
    }
  }

  // Standard curations
  const documentIds = [ ...promoted, ...hidden ];

  const documents = await Promise.all(
    documentIds.map(async documentId => ({
      id: documentId,
      data: await elastic.findDocument({ documentId: documentId })
    }))
  );

  for (const document of documents) {
    if (!document.data) {
      return {
        statusCode: 404,
        body: `Document ${document.id} not found`
      };
    }
  }

  const timedCuration = await curationsService.createCuration({
    id: uuid(),
    promoted: promoted,
    hidden: hidden,
    queries: queries,
    startTime: startTime,
    endTime: endTime,
    elasticCurationId: "",
    curationType: CurationType.STANDARD_TIMED
  });

  return {
    statusCode: 200,
    body: JSON.stringify(timedCuration)
  };
};

export const main = middyfy(createCuration);