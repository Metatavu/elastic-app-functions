import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 300,
  events: [
    {
      schedule: {
        rate: [
          "rate(5 minutes)"
        ]
      }
    }
  ],
};

export default fn;