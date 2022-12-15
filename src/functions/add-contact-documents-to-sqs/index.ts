import { handlerPath } from "@libs/handler-resolver";
import config from "src/config";
import { AWSFunction } from "src/types";

const rate = config.CONTACT_SYNC_INTERVAL_IN_DAYS;
const rateExpression = rate > 1
  ? `${rate} days`
  : "1 day";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 60,
  environment: {
    AWS_SQS_QUEUE_URL: {
      Ref: "HelsinkiSearchContactPersonQueue"
    }
  },
  events: [
    {
      schedule: {
        rate: [
          `rate(${rateExpression})`
        ]
      }
    }
  ],
};

export default fn;