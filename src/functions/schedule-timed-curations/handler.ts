import { middyfy } from "@libs/lambda";
import { curationsService, documentService } from "src/database/services";
import config from "src/config";
import { parseDate } from "@libs/date-utils";
import { getElastic } from "src/elastic";
import { DateTime } from "luxon";
import { CurationType } from "@types";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Scheduled lambda for managing timed curations
 */
const scheduleTimedCuration = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const timedCurations = (await curationsService.listCurations()).filter(curation => curation.startTime || curation.endTime);

  await Promise.allSettled(timedCurations.map(async timedCuration => {
    const { id, elasticCurationId, startTime, endTime, hidden, promoted, queries, curationType, documentId } = timedCuration;

    const start = startTime ? parseDate(startTime) : now;
    const end = endTime ? parseDate(endTime) : farFuture;
    const active = start.getTime() <= now.getTime() && end.getTime() >= now.getTime();
    const activeCustomTimedCuration = !!(!elasticCurationId && active && curationType === CurationType.CUSTOM && documentId);

    try {
      if (activeCustomTimedCuration) {
        const foundDocument = await documentService.findDocument(documentId);
        if (!foundDocument) {
          throw new Error(`Could not find custom document ${documentId}.`);
        }
        await elastic.updateDocuments({
          documents: [{
            id: foundDocument.id,
            title: foundDocument.title,
            description: foundDocument.description,
            links: foundDocument.links,
            language: foundDocument.language,
          }]
        });
      }

      if (!elasticCurationId && active) {
        const payload = {
          hidden: hidden,
          promoted: promoted,
          queries: queries
        };

        console.log(`Creating curation for scheduled curation ${id}...`);

        const curationId = await elastic.createCuration({
          curation: payload
        });

        curationsService.updateCuration({
          ...timedCuration,
          elasticCurationId: curationId
        });

        console.log(`Created curation ${curationId} for scheduled curation ${id}.`);
      } else if (elasticCurationId && !active) {
        console.log(`Curation ${elasticCurationId} scheduled to be deactivated. Removing curation from app search...`);

        const curation = await elastic.findCuration({ id: elasticCurationId });
        if (!curation) {
          throw new Error(`Could not find curation ${elasticCurationId}, cannot remove it.`);
        }

        await elastic.deleteCuration({ id: elasticCurationId });
        console.info(`Curation ${elasticCurationId} removed.`);

        if (curationType === CurationType.CUSTOM && documentId) {
          const foundDocument = await documentService.findDocument(documentId);
          if (!foundDocument) {
            throw new Error(`Could not find document ${documentId}.`);
          }

          const foundElasticDocument = await elastic.findDocument({ documentId: documentId });
          if (!foundElasticDocument) {
            throw new Error(`Could not find expired elastic custom document ${documentId}, so cannot remove it.`);
          }

          await elastic.deleteDocuments({documentIds: [documentId]});

          await documentService.updateDocument({
            ...foundDocument,
            curationId: ""
          });
        }
        await curationsService.deleteCuration(id);
      }
    } catch (error) {
      console.error(error);
    }
  }));
};

export const main = middyfy(scheduleTimedCuration);