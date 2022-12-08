import type { AWS } from "@serverless/typescript";

import findTimedCuration from "@functions/find-timed-curation";
import listTimedCurations from "@functions/list-timed-curations";
import createTimedCuration from "@functions/create-timed-curation";
import updateTimedCuration from "@functions/update-timed-curation";
import deleteTimedCuration from "@functions/delete-timed-curation";
import scheduleTimedCuration from "@functions/schedule-timed-curations";
import addCategoryToDocuments from "@functions/add-category-to-document";
import detectDocumentLanguages from "@functions/delect-document-languages";
import detectNewsPublished from "@functions/detect-news-published";
import detectBreadcrumbs from "@functions/detect-breadcrumbs";
import findScheduledCrawl from "@functions/scheduled-crawls/find-scheduled-crawl";
import listScheduledCrawls from "@functions/scheduled-crawls/list-scheduled-crawls";
import createScheduledCrawl from "@functions/scheduled-crawls/create-scheduled-crawl";
import updateScheduledCrawl from "@functions/scheduled-crawls/update-scheduled-crawl";
import deleteScheduledCrawl from "@functions/scheduled-crawls/delete-scheduled-crawl";
import triggerScheduledCrawl from "@functions/scheduled-crawls/trigger-scheduled-crawl";
import addContactDocumentsToSQS from "@functions/add-contact-documents-to-sqs";
import processContactDocumentFromSQS from "@functions/process-contact-documents-from-sqs"

import { env } from "process";

const serverlessConfiguration: AWS = {
  service: "elastic-app-functions",
  frameworkVersion: "3",
  plugins: [ "serverless-esbuild", "serverless-deployment-bucket", "serverless-dotenv-plugin" ],
  provider: {
    name: "aws",
    runtime: "nodejs16.x",
    region: env.AWS_DEFAULT_REGION as any,
    deploymentBucket: {
      name: "serverless-elastic-app-functions-${opt:stage}-deploy",
      serverSideEncryption: "AES256"
    },
    httpApi: {
      shouldStartNameWithService: true,
      cors: true
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000"
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
              { "Fn::GetAtt": [ "TimedCurations", "Arn" ] },
              { "Fn::GetAtt": [ "ScheduledCrawls", "Arn" ] }
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
    addCategoryToDocuments,
    detectDocumentLanguages,
    detectNewsPublished,
    detectBreadcrumbs,
    findScheduledCrawl,
    listScheduledCrawls,
    createScheduledCrawl,
    updateScheduledCrawl,
    deleteScheduledCrawl,
    triggerScheduledCrawl,
    addContactDocumentsToSQS,
    processContactDocumentFromSQS
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: [ "aws-sdk" ],
      target: "node16",
      define: { "require.resolve": undefined },
      platform: "node",
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
