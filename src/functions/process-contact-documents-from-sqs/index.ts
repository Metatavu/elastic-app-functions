import { handlerPath } from '@libs/handler-resolver';
import config from "../../config";


export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 60,
  events: [
    {
      sns: { arn: config.AWS_SQS_ARN }
    }
  ]
};
