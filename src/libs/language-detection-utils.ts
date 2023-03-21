import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { franc } from "franc";
import { iso6393To1 } from "iso-639-3";
import { Document } from "src/elastic";
import { Type } from "@sinclair/typebox";
import { validateSchema } from "./validation-utils";
import { SUPPORTED_LANGUAGES } from "src/constants";

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
    if (htmlLangValue) return htmlLangValue;

    const element = $("script[data-drupal-selector=drupal-settings-json]");
    if (!element.length) return;

    const jsonString = element.html();
    if (!jsonString?.length) return;

    return JSON.parse(jsonString)?.path?.currentLanguage as string;
  } else {
    console.warn(`Ignored document with URL ${url} with content type ${contentType}`);
    return;
  }
};

/**
 * Schema to validate that document schema
 */
const documentSchema = Type.Object({
  id: Type.String(),
  url: Type.String(),
  url_path_dir1: Type.Optional(Type.String()),
  url_path_dir2: Type.Optional(Type.String()),
  body_content: Type.Optional(Type.String())
});

/**
 * Resolves language for a document
 *
 * @param document document
 * @returns language or null if could not be resolved
 */
export const detectLanguageForDocument = async (document: Document) => {
  const validDocument = validateSchema(document, documentSchema);

  if (!validDocument) {
    console.error(`Document ${document.id} is not valid.`);
    return;
  }

  const { url, url_path_dir1, url_path_dir2, body_content } = document;

  if (url_path_dir1 && SUPPORTED_LANGUAGES.includes(url_path_dir1)) return url_path_dir1;
  if (url_path_dir2 && SUPPORTED_LANGUAGES.includes(url_path_dir2)) return url_path_dir2;

  const languageFromMetaTags = await new Promise<string | undefined>(async resolve => {
    const timeout = setTimeout(() => resolve(undefined), 10_000);
    try {
      resolve(await detectLanguageFromMetaTags(url));
    } catch {
      resolve(undefined);
    }

    clearTimeout(timeout);
  });

  if (languageFromMetaTags) return languageFromMetaTags;

  if (body_content) {
    const languageFromBodyContent = detectLanguageFromContents(body_content);

    if (languageFromBodyContent) return languageFromBodyContent;

    const lowerCaseBodyContent = body_content.toLowerCase();

    if ("ipsum".indexOf(lowerCaseBodyContent) || "lorem".indexOf(lowerCaseBodyContent)) {
      // lorem ipsum is interpret as "latin", this is necessary because there actually is lorem ipsum in target sites
      return "la";
    }
  }

  return;
};