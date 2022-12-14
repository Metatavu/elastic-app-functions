import type { AWS } from "@serverless/typescript";

/**
 * AWS function type
 */
export type AWSFunction = Exclude<AWS["functions"], undefined>[string];

/**
 * Person phone
 */
export interface Phone {
  "#text": string;
  "@_type": "landline" | "mobile";
};

/**
 * Person operational unit
 */
export interface OperationalUnit {
  "#text": string;
  "@_level": number;
};

/**
 * Person search word
 */
export interface SearchWord {
  type: "name" | "ou" | "title";
  weight: number;
  word: string;
};

/**
 * Single person from contact XML
 */
export interface XMLPerson {
  "@_mecm_id": string;
  name: string;
  title: string;
  title_sv: string;
  title_en: string;
  email_address: string;
  phones: {
    phone: Phone[];
  };
  addresses: {
    address: string;
  };
  ous: {
    ou: OperationalUnit[];
  };
  search_words: {
    search_word: SearchWord[];
  };
};

/**
 * Contact parsed from XML person
 */
export type Contact = Omit<XMLPerson, "@_mecm_id"> & { id: string; };