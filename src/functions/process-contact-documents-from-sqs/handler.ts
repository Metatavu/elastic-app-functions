import { middyfy } from "@libs/lambda";
import { SNSEvent } from "aws-lambda";
import config from "src/config";
import { getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Scheduled lambda for processing Person SQS queue messages
 */
const processContactDocumentFromSQS = async (event: SNSEvent) => {
  console.log("event", event);
  if (!event.Records) return;

  try {
    const person = event.Records[0];
    console.log("Person data", person);

    const elastic = getElastic({
      username: ELASTIC_ADMIN_USERNAME,
      password: ELASTIC_ADMIN_PASSWORD
    });

  } catch (error) {
    console.error("Error while processing contact information", error);
  }
};

export const main = middyfy(processContactDocumentFromSQS);