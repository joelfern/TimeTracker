import {Account} from './account.ts'

/**
 * Project type interface
 */
export interface Project {
	// postgres id
	pg_id__c?: number;
	// associated account object
	account?: Account;
	// start date
	start__c?: string;
	// end date
	end__c?: string;
	// local start date
	localStart?: Date;
	// local end date
	localEnd?: Date;
	// whether or not the project is active
	inactive__c?: boolean;
};
