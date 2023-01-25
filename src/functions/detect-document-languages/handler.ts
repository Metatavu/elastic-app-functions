import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { Document, getElastic } from "src/elastic";
import config from "src/config";
import { middyfy } from "@libs/lambda";
import { franc } from "franc";
import { iso6393To1 } from "iso-639-3";
import { searchResultsToDocuments } from "@libs/document-utils";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const SUPPORTED_LANGUAGES = [ "fi", "en", "sv", "et", "no", "lt", "fa", "ru", "de", "fr", "it", "ro", "sk", "so", "es", "la" ];
const LANGUAGE_UNDEFINED = "C";
const BATCH_SIZE = 100;
const UNLOCALIZABLE_CONTENT_TYPES = [ "application/pdf", "text/calendar; charset=UTF-8", "application/msword", "application/zip", "image/jpeg" ];

/**
 * Returns list of supported languages in 639-1 format
 *
 * @returns list of supported languages in 639-1 format
 */
const getLanguages = (): string[] => {
  return [ ...SUPPORTED_LANGUAGES, LANGUAGE_UNDEFINED ];
}
/**
 * Detects language from body content
 *
 * @param bodyContent body content
 * @returns language or null if not detected
 */
const detectFromContents = (bodyContent: string) => {
  const result = franc(bodyContent);
  if (result === "und") {
    return;
  }

  return iso6393To1[result];
}

/**
 * Detects language for given URL
 *
 * @param url URL
 * @returns language or null if not detected
 */
const detectLanguageFromMetaTags = async (url: string) => {
  const documentUrl = new URL(url);
  const pageResponse = await fetch(documentUrl.toString());
  const contentType = pageResponse.headers.get("content-type");
  if (contentType?.startsWith("text/html")) {
    const pageContent = await pageResponse.text();
    const $ = cheerio.load(pageContent);
    
    const htmlLangValue = $("html").attr("lang");
    
    if (htmlLangValue) {
      return htmlLangValue;
    }
    
    const element = $("script[data-drupal-selector=drupal-settings-json]");

    if (!element.length) return;
  
    const jsonString = element.html();
  
    if (!jsonString?.length) return;
  
    return JSON.parse(jsonString)?.path?.currentLanguage;
  } else {

    console.warn(`Failed to resolve language for ${url} with content type ${contentType}`);
    return;
  }
}

/**
 * Resolves language for a document
 *
 * @param document document
 * @returns language or null if could not be resolved
 */
const detectLanguageForDocument = async (document: any): Promise<string | null> => {
  const { id, url, url_path_dir1, url_path_dir2, body_content }: {
    id?: string,
    url?: string,
    url_path_dir1?: string,
    url_path_dir2?: string,
    body_content?: string
  } = document;

  if (!id || !url) {
    console.error(`Document ${id} does not contain URL`);
    return null;
  }

  if (url_path_dir1 && SUPPORTED_LANGUAGES.includes(url_path_dir1)) {
    return url_path_dir1;
  }

  if (url_path_dir2 && SUPPORTED_LANGUAGES.includes(url_path_dir2)) {
    return url_path_dir2;
  }

  const result = await detectLanguageFromMetaTags(url);
  if (result) {
    return result;
  }
  
  if (body_content) {
    const languageFromBodyContent = detectFromContents(body_content);
    if (languageFromBodyContent) {
      return languageFromBodyContent;
    }
    const lowerBodyContent = body_content.toLowerCase();

    if ("ipsum".indexOf(lowerBodyContent) || "lorem".indexOf(lowerBodyContent)) {
      // lorem ipsum is interpter as "latin", this is necessary because there actually is lorem ipsum
      // in target sites
      return "la";
    }

  }

  return null;
}

/**
 * Scheduled lambda for adding language to elastic documents without one
 */
const detectDocumentLanguages = async () => {
  const languages = getLanguages();

  const languageFilter = languages.map(language => ({
    "language": language
  }));

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
          none: languageFilter
        },
        {
          none: [ { "content_type": UNLOCALIZABLE_CONTENT_TYPES } ]
        }
      ]
    }
  });

  console.log(`Detecting language for ${meta.page.size} / ${meta.page.total_results} documents.`);

  if (!results.length) return;
  
  const documents = searchResultsToDocuments(results);
  const updateDocuments: Document[] = [];

  for (const document of documents) {
    const language = await detectLanguageForDocument(document);
    if (language) {
      if (!languages.includes(language)) {
        console.warn(`Detected unsupported language ${language} from ${JSON.stringify(document)}`)
      }

      updateDocuments.push({ ...document, language: language, id: document.id! });
    } else {
      console.warn("Failed for to detect language for document", document);
    }
  }

  if (updateDocuments.length > 0) {
    const result = await elastic.updateDocuments({
      documents: updateDocuments
    });

    console.log(`Updated ${result.length} document languages.`);
  } else {
    console.log(`Updated 0 document languages.`);
  }
};

export const main = middyfy(detectDocumentLanguages);
