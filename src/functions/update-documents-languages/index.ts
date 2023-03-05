import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "@types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      schedule: {
        rate: [
          "cron(0 3 ? * SAT *)"
        ]
      }
    }
  ]
};

export default fn;