import { Service, SuomiFiResponseWithMeta, SupportedLanguages } from "@types";
import fetch from "node-fetch";
import { Department } from "./departments-registry-utils";
import { compareTwoStrings } from "string-similarity";

const suomiFiBasePath = "https://api.palvelutietovaranto.suomi.fi/api/v11/"
const suomiFiServicesPath = "Service/list/organization?organizationId=";

/**
 * Gets services from Suomi.fi API
 *
 * @params organizationId Organization ID
 */
export const getSuomiFiServicesByOrganization = async (organizationId: string) => {
  let pageNumber = 1;
  let retrievedAllPages = false;

  const services: Service[] = [];

  do {
    const serviceResponse = await doListRequest<SuomiFiResponseWithMeta<Service>>(
      suomiFiServicesPath + organizationId,
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
  service.serviceNames.find(serviceName => serviceName.language === language)?.value ?? ""
);

/**
 * Gets Suomi.fi services summary description for given language
 *
 * @param service service
 * @param language language
 * @returns service summary description
 */
export const getServiceSummary = (service: Service, language: SupportedLanguages) => (
  service.serviceDescriptions.find(serviceDescription =>
    serviceDescription.language === language && serviceDescription.type === "Summary"
  )?.value ?? ""
);

/**
 * Compares equivalency between Suomi.fi services and TPR departments.
 * Returns true if titles are equal and summaries equality is over given threshold (defaults to 80%).
 *
 * @param service service
 * @param department department
 * @param language language
 * @param threshold threshold
 * @returns Whether services were equivalent enough
 */
export const compareServices = (service: Service, department: Department, language: SupportedLanguages, threshold: number = 80) => {
  const suomiFiSummary = getServiceSummary(service, language);
  const suomiFiName = getServiceName(service, language);
  const { longerSummary, shorterSummary } = getLongerAndShorterSummary(suomiFiSummary, department.description_short);
  const summarySimilarity = compareTwoStrings(shorterSummary, longerSummary.slice(0, shorterSummary.length - 1));

  if (suomiFiName === department.title && (summarySimilarity * 100) > threshold) {
    return true;
  } else {
    return false;
  }
};

/**
 * Returns whichever summary is shorter and longer than the other
 *
 * @params summary1 summary1
 * @params summary2 summary2
 */
const getLongerAndShorterSummary = (summary1: string, summary2: string) => {
  return {
    longerSummary: summary1.length > summary2.length ? summary1 : summary2,
    shorterSummary: summary1.length > summary2.length ? summary2 : summary1
  }
};

/**
 * Does HTTP GET request to given path in Suomi.fi API
 *
 * @param path path
 * @param pageNumber page number
 * @returns Response
 */
const doListRequest = async <T>(path: string, pageNumber?: number) => {
  let requestPath = suomiFiBasePath + path;

  if (pageNumber) {
    requestPath += `&page=${pageNumber}`;
  }

  const request = await fetch(requestPath);

  if (request.status === 200) {
    return await request.json() as Promise<T>;
  }
};