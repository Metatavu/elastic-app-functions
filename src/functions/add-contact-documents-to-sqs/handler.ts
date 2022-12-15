import fetch from "node-fetch";
import config from "src/config";
import { middyfy } from "@libs/lambda";
import { Contact, XMLPerson } from "@types";
import { XMLParser } from "fast-xml-parser";
import { SQS } from "aws-sdk";
import { Document, Elastic, getElastic } from "src/elastic";
import { searchResultsToDocuments } from "@libs/document-utils";
import { DateTime } from "luxon";

/**
 * Deletes expired contact documents from Elastic App Search.
 *
 * @param elastic elastic client instance
 * @param contactDocuments contact documents to delete
 */
const deleteExpiredContactsFromElastic = async (elastic: Elastic, contactDocuments: Document[]) => {
  // Maximum of 100 documents can be deleted from Elastic at a time
  while (contactDocuments.length > 0) {
    try {
      const documentIdBatch = contactDocuments.splice(0, 100).map(document => document.id!);
      const results = await elastic.deleteDocuments({ documentIds: documentIdBatch });

      results.forEach(result =>
        result.deleted === false && console.error(`Could not delete contact document with ID ${result.id} from Elastic`)
      );
    } catch (error) {
      throw Error("Error while deleting contact documents from Elastic", { cause: error });
    }
  }
};

/**
 * Returns expired documents from Elastic App Search
 *
 * Expired contact is defined by examining whether date time value in last_crawled_at
 * field of the document is more than (2 * CONTACT_SYNC_INTERVAL_IN_DAYS) days old.
 *
 * @param elastic elastic client instance
 * @param timestamp timestamp of current contact sync
 */
const fetchExpiredContactsFromElastic = async (elastic: Elastic, timestamp: number) => {
  const contactDocumentExpiredAt = DateTime.fromMillis(timestamp).minus(2 * config.CONTACT_SYNC_INTERVAL_IN_DAYS);

  const { results } = await elastic.searchDocuments({
    query: "",
    filters: {
      all: [
        { meta_content_category: "contact" },
        { last_crawled_at: { to: contactDocumentExpiredAt } }
      ]
    }
  });

  return searchResultsToDocuments(results);
};

/**
 * Send list of contacts as messages to AWS SQS queue
 *
 * @param contacts list of contacts
 * @param timestamp timestamp of the current contact sync
 */
const sendContactsToSQS = async (contacts: Contact[], timestamp: number) => {
  const queueUrl = process.env.AWS_SQS_QUEUE_URL;

  if (!queueUrl) throw Error("Missing AWS_SQS_QUEUE_URL environment variable");

  const sqs = new SQS({ apiVersion: "latest" });
  const batchSize = 10;

  for (let i = 0; i < contacts.length - 1; i += batchSize) {
    const contactBatch = contacts.slice(i, i + batchSize);

    const messageBatch = contactBatch.map<SQS.SendMessageBatchRequestEntry>(contact => ({
      Id: contact.id.toString(),
      MessageBody: JSON.stringify(contact),
      MessageAttributes: {
        timestamp: {
          DataType: "Number",
          StringValue: timestamp.toString()
        }
      }
    }));

    try {
      const result = await sqs.sendMessageBatch({
        QueueUrl: queueUrl,
        Entries: messageBatch
      }).promise();

      const { Failed, Successful } = result;

      if (Failed.length) {
        Failed.forEach(({ Code, Message }) =>
          console.error(`Failed to add message to SQS queue with code ${Code}: ${Message}.`)
        );

        continue;
      }

      if (Successful.length) {
        console.info(`Added IDs ${Successful.map(entry => entry.Id).join(", ")} to queue`);
      }

    } catch (error) {
      console.error("Error while sending contact person message batch to SQS queue", error);
    }

    const currentIndex = i + batchSize;
    const processedAmount = currentIndex > contacts.length ? contacts.length : currentIndex;

    console.info(`Processed ${processedAmount}/${contacts.length}...`);
  }
};

/**
 * Translates XML person to contact
 *
 * @param person XML person
 */
const translateXmlPersonToContact = ({ "@_mecm_id": id, ...rest }: XMLPerson): Contact =>
  ({ id: id.toString(), ...rest });

/**
 * Fetches CONTACT_PERSONS_URL and returns list of contacts parsed from XML response
 */
const fetchContacts = async (): Promise<Contact[]> => {
  const response = await fetch(new URL(config.CONTACT_PERSONS_URL).toString());

  const contentType = response.headers.get("content-type");
  if (!contentType?.startsWith("application/xml")) {
    throw Error(`Could not load contact persons XML from ${config.CONTACT_PERSONS_URL}`);
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

  const xmlPersons: XMLPerson[] = xmlParser.parse(responseContent).persons.person;

  return xmlPersons.map(translateXmlPersonToContact);
}

/**
 * Scheduled lambda for fetching contact data, processing it and sending it to SQS queue
 */
const addContactDocumentsToSQS = async () => {
  try {
    const elastic = getElastic({
      username: config.ELASTIC_ADMIN_USERNAME,
      password: config.ELASTIC_ADMIN_PASSWORD
    });

    const timestamp = Date.now();

    const expiredContacts = await fetchExpiredContactsFromElastic(elastic, timestamp);

    await deleteExpiredContactsFromElastic(elastic, expiredContacts);
    const contacts = await fetchContacts();

    await sendContactsToSQS(contacts, timestamp);
  } catch (error) {
    console.error("Error while processing contact information", error);
  }
};

export const main = middyfy(addContactDocumentsToSQS);