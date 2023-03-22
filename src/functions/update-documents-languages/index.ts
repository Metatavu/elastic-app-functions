import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "@types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      schedule: {
        rate: [
          "rate(1 day)"
        ]
      }
    }
  ]
};

export default fn;