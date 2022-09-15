import { middyfy } from '@libs/lambda';
import { scheduledCrawlService } from "../../../database/services";
import config from '../../../config';
import { calculateMinutesPassed } from '@libs/date-utils';
import { getElastic } from 'src/elastic';
import { GetCrawlerCrawlRequestResponse } from '@elastic/enterprise-search/lib/api/app/types';

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Scheduled lambda for managing curations based on timed curations
 */
const triggerScheduledCrawl = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  const scheduledCrawls = await scheduledCrawlService.listScheduledCrawls();

  let crawlDetailsMap: { [key: string]: GetCrawlerCrawlRequestResponse } = {  };

  /**
   * Get list of crawls to be executed
   */
  const activeCrawls = scheduledCrawls.filter(async crawl => {
    const { previousCrawlId, frequency, seedURLs } = crawl;

    if (!crawlDetailsMap[previousCrawlId]) {
      // IS THIS CORRECT? OR Will it ignore any other 'crawl' with same prevCrawlID, even if that crawl has different seedURLs?
      // The purpose of prevCrawlId is not for unique identification, but to give us access to the completed_at data
      const crawlDetails = previousCrawlId ? await elastic.findCrawlDetails({ id: previousCrawlId }) : null;

      // If no previousCrawlId then it should be crawled regardless of frequency
      if (crawl.previousCrawlId === null) {
        return seedURLs;
      } else {
         // Not passing in empty previousCrawlId's as this would then ignore all new scheduled crawls
        crawlDetailsMap = { ...crawlDetailsMap, [previousCrawlId] : crawlDetails };

        const { completed_at } = crawlDetails;
        const difference = calculateMinutesPassed(completed_at);

        if (difference >= frequency) {
          // TODO: How to prevent duplicate seedURLs from being returned here?
          return seedURLs;
          // seedURLs.forEach(url => {
          //   // Prevent duplicates in the seed urls.
          //   if (!seedUrlObject.seedUrls.includes(url)) {
          //     seedUrlObject.seedUrls.push(url);
          //     !seedUrlObject.ids.includes(id) && seedUrlObject.ids.push(id);
          //   };
          // });
        };
      }
    };
  });

  const urls = activeCrawls.flatMap(activeCrawl => activeCrawl.seedURLs);

  const crawlOptions = {
    crawl: {
      seed_urls: urls,
      // Hard coded for now, as not sure how to customize the crawl depth for seed_urls without making multiple requests (and not sure can do this...)
      max_crawl_depth: 2
    }
  };

  const crawlResponse = await elastic.createCrawlRequest(crawlOptions);

  // Update the completed crawls in DDB with previousCrawlId
  // TODO: how to handle error if already an active crawl ongoing?
  if (!crawlResponse) {
    console.warn("Error from creating crawl request");
  } else {
    activeCrawls.forEach(activeCrawl => {
      scheduledCrawlService.updateScheduledCrawl({
        ...activeCrawl,
        previousCrawlId: crawlResponse
      });
    });
  };



  // ORIGINAL LOGIC (JUST IN CASE...)

  // // Should this be a map or a for each?- not returning anything from this??
  // await Promise.all(scheduledCrawls.map(async crawl => {
  //   const { previousCrawlId, seedURLs, frequency, id } = crawl;

  //   // NOTE: on partial crawl request response we get a created at time, but not a completed at(is null)- if used created at instead would save having to view the details for each crawl request. But I don't think this is what we want.
  //   const crawlDetails = previousCrawlId ? await elastic.findCrawlDetails({ id: previousCrawlId }) : null;

  //   // If crawl does not yet have a elastic crawl id it will be added to the seed urls
  //   if (!crawlDetails) {
  //     // Need to clarify about how the seeds will be stored.???
  //     seedURLs.forEach(url => {
  //       seedUrlObject.seedUrls.push(url);
  //       !seedUrlObject.ids.includes(id) && seedUrlObject.ids.push(id);
  //     });
  //   } else {
  //     const { completed_at } = crawlDetails;
  //     // completed_at format "Fri, 29 Jan 2021 21:35:20 +0000"
  //     const difference = calculateMinutesPassed(completed_at);

  //     if (difference >= frequency) {
  //       seedURLs.forEach(url => {
  //         // Prevent duplicates in the seed urls.
  //         if (!seedUrlObject.seedUrls.includes(url)) {
  //           seedUrlObject.seedUrls.push(url);
  //           !seedUrlObject.ids.includes(id) && seedUrlObject.ids.push(id);
  //         };
  //       });
  //     };
  //   };
  // }));

  // const crawlOptions = {
  //   crawl: {
  //     seed_urls: seedUrlObject.seedUrls,
  //     // Hard coded for now, as not sure how to customize the crawl depth for seed_urls without making multiple requests (and not sure can do this...)
  //     max_crawl_depth: 2
  //   }
  // };

  // const crawlResponse = await elastic.createCrawlRequest(crawlOptions);

  // // If a scheduled crawl was triggered update the previousCrawlId
  // if (crawlResponse) {
  //   await Promise.all(scheduledCrawls.map(async crawl => {
  //     if (seedUrlObject.ids.includes(crawl.id))
  //       scheduledCrawlService.updateScheduledCrawl({
  //         ...crawl,
  //         previousCrawlId: crawlResponse
  //       });
  //   }));
  // };
};

export const main = middyfy(triggerScheduledCrawl);
