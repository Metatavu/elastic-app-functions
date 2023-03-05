import { searchResultsToDocuments } from "@libs/document-utils";
import { middyfy } from "@libs/lambda";
import { detectLanguageForDocument } from "@libs/language-detection-utils";
import config from "src/config";
import { Document, Elastic, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const LANGUAGE_CHECK_CHUNK_SIZE = 500;
const INDEX_CHUNK_SIZE = 100;

/**
 * Gets paginated Elastic Search results filtered by given external service ids.
 * 
 * @param elastic Elastic
 * @param externalServiceIds external service ids 
 * @returns Search results
 */
const getPaginatedElasticResults = async (elastic: Elastic) => {
  let currentPageNumber = 1;
  let retrievedAllDocuments = false;
  const retrievedDocuments: { [key: string]: any }[] = [];
  const retrievedIds: string[] = [];
  
  do {
    console.log(`Getting results page ${currentPageNumber} from Elastic...`);
    const { results, meta,  } = await elastic.searchDocuments({
      query: "",
      page: {
        size: 1000,
        current: currentPageNumber
      },
      sort: [
        { url: "asc" }
      ],
      filters: {
        none: [
          { last_language_check: new Date().toLocaleDateString() }
        ]
      }
    });
    
    if (meta.page.current === meta.page.total_pages) {
      retrievedAllDocuments = true;
    } else {
      currentPageNumber++;
    }

    retrievedDocuments.push( ...results )
  } while (!retrievedAllDocuments)
  
  return retrievedDocuments;
};

/**
 * Scheduled lambda for updating documents languages
 */
const updateDocumentsLanguages = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });
  
  const searchResults = await getPaginatedElasticResults(elastic);
  const retrievedDocuments = searchResultsToDocuments(searchResults);
  
  console.log(`Found ${retrievedDocuments.length} documents.`);
  
  const updatedDocuments: Document[] = [];
  
  for (let i = 0; i < retrievedDocuments.length; i += LANGUAGE_CHECK_CHUNK_SIZE) {
    const chunk = retrievedDocuments.slice(i, i + LANGUAGE_CHECK_CHUNK_SIZE);
    
    await Promise.allSettled(chunk.map(async document => {
      const detectedLanguage = await detectLanguageForDocument(document);
      console.log(`detectedLanguage: ${detectedLanguage}`)
      console.log(`document language: ${document.language}`)
      
      if (detectedLanguage !== document.language) {
        updatedDocuments.push({
          ...document,
          last_language_check: new Date().toLocaleDateString(),
          language: detectedLanguage
        });
      }
    }));
  }
  
  console.log(`Found ${updatedDocuments.length} documents with updated language`);
  
  for (let i = 0; i < updatedDocuments.length; i += INDEX_CHUNK_SIZE) {
    const chunk = updatedDocuments.slice(i, i + INDEX_CHUNK_SIZE);
    const result = await elastic.updateDocuments({
      documents: chunk as Document[]
    });
    console.log(`Indexed ${result.length} documents!`);
  }
  
};

export const main = middyfy(updateDocumentsLanguages);