import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getElastic } from "src/elastic";
import config from "src/config";
import { middyfy } from "@libs/lambda";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const BATCH_SIZE = 10;

/**
 * Detects breadcrumbs from old hel.fi format
 *
 * @param $ CheerioAPI
 * @param helBreadcrumbsOld selector for breadcrumbs
 * @returns list of breadcrumbs
 */
const detectBreadcrumbsFromHelOld = ($: cheerio.CheerioAPI, helBreadcrumbsOld: cheerio.Cheerio<cheerio.Element>) => {
  const result = [];

  helBreadcrumbsOld.children(".breadcrump-frontpage-link,a").each((_index, a) => {
    result.push($(a).text().replaceAll("»", "").trim());
  });

  result.push(helBreadcrumbsOld.contents().last().text().replaceAll("»", "").trim());

  return result.filter(i => !!i);
}

/**
 * Detects breadcrumbs from new hel.fi format
 *
 * @param $ CheerioAPI
 * @param helBreadcrumbsNew selector for breadcrumbs
 * @returns list of breadcrumbs
 */
const detectBreadcrumbsFromHelNew = ($: cheerio.CheerioAPI, helBreadcrumbsNew: cheerio.Cheerio<cheerio.Element>) => {
  const result = [];

  helBreadcrumbsNew.children("a").each((_index, a) => {
    result.push($(a).text().trim());
  });

  result.push(helBreadcrumbsNew.children("span:last-child").text().trim());

  return result.filter(i => !!i);
};

/**
 * Detects breadcrumbs for given URL
 *
 * @param url URL
 * @returns breadcrumbs or null if not detected
 */
const detectBreadcrumbsFromUrl = async (url: string): Promise<string[] | null> => {
  const documentUrl = new URL(url);
  const pageResponse = await fetch(documentUrl.toString());
  const contentType = pageResponse.headers.get("content-type");

  if (contentType?.startsWith("text/html")) {
    const pageContent = await pageResponse.text();
    const $ = cheerio.load(pageContent);

    const helBreadcrumpsOld = $(".long-breadcrumb");
    if (helBreadcrumpsOld.length) {
      return detectBreadcrumbsFromHelOld($, helBreadcrumpsOld);
    }

    const helBreadcrumpsNew = $(".breadcrumb");
    if (helBreadcrumpsNew.length) {
      return detectBreadcrumbsFromHelNew($, helBreadcrumpsNew);
    }
  }

  return null;
}

/**
 * Resolves breadcrumbs for a document
 *
 * @param document document
 * @returns breadcrumbs or null if could not be resolved
 */
const detectBreadcrumbsFromDocument = async (document: any): Promise<string[] | null> => {
  const { url, id } = document;

  if (!id || !url) {
    console.error(`Document ${id} does not contain URL`);
    return null;
  }

  const result = await detectBreadcrumbsFromUrl(url);
  if (!result) {
    console.warn(`Failed to resolve breadcrumbs for ${url}`);
  }

  return result;
}

/**
 * Scheduled lambda for adding breadcrumbs to elastic documents without one
 */
const detectBreadcrumbs = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const { results, meta } = await elastic.searchDocuments({
    query: "",
    page: {
      size: BATCH_SIZE
    },
    filters: {
      all: [
        {
          url_host: "www.hel.fi"
        },
        {
          none: [
            {
              breadcrumbs_updated: {
                "from": "1900-01-01T12:00:00+00:00",
                "to": new Date().toISOString()
              }
            }
          ]
        }
      ]
    }
  });

  console.log(`Detecting publication breadcrumbs ${meta.page.size} / ${meta.page.total_results}.`);

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
    const breadcrumbs = await detectBreadcrumbsFromDocument(document);
    if (breadcrumbs) {
      updateDocuments.push({
        ...document,
        breadcrumbs: breadcrumbs,
        breadcrumbs_updated: new Date().toISOString(),
        id: document.id!
      });
      console.log("breadcrumbs", breadcrumbs);
    } else {
      console.warn("Failed to detect breadcrumbs for document", document);
    }
  }

  if (updateDocuments.length > 0) {
    const result = await elastic.updateDocuments({
      documents: updateDocuments
    });

    console.log(`Updated ${result.length} document breadcrumbs.`);
  }
};

export const main = middyfy(detectBreadcrumbs);
