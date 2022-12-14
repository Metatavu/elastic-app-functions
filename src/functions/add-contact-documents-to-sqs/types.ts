/**
 * Phone
 */
export interface Phone {
  "#text": string;
  "@_type": "landline" | "mobile";
};

/**
 * Operational unit
 */
export interface OperationalUnit {
  "#text": string;
  "@_level": number;
};

/**
 * Search word
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
 * Person to use in SQS messaging
 */
export type Person = Omit<XMLPerson, "@_mecm_id"> & { id: string; };