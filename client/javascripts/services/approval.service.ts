import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/toPromise';

import {Project} from '../interfaces/project';
import {Contact} from '../interfaces/contact';
import {Approval} from '../interfaces/approval';
import {Entry} from '../interfaces/entry';

import {SecurityService} from './security.service';
import {EntryService} from './entry.service';
import {DatetimeService} from './datetime.service';


/**
 * Service class used for providing Approvals page related functionality
 */
@Injectable()
export class ApprovalService {

    private baseUrl = '/api/EntryApprovals';
	private entryBaseUrl = '/api/Entries/';
    private approvalEndpoint = '/myEntryApprovals';
	private approvalHistoryEndpoint = '/approvalHistory';

	private approvalUrl: string = '/api/EntryApprovals/';
    constructor (
        private http: Http,
        private securityService: SecurityService,
        private entryService: EntryService,
		private datetimeService: DatetimeService
    ) {}

    /**
     * Returns all approvals (with attached entries) for the logged in user
     * @return promise containing a map with entries for approvals, timesheets, and employee contacts
     */
    getEntryApprovals(): Promise<Object> {
        return this.http.get(this.baseUrl + this.approvalEndpoint, { headers: this.securityService.getAuthHeaders() })
            .toPromise()
            .then(response => {
                let data = response.json().data;
                // set the entry start/end values for use in the ui -- these value account for timezone differences in the db and the client
                for (let approval in data.approvals) {
                    data.approvals[approval].entry = this.entryService.setEntryDates(data.approvals[approval].entry);
                }
                return data;
            })
			.catch(error => { throw error; });
    };

    /**
     * Updates the status of a list of approvals to approved, as well as sets the approver to be the currently logged in user
     * @param approvals - list of Approval objects
	 * @param data - the data to be set on each approval
     * @return promise containing the list of approvals passed in, each with an updated status and approver 
     */
    updateApprovals(approvals: Approval[], data: Object): Promise<Approval[]> {
        // gather all the ids for the update filter
        let approvalIdList = [];
        for (let approval of approvals) {
            approvalIdList.push(approval.pg_id__c);
            // set these values for the return object so we dont have to query on the backend
            approval.approving_contact__r__pg_id__c = this.securityService.getEndUser().contact__r__pg_id__c;
            approval.status__c = status;
        }
        // create the update filer
        let where = {
            "pg_id__c": {
                "inq": approvalIdList
            }
        };
        return this.http.post(this.baseUrl + this.approvalEndpoint + '/update', { data: { where: where, values: data } }, { headers: this.securityService.getAuthHeaders() } )
            .toPromise()
            .then(response => approvals)
			.catch(error => { throw error; });
    };

	/**
	 * Calls helper function setting what the new data needs to be
	 * @param approvals list of approvals that need to be updated
	 * @return promise containing the approvals
	 */
	approveApprovals(approvals: Approval[]): Promise<Approval[]> {
        // set the values to be changed for all objects that match the filter defined above, ie the approvals we want to update
        let data = {
            approving_contact__r__pg_id__c: this.securityService.getEndUser().contact__r__pg_id__c,
            status__c: "Approved",
			time_of_response__c: this.datetimeService.getTimestamp(new Date())
        };

		return this.updateApprovals(approvals, data);
	}

    /**
     * Rejects a single approval
     * @param approval - the approval that should be marked rejected
     * @retun promise containing the updated approval
     */
    rejectApproval(approval: Approval): Promise<Approval> {
        // set the values to be changed for all objects that match the filter defined above, ie the approvals we want to update
        let data = {
            approving_contact__r__pg_id__c: this.securityService.getEndUser().contact__r__pg_id__c,
            status__c: "Rejected",
			time_of_response__c: this.datetimeService.getTimestamp(new Date()),
			comment__c: approval.comment__c
        };
        return this.updateApprovals([approval], data)
			.then(approvals => approval[0])
			.catch(error => { throw error; });
    };
	
	/**
	 * Retrieves the approval history for provided entry
	 * @param entry - entry to retrieve history for
	 * @return promise containing sorted list of of approvals
	 */
	getApprovalHistory(entry: Entry): Promise<Approval[]> {
		return this.http.get(this.entryBaseUrl + entry.pg_id__c + this.approvalHistoryEndpoint, { headers: this.securityService.getAuthHeaders()})
            .toPromise()
			.then(response => response.json().data)
			.then(approvals => {
				// if nothing was returned, still need to return a list for the UI
				if (!approvals) return [];

				// otherwise set the adjusted date for (handles timezone issues)
				for (let approval of approvals) {
					approval.time = this.datetimeService.getAdjustedDate(approval.time_of_response__c);
				}
				return approvals;
			})
			.catch(error => { throw error; });
	};
};
