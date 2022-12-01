import { Person } from "@functions/add-contact-documents-to-sqs/types";
import { middyfy } from "@libs/lambda";
import { SNSEvent } from "aws-lambda";
import config from "src/config";
import { ContentCategory, Document, getElastic } from "src/elastic";

const { ELASTIC_ADMIN_USERNAME, ELASTIC_ADMIN_PASSWORD } = config;

/**
 * Scheduled lambda for processing Person SQS queue messages
 */
const processContactDocumentFromSQS = async (event: SNSEvent) => {
  if (!event.Records) return;

  try {
    const person = JSON.parse(event.Records[0].Sns.Message) as Person;

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
      id: person["@_mecm_id"],
      meta_content_category: ContentCategory.CONTACT
    }];

    const result: any = await elastic.updateDocuments({
      documents: personDocument
    });

    if(result[0].errors.length) {
      throw new Error(result[0].errors.length);
    }

    console.log("Updated contact infomation", result[0].id, result);
  } catch (error) {
    console.error("Error while processing contact information", error);
  }
};

export const main = middyfy(processContactDocumentFromSQS);