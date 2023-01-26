import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import schema from "src/schema/timed-curation";
import { timedCurationsService } from "src/database/services";
import { v4 as uuid } from "uuid";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { ContentCategory, getElastic } from "src/elastic";

/**
 * Lambda for creating timed curations
 *
 * @param event event
 */
const createTimedCuration: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async event => {
  const { body, headers } = event;
  const { queries, promoted, hidden, startTime, endTime } = body;
  const { Authorization, authorization } = headers;
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

  if (promoted.length === 1 && documents[0].data?.meta_content_category === ContentCategory.MANUAL) {
    const manualDocumentCuration = await timedCurationsService.createTimedCuration({
      id: documents[0].id,
      promoted: promoted,
      hidden: hidden,
      queries: queries,
      startTime: startTime,
      endTime: endTime,
      curationId: "",
      isManuallyCreated: true
    });

    return {
      statusCode: 200,
      body: JSON.stringify(manualDocumentCuration)
    };
  }

  const timedCuration = await timedCurationsService.createTimedCuration({
    id: uuid(),
    promoted: promoted,
    hidden: hidden,
    queries: queries,
    startTime: startTime,
    endTime: endTime,
    curationId: ""
  });

  return {
    statusCode: 200,
    body: JSON.stringify(timedCuration)
  };
};

export const main = middyfy(createTimedCuration);
