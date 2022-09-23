import fetch from "node-fetch";
import  * as cheerio from "cheerio";
import { ContentCategory, getElastic } from "../../elastic";
import config from "../../config";
import { middyfy } from "@libs/lambda";
import { DrupalSettingsJson } from "../../drupal/types";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const NEWS_SLUG_IDENTIFIERS = [ "news", "uutiset" ];
const BATCH_SIZE = 10;

/**
 * Resolves category based from URL
 * 
 * @param url URL
 * @returns category
 */
const resolveUrlCategory = async (url: string): Promise<ContentCategory> => {
  const documentUrl = new URL(url);
  const urlSlugs = documentUrl.pathname.split('/');
  const pageResponse = await fetch(documentUrl.toString());
  const contentType = pageResponse.headers.get("content-type");

  if (contentType.startsWith("text/html")) {
    const pageContent = await pageResponse.text();
    const $ = cheerio.load(pageContent);

    if (urlSlugs.some(slug => !!slug && NEWS_SLUG_IDENTIFIERS.includes(slug))) {
      if ($("time[itemprop='datePublished']").length) {
        return ContentCategory.NEWS;
      }
    }

    const element = $("script[data-drupal-selector=drupal-settings-json]");
    if (!element.length) {
      console.warn(`Could not find drupal-settings-json from ${url} `);
      return ContentCategory.UNCATEGORIZED;
    }

    const jsonString = element.html();
    if (!jsonString.length) {
      console.warn(`Could not find drupal-settings-json string from ${url} `);
      return ContentCategory.UNCATEGORIZED;
    }

    const config: DrupalSettingsJson = JSON.parse(jsonString);
    if (!config) {
      console.warn(`Could not parse drupal-settings-json from ${url} `);
      return ContentCategory.UNCATEGORIZED;
    }

    const currentPath = config.path?.currentPath;
    if (!currentPath) {
      console.warn(`Could not find drupal-settings-json currentPath from ${url} `);
      return ContentCategory.UNCATEGORIZED;
    }

    if (currentPath.includes("tpr-unit")) {
      return ContentCategory.UNIT;
    }

    if (currentPath.includes("tpr-service")) {
      return ContentCategory.SERVICE;
    }
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
const resolveDocumentCategory = (document: any): Promise<ContentCategory | null> => {
  const { url, id } = document;

  if (!id || !url) {
    console.error(`Document ${id} does not contain URL`);
    return null;
  }

  return resolveUrlCategory(url);
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
      size: BATCH_SIZE
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
