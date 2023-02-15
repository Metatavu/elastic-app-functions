import CurationModel from "src/database/models/curation";
import { Elastic } from "src/elastic";


/**
 * Checks if elastic curation exists and update
 *
 * @param elasticCurationId
 * @param curationUpdates curation values to update
 * @param elastic elastic client
 */
export const updateExistingElasticCuration = async (elasticCurationId: string, curationUpdates: CurationModel, elastic: Elastic) => {
  const foundCuration = await elastic.findCuration({ id: elasticCurationId });
  if (!foundCuration) {
    throw new Error(`Elastic curation with id ${elasticCurationId} not found`);
  }
  return await elastic.updateCuration({
    curationId: elasticCurationId,
    curation: {
      id: elasticCurationId,
      queries: curationUpdates.queries,
      hidden: curationUpdates.hidden,
      promoted: curationUpdates.promoted
    }
  });
};

/**
 * Checks promoted and hidden documents exist in elastic
 *
 * @param promoted document ids
 * @param hidden document ids
 * @param elastic elastic client
 */
export const validateDocumentIds = async (promoted: string[], hidden: string[], elastic: Elastic) => {
  const documentIds = [ ...promoted, ...hidden ];

  const documents = await Promise.all(
    documentIds.map(async documentId => ({
      id: documentId,
      data: await elastic.findDocument({ documentId: documentId })
    }))
  );

  for (const document of documents) {
    if (!document.data) {
      throw new Error(`Document ${document.id} not found`);
    }
  }
};