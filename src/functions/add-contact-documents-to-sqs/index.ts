import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

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
          "rate(1 day)"
        ]
      }
    }
  ],
};

export default fn;