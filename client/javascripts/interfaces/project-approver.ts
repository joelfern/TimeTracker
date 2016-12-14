/**
 * Project Approver type interface
 */
export interface ProjectApprover {
	// postgres id
	pg_id__c?: number;
	// id for associated approval stage
	approval_stage__r__pg_id__c?: number;
	// idid for associated contact
	contact__r__pg_id__c?: number;
};