import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 60,
  events: [
    {
      sqs: {
        arn: {
          "Fn::GetAtt": [ "helsinki-search-contact-person-queue-${opt:stage}", "Arn" ]
        }
      }
    }
  ]
};

export default fn;