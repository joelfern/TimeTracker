import {Entry} from './entry';

/**
 * Interface for interacting with the Timesheet__c salesforce object
 */
export interface Timesheet {
	// postgres id
	pg_id__c?: number;
	// sfid for assoicated contact
	employee__r__pg_id__c: string;
	// start week date of the timesheet
	start__c: string;
	// whether or not the timesheet is deleted in salesforce
	isdeleted?: boolean;
	// date the record was created
	createddate?: string;
	// date the record was last modified
	systemmodstamp?: string;
	// salesforce name field
	name: string;
	// status of the timesheet (open, submitted, etc.)
	status__c: string;
	// UI variable used for calculation and managing timezone issues
	localStart?: Date;
	// whether or not a timesheet is editable based on status__c
	isEditable?: boolean;
	// attached entries
	entries?: Entry[];
	// the total hours of all entries
	totalHours?: number;
};
