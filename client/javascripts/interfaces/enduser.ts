import {Role} from './role';

/**
 * EndUser type interface
 */
export interface EndUser {
	id?: number;
	// loopback db roles
	roles?: Role[];
	// the first name of the enduser
	firstName: string;
	// the last name of the enduser
	lastName: string;
	// the id for the salesforce contact associaed with the user
	contact__r__pg_id__c: number;
	// user email
	email: string;
	// whether or not the user can log time
	contributor?: boolean;
	// whether or not the user can approve projects
	approver?: boolean;
	// whether or not the user is an admin
	admin?: boolean;
	// whtehr or not the user is an external approver
	external?: boolean;
	editing?: boolean;
};