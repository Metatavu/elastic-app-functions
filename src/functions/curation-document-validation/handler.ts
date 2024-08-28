import { middyfy } from "@libs/lambda";
import { getElastic } from "src/elastic";
import { curationsService } from "src/database/services";
import config from "src/config";
import { isEqual } from "lodash";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Lambda for validating curation documents
 */
const curationDocumentValidation = async() => {
  try {
    const elastic = getElastic({
      username: ELASTIC_ADMIN_USERNAME,
      password: ELASTIC_ADMIN_PASSWORD
    });

    const curations = await curationsService.listStandardDocumentCurations();
    if (!curations) throw new Error("Error listing curations");

    curations.map(async curation => {
      const invalidDocuments: string[] = [];

      // TODO: Should there be additional handling here for rejected promises?
      await Promise.allSettled(curation.promoted.map(async promotedDocument => {
        const foundDocument = await elastic.findDocument({ documentId: promotedDocument });
        if (!foundDocument) {
          invalidDocuments.push(promotedDocument);
        }
      }))

      await Promise.allSettled(curation.hidden.map(async hiddenDocument => {
        const foundDocument = await elastic.findDocument({ documentId: hiddenDocument });
        if (!foundDocument) {
          invalidDocuments.push(hiddenDocument);
        }
      }))

      if (!isEqual(invalidDocuments, curation.invalidDocuments)) {
        await curationsService.updateCuration({
          ...curation,
          invalidDocuments: invalidDocuments
        });
      }
    })
  } catch (error) {
    console.error("Error while validating curation documents", error);
  }
};

export const main = middyfy(curationDocumentValidation);