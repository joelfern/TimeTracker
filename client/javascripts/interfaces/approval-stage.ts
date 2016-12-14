/**
 * Approval stage type interface
 */
export interface ApprovalStage {
	// postgres id
	pg_id__c: number;
	// salesforce name field
    name?: string;
	// associated project id
	project__r__pg_id__c?: number;
	// the display name for the approval stage
    display_name__c?: string;
	// the stage in the approval process for a project 
	stage_number__c? : number;
	// list of approvers
	approvers?: Object[];
};