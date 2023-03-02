import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService, documentService } from "src/database/services";
import { CurationType } from "@types";

// TODO: Delete all curations sharing a groupId?
/**
 * Lambda for deleting curations
 *
 * @param event event
 */
const deleteCuration: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
  const { pathParameters, headers: { Authorization, authorization } } = event;
  const id = pathParameters?.id;
  const authHeader = Authorization || authorization;

  if (!id) return {
    statusCode: 400,
    body: "Bad request"
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
      body: "Curation not found"
    };
  }

  if (curation.elasticCurationId) {
    const elasticCuration = await elastic.findCuration({ id: curation.elasticCurationId });
    if (elasticCuration) {
      await elastic.deleteCuration({ id: curation.elasticCurationId });
    } else {
      console.warn(`Could not find elastic curation ${curation.elasticCurationId}, cannot remove it.`);
    }
  }

  if (curation.curationType === CurationType.CUSTOM && curation.documentId) {
    const foundElasticDocument = await elastic.findDocument({ documentId: curation.documentId });
    if (foundElasticDocument) {
      await elastic.deleteDocuments({documentIds: [curation.documentId]});
    } else {
      console.warn(`Could not find elastic document ${curation.documentId}, cannot remove it.`);
    }

    const foundDocument = await documentService.findDocument(curation.documentId);
    if (foundDocument) {
      await documentService.deleteDocument(curation.documentId);
    } else {
      console.warn(`Could not find document ${curation.documentId}, cannot remove it.`);
    }
  }

  await curationsService.deleteCuration(id);

  return {
    statusCode: 204,
    body: ""
  };
};

export const main = middyfy(deleteCuration);