import { searchResultsToDocuments } from "@libs/document-utils";
import { middyfy } from "@libs/lambda";
import { detectLanguageForDocument } from "@libs/language-detection-utils";
import { runInQueue } from "@libs/queue-utils";
import _ from "lodash";
import config from "src/config";
import { ALL_CONTENT_TYPES } from "src/constants";
import { Document, Elastic, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const LANGUAGE_CHECK_CHUNK_SIZE = 500;

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

    const { results, meta } = await elastic.searchDocuments({
      query: "",
      page: {
        size: 1000,
        current: currentPageNumber
      },
      sort: [
        { url: "asc" }
      ],
      filters: {
        any: [{
          meta_content_category: ["service", "unit", "news", "uncategorized"]
        }],
        none: [{
          language: ["fi", "en", "sv"]
        }, {
          // All content types can be ignored as intended documents
          // do not have any content type in Elastic document.
          content_type: ALL_CONTENT_TYPES
        }]
      }
    });

    if (meta.page.current === meta.page.total_pages) {
      retrievedAllDocuments = true;
    } else {
      currentPageNumber++;
    }

    retrievedDocuments.push(...results);
  } while (!retrievedAllDocuments);

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

  console.log(`Found ${retrievedDocuments.length} documents with incorrect language. Processing...`);

  const updatedDocuments: Document[] = [];

  const retrievedDocumentChunks = _.chunk(retrievedDocuments, LANGUAGE_CHECK_CHUNK_SIZE);

  let processedInTotal = 0;
  for (const chunk of retrievedDocumentChunks) {
    await Promise.allSettled(chunk.map(async document => {
      const detectedLanguage = await detectLanguageForDocument(document);

      if (detectedLanguage !== document.language) {
        updatedDocuments.push({
          ...document,
          last_language_check: new Date().toLocaleDateString(),
          language: detectedLanguage
        });
      }

      processedInTotal++;

      const displayProcessedInTotal = `${processedInTotal}`.padStart(`${retrievedDocuments.length}`.length, " ");

      const logs = [
        `${displayProcessedInTotal} / ${retrievedDocuments.length}`,
        detectedLanguage !== undefined ? "   OK" : "ERROR",
        document.id,
        document.language || "-",
        detectedLanguage || "PARSING FAILED"
      ];

      console.log(logs.join(" | "));
    }));
  }

  console.log(`${updatedDocuments.length} from ${retrievedDocuments.length} documents require language update. Updating..`);

  let totalUpdatedCount = 0;

  const updatedDocumentChunks = _.chunk(updatedDocuments, 100); // Elastic can only update 100 documents at a time

  const updateRequests = updatedDocumentChunks.map(documents =>
    async () => {
      const result = await elastic.updateDocuments({ documents: documents });
      totalUpdatedCount += result.length;
      console.log("Documents updated in total:", totalUpdatedCount);
    }
  );

  const results = await runInQueue(updateRequests);

  console.log(`DONE. Updated ${totalUpdatedCount} from ${retrievedDocuments.length} documents in total.`);

  const errors = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (errors.length) console.error("ERRORS:");
  errors.forEach(error => console.error(error.reason));
};

export const main = middyfy(updateDocumentsLanguages);