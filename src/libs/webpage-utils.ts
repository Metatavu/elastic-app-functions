import * as cheerio from "cheerio";
import fetch, { Response } from "node-fetch";
import { Document } from "src/elastic";
import { DrupalSettingsJson } from "@types";

/**
 * Gets element from pages head
 * 
 * @param pageResponse Response
 * @param elementName head element name
 * @returns Element, if found
 */
const getHeadElement = async (pageResponse: Response, elementName: string) => {
  const contentType = pageResponse.headers.get("content-type");
  
  if (!contentType?.startsWith("text/html")) {
    return;
  }
  
  const pageContent = await pageResponse.text();
  const $ = cheerio.load(pageContent);
  
  return $("head").find(elementName);
};

/**
 * Gets page response
 * 
 * @param id document id
 * @param url document url
 * @returns Response
 */
export const getPageResponse = async ({ id, url }: Document) => {
  if (!url) {
    console.error(`Document ${id} does not contain URL`);
    return;
  }
  
  return await fetch(new URL(url as string).toString());
};

/**
 * Gets Documents category attribute from pages meta tags
 * 
 * @param pageResponse Response
 * @return category attribute
 */
export const getCategoryAttribute = async (pageResponse: Response) => {
  const categoryElement = await getHeadElement(pageResponse, "meta[name=helfi_content_type]");
  if (!categoryElement) {
    return;
  }
  
  return categoryElement.attr("content");
};

/**
 * Gets external ID from crawled pages headers drupal-settings-json script element.
 * 
 * Results null if no external ID is found in there.
 * 
 * @param element element
 * @returns External ID if found
 */
export const getExternalIdFromElement = async (pageResponse: Response) => {
  const drupalSettingsElement = await getHeadElement(pageResponse, "script[data-drupal-selector=drupal-settings-json]");
  
  if (!drupalSettingsElement) {
    return;
  }
  
  if (!drupalSettingsElement.length) {
    return null;
  }
  
  const jsonString = drupalSettingsElement.html();
  if (!jsonString?.length) {
    return null;
  }
  
  const config: DrupalSettingsJson = JSON.parse(jsonString);
  if (!config) {
    return null;
  }
  
  const currentPath = config?.path?.currentPath;
  if (!currentPath) {
    return null;
  }
  
  if (currentPath.match(/\d+/g)) {
    const numbers = currentPath.match(/\d+/g);
    
    if (!numbers) {
      return null;
    }
    return parseInt(numbers.join());
  }
};