import { middyfy } from "@libs/lambda";
import { timedCurationsService } from "src/database/services";
import config from "src/config";
import { parseDate } from "@libs/date-utils";
import { getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Scheduled lambda for managing curations based on timed curations
 */
const scheduleTimedCuration = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const timedCurations = await timedCurationsService.listTimedCurations();

  await Promise.all(timedCurations.map(async timedCuration => {
    const { id, curationId, startTime, endTime, hidden, promoted, queries, isManuallyCreated } = timedCuration;

    const now = new Date();
    const start = parseDate(startTime);
    const end = parseDate(endTime);
    const active = start.getTime() <= now.getTime() && end.getTime() >= now.getTime();
    const alwaysActive = isManuallyCreated && !startTime && !endTime;

    if (!curationId && (active || alwaysActive)) {
      const payload = {
        hidden: hidden,
        promoted: promoted,
        queries: queries
      };

      console.log(`Creating curation for scheduled curation ${id}...`);

      const curationId = await elastic.createCuration({
        curation: payload
      });

      timedCurationsService.updateTimedCuration({
        ...timedCuration,
        curationId: curationId
      });

      console.log(`Created curation ${curationId} for scheduled curation ${id}.`);
    } else if (curationId && !active && !alwaysActive) {
      console.log(`Curation ${curationId} scheduled to be deactivated. Removing curation from app search...`);

      const curation = await elastic.findCuration({ id: curationId });
      if (curation) {
        await elastic.deleteCuration({ id: curationId });
        console.info(`Curation ${curationId} removed.`);
      } else {
        console.warn(`Could not find curation ${curationId}, cannot remove it.`);
      }

      await timedCurationsService.deleteTimedCuration(id);
    }
  }));
};

export const main = middyfy(scheduleTimedCuration);
