import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService } from "src/database/services";
import { CurationType } from "@types";

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

  const isCustomCuration = curation.curationType === CurationType.CUSTOM_PERMANENT || curation.curationType === CurationType.CUSTOM_TIMED;

  if (curation.elasticCurationId) {
    const elasticCuration = await elastic.findCuration({ id: curation.elasticCurationId });
    if (elasticCuration) {
      await elastic.deleteCuration({ id: curation.elasticCurationId });
    } else {
      console.warn(`Could not find elastic curation ${curation.elasticCurationId}, cannot remove it.`);
    }
  }

  if (isCustomCuration && curation.documentId) {
    const foundDocument = await elastic.findDocument({ documentId: curation.documentId });
    if (foundDocument) {
      await elastic.deleteDocuments({documentIds: [curation.documentId]});
    } else {
      console.warn(`Could not find elastic document ${curation.documentId}, cannot remove it.`);
    }
  }

  return {
    statusCode: 204,
    body: ""
  };
};

export const main = middyfy(deleteCuration);
