import { getDepartmentsFromRegistry } from "@libs/departments-registry-utils";
import { createDocumentsFromService, searchResultsToDocuments } from "@libs/document-utils";
import { middyfy } from "@libs/lambda";
import { runInQueue } from "@libs/queue-utils";
import { compareServices, getSuomiFiServicesByOrganization } from "@libs/suomifi-utils";
import { ServiceDocument, SupportedLanguages } from "@types";
import _ from "lodash";
import config from "src/config";
import { ContentCategory, Elastic, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD, SUOMIFI_ORGANIZATION_ID } = config;
const INDEX_CHUNK_SIZE = 50;

/**
 * Gets paginated Elastic Search results filtered by given external service ids.
 *
 * @param elastic Elastic
 * @param externalServiceIds external service ids
 * @returns Search results
 */
const getPaginatedElasticResults = async (elastic: Elastic, externalServiceIds: string[]) => {

  let currentPageNumber = 1;
  let retrievedAllDocuments = false;
  const retrievedDocuments: { [key: string]: any }[] = [];

  do {
    const { results, meta } = await elastic.searchDocuments({
      query: "",
      page: {
        size: 1000,
        current: currentPageNumber
      },
      filters: {
        all: [
          { meta_content_category: [ ContentCategory.SERVICE, ContentCategory.EXTERNAL ] },
          { external_service_id: externalServiceIds }
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
 * Scheduled lambda for creating documents for external services
 */
const createDocumentFromExternalService = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });
  const suomiFiServices = await getSuomiFiServicesByOrganization(SUOMIFI_ORGANIZATION_ID);
  console.log(`Found ${suomiFiServices?.length} Suomi.fi services`);
  const departments = await getDepartmentsFromRegistry();
  console.log(`Found ${departments?.length} TPR services`);

  if (!suomiFiServices || !departments) return;

  const externalServiceIds = departments.map(department => department.id.toString());
  const searchResults = await getPaginatedElasticResults(elastic, externalServiceIds)
  const retrievedDocuments = searchResultsToDocuments(searchResults);
  const distinctExternalServiceIds = Array.from(new Set([ ...retrievedDocuments.map(document => parseInt(document.external_service_id as string)) ]));
  const filteredDepartments = departments.filter(department => !distinctExternalServiceIds.find(id => id === department.id));
  console.log(`Found ${distinctExternalServiceIds.length} Elastic documents with TPR service ID`);

  const matchingDocuments: ServiceDocument[] = [];

  console.log(`[${new Date()}] Starting to process non indexed services...`);
  await Promise.all(filteredDepartments.map(async department => {
    const matchingSuomiFiService = suomiFiServices.find(service => compareServices(service, department, SupportedLanguages.FI));

    if (matchingSuomiFiService) {
      const createdDocuments = await createDocumentsFromService(matchingSuomiFiService, department);
      matchingDocuments.push(...createdDocuments);
      console.log(`Created document (${matchingDocuments.length}) for ${department.title}`);
    }
  }));

  console.log(`[${new Date()}] Starting to index new documents....`);

  const matchingDocumentsChunks = _.chunk(matchingDocuments, INDEX_CHUNK_SIZE);

  await runInQueue(matchingDocumentsChunks.map(documents =>
    async () => {
      const result = await elastic.updateDocuments({
        documents: documents
      });

      console.log(`Indexed ${result.length} / ${matchingDocumentsChunks} documents!`);
    }
  ));
}

export const main = middyfy(createDocumentFromExternalService);