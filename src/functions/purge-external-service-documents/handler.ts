import { searchResultsToDocuments } from "@libs/document-utils";
import { middyfy } from "@libs/lambda";
import _ from "lodash";
import fetch from "node-fetch";
import config from "src/config";
import { ContentCategory, Document, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;
const SUOMIFI_CHUNK_SIZE = 50;
const DELETE_CHUNK_SIZE = 10;

/**
 * Scheduled lambda for purging external service documents that respond with 404
 */
const purgeExternalServiceDocuments = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const documents = searchResultsToDocuments(await elastic.getPaginatedSearchResults({
    query: "",
    filters: {
      all: [
        { meta_content_category: [ ContentCategory.EXTERNAL ]}
      ]
    }
  }));
  const suomiFiServices = documents.filter(document => (document.external_url as string).startsWith("https://www.suomi.fi/"));
  const chunks = _.chunk(suomiFiServices, SUOMIFI_CHUNK_SIZE);
  let removedServices: Document[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const suomiFiServiceChunk = chunks[i];
    await Promise.allSettled(suomiFiServiceChunk.map(async (suomiFiService) => {
      const response = await fetch(suomiFiService.external_url as string, { method: "HEAD" });
      if (response.status === 404) {
        console.log(`Found non-existent Suomi.fi service document ${suomiFiService.id} - ${suomiFiService.external_url}`);
        removedServices.push(suomiFiService);
      }
    }));
  }

  console.log(`Found a total of ${removedServices.length} non-existent Suomi.fi service documents`);

  const removedServiceChunks = _.chunk(removedServices, DELETE_CHUNK_SIZE);
  for (const chunk of removedServiceChunks) {
    const documentIds = chunk.map((document) => document.id as string);
    await elastic.deleteDocuments({documentIds: documentIds});
    console.log(`Deleted ${documentIds.length} documents`);
  }
};

export const main = middyfy(purgeExternalServiceDocuments);