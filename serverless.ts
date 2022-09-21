import type { AWS } from '@serverless/typescript';

import findTimedCuration from '@functions/find-timed-curation';
import listTimedCurations from '@functions/list-timed-curations';
import createTimedCuration from '@functions/create-timed-curation';
import updateTimedCuration from '@functions/update-timed-curation';
import deleteTimedCuration from '@functions/delete-timed-curation';
import scheduleTimedCuration from "@functions/schedule-timed-curations";
import findScheduledCrawl from '@functions/scheduled-crawls/find-scheduled-crawl';
import listScheduledCrawls from '@functions/scheduled-crawls/list-scheduled-crawls';
import createScheduledCrawl from '@functions/scheduled-crawls/create-scheduled-crawl';
import updateScheduledCrawl from '@functions/scheduled-crawls/update-scheduled-crawl';
import deleteScheduledCrawl from '@functions/scheduled-crawls/delete-scheduled-crawl';
import triggerScheduledCrawl from "@functions/scheduled-crawls/trigger-scheduled-crawl";
import { env } from 'process';

const serverlessConfiguration: AWS = {
  service: 'elastic-app-functions',
  frameworkVersion: '3',
  plugins: [ 'serverless-esbuild', 'serverless-deployment-bucket' ],
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    region: env.AWS_DEFAULT_REGION as any,
    deploymentBucket: {
      name: "serverless-elastic-app-functions-${opt:stage}-deploy"
    },
    httpApi: {
      shouldStartNameWithService: true,
      cors: true
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      ELASTIC_URL: env.ELASTIC_URL,
      ELASTIC_APP_ENGINE: env.ELASTIC_APP_ENGINE,
      ELASTIC_ADMIN_USERNAME: env.ELASTIC_ADMIN_USERNAME,
      ELASTIC_ADMIN_PASSWORD: env.ELASTIC_ADMIN_PASSWORD
    },
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: [
              "dynamodb:DescribeTable",
              "dynamodb:Query",
              "dynamodb:Scan",
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
            ],
            Resource: [
              // TODO: to be checked.
              { "Fn::GetAtt": [ "TimedCurations", "Arn", "ScheduledCrawls" ] }
            ],
          }
        ]
      }
    }
  },
  functions: { 
    findTimedCuration,
    listTimedCurations, 
    createTimedCuration, 
    updateTimedCuration,
    deleteTimedCuration,
    scheduleTimedCuration,
    findScheduledCrawl,
    listScheduledCrawls, 
    createScheduledCrawl, 
    updateScheduledCrawl,
    deleteScheduledCrawl,
    triggerScheduledCrawl
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: [ 'aws-sdk' ],
      target: 'node16',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    } 
  },
  resources: {
    Resources: {
      TimedCurations: {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: "Delete",
        Properties: {
          TableName: "timed-curations",
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          },
        },
      },
      ScheduledCrawls: {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: "Delete",
        Properties: {
          TableName: "scheduled-crawls",
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          },
        },
      },
    }
  }
};

module.exports = serverlessConfiguration;
