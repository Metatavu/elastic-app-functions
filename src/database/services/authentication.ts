import { DocumentClient } from "aws-sdk/clients/dynamodb";
import Authentication from "../models/authentication";

const TABLE_NAME = "authentication";

/**
 * Database service for authentication
 */
class AuthenticationService {

  /**
   * Constructor
   *
   * @param docClient DynamoDB client
   */
  constructor(private readonly docClient: DocumentClient) {}

  /**
   * Creates authentication session
   *
   * @param authentication authentication
   * @returns authentication session
   */
  public createSession = async (authentication: Authentication): Promise<Authentication> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: authentication
      })
      .promise();

    return authentication;
  }

  /**
   * Finds authentication credentials
   *
   * @param token lambda authentication token
   * @returns authentication credentials or null if not found
   */
  public findSession = async (token: string): Promise<Authentication | null> => {
    const result = await this.docClient
      .get({
        TableName: TABLE_NAME,
        Key: {
          token: token
        },
      })
      .promise();

      return result.Item as Authentication;
  }

  /**
   * Deletes authentication session
   *
   * @param token lambda authentication token
   */
  public deleteSession = async (token: string) => {
    return this.docClient
      .delete({
        TableName: TABLE_NAME,
        Key: {
          token: token
        },
      })
      .promise();
  }

}

export default AuthenticationService;