import { CurationType } from "@types";

/**
 * DynamoDB model for curation
 */
interface CurationModel {
  id: string;
  elasticCurationId?: string;
  documentId?: string;
  queries: string[];
  promoted: string[];
  hidden: string[];
  startTime?: string;
  endTime?: string;
  curationType: CurationType;
}

export default CurationModel;