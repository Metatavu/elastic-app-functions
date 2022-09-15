import { middyfy } from '@libs/lambda';
import { scheduledCrawlService } from "../../../database/services";
import config from '../../../config';
import { parseDate } from '@libs/date-utils';
import { getElastic } from 'src/elastic';

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

// TODO: this file will be updated to trigger the partial crawl.

/**
 * Scheduled lambda for managing curations based on timed curations
 */
const triggerScheduledCrawl = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  // Get all the schedules

  const scheduledCrawls = await scheduledCrawlService.listScheduledCrawls();

  // Have the frequencies elapsed since last trigger?

    // Need last time it was triggered
      // Crawler api, for each crawl take elastic crawl id,
        // View details for a crawl request based on above id and take the completed at (recieving the whole response or null if not found)
        // NOTE: on partial crawl we get a created at time, but not a completed at (obvs)- if used this would save having to view the details for each crawl request.
      // If does not yet have a elastic crawl id it will be added to the seed urls

      let seed_urls: string[];

      // Should this be a map or a for each?
      await Promise.all(scheduledCrawls.map(async crawl => {
        const { previousCrawlId, seedURLs } = crawl;

        const crawlDetails = await elastic.findCrawlDetails({ id: previousCrawlId });

        // Meaning it has not had a scheduled run before
        if (!crawlDetails) {
          // Need to clarify about how the seeds will be stored.
          seedURLs.forEach(url => seed_urls.push(url));
        } else {
          // HERE
       // How much time has passed since the completed at
      // Some kind of date now
    
      //Compare with frequency, difference between now and completed at Has the frequency elapsed- if so add to seed urls?

          const { completed_at } = crawlDetails;
        }

      }));

  // If should be triggered add to the array of seed urls and call the partial crawl request.

    // Remove any duplicates in the seed urls.


  // Any url/ row in the last crawl is updated with a new elastic crawl ID.

    // Loop through scheduledCrawls, if was added to seed urls, call the update-scheduled-crawl function to update the elastic id.






  // const timedCurations = await timedCurationsService.listTimedCurations();

  // await Promise.all(timedCurations.map(async timedCuration => {
  //   const { id, curationId, startTime, endTime, hidden, promoted, queries } = timedCuration;
    
  //   const now = new Date();
  //   const start = parseDate(startTime);
  //   const end = parseDate(endTime);
  //   const active = start.getTime() <= now.getTime() && end.getTime() >= now.getTime();

  //   if (!curationId && active) {
  //     const payload = {
  //       hidden: hidden, 
  //       promoted: promoted, 
  //       queries: queries
  //     };

  //     console.log(`Creating curation for scheduled curation ${id}...`);
      
  //     const curationId = await elastic.createCuration({
  //       curation: payload
  //     });
      
  //     timedCurationsService.updateTimedCuration({
  //       ...timedCuration, curationId: curationId
  //     });

  //     console.log(`Created curation ${curationId} for scheduled curation ${id}.`);
  //   } else if (curationId && !active) {
  //     console.log(`Curation ${curationId} scheduled to be deactivated. Removing curation from app search...`);

  //     const curation = await elastic.findCuration({ id: curationId });
  //     if (curation) {
  //       await elastic.deleteCuration({ id: curationId });
  //       console.info(`Curation ${curationId} removed.`);
  //     } else {
  //       console.warn(`Could not find curation ${curationId}, cannot remove it.`);
  //     }

  //     await timedCurationsService.deleteTimedCuration(id);
  //   }
  // }));
};

export const main = middyfy(triggerScheduledCrawl);
