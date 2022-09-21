// import { middyfy } from "@libs/lambda";
import fetch from "node-fetch";
import  * as cheerio from "cheerio";
import { getElastic } from "src/elastic";
import config from "../../config";

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
 * Scheduled lambda for adding category to elastic documents without one
 */
const scheduleAddCategoryToDocuments = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const existingValueFilters = Object.values(ContentCategory).map(category => ({
    "meta_content_category": category
  }));

  const { results } = await elastic.searchDocuments({
    query: "",
    filters: {
      none: existingValueFilters
    }
  });

  /**
   * TODO:
   *
   * This should be applied the first time when this lambda is run since Elastic schema does not yet contain
   * the filter field. It can be added to Elastic by updating a single document to contain a value in it.
   */
  // const documentResponse = await elastic.findDocument({
  //   documentId: "some_id"
  // });

  // const response = await elastic.updateDocuments({
  //   documents: [
  //     {
  //       ...documentResponse,
  //       id: documentResponse.id as string,
  //       meta_content_category: ContentCategory.SERVICE
  //     }
  //   ]
  // });

  if (!results.length) return;

  // Search result values are stored in { raw: "value" } format, this flattens them
  const flattenedDocuments = results.map(result =>
    Object.keys(result).reduce<{ [key: string]: any }>((document, key) => {
      const value = result[key]?.raw;
      return value ? { ...document, [key]: value } : document;
    }, {})
  );

  for (const document of flattenedDocuments) {
    const { url, id } = document;

    if (!id || !url) continue;

    const documentUrl = new URL(url);
    const urlSlugs = documentUrl.pathname.split('/');

    if (urlSlugs.some(slug => !!slug && NEWS_SLUG_IDENTIFIERS.includes(slug))) {
      console.log("NEWS FOUND", id);
      continue;
    }

    const pageResponse = await fetch(document.url);
    const pageContent = await pageResponse.text();
    const $ = cheerio.load(pageContent);
    const element = $("script[data-drupal-selector=drupal-settings-json]");

    if (!element.length) continue;

    const jsonString = element.html();

    if (!jsonString.length) continue;

    const config: DrupalSettingsJson = JSON.parse(jsonString);

    const currentPath = config.path?.currentPath;

    if (currentPath.includes("tpr-unit")) {
      console.log("UNIT FOUND");
      continue;
    }

    if (currentPath.includes("tpr-service")) {
      console.log("SERVICE FOUND");
      continue;
    }
  }
};

// scheduleAddCategoryToDocuments();

// export const main = middyfy(scheduleAddCategoryToDocuments);
