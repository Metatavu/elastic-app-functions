import { Document, getElastic } from "src/elastic";
import config from "src/config";
import { middyfy } from "@libs/lambda";
import { searchResultsToDocuments } from "@libs/document-utils";
import { detectLanguageForDocument } from "@libs/language-detection-utils";
import { CALENDAR_CONTENT_TYPES,DOCUMENT_CONTENT_TYPES,IMAGE_CONTENT_TYPES, OTHER_CONTENT_TYPES, SUPPORTED_LANGUAGES } from "src/constants";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

const LANGUAGE_UNDEFINED = "C";
const BATCH_SIZE = 100;

const UNLOCALIZABLE_CONTENT_TYPES = [
  ...DOCUMENT_CONTENT_TYPES,
  ...OTHER_CONTENT_TYPES,
  ...CALENDAR_CONTENT_TYPES,
  ...IMAGE_CONTENT_TYPES
];

/**
 * Returns list of supported languages in 639-1 format
 *
 * @returns list of supported languages in 639-1 format
 */
const getLanguages = (): string[] => {
  return [ ...SUPPORTED_LANGUAGES, LANGUAGE_UNDEFINED ];
}

/**
 * Scheduled lambda for adding language to elastic documents without one
 */
const detectDocumentLanguages = async () => {
  const languages = getLanguages();

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
      none: [
        { language: languages },
        { content_type: UNLOCALIZABLE_CONTENT_TYPES }
      ]
    }
  });

  console.log(`Detecting language for ${meta.page.size} / ${meta.page.total_results} documents.`);

  if (!results.length) return;

  const documents = searchResultsToDocuments(results);
  const updateDocuments: Document[] = [];

  for (const document of documents) {
    const language = await detectLanguageForDocument(document);

    if (language) {
      if (!languages.includes(language)) {
        console.warn(`Detected unsupported language ${language} from ${JSON.stringify(document)}`)
      }

      updateDocuments.push({ ...document, language: language, id: document.id! });
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
