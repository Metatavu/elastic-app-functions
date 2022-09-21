import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      timeout: 60,      
      schedule: {
        rate: [
          "rate(1 minute)"
        ]
      }
    }
  ],
};
