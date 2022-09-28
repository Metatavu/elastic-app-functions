import { middyfy } from '@libs/lambda';
import { scheduledCrawlService } from "../../../database/services";
import config from '../../../config';
import { calculateMinutesPassed } from '@libs/date-utils';
import { getElastic } from 'src/elastic';
import { GetCrawlerActiveCrawlRequestRequest, GetCrawlerCrawlRequestResponse } from '@elastic/enterprise-search/lib/api/app/types';

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Scheduled lambda for managing curations based on timed curations
 */
const triggerScheduledCrawl = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  try {
    const activeCrawl = await elastic.checkIfActiveCrawl();
    console.info("Crawl already running, current scheduled crawls delayed", activeCrawl);
  } catch {
    const scheduledCrawls = await scheduledCrawlService.listScheduledCrawls();

    const crawlDetailsMap: { [key: string]: GetCrawlerCrawlRequestResponse } = {};

    const activeCrawls = scheduledCrawls.filter(async crawl => {
      const { previousCrawlId, frequency } = crawl;

      let crawlDetails: GetCrawlerCrawlRequestResponse = crawlDetailsMap[previousCrawlId];
      if (crawlDetails === undefined) {
        crawlDetails = previousCrawlId ? await elastic.findCrawlDetails({ id: previousCrawlId }) : null;
        crawlDetailsMap[previousCrawlId] = crawlDetails;
      }

      if (!crawlDetails) {
        return true;
      } else {
        const { completed_at } = crawlDetails;
        const difference = calculateMinutesPassed(completed_at);
        console.log("diff checks, completed at, difference, frequency, is diff > freq", completed_at, difference, frequency, difference >= frequency);
        return difference >= frequency;
      }
    });

    const urls = [ ...new Set(activeCrawls.flatMap(activeCrawl => activeCrawl.seedURLs)) ];

    const crawlOptions = {
      overrides: {
        seed_urls: urls,
        max_crawl_depth: 2
      }
    };

    try {
      const crawlResponse = await elastic.createCrawlRequest(crawlOptions);

      console.log("Crawl request created successfully", crawlResponse, urls);

      activeCrawls.forEach(activeCrawl => {
        scheduledCrawlService.updateScheduledCrawl({
          ...activeCrawl,
          previousCrawlId: crawlResponse
        });
      });
    } catch(e) {
      console.error("error creating crawl request", e)
    }
  }
};

export const main = middyfy(triggerScheduledCrawl);