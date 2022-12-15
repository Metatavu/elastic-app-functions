import type { AWS } from "@serverless/typescript";

import findTimedCuration from "@functions/find-timed-curation";
import listTimedCurations from "@functions/list-timed-curations";
import createTimedCuration from "@functions/create-timed-curation";
import updateTimedCuration from "@functions/update-timed-curation";
import deleteTimedCuration from "@functions/delete-timed-curation";
import scheduleTimedCuration from "@functions/schedule-timed-curations";
import addCategoryToDocuments from "@functions/add-category-to-document";
import detectDocumentLanguages from "@functions/detect-document-languages";
import detectNewsPublished from "@functions/detect-news-published";
import detectBreadcrumbs from "@functions/detect-breadcrumbs";
import findScheduledCrawl from "@functions/scheduled-crawls/find-scheduled-crawl";
import listScheduledCrawls from "@functions/scheduled-crawls/list-scheduled-crawls";
import createScheduledCrawl from "@functions/scheduled-crawls/create-scheduled-crawl";
import updateScheduledCrawl from "@functions/scheduled-crawls/update-scheduled-crawl";
import deleteScheduledCrawl from "@functions/scheduled-crawls/delete-scheduled-crawl";
import triggerScheduledCrawl from "@functions/scheduled-crawls/trigger-scheduled-crawl";
import addContactDocumentsToSQS from "@functions/add-contact-documents-to-sqs";
import processContactDocumentFromSQS from "@functions/process-contact-documents-from-sqs";

import config from "src/config";

const serverlessConfiguration: AWS = {
  service: "elastic-app-functions",
  frameworkVersion: "3",
  plugins: [ "serverless-esbuild", "serverless-deployment-bucket", "serverless-dotenv-plugin" ],
  provider: {
    name: "aws",
    runtime: "nodejs16.x",
    region: config.AWS_DEFAULT_REGION as AWS["provider"]["region"],
    deploymentBucket: {
      name: "serverless-elastic-app-functions-${opt:stage}-deploy"
    },
    httpApi: {
      shouldStartNameWithService: true,
      cors: true
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      ELASTIC_URL: config.ELASTIC_URL,
      ELASTIC_APP_ENGINE: config.ELASTIC_APP_ENGINE,
      ELASTIC_ADMIN_USERNAME: config.ELASTIC_ADMIN_USERNAME,
      ELASTIC_ADMIN_PASSWORD: config.ELASTIC_ADMIN_PASSWORD,
      CONTACT_PERSONS_URL: config.CONTACT_PERSONS_URL,
      CONTACT_SYNC_INTERVAL_IN_DAYS: config.CONTACT_SYNC_INTERVAL_IN_DAYS.toString()
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
          },
          {
            Effect: "Allow",
            Action: [
              "sqs:*"
            ],
            Resource: [
              { "Fn::GetAtt": [ "HelsinkiSearchContactPersonQueue", "Arn" ] },
              { "Fn::GetAtt": [ "HelsinkiSearchContactPersonProcessingFailedQueue", "Arn" ] }
            ]
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
      HelsinkiSearchContactPersonQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "helsinki-search-contact-person-queue-${opt:stage}",
          VisibilityTimeout: 600,
          MessageRetentionPeriod: 86400,
          ReceiveMessageWaitTimeSeconds: 20,
          RedriveAllowPolicy: {
            redrivePermission: "denyAll"
          },
          RedrivePolicy: {
            deadLetterTargetArn: { "Fn::GetAtt": [ "HelsinkiSearchContactPersonProcessingFailedQueue", "Arn" ] },
            maxReceiveCount: 1
          }
        },
      },
      HelsinkiSearchContactPersonProcessingFailedQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "helsinki-search-contact-person-processing-failed-queue-${opt:stage}",
          RedriveAllowPolicy: {
            redrivePermission: "allowAll"
          }
        },
      }
    },
  }
};

module.exports = serverlessConfiguration;
