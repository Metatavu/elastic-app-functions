import { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { getElasticCredentialsForSession, returnUnauthorized } from "@libs/auth-utils";
import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { searchResultsToDocuments } from "@libs/document-utils";
import schema from "src/schema/list-documents";

/**
 * Lambda for listing documents by ids
 * 
 * @param event event
 */
const listDocumentsByIds: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async event => {
  const { body: { documentIds }, headers: { authorization, Authorization } } = event;
  const authHeader = Authorization || authorization;
  const auth = await getElasticCredentialsForSession(authHeader);
  
  if (!auth) {
    return returnUnauthorized();
  }
  
  const elastic = getElastic(auth);
  
  const { results } = await elastic.searchDocuments({
    query: "",
    page: {
      size: 1000
    },
    filters: {
      id: documentIds
    }
  });
  
  const foundDocuments = searchResultsToDocuments(results);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ foundDocuments })
  }
};

export const main = middyfy(listDocumentsByIds);