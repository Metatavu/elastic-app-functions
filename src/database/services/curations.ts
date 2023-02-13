import { CurationType } from "@types";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import Curation from "../models/curation";

const TABLE_NAME = "curations";

/**
 * Database service for curations
 */
class CurationService {

  /**
   * Constructor
   *
   * @param docClient DynamoDB client
   */
  constructor(private readonly docClient: DocumentClient) {}

  /**
   * Creates curation
   *
   * @param curation curation
   * @returns created curation
   */
  public createCuration = async (curation: Curation): Promise<Curation> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: curation
      })
      .promise();

    return curation;
  }

  /**
   * Finds single curation
   *
   * @param id curation id
   * @returns curation or null if not found
   */
  public findCuration = async (id: string): Promise<Curation | null> => {
    const result = await this.docClient
      .get({
        TableName: TABLE_NAME,
        Key: {
          id: id
        },
      })
      .promise();

      return result.Item as Curation;
  }

  /**
   * Lists curations
   *
   * @returns list of curations
   */
  public listCurations = async (): Promise<Curation[]> => {
    const result = await this.docClient
      .scan({
        TableName: TABLE_NAME
      })
      .promise();

    return result.Items as Curation[];
  }

  /**
   * Lists custom document curations
   *
   * @returns list of curations
   */
  public listCustomDocumentCurations = async (): Promise<Curation[]> => {
    const result = await this.docClient
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: "#curationType = :curationType",
        ExpressionAttributeValues: { ":curationType":CurationType.CUSTOM }
      })
      .promise();

    return result.Items as Curation[];
  }

  /**
   * Updates curation
   *
   * @param curation curation to be updated
   * @returns updated curation
   */
  public updateCuration = async (curation: Curation): Promise<Curation> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: curation
      })
      .promise();

      return curation;
  }

  /**
   * Deletes curation
   *
   * @param id curation id
   */
  public deleteCuration = async (id: string) => {
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

export default CurationService;