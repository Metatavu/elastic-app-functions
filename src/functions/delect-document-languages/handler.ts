import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getElastic } from "src/elastic";
import config from "../../config";
import { middyfy } from "@libs/lambda";
import { DrupalSettingsJson } from "../../drupal/types";
import { franc } from "franc";
import { iso6393To1 } from "iso-639-3";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const SUPPORTED_LANGUAGES = [ "fi", "en", "sv", "et", "no", "lt", "fa", "ru", "de", "fr", "it", "ro", "sk", "so", "es", "la" ];
const LANGUAGE_UNDEFINED = "C";
const BATCH_SIZE = 100;
const UNLOCALIZABLE_CONTENT_TYPES = ["application/pdf", "text/calendar; charset=UTF-8", "application/msword", "application/zip", "image/jpeg"];

/**
 * Returns list of supported languages in 639-1 format
 * 
 * @returns list of supported languages in 639-1 format
 */
const getLanguages = (): string[] => {
  return [ ...SUPPORTED_LANGUAGES, LANGUAGE_UNDEFINED ];
}

/**
 * Resolves language from Drupal settings JSON
 * 
 * @param $ cheerio document
 * @returns language or null if not resolved
 */
const resolveLanguageFromDrupalSettings = ($: cheerio.CheerioAPI): string | null => {
  const element = $("script[data-drupal-selector=drupal-settings-json]");

  if (!element.length) {
    return null;
  }

  const jsonString = element.html();
  if (!jsonString.length) {
    return null;
  }

  const config: DrupalSettingsJson = JSON.parse(jsonString);

  return config?.path?.currentLanguage || null;
}

/**
 * Detects language from body content
 * 
 * @param bodyContent body content
 * @returns language or null if not detected
 */
const detectFromContents = (bodyContent: string): string | null => {
  const result = franc(bodyContent);
  if (result === "und") {
    return null;
  }

  return iso6393To1[result] || null;
}

/**
 * Detects language for given URL
 * 
 * @param url URL
 * @returns language or null if not detected
 */
const detectLanguageForUrl = async (url: string): Promise<string | null> => {
  const documentUrl = new URL(url); 
  const pageResponse = await fetch(documentUrl.toString());
  const contentType = pageResponse.headers.get("content-type");
  if (contentType.startsWith("text/html")) {
    const pageContent = await pageResponse.text();
    const $ = cheerio.load(pageContent);

    const languageFromDrupalJson = resolveLanguageFromDrupalSettings($);
    if (languageFromDrupalJson) {
      return languageFromDrupalJson;
    }
  } else {
    if (contentType.startsWith("image/")) {
      return LANGUAGE_UNDEFINED;
    }

    if (contentType.startsWith("application/pdf")) {
      return null;
    }

    console.warn(`Failed to resolve language for ${url} with content type ${contentType}`);
    return null;
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
    
  if (body_content) {
    const lowerBodyContent = body_content.toLowerCase();

    if ("ipsum".indexOf(lowerBodyContent) || "lorem".indexOf(lowerBodyContent)) {
      return "la";
    }

    const languageFromBodyContent = detectFromContents(body_content);
    if (languageFromBodyContent) {
      return languageFromBodyContent;
    }
  }

  const result = await detectLanguageForUrl(url);
  if (!result) {
    if (!body_content) {
      return LANGUAGE_UNDEFINED;
    }    

    console.warn(`Failed to resolve language for ${url}`);
  }

  return result;
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

  // Search result values are stored in { raw: "value" } format, this flattens them
  const flattenedDocuments = results.map(result =>
    Object.keys(result).reduce<{ [key: string]: any }>((document, key) => {
      const value = result[key]?.raw;
      return value ? { ...document, [key]: value } : document;
    }, {})
  );

  const updateDocuments = [];

  for (const document of flattenedDocuments) {
    const language = await detectLanguageForDocument(document);
    if (language) {
      if (!languages.includes(language)) {
        console.warn(`Detected unsupported language ${language} from ${JSON.stringify(document)}`)
      }

      updateDocuments.push({ ...document, language: language });
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
