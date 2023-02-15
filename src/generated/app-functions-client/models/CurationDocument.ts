/* tslint:disable */
/* eslint-disable */
/**
 * Elastic App search lambda functions
 * Elastic App search lambda functions
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface CurationDocument
 */
export interface CurationDocument {
    /**
     * 
     * @type {string}
     * @memberof CurationDocument
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof CurationDocument
     */
    description: string;
    /**
     * 
     * @type {string}
     * @memberof CurationDocument
     */
    links: string;
    /**
     * 
     * @type {string}
     * @memberof CurationDocument
     */
    language: string;
}

export function CurationDocumentFromJSON(json: any): CurationDocument {
    return CurationDocumentFromJSONTyped(json, false);
}

export function CurationDocumentFromJSONTyped(json: any, ignoreDiscriminator: boolean): CurationDocument {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'title': json['title'],
        'description': json['description'],
        'links': json['links'],
        'language': json['language'],
    };
}

export function CurationDocumentToJSON(value?: CurationDocument | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'title': value.title,
        'description': value.description,
        'links': value.links,
        'language': value.language,
    };
}

