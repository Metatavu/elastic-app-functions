import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { franc } from "franc";
import { iso6393To1 } from "iso-639-3";

/**
 * Constant for supported languages for documents
 */
export const SUPPORTED_LANGUAGES = [ "fi", "en", "sv", "et", "no", "lt", "fa", "ru", "de", "fr", "it", "ro", "sk", "so", "es", "la" ];

/**
 * Detects language from body content
 *
 * @param bodyContent body content
 * @returns language or null if not detected
 */
const detectLanguageFromContents = (bodyContent: string) => {
  const result = franc(bodyContent);
  if (result === "und") {
    return;
  }

  return iso6393To1[result];
};

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
};

/**
 * Resolves language for a document
 * 
 * @param document document
 * @returns language or null if could not be resolved
 */
export const detectLanguageForDocument = async (document: any) => {
  const { id, url, url_path_dir1, url_path_dir2, body_content }: {
    id?: string,
    url?: string,
    url_path_dir1?: string,
    url_path_dir2?: string,
    body_content?: string
  } = document;
  
  if (!id || !url) {
    // console.error(`Document ${id} does not contain URL`);
    return;
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
    const languageFromBodyContent = detectLanguageFromContents(body_content);
    
    if (languageFromBodyContent) {
      return languageFromBodyContent;
    }
    
    const lowerCaseBodyContent = body_content.toLowerCase();
    
    if ("ipsum".indexOf(lowerCaseBodyContent) || "lorem".indexOf(lowerCaseBodyContent)) {
      // lorem ipsum is interpret as "latin", this is necessary because there actually is lorem ipsum in target sites
      return "la";
    }
  }
  
  return;
};