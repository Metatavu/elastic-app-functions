import { getDepartmentsFromRegistry } from "@libs/departments-registry-utils";
import { searchResultsToDocuments } from "@libs/document-utils";
import { middyfy } from "@libs/lambda";
import { runInQueue } from "@libs/queue-utils";
import { getExternalIdFromElement, getPageResponse } from "@libs/webpage-utils";
import _ from "lodash";
import config from "src/config";
import { ContentCategory, Document, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const UPDATE_CHUNK_SIZE = 10;

/**
 * Resolves TPR ID from document
 *
 * @param document document
 * @returns TPR ID or null
 */
const resolveServiceDocumentsExternalId = async (document: Document) => {
  const pageResponse = await getPageResponse(document);

  if (!pageResponse) {
    return null;
  }

  return await getExternalIdFromElement(pageResponse);
};

/**
 * Manually triggered lambda for adding external_service_id to documents with meta_content_category as service
 */
const addExternalServiceIdToServices = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const departments = await getDepartmentsFromRegistry();

  const { results, meta } = await elastic.searchDocuments({
    query: "",
    page: {
      size: 1000
    },
    filters: {
      meta_content_category: ContentCategory.SERVICE
    }
  });

  const documentsWithoutExternalServiceId = results.filter(result => !result.external_service_id);

  console.log(`Found ${documentsWithoutExternalServiceId.length} without external_service_id out of ${meta.page.total_results} service documents`);

  const updatedDocuments: Document[] = [];

  for (const document of searchResultsToDocuments(documentsWithoutExternalServiceId)) {
    const index = searchResultsToDocuments(documentsWithoutExternalServiceId).findIndex(i => i.id === document.id);
    console.log(`Resolving external_service_id for document ${document.title} ${index + 1}/${searchResultsToDocuments(documentsWithoutExternalServiceId).length}`);
    const externalServiceId = await resolveServiceDocumentsExternalId(document);

    if (externalServiceId) {
      const foundRegistryDepartment = departments?.find(department => department.id === externalServiceId);

      updatedDocuments.push({
        ...document,
        external_service_id: foundRegistryDepartment?.id
      });
    }
  }

  const updatedDocumentsChunks = _.chunk(updatedDocuments, UPDATE_CHUNK_SIZE);

  await runInQueue(updatedDocumentsChunks.map(chunk =>
    async () => {
      const result = await elastic.upsertDocuments({
        documents: chunk
      });
      console.log(`Updated ${result.length}`);
    }
  ));
};

export const main = middyfy(addExternalServiceIdToServices);