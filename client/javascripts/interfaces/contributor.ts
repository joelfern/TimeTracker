import {Contact} from './contact';
import {Project} from './project';

/**
 * Interface used to store the Contributor__c salesforce object has stored in the PostgreSQL DB
 */
export interface Contributor {
	// postgres id
	pg_id__c?: number;
	// associated contact 
	contact__r__pg_id__c: number;
	// associated project 
	project__r__pg_id__c: number;
	// whether or not the contributor is deleted in salesforce
	isdeleted?: boolean;
	// the date that the record was created on
	createddate?: string;
	// the last time the record was modified
	systemmodstamp?: string;
	// the salesforce name field
	name?: string;
};
