// import { middyfy } from "@libs/lambda";
import fetch from "node-fetch";
import  * as cheerio from "cheerio";
import { getElastic } from "src/elastic";
import config from "../../config";
import { middyfy } from "@libs/lambda";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const NEWS_SLUG_IDENTIFIERS = [ "news", "uutiset" ];

/**
 * Enum for content category
 */
enum ContentCategory {
  SERVICE = "service",
  UNIT = "unit",
  NEWS = "news",
  UNCATEGORIZED = "uncategorized"
}

/**
 * Drupal settings JSON with property to decipher content categories for service and unit
 */
interface DrupalSettingsJson {
  path?: {
    currentPath?: string | null;
  };
};

/**
 * Resolves category based from URÖ
 * 
 * @param url URL
 * @returns category
 */
const resolveUrlCategory = async (url: string): Promise<ContentCategory> => {
  const documentUrl = new URL(url);
  const urlSlugs = documentUrl.pathname.split('/');

  if (urlSlugs.some(slug => !!slug && NEWS_SLUG_IDENTIFIERS.includes(slug))) {
    return ContentCategory.NEWS;
  }

  const pageResponse = await fetch(documentUrl.toString());
  const pageContent = await pageResponse.text();
  const $ = cheerio.load(pageContent);
  const element = $("script[data-drupal-selector=drupal-settings-json]");

  if (!element.length) {
    console.warn(`Could not find drupal-settings-json from ${url} `);
    return ContentCategory.UNCATEGORIZED;
  }

  const jsonString = element.html();
  if (!jsonString.length) {
    console.warn(`Could find drupal-settings-json string from ${url} `);
    return ContentCategory.UNCATEGORIZED;
  }

  const config: DrupalSettingsJson = JSON.parse(jsonString);
  if (!config) {
    console.warn(`Could parse drupal-settings-json from ${url} `);
    return ContentCategory.UNCATEGORIZED;
  }

  const currentPath = config.path?.currentPath;
  if (!currentPath) {
    console.warn(`Could find drupal-settings-json currentPath from ${url} `);
    return ContentCategory.UNCATEGORIZED;
  }

  if (currentPath.includes("tpr-unit")) {
    return ContentCategory.UNIT;
  }

  if (currentPath.includes("tpr-service")) {
    return ContentCategory.SERVICE;
  }

  console.warn(`Could resolve category type for ${url}`);

  return ContentCategory.UNCATEGORIZED;
}

/**
 * Resolves category for a document
 * 
 * @param document document
 * @returns URL or null if category could not be resolved
 */
const resolveDocumentCategory = async (document: any): Promise<ContentCategory | null> => {
  const { url, id } = document;

  if (!id || !url) {
    console.error(`Document ${id} does not contain URL`);
    return null;
  }

  return await resolveUrlCategory(url);
}

/**
 * Scheduled lambda for adding category to elastic documents without one
 */
const addCategoryToDocuments = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const existingValueFilters = Object.values(ContentCategory).map(category => ({
    "meta_content_category": category
  }));

  const { results, meta } = await elastic.searchDocuments({
    query: "",
    page: {
      size: 10
    },
    filters: {
      all: [
        { url_host: "www.hel.fi" },
        { none: existingValueFilters }
      ]
    }
  });
  
  console.log(`Indexing of next ${meta.page.size} of uncategorized ${meta.page.total_results} results`);

  if (!results.length) return;

  // Search result values are stored in { raw: "value" } format, this flattens them
  const flattenedDocuments = results.map(result =>
    Object.keys(result).reduce<{ [key: string]: any }>((document, key) => {
      const value = result[key]?.raw;
      return value ? { ...document, [key]: value } : document;
    }, {})
  );

  const updateDocuments = [];

  for (const document of flattenedDocuments) {
    const category = await resolveDocumentCategory(document);
    if (category) {
      updateDocuments.push({ ...document, meta_content_category: category });
    }
  }

  const result = await elastic.updateDocuments({
    documents: updateDocuments
  });

  console.log(`Updated ${result.length} document categories.`); 
};

export const main = middyfy(addCategoryToDocuments);
