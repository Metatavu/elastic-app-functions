import fetch from "node-fetch";
import config from "src/config";
import { middyfy } from "@libs/lambda";
import { Person } from "./types";
import { XMLParser } from "fast-xml-parser";
import { AWSError, SQS } from "aws-sdk";
import { SendMessageBatchResult } from "aws-sdk/clients/sqs";

const { CONTACT_PERSONS_URL } = config;

/**
 * Send messages to AWS SQS
 *
 * @param personsData list of contact persons
 */
const sendMessagesToSQS = (personsData: Person[]) => {
  const queueUrl = process.env.AWS_SQS_QUEUE_URL;

  if (!queueUrl) throw Error("Missing AWS_SQS_QUEUE_URL environment variable");

  const sqs = new SQS({ apiVersion: "latest" });
  const batchSize = 10;

  for (let i = 0; i < personsData.length -1; i += batchSize) {
    const currentBatch = personsData.slice(i, i + batchSize);

    const batch: SQS.SendMessageBatchRequestEntryList = currentBatch.map(person => ({
      Id: person["@_mecm_id"].toString(),
      MessageBody: JSON.stringify(person)
    }));

    console.log(batch[0]);

    sqs.sendMessageBatch({
      QueueUrl: queueUrl,
      Entries: batch
    }, (error: AWSError, result: SendMessageBatchResult) => {
      if (error != null) {
        console.error("Error while sending contact person message batch to SQS queue", error);
      }

      if (result.Failed.length) {
        result.Failed.forEach(({ Code, Message }) =>
          console.error(`Failed to add message to SQS queue with code ${Code}: ${Message}.`)
        );
      }

      if (result.Successful.length) {
        console.info(`Added IDs ${result.Successful.map(entry => entry.Id)} to queue`);
      }
    });

    const processedAmount = i + batchSize > personsData.length ?
      personsData.length :
      i + batchSize;

    console.info(`Processed ${processedAmount}/${personsData.length}...`);
  }
};

/**
 * Scheduled lambda for reading xml file, processing it and sending SQS queue
 */
const addContactDocumentsToSQS = async () => {
  try {
    const response = await fetch(new URL(CONTACT_PERSONS_URL).toString());
    const contentType = response.headers.get("content-type");

    if (!contentType?.startsWith("application/xml")) {
      console.error(`Could not load contact persons XML from ${CONTACT_PERSONS_URL}`);
      return;
    }

    const responseContent = await response.text();
    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      numberParseOptions: {
        hex: true,
        leadingZeros: false
      }
    });

    const personsData = xmlParser.parse(responseContent).persons.person as Person[];
    sendMessagesToSQS(personsData);
  } catch (error) {
    console.error("Error while processing contact information", error);
  }
};

export const main = middyfy(addContactDocumentsToSQS);