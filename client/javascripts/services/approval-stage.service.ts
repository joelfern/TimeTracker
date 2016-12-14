import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/toPromise';

import {ApprovalStage} from '../interfaces/approval-stage';

import {SecurityService} from './security.service';

@Injectable()
export class ApprovalStageService {
	private approvalStageUrl: string = '/api/ApprovalStages/';
	private approvalStageMapEndpoint: string = 'ApprovalStageMap/';
	private setStagesEndpoint: string = 'setStages/';
	private displayNameEndpoint: string = 'display_name__c/';

    constructor (
        private http: Http,
        private securityService: SecurityService
    ) {}

	/**
	 * Returns all approvalStages provided in array of approvalStage ids
	* @param stageIds - ids for the approval stages to be retrieved
	* @return - promise containing a map of sfids to approvalStage
	*/
	getApprovalStagesFromPgIds(stageIds: string[]): Promise<Object> {
		let where = {
			pg_id__c: {
				inq: stageIds
			}
		};

		return this.http.get(this.approvalStageUrl + this.approvalStageMapEndpoint + "?where=" + JSON.stringify(where), { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => response.json().data)
			.catch(error => { throw error; });
	};

	/**
	* Returns all approvalStages provided in array of approvalStage ids
	* @param projectPgID - the postgres id for hte project
	* @return - promise containing a map of sfids to approvalStage
	*/
	getApprovalStagesForProject(projectPgID: number): Promise<Object> {
		let filter = {
			where: {
				project__r__pg_id__c: projectPgID
			}
		};

		return this.http.get(this.approvalStageUrl + "?filters=" + JSON.stringify(filter), { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => {
				let approvalStages = {};
				// conver the list of approval stages to a map
				let approvalStageArray: ApprovalStage[] = response.json();
				for (let approvalStage of approvalStageArray) {
					if (approvalStage.project__r__pg_id__c === projectPgID) {
						approvalStages[approvalStage.pg_id__c] = approvalStage;
					}
				}
				return approvalStages;
			})
			.catch(error => { throw error });
	};

	/**
	 * Sends request to update approval stages for project
	 * @param projectPgID - the id for the project to add an approval stage for
	 * @param approvalStages - list of approval stage objects to be set for the project
	 * @param approvalStageNames - ordered array of stages with at least display_name__c (first in array being first stage)
	 * @return promise containing the updated list of approval stages
	 */
	setApprovalStagesForProject(projectPgID: number, approvalStages: ApprovalStage[]): Promise<ApprovalStage[]> {
		// set the body data for the post request
		var data = {
			project: projectPgID,
			stages: approvalStages
		};

		return this.http.post(this.approvalStageUrl + this.setStagesEndpoint, { data: data }, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => {
				let data = response.json().data;
				for (var stage of data) {
					stage.approvers = stage.projectApprovers;
					delete stage.projectApprovers;
				}
				return data;
			})
			.catch(error => { throw error; })
	}

	/**
	 * Sends request to updated approval stage display names
	 * @param approvalStages - array of approvalStages
	 * @return promise containing the list of updated approval stages
	 */
	setApprovalStageDisplayNames(approvalStages: ApprovalStage[]): Promise<ApprovalStage[]> {
		// the payload for our post request
		var stagesForUpdate = [];
		// go through and add each stage that needs to be updated t
		for (let stage of approvalStages) {
			stagesForUpdate.push({
				pg_id__c: stage.pg_id__c,
				display_name__c: stage.display_name__c
			});
		}

		return this.http.post(this.approvalStageUrl + this.displayNameEndpoint, { data: stagesForUpdate }, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => response.json().data)
			.catch(error => { throw error; });
	}
};