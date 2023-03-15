import { searchResultsToDocuments } from "@libs/document-utils";
import { middyfy } from "@libs/lambda";
import { detectLanguageForDocument } from "@libs/language-detection-utils";
import config from "src/config";
import { Document, Elastic, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const LANGUAGE_CHECK_CHUNK_SIZE = 500;
const INDEX_CHUNK_SIZE = 100;

const IGNORABLE_CONTENT_TYPES = [
  "text/calendar; charset=UTF-8",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/calendar; charset=windows-1252",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/msword",
  "application/octet-stream",
  "text/html; charset=ISO-8859-1",
  "application/rss+xml",
  "image/vnd.dwg",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  "text/plain; charset=UTF-8",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/rtf",
  "audio/mpeg",
  "application/vnd.ms-excel",
  "text/plain; charset=ISO-8859-1",
  "application/vnd.oasis.opendocument.text",
  "image/svg+xml",
  "text/html; charset=UTF-8",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "image/gif",
  "image/vnd.dgn; version=8",
  "text/plain; charset=windows-1252"
]

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
  const retrievedDocuments: Document[] = [];
  
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
          { "language": [ "fi", "sv", "en" ] },
          { "content_type": IGNORABLE_CONTENT_TYPES }
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
const getTimestamp = () => {
  return `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
}
/**
 * Scheduled lambda for updating documents languages
 */
const updateDocumentsLanguages = async () => {
  console.log(`[${getTimestamp()}] Starting to update documents language...`)
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });
  
  const searchResults = await getPaginatedElasticResults(elastic);
  const retrievedDocuments = searchResultsToDocuments(searchResults).filter(doc => !["image", "pdf"].find((i) => (doc["content_type"] as string || "").includes(i)));
  
  console.log(`Found ${retrievedDocuments.length} documents.`);
  
  const updatedDocuments: Document[] = [];
  let processed = 0;
  for (let i = 0; i < retrievedDocuments.length; i += LANGUAGE_CHECK_CHUNK_SIZE) {
    const chunk = retrievedDocuments.slice(i, i + LANGUAGE_CHECK_CHUNK_SIZE);
    
    await Promise.allSettled(chunk.map(async document => {
      processed++;
      try {
        const detectedLanguage = await detectLanguageForDocument(document);
        if (detectedLanguage !== document.language) {
          console.log(`[${getTimestamp()}] Document (${processed}/${retrievedDocuments.length}) processed!`)
          updatedDocuments.push({
            ...document,
            last_language_check: new Date().toLocaleDateString(),
            language: detectedLanguage
          });
        }
      } catch (e) {
        console.log(e);
      }
      
    }));
  }
  
  console.log(`Found ${updatedDocuments.length} documents with updated language`);
  console.time("total");
  for (let i = 0; i < updatedDocuments.length; i += INDEX_CHUNK_SIZE) {
    const chunk = updatedDocuments.slice(i, i + INDEX_CHUNK_SIZE);
    console.time("req")
    const result = await elastic.updateDocuments({
      documents: chunk as Document[]
    });
    console.timeEnd("req")
    console.log(`Indexed ${result.length} documents!`);
  }
  console.timeEnd("total")
  console.log(`[${getTimestamp()}] Finished updating documents languages!`)

};

export const main = middyfy(updateDocumentsLanguages);