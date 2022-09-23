import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { ContentCategory, getElastic } from "src/elastic";
import config from "../../config";
import { middyfy } from "@libs/lambda";
import { DateTime } from "luxon";
import { parseHelFiNewsDate } from "@libs/date-utils";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const BATCH_SIZE = 10;

/**
 * Detects language for given URL
 * 
 * @param url URL
 * @returns language or null if not detected
 */
const detectNewsPublishedDateFromUrl = async (url: string): Promise<DateTime | null> => {
  const documentUrl = new URL(url); 
  const pageResponse = await fetch(documentUrl.toString());
  const contentType = pageResponse.headers.get("content-type");

  if (contentType.startsWith("text/html")) {
    const pageContent = await pageResponse.text();
    const $ = cheerio.load(pageContent);
    const publishedElement = $("time[itemprop='datePublished']");
    if (publishedElement.length) {      
      return parseHelFiNewsDate(publishedElement.attr("datetime"));
    }
  }

  return null;
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

  const result = await detectNewsPublishedDateFromUrl(url);
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

  // Search result values are stored in { raw: "value" } format, this flattens them
  const flattenedDocuments = results.map(result =>
    Object.keys(result).reduce<{ [key: string]: any }>((document, key) => {
      const value = result[key]?.raw;
      return value ? { ...document, [key]: value } : document;
    }, {})
  );

  const updateDocuments = [];

  for (const document of flattenedDocuments) {
    const publishDate = await detectNewsPublishedDateFromDocument(document);
    if (publishDate && publishDate.isValid) {
      updateDocuments.push({ ...document, publish_date: publishDate.toISO() });
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
