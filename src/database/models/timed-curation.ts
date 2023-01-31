/**
 * DynamoDB model for timed curation
 */
interface TimedCuration {
  id: string;
  curationId?: string;
  queries: string[];
  promoted: string[];
  hidden: string[];
  startTime?: string;
  endTime?: string;
  isManuallyCreated?: boolean;
}

export default TimedCuration;