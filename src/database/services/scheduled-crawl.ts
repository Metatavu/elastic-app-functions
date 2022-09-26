import { DocumentClient } from "aws-sdk/clients/dynamodb";
import ScheduledCrawl from "../models/scheduled-crawl";

const TABLE_NAME = "scheduled-crawls";

/**
 * Database service for scheduled crawls
 */
class ScheduledCrawlService {

  /**
   * Constructor
   * 
   * @param docClient DynamoDB client
   */
  constructor(private readonly docClient: DocumentClient) {}

  /**
   * Creates scheduled crawl
   * 
   * @param scheduledCrawl scheduled crawl
   * @returns created scheduled crawl
   */
   public createScheduledCrawl = async (scheduledCrawl: ScheduledCrawl): Promise<ScheduledCrawl> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: scheduledCrawl
      })
      .promise();

    return scheduledCrawl;
  }

  /**
   * Finds single scheduled crawl
   * 
   * @param id scheduled crawl id
   * @returns scheduled crawl or null if not found
   */
  public findScheduledCrawl = async (id: string): Promise<ScheduledCrawl | null> => {
    const result = await this.docClient
      .get({
        TableName: TABLE_NAME,
        Key: { 
          id: id 
        },
      })
      .promise();

      return result.Item as ScheduledCrawl;
  }  

  /**
   * Lists scheduled crawls
   * 
   * @returns list of scheduled crawls
   */
  public listScheduledCrawls = async (): Promise<ScheduledCrawl[]> => {
    // TODO: could scan be updated to get to specify which columns are returned?
    const result = await this.docClient
      .scan({
        TableName: TABLE_NAME
      })
      .promise();

    return result.Items as ScheduledCrawl[];
  }

  /**
   * Updates scheduled crawl
   * 
   * @param scheduledCrawl scheduled crawl to be updated
   * @returns updated scheduled crawl
   */
  public updateScheduledCrawl = async (scheduledCrawl: ScheduledCrawl): Promise<ScheduledCrawl> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: scheduledCrawl
      })
      .promise();

      return scheduledCrawl;
  }

  /**
   * Deletes scheduled crawl
   * 
   * @param id scheduled crawl id
   */
  public deleteScheduledCrawl = async (id: string) => {
    return this.docClient
      .delete({
        TableName: TABLE_NAME,
        Key: { 
          id: id 
        },
      })
      .promise();
  }  

}

export default ScheduledCrawlService;