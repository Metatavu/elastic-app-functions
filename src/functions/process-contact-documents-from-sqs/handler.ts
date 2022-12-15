import { Contact } from "@types";
import { middyfy } from "@libs/lambda";
import { SQSEvent } from "aws-lambda";
import config from "src/config";
import { ContentCategory, Document, getElastic } from "src/elastic";
import { DateTime } from "luxon";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Scheduled lambda for processing Person SQS queue messages
 *
 * @param event event
 */
const processContactDocumentFromSQS = async (event: SQSEvent) => {
  const record = event.Records?.at(0);

  if (!record) throw Error(`No record fround from event ${event}`);

  const timestamp = Number(record.messageAttributes.timestamp.stringValue || "");

  if (Number.isNaN(timestamp)) throw Error(`Invalid timestamp '${timestamp}' found from event ${event}`);

  try {
    const person: Contact = JSON.parse(record.body);

    const elastic = getElastic({
      username: ELASTIC_ADMIN_USERNAME,
      password: ELASTIC_ADMIN_PASSWORD
    });

    const personDocument: Document[] =[{
      name: person.name,
      title: person.title,
      title_sv: person.title_sv,
      title_en: person.title_en,
      email_address: person.email_address,
      phones: person.phones,
      addresses: person.addresses,
      ous: person.ous,
      search_words: person.search_words,
      id: person.id,
      meta_content_category: ContentCategory.CONTACT,
      last_crawled_at: DateTime.fromMillis(timestamp).toISO()
    }];

    const documents = await elastic.updateDocuments({
      documents: personDocument
    });

    if (documents[0].errors.length) {
      throw Error("Failed to create or update document to Elastic App Search: ", { cause: documents[0].errors });
    }

    console.log("Updated contact information", documents[0].id);
  } catch (error) {
    console.error("Error while processing contact information", error);
  }
};

export const main = middyfy(processContactDocumentFromSQS);