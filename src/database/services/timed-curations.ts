import { DocumentClient } from "aws-sdk/clients/dynamodb";
import TimedCuration from "../models/timed-curation";

const TABLE_NAME = "timed-curations";

/**
 * Database service for timed curations
 */
class TimedCurationService {

  /**
   * Constructor
   *
   * @param docClient DynamoDB client
   */
  constructor(private readonly docClient: DocumentClient) {}

  /**
   * Creates timed curation
   *
   * @param timedCuration timed curation
   * @returns created timed curation
   */
   public createTimedCuration = async (timedCuration: TimedCuration): Promise<TimedCuration> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: timedCuration
      })
      .promise();

    return timedCuration;
  }

  /**
   * Finds single timed curation
   *
   * @param id timed curation id
   * @returns timed curation or null if not found
   */
  public findTimedCuration = async (id: string): Promise<TimedCuration | null> => {
    const result = await this.docClient
      .get({
        TableName: TABLE_NAME,
        Key: {
          id: id
        },
      })
      .promise();

      return result.Item as TimedCuration;
  }

  /**
   * Lists timed curations
   *
   * @returns list of timed curations
   */
  public listTimedCurations = async (): Promise<TimedCuration[]> => {
    const result = await this.docClient
      .scan({
        TableName: TABLE_NAME
      })
      .promise();

    return result.Items as TimedCuration[];
  }

  /**
   * Lists manually created document curations
   *
   * @returns list of timed curations
   */
  public listManuallyCreatedDocumentCurations = async (): Promise<TimedCuration[]> => {
    const result = await this.docClient
    // Could this be done with a query?
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: "#isManuallyCreated = :isManuallyCreated",
        ExpressionAttributeNames: { "#isManuallyCreated": "isManuallyCreated" },
        ExpressionAttributeValues: { ":isManuallyCreated":true }
      })
      .promise();

    return result.Items as TimedCuration[];
  }

  /**
   * Updates timed curation
   *
   * @param timedCuration timed curation to be updated
   * @returns updated timed curation
   */
  public updateTimedCuration = async (timedCuration: TimedCuration): Promise<TimedCuration> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: timedCuration
      })
      .promise();

      return timedCuration;
  }

  /**
   * Deletes timed curation
   *
   * @param id timed curation id
   */
  public deleteTimedCuration = async (id: string) => {
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

export default TimedCurationService;