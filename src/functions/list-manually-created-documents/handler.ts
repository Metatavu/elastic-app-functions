import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { timedCurationsService } from "src/database/services";
import { getElasticCredentialsForSession } from "@libs/auth-utils";

/**
 * Lambda for listing manually created documents
 *
 * @param event event
 */
const listManuallyCreatedDocuments: ValidatedEventAPIGatewayProxyEvent<any> = async event => {
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

  const manuallyCreatedCurations = await timedCurationsService.listManuallyCreatedDocumentCurations();
  const manuallyCreatedCurationsIds = manuallyCreatedCurations.map(curation => curation.id);

  const { results } = await elastic.searchDocuments({
    query: "",
    page: {
      size: 1000
    },
    filters: {
      id: manuallyCreatedCurationsIds
    }
  });

  return {
    statusCode: 200,
    body: JSON.stringify(results)
  };
};

export const main = middyfy(listManuallyCreatedDocuments);
