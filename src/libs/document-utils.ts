import { Service, SupportedLanguages } from "@types";
import fetch from "node-fetch";
import { ContentCategory, Document } from "src/elastic";
import { Department } from "./departments-registry-utils";
import { getServiceName, getServiceSummary } from "./suomifi-utils";

/**
 * Flattens search result values to documents.
 *
 * Elastic search results contains their values in { raw: "value" } format. This flattens the results
 * and returns documents with values from search results.
 *
 * @param searchResults search results
 * @returns
 */
export const searchResultsToDocuments = (searchResults: { [key: string]: any; }[]) => (
  searchResults.map<Document>(result => {
    const { id, ...otherProperties } = result;

    const entries = Object.entries(otherProperties);

    const flattenedProperties = entries.reduce<{ [key: string]: unknown }>((document, [key, value]) =>
      value?.raw ? { ...document, [key]: value.raw } : document
      , {});

    return {
      id: id.raw,
      ...flattenedProperties
    };
  })
);

/**
 * Resolves services final URL.
 * URL without slug redirects to the correct, localized, page. Fetch handles redirecting responses automatically and therefore no looping or anything is needed.
 *
 * @param service service
 * @param basePath base path
 * @returns service url
 */
const resolveServiceUrl = async (service: Service, basePath: string) => {
    return (await fetch(basePath + service.id, { method: "HEAD" })).url
};

/**
 * Gets localized Service URL by language
 *
 * @param language language
 * @param service service
 * @returns service url
 */
const getLocalizedServiceUrl = async (language: SupportedLanguages, service: Service) => ({
  [SupportedLanguages.FI]: await resolveServiceUrl(service, "https://www.suomi.fi/palvelut/"),
  [SupportedLanguages.EN]: await resolveServiceUrl(service, "https://www.suomi.fi/services/"),
  [SupportedLanguages.SV]: await resolveServiceUrl(service, "https://www.suomi.fi/service/")
})[language];

/**
 * Creates document based on properties from Suomi.fi and TPR
 *
 * @params service service
 * @params department department
 * @returns Document
 */
export const createDocumentsFromService = async (service: Service, department: Department) => {
  const createdDocuments = await Promise.all(service.serviceNames.map(async serviceName => {
    const language = serviceName.language as SupportedLanguages;
    const localizedDescription = getServiceSummary(service, language);

    return {
      title: getServiceName(service, language),
      meta_content_category: ContentCategory.EXTERNAL,
      meta_description: language === SupportedLanguages.FI ? department.description_short : localizedDescription,
      external_service_id: department.id,
      language: language,
      external_url: await getLocalizedServiceUrl(language, service)
    };
  }));

  return createdDocuments;
};