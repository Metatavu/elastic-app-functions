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
import {
    CurationDocument,
    CurationDocumentFromJSON,
    CurationDocumentFromJSONTyped,
    CurationDocumentToJSON,
} from './CurationDocument';

/**
 * 
 * @export
 * @interface Curation
 */
export interface Curation {
    /**
     * Identifier
     * @type {string}
     * @memberof Curation
     */
    readonly id?: string;
    /**
     * Name of curation
     * @type {string}
     * @memberof Curation
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof Curation
     */
    elasticCurationId?: string;
    /**
     * 
     * @type {string}
     * @memberof Curation
     */
    documentId?: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof Curation
     */
    queries: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof Curation
     */
    promoted: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof Curation
     */
    hidden: Array<string>;
    /**
     * 
     * @type {Array<string>}
     * @memberof Curation
     */
    invalidDocuments?: Array<string>;
    /**
     * Start time of curation
     * @type {Date}
     * @memberof Curation
     */
    startTime?: Date;
    /**
     * Start time of curation
     * @type {Date}
     * @memberof Curation
     */
    endTime?: Date;
    /**
     * 
     * @type {string}
     * @memberof Curation
     */
    curationType: string;
    /**
     * 
     * @type {string}
     * @memberof Curation
     */
    groupId?: string;
    /**
     * 
     * @type {string}
     * @memberof Curation
     */
    language?: string;
    /**
     * 
     * @type {CurationDocument}
     * @memberof Curation
     */
    document?: CurationDocument;
}

export function CurationFromJSON(json: any): Curation {
    return CurationFromJSONTyped(json, false);
}

export function CurationFromJSONTyped(json: any, ignoreDiscriminator: boolean): Curation {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'id': !exists(json, 'id') ? undefined : json['id'],
        'name': json['name'],
        'elasticCurationId': !exists(json, 'elasticCurationId') ? undefined : json['elasticCurationId'],
        'documentId': !exists(json, 'documentId') ? undefined : json['documentId'],
        'queries': json['queries'],
        'promoted': json['promoted'],
        'hidden': json['hidden'],
        'invalidDocuments': !exists(json, 'invalidDocuments') ? undefined : json['invalidDocuments'],
        'startTime': !exists(json, 'startTime') ? undefined : (new Date(json['startTime'])),
        'endTime': !exists(json, 'endTime') ? undefined : (new Date(json['endTime'])),
        'curationType': json['curationType'],
        'groupId': !exists(json, 'groupId') ? undefined : json['groupId'],
        'language': !exists(json, 'language') ? undefined : json['language'],
        'document': !exists(json, 'document') ? undefined : CurationDocumentFromJSON(json['document']),
    };
}

export function CurationToJSON(value?: Curation | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'name': value.name,
        'elasticCurationId': value.elasticCurationId,
        'documentId': value.documentId,
        'queries': value.queries,
        'promoted': value.promoted,
        'hidden': value.hidden,
        'invalidDocuments': value.invalidDocuments,
        'startTime': value.startTime === undefined ? undefined : (value.startTime.toISOString()),
        'endTime': value.endTime === undefined ? undefined : (value.endTime.toISOString()),
        'curationType': value.curationType,
        'groupId': value.groupId,
        'language': value.language,
        'document': CurationDocumentToJSON(value.document),
    };
}

