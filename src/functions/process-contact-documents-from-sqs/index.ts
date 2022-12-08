import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 60,
  events: [
    {
      sqs: {
        arn: {
          "Fn::GetAtt": [ "HelsinkiSearchContactPersonQueue", "Arn" ]
        }
      }
    }
  ]
};

export default fn;