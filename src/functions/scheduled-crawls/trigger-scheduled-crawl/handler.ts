import { middyfy } from "@libs/lambda";
import { scheduledCrawlService } from "src/database/services";
import config from "src/config";
import { Elastic, getElastic } from "src/elastic";
import parser from "cron-parser";
import { ScheduledCrawl } from "src/schema/scheduled-crawl";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Fills missing crawl details for a scheduled crawl. Currently only fills the completedAt.
 *
 * @param elastic Elastic instance
 * @param scheduledCrawl Scheduled crawl to fill missing details for
 */
const fillMissingCrawlDetails = async (elastic: Elastic, scheduledCrawl: ScheduledCrawl) => {
  if (!scheduledCrawl.previousCrawlId || scheduledCrawl.previousCrawlCompletedAt) {
    return scheduledCrawl;
  }

  try {
    const crawlDetails = await elastic.findCrawlDetails({ id: scheduledCrawl.previousCrawlId });

    if (!crawlDetails?.completed_at) return scheduledCrawl;

    const updateScheduledCrawl = await scheduledCrawlService.updateScheduledCrawl({
      ...scheduledCrawl,
      previousCrawlCompletedAt: crawlDetails.completed_at
    });

    return updateScheduledCrawl;
  } catch (error) {
    console.error("Error fetching crawl details", error);
    return scheduledCrawl;
  }
};

/**
 * Scheduled lambda for managing curations based on timed curations
 */
const triggerScheduledCrawl = async () => {
  const elastic = getElastic({
    username: ELASTIC_ADMIN_USERNAME,
    password: ELASTIC_ADMIN_PASSWORD
  });

  try {
    const activeCrawl = await elastic.getCurrentlyActiveCrawl();
    console.info("Crawl already running, current scheduled crawls delayed", activeCrawl);
  } catch {
    const scheduledCrawls = await scheduledCrawlService.listScheduledCrawls();

    if (!scheduledCrawls.length) {
      console.info("No scheduled crawls found");
      return;
    }

    const crawlsWithLatestInformation = await Promise.all(
      scheduledCrawls.map(scheduledCrawl => fillMissingCrawlDetails(elastic, scheduledCrawl))
    );

    const pendingCrawls = crawlsWithLatestInformation.filter(scheduledCrawl => {
      if (!scheduledCrawl.enabled) return false;

      try {
        const interval = parser.parseExpression(scheduledCrawl.scheduleCron);
        const lastCrawlTime = new Date(scheduledCrawl.previousCrawlCompletedAt || 0);
        const previousTimeToRun = interval.prev().toDate();
        return lastCrawlTime.valueOf() <= previousTimeToRun.valueOf();
      } catch (error) {
        return false;
      }
    });

    const pendingCrawlsSortedByPriority = pendingCrawls.sort((a, b) => a.priority - b.priority);

    const nextCrawlToStartNow = pendingCrawlsSortedByPriority.shift();

    if (!nextCrawlToStartNow) {
      console.info("No scheduled crawls needed crawling");
      return;
    }

    try {
      const crawlResponse = await elastic.createCrawlRequest({
        overrides: {
          seed_urls: nextCrawlToStartNow.seedURLs,
          max_crawl_depth: nextCrawlToStartNow.maxCrawlDepth,
          domain_allowlist: nextCrawlToStartNow.domainAllowlist,
        }
      });

      await scheduledCrawlService.updateScheduledCrawl({
        ...nextCrawlToStartNow,
        previousCrawlId: crawlResponse.id,
        previousCrawlCompletedAt: undefined
      });

      console.log("Crawl request created successfully", crawlResponse);
    } catch(e) {
      console.error("error creating crawl request", e);
    }
  }
};

export const main = middyfy(triggerScheduledCrawl);