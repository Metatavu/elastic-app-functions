import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { ContentCategory, getElastic, Document } from "../../elastic";
import config from "../../config";
import { middyfy } from "@libs/lambda";
import { searchResultsToDocuments } from "@libs/document-utils";

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
}

/**
 * Resolves category for a document
 *
 * @param document document
 * @returns category type or null if category could not be resolved
 */
const resolveDocumentCategory = async (document: Document): Promise<ContentCategory | null> => {
  const { id, url } = document;

  if (!url) {
    console.error(`Document ${id} does not contain URL`);
    return null;
  }

  const pageResponse = await fetch(new URL(url as string).toString());
  const contentType = pageResponse.headers.get("content-type");

  if (!contentType?.startsWith("text/html")) {
    console.warn(`Could resolve category type for ${url}`);

    return ContentCategory.UNCATEGORIZED;
  }

  const pageContent = await pageResponse.text();
  const $ = cheerio.load(pageContent);
  const categoryElement = $("head").find("meta[name=helfi_content_type]");

  return getContentCategory(categoryElement.attr("content"));
}

/**
 * Scheduled lambda for adding category to elastic documents without one
 */
const addCategoryToDocuments = async () => {
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
        { url_host: "www.hel.fi" },
        { none: { "meta_content_category": Object.values(ContentCategory) } }
      ]
    }
  });

  console.log(`Indexing of next ${meta.page.size} of uncategorized ${meta.page.total_results} results`);

  if (!results.length) return;

  const updateDocuments: Document[] = [];

  for (const document of searchResultsToDocuments(results)) {
    const category = await resolveDocumentCategory(document);
    if (category) {
      updateDocuments.push({
        ...document,
        id: document.id,
        meta_content_category: category
      });
    }
  }

  const result = await elastic.updateDocuments({
    documents: updateDocuments
  });

  console.log(`Updated ${result.length} document categories.`);
};

export const main = middyfy(addCategoryToDocuments);
