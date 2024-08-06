import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 30,
  events: [
    {
      httpApi: {
        method: "get",
        path: "/scheduled-crawl",
      },
    },
  ],
};

export default fn;
