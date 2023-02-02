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

  const timedCurations = await curationsService.listTimedCurations();

  await Promise.all(timedCurations.map(async timedCuration => {
    const { id, elasticCurationId, startTime, endTime, hidden, promoted, queries, curationType, documentId } = timedCuration;

    const now = new Date();
    const farFuture = (DateTime.local().plus({ years: 100 })).toJSDate();

    const start = startTime ? parseDate(startTime) : now;
    const end = endTime ? parseDate(endTime) : farFuture;
    const active = start.getTime() <= now.getTime() && end.getTime() >= now.getTime();
    const activeCustomTimedCuration = !!(!elasticCurationId && active && curationType === CurationType.CUSTOM_TIMED && documentId);

    if (activeCustomTimedCuration) {
      const foundDocument = await documentService.findDocument(documentId);
      if (!foundDocument) {
        console.warn(`Could not find custom document ${documentId}.`);
      } else {
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

      if (curation) {
        await elastic.deleteCuration({ id: elasticCurationId });
        console.info(`Curation ${elasticCurationId} removed.`);
      } else {
        console.warn(`Could not find curation ${elasticCurationId}, cannot remove it.`);
      }

      if (curationType === CurationType.CUSTOM_TIMED && documentId) {
        const foundDocument = await documentService.findDocument(documentId);
        if (!foundDocument) {
          console.warn(`Could not find document ${documentId}.`);
        } else {
          const foundElasticDocument = await elastic.findDocument({ documentId: documentId });

          if (!foundElasticDocument) {
            console.warn(`Could not find expired elastic custom document ${documentId}, so cannot remove it.`);
          } else {
            await elastic.deleteDocuments({documentIds: [documentId]});

            await documentService.updateDocument({
              ...foundDocument,
              curationId: ""
            });
          }
        }
      }

      await curationsService.deleteCuration(id);
    }
  }));
};

export const main = middyfy(scheduleTimedCuration);