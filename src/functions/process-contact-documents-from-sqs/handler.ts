import { Person } from "@functions/add-contact-documents-to-sqs/types";
import { middyfy } from "@libs/lambda";
import { SQSEvent } from "aws-lambda";
import config from "src/config";
import { ContentCategory, Document, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Scheduled lambda for processing Person SQS queue messages
 *
 * @param event event
 */
const processContactDocumentFromSQS = async (event: SQSEvent) => {
  const record = event.Records?.at(0);

  if (!record) {
    throw Error(`No item fround from event ${event}`);
  }

  try {
    const personId = record.messageId;
    const person = JSON.parse(record.body) as Person;

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
      id: personId,
      meta_content_category: ContentCategory.CONTACT
    }];

    const documents = await elastic.updateDocuments({
      documents: personDocument
    });

    if (documents[0].errors.length) {
      throw Error("Failed to create or update document to Elastic App Search: ", { cause: documents[0].errors });
    }

    console.log("Updated contact infomation", documents[0].id);
  } catch (error) {
    console.error("Error while processing contact information", error);
  }
};

export const main = middyfy(processContactDocumentFromSQS);