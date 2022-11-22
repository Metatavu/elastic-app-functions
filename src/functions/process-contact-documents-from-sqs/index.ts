import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  timeout: 60,
  events: [
    {
      schedule: {
        rate: [
          "rate(10 seconds)"
        ]
      }
    }
  ],
};
