import {Entry} from './entry';

/**
 * Entry approval type interface
 */
export interface Approval {
	// Salesforce name field
    name?: string;
	// id for the associated approval stage
    approval_stage__r__pg_id__c?: number;
	// Status of the approval
    status__c?: string;
	// the postgres id for the entry approval
    pg_id__c?: number;
	// the id for the entry approval
    sfid?: string;
	// the id for the associated approver contact
    approving_contact__r__pg_id__c?: number;
	// theid for the associaed entry
    entry__r__pg_id__c?: string;
	// entry approval comment - used in rejections
	comment__c?: string;
	// timestamp for when the approval was approved/rejected
	time_of_response__c?: string;
	// custom fields provided by history endpoint
	approvalStageName?: string;
	approverName?: string;
	// custom field not stored in db for date version of time_of_response__c
	time?: Date;
    // this is a custom field not stored in the db so that we can attach the Entry directly to the approval
    entry?: Entry;
};