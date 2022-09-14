import createDynamoDBClient from "../client";
import TimedCurationService from "./timed-curations";

export const timedCurationsService = new TimedCurationService(createDynamoDBClient());