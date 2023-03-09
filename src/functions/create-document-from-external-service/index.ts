import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      schedule: {
        rate: [
          "cron(0 3 ? * SUN *)"
        ]
      }
    }
  ]
};

export default fn;