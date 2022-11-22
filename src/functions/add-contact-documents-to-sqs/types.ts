export interface Phone {
  "#text": string;
  "@_type": "landline" | "mobile";
};

export interface OperationalUnit {
  "#text": string;
  "@_level": number;
};

export interface SearchWord {
  type: "name" | "ou" | "title";
  weight: number;
  word: string;
};

export interface Person {
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