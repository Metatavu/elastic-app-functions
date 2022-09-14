import { Client } from "@elastic/enterprise-search";
import { BasicAuth } from "@libs/auth-utils";
import config from "../config";

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
   * @returns craeted curation
   */
  public createCuration = async (options: { curation: { queries: string[], promoted: string[], hidden: string[] } }): Promise<string> => {
    const { curation } = options;

    const result = await this.getClient().app.createCuration({
      engine_name: this.options.engineName,
      body: curation
    });

    return result.id;
  };

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
      documentIds: [ documentId ]
    });

    return response?.length === 1 ? response[0] : null;
  }

  /**
   * Finds single curation
   * 
   * @param options options
   * @returns single curation or null if not found
   */
  public findCuration = async (options: { id: string }) => {
    const { id } = options;
    return await this.getClient().app.getCuration({
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
 * Returns preconfigured Elastic client
 * 
 * @param auth authentication 
 * @returns Preconfigured Elastic client
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