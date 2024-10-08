import { CurationType } from "@types";

/**
 * DynamoDB model for curation
 */
interface CurationModel {
  id: string;
  name: string;
  elasticCurationId?: string;
  language?: string;
  documentId?: string;
  queries: string[];
  promoted: string[];
  hidden: string[];
  invalidDocuments?: string[];
  startTime?: string;
  endTime?: string;
  curationType: CurationType;
  groupId?: string;
}

export default CurationModel;