import { Client } from "@elastic/enterprise-search";
import { CreateCurationRequest, DeleteDocumentsResponse, SearchRequest, SearchResponse } from "@elastic/enterprise-search/lib/api/app/types";
import { BasicAuth } from "@libs/auth-utils";
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
  EXTERNAL = "service-external-link"
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
  id: string;
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
   * Creates new curation
   *
   * @param options options
   * @returns created curation
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
    } catch {
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
  public createCrawlRequest = async (options: { overrides: { seed_urls: string[] } }): Promise<string> => {
    const result = await this.getClient().app.createCrawlerCrawlRequest({
      engine_name: this.options.engineName,
      body: options as any
    });

    return result.id;
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
   * Check if a crawl is currently active
   *
   * @param options options
   * @returns active crawl details or 404
   */
  public checkIfActiveCrawl = async () => {
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
    "url": ELASTIC_URL,
    "engineName": ELASTIC_APP_ENGINE,
    "username": auth.username,
    "password": auth.password
  });
}