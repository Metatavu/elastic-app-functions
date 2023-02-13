/**
 * DynamoDB model for documents
 */
interface Document {
    id: string;
    curationId?: string;
    title: string;
    description: string;
    links: string;
    language: string;
  };

  export default Document;