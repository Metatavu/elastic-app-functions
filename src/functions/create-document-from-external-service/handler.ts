import { getDepartmentsFromRegistry } from "@libs/departments-registry-utils";
import { createDocumentsFromService, searchResultsToDocuments } from "@libs/document-utils";
import { middyfy } from "@libs/lambda";
import { compareServices, getSuomifiServices } from "@libs/suomifi-utils";
import { SupportedLanguages } from "@types";
import config from "src/config";
import { ContentCategory, Elastic, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
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
  const suomifiServices = await getSuomifiServices();
  const departments = await getDepartmentsFromRegistry();
  
  if (!suomifiServices || !departments) {
    return;
  }
  
  const externalServiceIds = departments.map(department => department.id.toString());
  const searchResults = await getPaginatedElasticResults(elastic, externalServiceIds)
  const retrievedDocuments = searchResultsToDocuments(searchResults);
  const distinctExternalServiceIds = Array.from(new Set([ ...retrievedDocuments.map(document => parseInt(document.external_service_id as string)) ]));
  const filteredDepartments = departments.filter(department => !distinctExternalServiceIds.find(id => id === department.id));
  
  const matches: any[] = [];
  
  for (const department of filteredDepartments) {
      const matchingSuomifiService = suomifiServices.find(service => compareServices(service, department, SupportedLanguages.FI));
  
      if (matchingSuomifiService) {
        matches.push(...createDocumentsFromService(matchingSuomifiService, department));
      }
  };
  
  for (let i = 0; i < matches.length; i += INDEX_CHUNK_SIZE) {
    const chunk = matches.slice(i, i + INDEX_CHUNK_SIZE);
    const result = await elastic.updateDocuments({
      documents: chunk
    });
    console.log(`Indexed ${result.length} documents!`);
  }
}

export const main = middyfy(createDocumentFromExternalService);