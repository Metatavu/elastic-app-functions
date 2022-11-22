import fetch from "node-fetch";
import config from "../../config";
import { middyfy } from "@libs/lambda";
import { Person } from "./types";
import { XMLParser } from "fast-xml-parser";
import { AWSError, SQS } from "aws-sdk";
import { SendMessageBatchResult } from "aws-sdk/clients/sqs";

const { AWS_SQS_QUEUE_URL, CONTACT_PERSONS_URL } = config;

/**
 * Send messages to AWS SQS
 *
 * @param personsData list of contact persons
 */
const sendMessagesToSQS = (personsData: Person[]) => {
  const sqs = new SQS({ apiVersion: "latest" });
  const batchSize = 10;

  // TODO: FOr development purposes only first 20 persons are sent to SQS
  // Remove this limitation once the functionalities are complete
  for (let i = 0; i < 20; i += batchSize) {
    const currentBatch = personsData.slice(i, i + batchSize);

    const batch: SQS.SendMessageBatchRequestEntryList = currentBatch.map(person => ({
      Id: person["@_mecm_id"].toString(),
      MessageBody: JSON.stringify(person)
    }));

    sqs.sendMessageBatch({
      Entries: batch,
      QueueUrl: AWS_SQS_QUEUE_URL
    }, (error: AWSError, _: SendMessageBatchResult) => {
      if (error != null) {
        console.error("Error while sending contact person message batch to SQS queue", error);
      }
    });

    console.info(`Processed ${i}/${personsData.length}...`);
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