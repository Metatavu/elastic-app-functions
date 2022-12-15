import { Contact } from "@types";
import { middyfy } from "@libs/lambda";
import { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import config from "src/config";
import { ContentCategory, Document, getElastic } from "src/elastic";
import { DateTime } from "luxon";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Translates SQS message event record to Elastic Search document containing contact information
 *
 * @param record record
 * @returns contact document or undefined if timestamp from message attribute is invalid
 */
const translateRecordToContactDocument = (record: SQSRecord): Document | undefined => {
  const timestamp = Number(record.messageAttributes.timestamp.stringValue || "");

  if (Number.isNaN(timestamp)) {
    console.error(`Invalid timestamp '${timestamp}' found from event record ${record}`);
    return undefined;
  }

  const contact: Contact = JSON.parse(record.body);

  return {
    name: contact.name,
    title: contact.title,
    title_sv: contact.title_sv,
    title_en: contact.title_en,
    email_address: contact.email_address,
    phones: contact.phones,
    addresses: contact.addresses,
    ous: contact.ous,
    search_words: contact.search_words,
    id: contact.id,
    meta_content_category: ContentCategory.CONTACT,
    last_crawled_at: DateTime.fromMillis(timestamp).toISO()
  };
}

/**
 * Lambda that is launched by SQS queue.
 *
 * - receives a batch of contact information messages from the queue
 * - translates received contact information to Elastic Search documents
 * - updates the documents to Elastic
 *
 * @param event event
 */
const processContactDocumentFromSQS = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const records = event.Records || [];

  if (!records.length) throw Error(`No records fround from event ${event}`);
  if (records.length > 100) throw Error(`Too many records found from event ${event}`);

  // We return all failed items from the received batch to the event source
  // as we want it to only return failed items to the SQS queue.
  const failedItemIdsSet = new Set<string>(records.map(record => record.messageId));

  try {
    const elastic = getElastic({
      username: ELASTIC_ADMIN_USERNAME,
      password: ELASTIC_ADMIN_PASSWORD
    });

    const documents = records.reduce<Document[]>((list, item) => {
      const document = translateRecordToContactDocument(item);
      if (document) list.push(document);
      return list;
    }, []);

    const results = await elastic.updateDocuments({ documents: documents });

    results.forEach(({ errors, id }) => {
      if (errors.length || !id) {
        console.error(`Failed to update contact document with ID ${id}. Reasons: ${errors.join(", ")}`);
      } else {
        console.info(`Updated contact information with ID ${id}`);
        failedItemIdsSet.delete(id);
      }
    });
  } catch (error) {
    console.error("Error while processing contact information", error);
  }

  return {
    batchItemFailures: [ ...failedItemIdsSet.values() ].map(id => ({ itemIdentifier: id }))
  };
};

export const main = middyfy(processContactDocumentFromSQS);