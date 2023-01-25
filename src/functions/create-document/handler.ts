import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import schema from "src/schema/create-document";
import { getElasticCredentialsForSession } from "@libs/auth-utils";
import { ContentCategory, getElastic } from "src/elastic";

/**
 * Lambda for creating documents
 *
 * @param event event
 */
const createDocument: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async event => {
  const { body, headers } = event;
  const { title, description, links } = body;
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

  const documentProperties = [{
    title: title,
    description: description,
    links: links,
    meta_content_category: ContentCategory.MANUAL
  }];

  const document = await elastic.updateDocuments({
    documents: documentProperties
  });

  return {
    statusCode: 201,
    body: JSON.stringify(document)
  };
};

export const main = middyfy(createDocument);