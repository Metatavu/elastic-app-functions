import { getDepartmentsFromRegistry } from "@libs/departments-registry-utils";
import { createDocumentsFromService } from "@libs/document-utils";
import { middyfy } from "@libs/lambda";
import { compareServices, getSuomifiServices } from "@libs/suomifi-utils";
import { SupportedLanguages } from "@types";
import config from "src/config";
import { ContentCategory, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const INDEX_CHUNK_SIZE = 50;

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
  console.log(`suomifi results: ${suomifiServices.length}`)
  console.log(`departments results: ${departments.length}`)
  
  const { results, meta } = await elastic.searchDocuments({
    query: "",
    page: {
      size: 1000
    },
    filters: {
      all: [
        { meta_content_category: [ ContentCategory.SERVICE, ContentCategory.EXTERNAL ] },
        { external_service_id: departments.map(department => department.id.toString()) }
      ]
    }
  });
  
  console.log(`meta size: ${meta.page.total_results}`)
  const distinctCategories = Array.from(new Set([ ...results.map(result => result.meta_content_category.raw) ]))
  console.log(distinctCategories)
  console.log(`Elastic results: ${results.length}`)
  const distinctExternalServerIds = Array.from(new Set([ ...results.map(result => parseInt(result.external_service_id.raw)) ]));
  const filteredDepartments = departments.filter(department => !distinctExternalServerIds.find(id => id === department.id));
  
  const matches: any[] = [];
  
  for (const department of filteredDepartments) {
      const matchingSuomifiService = suomifiServices.find(service => compareServices(service, department, SupportedLanguages.FI));
  
      if (matchingSuomifiService) {
        matches.push(...createDocumentsFromService(matchingSuomifiService, department));
      }
  };
  
  console.log(matches.length);
  for (let i = 0; i < matches.length; i += INDEX_CHUNK_SIZE) {
    const chunk = matches.slice(i, i + INDEX_CHUNK_SIZE);
    const result = await elastic.updateDocuments({
      documents: chunk
    });
    console.log(`Indexed ${result.length} documents!`);
  }
}

export const main = middyfy(createDocumentFromExternalService);