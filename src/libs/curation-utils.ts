import { Elastic } from "src/elastic";


/**
 * Checks if elastic curation exists and updates if it does
 *
 * @param elasticCurationId
 * @param elastic elastic client
 */
export const updateExistingElasticCuration = async (elasticCurationId: string, elastic: Elastic) => {
  const foundCuration = await elastic.findCuration({ id: elasticCurationId });
  if (foundCuration) {
    await elastic.updateCuration({
      curation: {
        id: foundCuration.id,
        queries: foundCuration.queries,
      }
    });
  }
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