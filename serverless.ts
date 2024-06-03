import type { AWS } from "@serverless/typescript";
import config from "src/config";
import {
  findCuration,
  listCurations,
  createCuration,
  updateCuration,
  deleteCuration,
  scheduleTimedCuration,
  createSession,
  deleteSession,
  findScheduledCrawl,
  listScheduledCrawls,
  createScheduledCrawl,
  updateScheduledCrawl,
  deleteScheduledCrawl,
  triggerScheduledCrawl,
  addContactDocumentsToSQS,
  processContactDocumentFromSQS,
  addExternalServiceIdToServices,
  createDocumentFromExternalService,
  listCustomDocuments,
  purgeExternalServiceDocuments,
} from "@functions";


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
      CONTACT_SYNC_INTERVAL_IN_DAYS: config.CONTACT_SYNC_INTERVAL_IN_DAYS.toString(),
      AUTHENTICATION_EXPIRY_IN_MINS: config.AUTHENTICATION_EXPIRY_IN_MINS.toString(),
      SUOMIFI_ORGANIZATION_ID: config.SUOMIFI_ORGANIZATION_ID
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
              "dynamodb:UpdateTimeToLive"
            ],
            Resource: [
              { "Fn::GetAtt": [ "Curations", "Arn" ] },
              { "Fn::GetAtt": [ "ScheduledCrawls", "Arn" ] },
              { "Fn::GetAtt": [ "AuthenticationSessions", "Arn" ] },
              { "Fn::GetAtt": [ "Documents", "Arn" ] }
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
    findCuration,
    listCurations,
    createCuration,
    updateCuration,
    deleteCuration,
    scheduleTimedCuration,
    findScheduledCrawl,
    listScheduledCrawls,
    createScheduledCrawl,
    updateScheduledCrawl,
    deleteScheduledCrawl,
    triggerScheduledCrawl,
    addContactDocumentsToSQS,
    processContactDocumentFromSQS,
    createSession,
    deleteSession,
    addExternalServiceIdToServices,
    createDocumentFromExternalService,
    listCustomDocuments,
    purgeExternalServiceDocuments,
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
      Curations: {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: "Delete",
        Properties: {
          TableName: "curations",
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
      Documents: {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: "Delete",
        Properties: {
          TableName: "documents",
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          },
        },
      },
      AuthenticationSessions: {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: "Delete",
        Properties: {
          TableName: "authentication-sessions",
          AttributeDefinitions: [{ AttributeName: "token", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "token", KeyType: "HASH" }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          },
          TimeToLiveSpecification: {
            AttributeName: "expiresAt",
            Enabled: true
          }
        },
      },
      HelsinkiSearchContactPersonQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "helsinki-search-contact-person-queue-${opt:stage}",
          VisibilityTimeout: 600, // should be at least six times your function timeout, plus the value of MaximumBatchingWindowInSeconds.
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
