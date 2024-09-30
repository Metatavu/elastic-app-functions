import config from "src/config";
import { middyfy } from "@libs/lambda";
import { Document, Elastic, getElastic } from "src/elastic";
import { DateTime } from "luxon";
import { CrawlerDomain, CrawlRule } from "@types";
import fetch from "node-fetch";

/**
 * Document ID and URL
 */
type DocumentIdAndUrl = { id: string, url: string };

/**
 * Returns a regex pattern from a pattern and a rule.
 *
 * @param pattern pattern
 * @param rule rule
 */
const regexFromPatternAndRule = (pattern: string, rule: "begins" | "ends" | "contains" | "regex") => {
  if (rule === "regex") return pattern;

  const escapedPattern = pattern.replace(/[.+?^${}()\/|[\]\\]/g, "\\$&");
  const patternWithWildcards = escapedPattern.replace(/\*/g, ".*");

  return {
    begins: `^${patternWithWildcards}`,
    ends: `${patternWithWildcards}$`,
    contains: patternWithWildcards
  }[rule];
};

/**
 * Checks whether the document URL path with search query matches the crawl rule.
 *
 * @param crawlRule crawl rule
 * @param documentUrl document URL
 * @returns whether the path with search query matches the crawl rule
 */
const checkCrawlRuleAgainstDocumentUrl = (crawlRule: CrawlRule, documentUrl: string) => {
  const comparedValue = crawlRule.policy === "allow";
  const url = new URL(documentUrl);
  const regex = regexFromPatternAndRule(crawlRule.pattern, crawlRule.rule);
  console.info(`Checking crawl rule: ${crawlRule.policy} ${regex}`);
  return comparedValue === new RegExp(regex).test(`${url.pathname}${url.search}`);
};

/**
 * Safely parses the URL. Throws an error if the URL is not a string or is invalid.
 *
 * @param url url
 */
const safeParseUrl = (url: unknown): URL => {
  if (typeof url !== "string") throw Error(`Non-string URL ${url}`);

  try {
    return new URL(url);
  } catch {
    throw Error(`Invalid URL ${url}`);
  }
}

/**
 * Checks whether the document matches the crawl rules of the domain it belongs to.
 *
 * @param document document
 * @param crawlerDomains crawler domains
 */
const isDocumentMatchingCrawlRules = async (document: DocumentIdAndUrl, crawlerDomains: CrawlerDomain[]) => {
  const documentUrl = safeParseUrl(document.url);

  const matchingDomain = crawlerDomains.find((domain) => documentUrl.origin === domain.name);
  if (!matchingDomain) {
    console.info(`Domain in document URL does not match any of the crawled domains.`);
    return false;
  }

  const domainCrawlRules = [...(matchingDomain.crawl_rules ?? [])].sort((a, b) => a.order - b.order);
  if (!domainCrawlRules.length) {
    console.info(`Domain has no crawl rules.`);
    return true;
  }

  for (const crawlRule of domainCrawlRules) {
    if (!checkCrawlRuleAgainstDocumentUrl(crawlRule, document.url)) return false;
  }

  return true;
};

/**
 * Checks whether the document URL is accessible.
 *
 * @param document document
 */
const isDocumentUrlAccessible = async (document: Document) => {
  try {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500)); // Sleep for a random time to avoid rate limiting
    const response = await fetch(safeParseUrl(document.url).toString(), { method: "HEAD" });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * Returns crawled documents that possibly need to be purged from Elastic App Search.
 *
 * Included documents are defined by examining whether
 * - document URL exists
 * - document has a last_crawled_at field
 * - the date time value in purge_last_checked_at field of the document is more than
 * (2 * PURGE_CHECK_INTERVAL_IN_DAYS) days old.
 *
 * @param elastic elastic client instance
 */
const fetchCrawledDocumentsWithExpiredPurgeCheck = async (elastic: Elastic) => {
  try {
    const response = await elastic.searchDocumentsViaElasticSearchApi({
      size: 1000,
      _source: ["id", "url"],
      query: {
        bool: {
          must: [
            { exists: { field: "last_crawled_at" } },
            { exists: { field: "url" } }
          ],
          must_not: [{
            range: {
              "purge_last_checked_at.date": {
                "gte": `now-${config.PURGE_CHECK_INTERVAL_IN_DAYS}d/d`,
                "lte": "now"
              }
            }
          }],
        }
      }
    });

    if (!response.hits?.hits) throw Error(`No hits property found from response ${JSON.stringify(response, null, 2)}`);
    return response.hits.hits.map<DocumentIdAndUrl>((hit) => ({ id: hit._source.id, url: hit._source.url }));
  } catch (error) {
    console.error("Error while fetching crawled documents with expired purge check", error);
    throw error;
  }
};

/**
 * Purges documents from document purge batch and empties the batch.
 *
 * @param elastic Elastic client instance
 * @param documentPurgeBatch document purge batch
 * @param dryRun whether to run the purge as a dry run
 *
 * @returns number of purged documents
 */
const purgeDocumentsFromBatch = async (elastic: Elastic, documentPurgeBatch: DocumentIdAndUrl[], dryRun: boolean) => {
  let deletedCount = 0;

  if (dryRun) {
    console.info(`Would have purged documents with URLs:\n${documentPurgeBatch.map((document) => document.url).join("\n")}`);
    deletedCount = documentPurgeBatch.length;
  } else {
    try {
      const deleteResult = await elastic.deleteDocuments({ documentIds: documentPurgeBatch.map((document) => document.id) });
      deletedCount = deleteResult.filter((item) => item.deleted).length;
      console.info(`Purged ${deletedCount} documents.`);
    } catch (error) {
      console.error(`Error while purging documents from Elastic`, error);
    }
  }

  documentPurgeBatch.splice(0);

  return deletedCount;
};

/**
 * Scheduled lambda for purging crawled documents which either
 * - do not fit to crawl rules of the domain or
 * - do not exist anymore
 */
const purgeCrawledDocuments = async () => {
  console.time("purge run took time");

  const dryRun = config.PURGE_CRAWLED_DOCUMENTS_DRY_RUN;
  if (dryRun) console.info("Running in dry run mode.");

  try {
    const elastic = getElastic({
      username: config.ELASTIC_ADMIN_USERNAME,
      password: config.ELASTIC_ADMIN_PASSWORD
    });

    console.info("Fetching crawled documents that possibly need purging from Elastic App Search..");
    const documentsToBeCheckedForPurge = await fetchCrawledDocumentsWithExpiredPurgeCheck(elastic);
    if (documentsToBeCheckedForPurge.length === 0) {
      console.info("No documents need to be checked for purge. Ending task.");
      console.timeEnd("purge run took time");
      return;
    }

    console.info(`Found ${documentsToBeCheckedForPurge.length} documents.`);
    console.info(`Checking documents for purging..`);

    let purgedDocumentCount = 0;
    let documentPurgeBatch: DocumentIdAndUrl[] = [];
    const crawlerDomains = await elastic.listCrawlerDomains();

    for (const [index, document] of documentsToBeCheckedForPurge.entries()) {
      if (documentPurgeBatch.length >= 50) {
        console.info("Purge batch full. Purging documents from purge batch..");
        purgedDocumentCount += await purgeDocumentsFromBatch(elastic, documentPurgeBatch, dryRun);
      }

      console.info(`${index}/${documentsToBeCheckedForPurge.length} documents processed.`);
      console.info(`Document ${document.id} - ${document.url}`);
      let shouldPurgeDocument = false;

      try {
        const crawlRulesMatch = await isDocumentMatchingCrawlRules(document, crawlerDomains);
        if (!crawlRulesMatch) shouldPurgeDocument = true;
      } catch (error) {
        console.error(`Error while checking crawl rules for document ${document.id}`, error);
        continue;
      }

      if (!shouldPurgeDocument) {
        if (await isDocumentUrlAccessible(document)) {
          console.info(`URL is accessible.`);
        } else {
          console.info(`URL is not accessible.`);
          shouldPurgeDocument = true;
        }
      }

      if (shouldPurgeDocument) {
        console.info(`PURGE`);
        documentPurgeBatch.push(document);
      } else {
        console.info(`VALID`);
        if (!dryRun) await elastic.patchDocuments([{...document, purge_last_checked_at: new Date() }]);
      }
    }

    if (documentPurgeBatch.length) {
      console.info("Purging remaining documents from purge batch..");
      purgedDocumentCount += await purgeDocumentsFromBatch(elastic, documentPurgeBatch, dryRun);
    }

    if (dryRun) {
      console.info(`Would have purged ${purgedDocumentCount} documents. Ending task.`);
    } else {
      console.info(`Purged ${purgedDocumentCount} documents. Ending task.`);
    }
  } catch (error) {
    console.error("Error while checking documents for purging", error);
  }

  console.timeEnd("purge run took time");
};

export const main = middyfy(purgeCrawledDocuments);