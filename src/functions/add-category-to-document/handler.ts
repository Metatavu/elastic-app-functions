import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { ContentCategory, getElastic, Document } from "src/elastic";
import config from "src/config";
import { middyfy } from "@libs/lambda";
import { searchResultsToDocuments } from "@libs/document-utils";
import { getDepartmentsFromRegistry } from "@libs/departments-registry";
import { DrupalSettingsJson } from "@types";

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
 * Gets page response
 * 
 * @param id document id
 * @param url document url
 * @returns Response
 */
const getPageResponse = async ({ id, url }: Document) => {
  if (!url) {
    console.error(`Document ${id} does not contain URL`);
    return;
  }
  
  return await fetch(new URL(url as string).toString());
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
    
  const contentType = pageResponse.headers.get("content-type");

  if (!contentType?.startsWith("text/html")) {
    console.warn(`Could resolve TPR service id for ${document.url}`);

    return null;
  }
  
  const pageContent = await pageResponse.text();
  const $ = cheerio.load(pageContent);
  const element = $("script[data-drupal-selector=drupal-settings-json]");
  
  if (!element.length) {
    console.warn(`Couldn't find drupal-settings-json from ${document.url}`);
    return null;
  }
  
  const jsonString = element.html();
  if (!jsonString?.length) {
    console.warn(`Couldn't find drupal-settings-json from ${document.url}`);
    return null;
  }
  
  const config: DrupalSettingsJson = JSON.parse(jsonString);
  if (!config) {
    console.warn(`Couldn't parse drupal-settings-json from ${document.url}`);
    return null;
  }
  
  const currentPath = config?.path?.currentPath;
  if (!currentPath) {
    console.warn(`Couldn't find drupal-settings-json currentPath from ${document.url}`);
    return null;
  }
  
  if (currentPath.match(/\d+/g)) {
    const numbers = currentPath.match(/\d+/g);
    
    if (!numbers) {
      return null;
    }
    return parseInt(numbers.join());
  }
};

/**
 * Resolves category for a document
 *
 * @param document document
 * @returns category type or null if category could not be resolved
 */
const resolveDocumentCategory = async (document: Document): Promise<ContentCategory | null> => {
  const pageResponse = await getPageResponse(document);
  
  if (!pageResponse) {
    return null;
  }
  
  const contentType = pageResponse.headers.get("content-type");

  if (!contentType?.startsWith("text/html")) {
    console.warn(`Could resolve category type for ${document.url}`);

    return ContentCategory.UNCATEGORIZED;
  }

  const pageContent = await pageResponse.text();
  const $ = cheerio.load(pageContent);
  const categoryElement = $("head").find("meta[name=helfi_content_type]");

  return getContentCategory(categoryElement.attr("content"));
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
          updatedDocument.tpr_id = foundRegistryDepartment?.id;
          updatedDocument.meta_content_category = ContentCategory.EXTERNAL;
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
