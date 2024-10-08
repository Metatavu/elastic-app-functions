import { ListCrawlerDomainsResponse, SearchEsSearchRequest } from "@elastic/enterprise-search/lib/api/app/types";
import type { AWS } from "@serverless/typescript";
import { ContentCategory } from "src/elastic";

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

/**
 * Drupal settings JSON with property to decipher content categories for service and unit
 */
export type DrupalSettingsJson = {
  path?: {
    currentPath?: string | null;
  };
};

/**
 * Type for Suomi.fi Services API response
 */
export type SuomiFiResponseWithMeta<T> = {
  pageNumber: number;
  pageSize: number;
  pageCount: number;
  itemList: T[];
};

/**
 * Enum for supported languages for Suomi.fi Services
 */
export enum SupportedLanguages {
  FI = "fi",
  SV = "sv",
  EN = "en"
}

/**
 * Type for Suomi.fi Services
 */
export type Service = {
  id: string;
  sourceId: number;
  serviceNames: {
    language: string;
    value: string;
  }[];
  serviceDescriptions: {
    language: string;
    value: string;
    type: string;
  }[];
};

/**
 * Type for TPR Service document
 */
export type ServiceDocument = {
  title: string;
  meta_content_category: ContentCategory;
  meta_description: string;
  language: SupportedLanguages;
  external_url: string;
};

/**
 * Enum for curation type
 */
export enum CurationType {
  CUSTOM = "custom",
  STANDARD = "standard"
};

/**
 * Crawler domain
 */
export type CrawlerDomain = ListCrawlerDomainsResponse["results"][0];

/**
 * Crawl rule
 */
export type CrawlRule = Required<CrawlerDomain>["default_crawl_rule"];

/**
 * Search request options for Elastic App Search
 */
export type SearchESSearchRequestBody = Required<SearchEsSearchRequest>["body"];

/**
 * Search response from Elastic App Search
 */
export type SearchEsSearchResponse = {
  took?: number,
  timed_out?: boolean,
  _shards?: {
    total: number,
    successful: number,
    skipped: number,
    failed: number
  },
  hits?: {
    total?: {
      value?: number,
      relation?: string
    },
    max_score?: number,
    hits?: { [k: string]: any }[],
  }
};