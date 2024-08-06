import { handlerPath } from "@libs/handler-resolver";
import { AWSFunction } from "src/types";

const fn: AWSFunction = {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 30,
  events: [
    {
      httpApi: {
        method: "post",
        path: "/login",
      },
    },
  ],
};

export default fn;
