import { Service, SupportedLanguages } from "@types";
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
 * Creates document based on properties from Suomi.fi and TPR
 * 
 * @params service service
 * @params department department
 * @returns Document
 */
export const createDocumentsFromService = (service: Service, department: Department) => (
  service.serviceNames.map(serviceName =>{
    const language = serviceName.language as SupportedLanguages;
    const localizedDescription = getServiceSummary(service, language);
    let url = "https://www.suomi.fi/";
    
    switch (language) {
      case SupportedLanguages.FI: url += `palvelut/${service.id}`;
        break;
      case SupportedLanguages.EN: url += `services/${service.id}`;
        break;
      case SupportedLanguages.SV: url += `service/${service.id}`;
    }
    return {
      title: getServiceName(service, language),
      meta_content_category: ContentCategory.EXTERNAL,
      meta_description: language === SupportedLanguages.FI ? department.title : localizedDescription,
      external_service_id: department.id,
      language: language,
      external_url: url
    };
  })
);