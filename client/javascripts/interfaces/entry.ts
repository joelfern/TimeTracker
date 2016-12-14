import {Approval} from './approval'

/**
 * Entry type interface
 */

export interface Entry {
	// pg id for the timesheet that the entry is attached to
	timesheet__r__pg_id__c: number;
	// pg id for the project that the entry is for
	project__r__pg_id__c?: number;
	// date that the entry was created
	createddate?: string;
	// the final approver contact pg id for the entry
	final_approver__r__pg_id__c?: number;
	// the salesforce name field for the entry
	name?: string;
	// the date last modified
	systemmodstamp?: string;
	// the end time for the entry
	end__c?: string;
	// the start time for the entry
	start__c?: string;
	// optional variable used in the front end to deal with timezone issues and calculations
	end?: Date;
	// optional variable used i nthe front end to deal with timezone issues and calculations
	start?: Date;
	// description the description for the entry
	description__c?: string;
	// the postgres id for the entry
	pg_id__c?: number;
	// the status of the entry (Open, Submitted, etc.)
	status__c?: string;
	// optional rejected approval object
	approvals?: Approval[];
};
