import { ContentCategory, getElastic, Document } from "src/elastic";
import config from "src/config";
import { middyfy } from "@libs/lambda";
import { searchResultsToDocuments } from "@libs/document-utils";
import { getDepartmentsFromRegistry } from "@libs/departments-registry-utils";
import { getCategoryAttribute, getExternalIdFromElement, getPageResponse } from "@libs/webpage-utils";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const BATCH_SIZE = 10;

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
  
  if (!pageResponse) {
    return null;
  }
  
  const externalId = await getExternalIdFromElement(pageResponse);
  
  return externalId;
};

/**
 * Resolves category for a document
 *
 * @param document document
 * @returns category type or null if category could not be resolved
 */
const resolveDocumentCategory = async (document: Document) => {
  const pageResponse = await getPageResponse(document);
  
  if (!pageResponse) {
    return;
  }

  const categoryAttribute = await getCategoryAttribute(pageResponse)
  
  if (!categoryAttribute) {
    console.warn(`Couldn't resolve category type for ${document.url}`);
    
    return ContentCategory.UNCATEGORIZED;
  }

  return getContentCategory(categoryAttribute);
};

/**
 * Scheduled lambda for adding category to elastic documents without one
 */
const addCategoryToDocuments = async () => {
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
        { none: { "meta_content_category": Object.values(ContentCategory) } }
      ]
    }
  });

  console.log(`Indexing of next ${meta.page.size} of uncategorized ${meta.page.total_results} results`);

  if (!results.length) return;

  const updateDocuments: Document[] = [];

  for (const document of searchResultsToDocuments(results)) {
    let updatedDocument: Document;
    const category = await resolveDocumentCategory(document);
    
    if (category) {
      updatedDocument = {
        ...document,
        id: document.id,
        meta_content_category: category
      };
      
      if (category === ContentCategory.SERVICE) {
        const externalServiceId = await resolveServiceDocumentsExternalId(document);
        
        if (externalServiceId) {
          const foundRegistryDepartment = departments?.find(department => department.id === externalServiceId);
          updatedDocument = {
            ...updatedDocument,
            external_service_id: foundRegistryDepartment?.id
          };
        }
      }
      
      updateDocuments.push(updatedDocument);
    }
  }

  const result = await elastic.updateDocuments({
    documents: updateDocuments
  });

  console.log(`Updated ${result.length} document categories.`);
};

export const main = middyfy(addCategoryToDocuments);
