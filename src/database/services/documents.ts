import { DocumentClient } from "aws-sdk/clients/dynamodb";
import Document from "../models/document";

const TABLE_NAME = "documents";

/**
 * Database service for documents
 */
class DocumentService {

  /**
   * Constructor
   *
   * @param docClient DynamoDB client
   */
  constructor(private readonly docClient: DocumentClient) {}

  /**
   * Creates document
   *
   * @param documents document
   * @returns created document
   */
  public createDocument = async (documents: Document): Promise<Document> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: documents
      })
      .promise();

    return documents;
  }

  /**
   * Finds single document
   *
   * @param id document id
   * @returns document or null if not found
   */
  public findDocument = async (id: string): Promise<Document | null> => {
    const result = await this.docClient
      .get({
        TableName: TABLE_NAME,
        Key: {
          id: id
        },
      })
      .promise();

      return result.Item as Document;
  }

  /**
   * Lists documents
   *
   * @returns list of documents
   */
  public listDocuments = async (): Promise<Document[]> => {
    const result = await this.docClient
      .scan({
        TableName: TABLE_NAME
      })
      .promise();

    return result.Items as Document[];
  }

  /**
   * Updates document
   *
   * @param documents document to be updated
   * @returns updated document
   */
  public updateDocument = async (documents: Document): Promise<Document> => {
    await this.docClient
      .put({
        TableName: TABLE_NAME,
        Item: documents
      })
      .promise();

      return documents;
  }

  /**
   * Deletes document
   *
   * @param id document id
   */
  public deleteDocument = async (id: string) => {
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

export default DocumentService;