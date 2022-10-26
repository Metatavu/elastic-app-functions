import { Document } from "src/elastic";

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