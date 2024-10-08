import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  name: "elastic-app-functions-${opt:stage}-purgeCrawledDocuments",
  timeout: 900,
  events: [
    {
      schedule: {
        rate: ["rate(15 minutes)"]
      }
    }
  ]
};

export default fn;