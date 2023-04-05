import { ContentCategory, getElastic, Document } from "src/elastic";
import config from "src/config";
import { middyfy } from "@libs/lambda";
import { searchResultsToDocuments } from "@libs/document-utils";
import { getDepartmentsFromRegistry } from "@libs/departments-registry-utils";
import { getCategoryAttribute, getExternalIdFromElement, getPageResponse } from "@libs/webpage-utils";
import { runInQueue } from "@libs/queue-utils";
import _ from "lodash";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const BATCH_SIZE = 1000;

/**
 * Returns content category type from given category string
 *
 * @param category category
 */
const getContentCategory = (category: string | undefined) => {
  switch (category) {
    case "news_item": return ContentCategory.NEWS;
    case "tpr_unit": return ContentCategory.UNIT;
    case "tpr_service": return ContentCategory.SERVICE;
    default: return ContentCategory.UNCATEGORIZED;
  }
};

/**
 * Resolves TPR ID from document
 *
 * @param document document
 * @returns TPR ID or null
 */
const resolveServiceDocumentsExternalId = async (document: Document) => {
  const pageResponse = await getPageResponse(document);
  if (!pageResponse) throw Error("Page did not respond");

  return getExternalIdFromElement(pageResponse);
};

/**
 * Resolves category for a document
 *
 * @param document document
 * @returns category type or null if category could not be resolved
 */
const resolveDocumentCategory = async (document: Document) => {
  const pageResponse = await getPageResponse(document);
  if (!pageResponse) throw Error("Page did not respond");

  const categoryAttribute = await getCategoryAttribute(pageResponse);
  if (!categoryAttribute) return ContentCategory.UNCATEGORIZED;

  return getContentCategory(categoryAttribute);
};

/**
 * Scheduled lambda for adding category to elastic documents without one
 */
const addCategoryToDocuments = async () => {
  console.time("Time to finish");

  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const departments = await getDepartmentsFromRegistry();

  const { results, meta } = await elastic.searchDocuments({
    query: "",
    page: {
      size: BATCH_SIZE
    },
    filters: {
      all: [
        { url_host: "www.hel.fi" },
        { none: { meta_content_category: Object.values(ContentCategory) } }
      ]
    }
  });

  if (!results.length) {
    console.log("No uncategorized documents found.");
    return;
  }

  console.log(`Processing next ${results.length} of uncategorized ${meta.page.total_results} documents..`);

  const resolveDocumentCategoryRequests = searchResultsToDocuments(results).map(document =>
    async () => {
      try {
        const category = await resolveDocumentCategory(document);

        const updatedDocument: Document = {
          ...document,
          id: document.id,
          meta_content_category: category
        };

        if (category === ContentCategory.SERVICE) {
          const externalServiceId = await resolveServiceDocumentsExternalId(document);

          if (externalServiceId) {
            const foundRegistryDepartment = departments?.find(department => department.id === externalServiceId);
            updatedDocument.external_service_id = foundRegistryDepartment?.id;
          }
        }

        console.log(`Resolved document category. ID: ${document.id}, category: ${category}`);

        return updatedDocument;
      } catch (error) {
        const { message, cause } = error as Error;
        console.error(`Failed to resolve document category. ID: ${document.id}, URL: ${document.url}. Reason: ${message} ${cause ?? ""}`);
        throw error;
      }
    }
  );

  const resolveDocumentCategoryResults = await runInQueue(resolveDocumentCategoryRequests, {
    retryCount: 2,
    concurrency: 10,
    carryoverConcurrencyCount: true,
    intervalCap: 10,
    interval: 1_000
  });

  const documentsWithResolvedCategory = resolveDocumentCategoryResults
    .filter((result): result is PromiseFulfilledResult<Document> => result.status === "fulfilled")
    .map(result => result.value);
  const failedAmount = resolveDocumentCategoryRequests.length - documentsWithResolvedCategory.length;

  console.log(`Done. ${documentsWithResolvedCategory.length} successful, ${failedAmount} failed.`);
  console.log(`Updating documents with updated category to Elastic index..`);

  let totalUpdated = 0;
  const updateDocumentsRequests = _.chunk(documentsWithResolvedCategory, 100).map(chunk =>
    async () => {
      try {
        const updatedDocument = await elastic.updateDocuments({ documents: chunk });
        totalUpdated +=chunk.length;
        console.log(`Updated ${totalUpdated} / ${documentsWithResolvedCategory.length} documents to Elastic.`);
        return updatedDocument;
      } catch (error) {
        const { message, cause } = error as Error;
        console.error(`Failed to update documents to Elastic. Reason: ${message} ${cause ?? ""}`);
        throw error;
      }
    }
  );

  const updateDocumentsResults = await runInQueue(updateDocumentsRequests);
  const successfulUpdateAmount = updateDocumentsResults.filter(result => result.status === "fulfilled").length;

  console.log(`Done. ${totalUpdated} successful, ${updateDocumentsRequests.length - successfulUpdateAmount} failed.`);
  console.timeEnd("Time to finish");
};

export const main = middyfy(addCategoryToDocuments);
