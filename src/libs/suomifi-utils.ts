import { Service, SuomiFiResponseWithMeta, SupportedLanguages } from "@types";
import fetch from "node-fetch";
import config from "src/config";
import { Department } from "./departments-registry-utils";

const { SUOMIFI_HELSINKI_ORGANIZATION_ID } = config;
const suomifiBasePath = "https://api.palvelutietovaranto.suomi.fi/api/v11/"
const suomifiServicesPath = "Service/list/organization?organizationId=";

/**
 * Gets services from Suomi.fi API
 */
export const getSuomifiServices = async () => {
  let pageNumber = 1;
  let retrievedAllPages = false;
  
  const services: Service[] = [];
  
  do {
    const serviceResponse = await doRequest<SuomiFiResponseWithMeta<Service>>(
      suomifiServicesPath + SUOMIFI_HELSINKI_ORGANIZATION_ID,
      pageNumber
    );
    
    if (!serviceResponse) {
      return;
    }
    
    if (serviceResponse.pageCount ===  serviceResponse.pageNumber) {
      retrievedAllPages = true;
    } 
    pageNumber += 1;
    services.push(...serviceResponse.itemList);
  } while (!retrievedAllPages)
  
  return services;
};

/**
 * Gets Suomifi services name for given language
 * 
 * @param service service
 * @param language language
 * @returns service name
 */
export const getServiceName = (service: Service, language: SupportedLanguages) => (
  service.serviceNames.find(serviceName => serviceName.language === language)?.value
);

/**
 * Gets Suomi.fi services summary description for given language
 * 
 * @param service service
 * @param language language
 * @returns service summary description
 */
export const getServiceSummary = (service: Service, language: SupportedLanguages) => (
  service.serviceDescriptions.find(serviceDdescription =>
    serviceDdescription.language === language && serviceDdescription.type === "Summary"
  )?.value
);

/**
 * Compares equivalency between Suomi.fi services and TPR departments.  
 * Returns true if titles are equal and summaries equality is over given treshold (defaults to 80%).
 * 
 * @param service service
 * @param department department
 * @param language language
 * @param treshold treshold
 * @returns Whether services were equivalent enough
 */
export const compareServices = (service: Service, department: Department, language: SupportedLanguages, treshold: number = 80) => {
  const suomifiSummary = getServiceSummary(service, language);
  const suomifiName = getServiceName(service, language);
  if (suomifiName === department.title && compareSummaries(suomifiSummary, department.description_short) > treshold) {
    return true;
  } else {
    return false;
  }
};

/**
 * Returns whichever summary is shorther and longer than the other
 * 
 * @params summary1 summary1
 * @params summary2 summary2
 */
const getLongerAndShortherSummary = (summary1: string[], summary2: string[]) => {
  if (summary1.length > summary2.length) {
    return {
      longerSummary: summary1,
      shortherSummary: summary2
    }
  }
  
  return {
    longerSummary: summary2,
    shortherSummary: summary1
  }
};

/**
 * Compares summaries from Suomi.fi and TPR word by word and returns percentage of matching words.
 * 
 * @param suomifiSummary Summary from Suomi.fi service
 * @param registrySummary Summary from TPR department
 * @returns Match in percentages
 */
const compareSummaries = (suomifiSummary?: string, registrySummary?: string) => {
  if (!suomifiSummary || !registrySummary) {
    return 0;
  }
  const suomifiSplit = suomifiSummary.split(" ").map(word => word.replace(/[^a-zA-Z0-9 ]/g, ""));
  const registrySplit = registrySummary.split(" ").map(word => word.replace(/[^a-zA-Z0-9 ]/g, ""));
  
  const { longerSummary, shortherSummary } = getLongerAndShortherSummary(suomifiSplit, registrySplit);
  
  let amountOfMatchingWords = 0;
  for (let i = 0; i < longerSummary.length; i++) {
    if (longerSummary[i] === shortherSummary[i]) {
      amountOfMatchingWords++;
    }
  }
  
  return amountOfMatchingWords / shortherSummary.length * 100;
};

/**
 * Does HTTP GET request to given path in Suomi.fi API
 * 
 * @param path path
 * @param pageNumber page number
 * @returns Response
 */
const doRequest = async <T>(path: string, pageNumber?: number) => {
  let requestPath = suomifiBasePath + path;
  
  if (pageNumber) {
    requestPath += `&page=${pageNumber}`;
  }
  
  const request = await fetch(requestPath);
  
  if (request.status === 200) {
    return await request.json() as Promise<T>;
  }
};