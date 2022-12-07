import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 60,
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