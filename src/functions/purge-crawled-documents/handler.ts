import config from "src/config";
import { middyfy } from "@libs/lambda";
import { Document, Elastic, getElastic } from "src/elastic";
import { searchResultsToDocuments } from "@libs/document-utils";
import { DateTime } from "luxon";
import { CrawlerDomain, CrawlRule } from "@types";
import fetch from "node-fetch";

/**
 * Checks whether the document URL matches the crawl rule.
 *
 * @param crawlRule crawl rule
 * @param documentUrl document URL
 * @returns whether the document URL matches the crawl rule
 */
const checkCrawlRuleAgainstDocumentUrl = (crawlRule: CrawlRule, documentUrl: string) => {
  const comparedValue = crawlRule.policy === "allow";

  const url = new URL(documentUrl);

  switch(crawlRule.rule) {
    case "begins": return comparedValue === url.pathname.startsWith(crawlRule.pattern);
    case "ends": return comparedValue === url.pathname.endsWith(crawlRule.pattern);
    case "regex": return new RegExp(crawlRule.pattern).test(documentUrl);
    default: return true;
  }
};

/**
 * Checks whether the document matches the crawl rules.
 *
 * @param document document
 * @param crawlerDomains crawler domains
 */
const isDocumentMatchingCrawlRules = async (document: Document, crawlerDomains: CrawlerDomain[]) => {
  const matchingDomain = crawlerDomains.find((domain) => document.url === domain.name);
  if (!matchingDomain) {
    console.info(`Domain ${matchingDomain} does not match any of the crawler domains.`);
    return true;
  }

  const domainCrawlRules = matchingDomain.crawl_rules ?? [];
  if (!domainCrawlRules.length) {
    console.info(`Matching domain ${matchingDomain.name} does not have any custom crawl rules. Document is automatically valid.`);
    return true;
  }

  return domainCrawlRules.every((crawlRule) => checkCrawlRuleAgainstDocumentUrl(crawlRule, document.url as string));
};

/**
 * Checks whether the document URL exists.
 *
 * @param document document
 */
const isDocumentUrlExisting = async (document: Document) => {
  try {
    const response = await fetch(document.url as string, { method: "HEAD" });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * Returns crawled documents that possibly need to be purged from Elastic App Search.
 *
 * Included documents are defined by examining whether document has a last_crawled_at field and the date time value
 * in purge_last_checked_at field of the document is more than (2 * PURGE_CHECK_INTERVAL) days old.
 *
 * @param elastic elastic client instance
 * @param timestamp timestamp of current contact sync
 */
const fetchCrawledDocumentsWithExpiredPurgeCheck = async (elastic: Elastic) => {
  console.info("Fetching crawled documents that possibly need purging from Elastic App Search..");

  const purgeCheckThresholdDate = DateTime.fromMillis(Date.now()).minus({ days: config.PURGE_CHECK_INTERVAL_IN_DAYS });

  const searchResults = await elastic.getPaginatedSearchResults({
    query: "",
    filters: {
      all: [
        { last_crawled_at: { from: new Date(0).toISOString() } }
      ],
      none: [
        { purge_last_checked_at: { to: purgeCheckThresholdDate } }
      ]
    }
  });

  console.info(`Found ${searchResults.length} documents.`);

  return searchResultsToDocuments(searchResults);
};

/**
 * Scheduled lambda for purging crawled documents which do not exist anymore or do not fit to crawl rules
 */
const purgeCrawledDocuments = async (event: any) => {
  console.info(JSON.stringify(event, null, 2));
  const dryRun = true;

  try {
    const elastic = getElastic({
      username: config.ELASTIC_ADMIN_USERNAME,
      password: config.ELASTIC_ADMIN_PASSWORD
    });

    const documentsToBeCheckedForPurge = await fetchCrawledDocumentsWithExpiredPurgeCheck(elastic);

    if (documentsToBeCheckedForPurge.length === 0) {
      console.info("No documents need to be checked for purge. Ending task.");
      return;
    }

    console.info(`Checking documents for purging..`);

    let purgedDocumentCount = 0;

    const crawlerDomains = await elastic.listCrawlerDomains();

    for (const document of documentsToBeCheckedForPurge) {
      let shouldPurgeDocument = false;

      const crawlRulesMatch = await isDocumentMatchingCrawlRules(document, crawlerDomains);
      if (!crawlRulesMatch) shouldPurgeDocument = true;

      if (!shouldPurgeDocument) {
        const documentUrlExists = await isDocumentUrlExisting(document);
        if (!documentUrlExists) shouldPurgeDocument = true;
      }

      if (!shouldPurgeDocument) continue;

      if (dryRun) {
        console.info(`Document ${document.id} would be purged.`);
        purgedDocumentCount++;
      } else {
        try {
          await elastic.deleteDocuments({ documentIds: [document.id!] });
          console.info(`Document ${document.id} purged.`);
          purgedDocumentCount++;
        } catch (error) {
          console.error("Error while deleting contact documents from Elastic", error);
        }
      }
    }

    if (dryRun) {
      console.info(`Would have purged ${purgedDocumentCount} documents. Ending task.`);
    } else {
      console.info(`Purged ${purgedDocumentCount} documents. Ending task.`);
    }
  } catch (error) {
    console.error("Error while checking documents for purging", error);
  }
};

export const main = middyfy(purgeCrawledDocuments);