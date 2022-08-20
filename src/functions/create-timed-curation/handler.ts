import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import schema from '../../schema/timed-curation';
import { timedCurationsService } from "../../database/services";
import { v4 as uuid } from 'uuid';
import { parseBasicAuth } from '@libs/auth-utils';
import { getElastic } from 'src/elastic';

/**
 * Lambda for creating timed curations
 * 
 * @param event event
 */
const createTimedCuration: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { body: { queries, promoted, hidden, startTime, endTime}, headers: { Authorization, authorization } } = event;

  const auth = parseBasicAuth(authorization || Authorization);
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
  
  const documents = await Promise.all(documentIds.map(documentId => elastic.findDocument({
    documentId: documentId
  })));

  for (let i = 0; i < documentIds.length; i++) {
    const documentId = documentIds[i];
    if (!documents[i]) {
      return {
        statusCode: 404,
        body: `Document ${documentId} not found`
      };
    }
  }

  const timedCuration = await timedCurationsService.createTimedCuration({
    "id": uuid(),
    "promoted": promoted,
    "hidden": hidden,
    "queries": queries,
    "startTime": startTime,
    "endTime": endTime,
    "curationId": ""
  });

  return {
    statusCode: 200,
    body: JSON.stringify(timedCuration)
  };
};

export const main = middyfy(createTimedCuration);
