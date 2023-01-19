import fetch from "node-fetch";

/**
 * Department Registry Department type
 */
export type Department = {
  id: number;
  main_description: boolean;
  service_id: number;
  title: string;
  name_synonyms: string;
  description_short: string;
  description_long: string;
  availability_summary: string;
  prerequisites: string;
  information: string;
  general_description_id: string;
  provided_languages: string[];
  responsible_depts: string[];
  target_groups: string[];
  life_events: string[];
  errand_services: any[];
  exact_errand_services: number[];
  links: {
    type: string;
    title: string; 
    url: string;
  }[];
  availabilities: string[];
  unit_ids: number[]; 
};

const DEPARTMENTS_REGISTRY_API_URL = "https://www.hel.fi/palvelukarttaws/rest/vpalvelurekisteri/description/?municipality=91&language=fi&alldata=yes";

/**
 * Gets Departments from Department Registry
 * 
 * @returns Departments
 */
export const getDepartmentsFromRegistry = async () => {
  const departmentsRequest = await fetch(DEPARTMENTS_REGISTRY_API_URL);
  
  if (departmentsRequest.status !== 200) {
    return;
  }

  return await departmentsRequest.json() as Department[];
};