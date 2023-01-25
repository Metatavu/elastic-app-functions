import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "@types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      httpApi: {
        method: "get",
        path: "/documents"
      }
    }
  ]
};

export default fn;