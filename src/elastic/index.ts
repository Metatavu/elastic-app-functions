import { Client } from "@elastic/enterprise-search";
import { CreateCrawlerCrawlRequestRequest, CreateCurationRequest, DeleteDocumentsResponse, PutCurationRequest, SearchRequest, SearchResponse } from "@elastic/enterprise-search/lib/api/app/types";
import { BasicAuth } from "@libs/auth-utils";
import { CrawlerDomain, SearchESSearchRequestBody, SearchEsSearchResponse } from "@types";
import config from "src/config";

/**
 * Elastic client options
 */
export interface Options {
  url: string;
  username: string;
  password: string;
  engineName: string;
}

/**
 * Enum for content category
 */
export enum ContentCategory {
  SERVICE = "service",
  UNIT = "unit",
  NEWS = "news",
  UNCATEGORIZED = "uncategorized",
  CONTACT = "contact",
  EXTERNAL = "service_external_link"
}

/**
 * App Search response with correct results typing
 */
export interface AppSearchResponse extends SearchResponse {
  results: { [key: string]: any }[];
}

/**
 * Document
 */
export type Document = {
  id?: string;
  [k: string]: unknown;
}

/**
 * Correct type for single document object in indexDocuments request of Elastic App Search
 */
export type UpsertDocumentResponse = {
  id: string | null,
  errors: string[]
};

/**
 * Elastic client
 */
export class Elastic {

  private options: Options;

  /**
   * Constructor
   *
   * @param options client options
   */
  constructor(options: Options) {
    this.options = options;
  }

  /**
   * Patches documents to Elastic Search. ID is required for each document.
   *
   * @param documents documents
   * @returns patch response for each document
   */
  public patchDocuments = (documents: Document[]) => {
    return this.getClient().app.putDocuments({
      engine_name: this.options.engineName,
      documents: documents
    });
  }

  /**
   * Lists all crawler domains from Elastic App Search
   */
  public listCrawlerDomains = async () => {
    let currentPageNumber = 1;
    let retrievedAllDomains = false;
    const retrievedDomains: CrawlerDomain[] = [];

    do {
      const response = await this.getClient().app.listCrawlerDomains({
        engine_name: this.options.engineName,
        page: { current: currentPageNumber, size: 25 },
      });

      if (response.meta.page.current === response.meta.page.total_pages) retrievedAllDomains = true;
      else currentPageNumber++;

      retrievedDomains.push(...response.results);
    } while (!retrievedAllDomains);

    return retrievedDomains as CrawlerDomain[];
  };

  /**
   * Gets paginated Elastic Search results filtered by given filters and query.
   *
   * @param options options
   * @returns Search results
   */
  public getPaginatedSearchResults = async (options: any): Promise<Array<{ [key: string]: any; }>> => {
    let currentPageNumber = 1;
    let retrievedAllDocuments = false;
    const retrievedDocuments: { [key: string]: any }[] = [];

    do {
      const { results, meta } = await this.searchDocuments({
        query: options.query,
        page: {
          size: 1000,
          current: currentPageNumber
        },
        filters: options.filters
      });

      if (meta.page.current === meta.page.total_pages) {
        retrievedAllDocuments = true;
      } else {
        currentPageNumber++;
      }

      retrievedDocuments.push(...results);
    } while (!retrievedAllDocuments)

    return retrievedDocuments;
  };

  /**
   * Creates new curation
   *
   * @param options options
   * @returns ID of created curation
   */
  public createCuration = async (options: { curation: CreateCurationRequest["body"] }): Promise<string> => {
    const { curation } = options;

    const result = await this.getClient().app.createCuration({
      engine_name: this.options.engineName,
      body: curation
    });

    return result.id;
  };

  /**
   * Updates curation
   *
   * @param options options
   * @returns updated curation id
   */
  public updateCuration = async (options: { curation: PutCurationRequest["body"], curationId: string }): Promise<string> => {
    const { curation, curationId } = options;

    const result = await this.getClient().app.putCuration({
      engine_name: this.options.engineName,
      curation_id: curationId,
      body: curation
    });

    return result.id;
  };

  /**
   * Searches documents from Elastic search
   *
   * @param options search request options
   * @returns list of documents matching the search criteria
   */
  public searchDocuments = async (options: SearchRequest["body"]): Promise<AppSearchResponse> => {
    return this.getClient().app.search({
      engine_name: this.options.engineName,
      body: options
    });
  }

  /**
   * Searches documents via Elastic App Search ElasticSearch API
   *
   * @param requestBody search request body
   */
  public searchDocumentsViaElasticSearchApi = async (requestBody: SearchESSearchRequestBody) => {
    try {
      return await this.getClient().app.searchEsSearch(
        {
          engine_name: this.options.engineName,
          body: requestBody
        } as any, // Types in Elastic Enterprise Search client package are WRONG.
        {
          headers: {
            Authorization: `Bearer ${process.env.ELASTIC_APP_SEARCH_PRIVATE_API_KEY}`
          }
        }
      ) as SearchEsSearchResponse;
    } catch (error) {
      console.error("Error searching documents via ElasticSearch API", JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Finds single document from Elastic search
   *
   * @param options options
   * @returns document or null if not found
   */
  public findDocument = async (options: { documentId: string }) => {
    const { documentId } = options;

    const response = await this.getClient().app.getDocuments({
      engine_name: this.options.engineName,
      documentIds: [documentId]
    });

    return response?.length === 1 ? response[0] : null;
  }

  /**
   * Updates documents to Elastic search
   *
   * @param options options
   * @param options.document document to update
   */
  public updateDocuments = async ({ documents }: { documents: Document[]; }): Promise<UpsertDocumentResponse[]> => {
    return this.getClient().app.indexDocuments({
      engine_name: this.options.engineName,
      documents: documents
    }, {
      requestTimeout: 60_000
    }) as Promise<UpsertDocumentResponse[]>;
  }

  /**
   * Deletes documents with given IDs from Elastic Search
   *
   * @param options options
   * @param options.documentIds list of IDs of documents to delete. Maximum length is 100.
   */
  public deleteDocuments = async ({ documentIds }: { documentIds: string[]; }): Promise<DeleteDocumentsResponse> => {
    return this.getClient().app.deleteDocuments({
      engine_name: this.options.engineName,
      documentIds: documentIds
    });
  }

  /**
   * Finds single curation
   *
   * @param options options
   * @returns single curation or null if not found
   */
  public findCuration = (options: { id: string }) => {
    const { id } = options;
    return this.getClient().app.getCuration({
      engine_name: this.options.engineName,
      curation_id: id
    });
  }

  /**
   * Lists curations
   *
   * @returns list of curations
   */
  public listCurations = async () => {
    return this.getClient().app.listCurations({
      engine_name: this.options.engineName
    });
  }

  /**
   * Deletes a curation
   *
   * @param options options
   */
  public deleteCuration = async (options: { id: string }) => {
    const { id } = options;
    await this.getClient().app.deleteCuration({
      engine_name: this.options.engineName,
      curation_id: id
    });
  }

  /**
   * Returns whether user has permission to manage curations.
   *
   * Check is done by listing curations
   *
   * @returns whether user has permission to manage curations
   */
  public hasCurationsAccess = async () => {
    try {
      const result = await this.getClient().app.listCurations({
        engine_name: this.options.engineName,
        page: {
          current: 1,
          size: 1
        }
      });

      return !!result.results;
    } catch (error) {
      console.error("Error checking curation access", error);
      return false;
    }
  }

  /**
   * Returns whether user has permission to manage scheduled crawls.
   *
   * Check is done by listing crawl requests
   *
   * @returns whether user has permission to manage scheduled crawls
   */
  public hasScheduledCrawlAccess = async () => {
    try {
      const result = await this.getClient().app.listCrawlerCrawlRequests({
        engine_name: this.options.engineName,
        page: {
          current: 1,
          size: 1
        }
      });

      return !!result.results;
    } catch (e) {
    }

    return false;
  }

  /**
   * Creates new partial crawl request
   *
   * @param options options
   * @returns crawl request id
   */
  public createCrawlRequest = async (options: CreateCrawlerCrawlRequestRequest["body"]) => {
    const result = await this.getClient().app.createCrawlerCrawlRequest({
      engine_name: this.options.engineName,
      body: options
    });

    return result;
  }

  /**
   * Finds details for a crawl request
   *
   * @param options options
   * @returns crawl details or null if not found
   */
  public findCrawlDetails = async (options: { id: string }) => {
    const { id } = options;
    return await this.getClient().app.getCrawlerCrawlRequest({
      engine_name: this.options.engineName,
      crawl_request_id: id
    });
  }

  /**
   * Get currently active crawl
   *
   * @param options options
   * @returns active crawl details or 404
   */
  public getCurrentlyActiveCrawl = async () => {
    return await this.getClient().app.getCrawlerActiveCrawlRequest({
      engine_name: this.options.engineName,
    });
  }

  /**
   * Returns client
   *
   * @returns client
   */
  private getClient = () => {
    return new Client({
      url: this.options.url,
      auth: {
        username: this.options.username,
        password: this.options.password
      }
    });
  }

}

/**
 * Returns pre-configured Elastic client
 *
 * @param auth authentication
 * @returns Pre-configured Elastic client
 */
export const getElastic = (auth: BasicAuth) => {
  const { ELASTIC_URL, ELASTIC_APP_ENGINE } = config;

  return new Elastic({
    url: ELASTIC_URL,
    engineName: ELASTIC_APP_ENGINE,
    username: auth.username,
    password: auth.password
  });
}
