import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  name: "elastic-app-functions-${opt:stage}-curationDocumentValidation",
  timeout: 900,
  events: [
    {
      schedule: {
        rate: [
          // TODO: Should this be updated?
          "cron(0 4 ? * SUN *)"
        ]
      }
    }
  ]
};

export default fn;