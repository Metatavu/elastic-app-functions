import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { ContentCategory, getElastic } from "src/elastic";
import config from "src/config";
import { middyfy } from "@libs/lambda";
import { DateTime } from "luxon";
import { searchResultsToDocuments } from "@libs/document-utils";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const BATCH_SIZE = 10;

/**
 * Tries to resolve published date of news page from page content
 *
 * @param url URL of the news page
 * @returns language or null if failed to resolve
 */
const tryToResolvePublishedDateFromPageContent = async (url: string): Promise<DateTime | null> => {
  const documentUrl = new URL(url);
  const pageResponse = await fetch(documentUrl.toString());
  const contentType = pageResponse.headers.get("content-type");

  if (!contentType?.startsWith("text/html")) return null;

  const pageContent = await pageResponse.text();
  const $ = cheerio.load(pageContent);
  const dateString = $("meta[property='article:published_time']")?.attr("content");

  return dateString ? DateTime.fromISO(dateString) : null;
}

/**
 * Resolves language for a document
 *
 * @param document document
 * @returns language or null if could not be resolved
 */
const detectNewsPublishedDateFromDocument = async (document: any): Promise<DateTime | null> => {
  const { url, id } = document;

  if (!id || !url) {
    console.error(`Document ${id} does not contain URL`);
    return null;
  }

  const result = await tryToResolvePublishedDateFromPageContent(url);
  if (!result) {
    console.warn(`Failed to resolve language for ${url}`);
  }

  return result;
}

/**
 * Scheduled lambda for adding language to elastic documents without one
 */
const detectNewsPublished = async () => {
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
          meta_content_category: ContentCategory.NEWS
        },
        {
          none: [
            {
              publish_date: {
                "from": "1900-01-01T12:00:00+00:00",
                "to": new Date().toISOString()
              }
            }
          ]
        }
      ]
    }
  });

  console.log(`Detecting publication date for news ${meta.page.size} / ${meta.page.total_results}.`);

  if (!results.length) return;

  const updateDocuments = [];

  for (const document of searchResultsToDocuments(results)) {
    const publishDate = await detectNewsPublishedDateFromDocument(document);
    if (publishDate && publishDate.isValid) {
      updateDocuments.push({
        ...document,
        publish_date: publishDate.toISO(),
        id: document.id!
      });
    } else {
      console.warn("Failed to detect publish date for document", document);
    }
  }

  if (updateDocuments.length > 0) {
    const result = await elastic.updateDocuments({
      documents: updateDocuments
    });

    console.log(`Updated ${result.length} document languages.`);
  }
};

export const main = middyfy(detectNewsPublished);
