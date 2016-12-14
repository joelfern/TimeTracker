import {Injectable} from '@angular/core';
import {Http, Response} from '@angular/http';
import 'rxjs/add/operator/toPromise';

import {ProjectApprover} from '../interfaces/project-approver';

import {SecurityService} from './security.service';

@Injectable()
export class ProjectApproverService {
	
	constructor(
        private http: Http,
        private securityService: SecurityService
    ) {}

	// api endpoints
    private baseUrl = '/api/ProjectApprovers';
    private projectApproverEndpoint = '/ProjectApprover';

    /**
	 * Returns a map of all project approvers
	 * @return - promise containing a map of objects
	 */
    getProjectApprovers(): Promise<Object> {
        return this.http.get(this.baseUrl)
        	.toPromise()
    		.then(response => response.json())
			.catch(error => { throw error });
    };

	/**
	 * Posts a new project approver to database
	 * @param stageId - the id of the stage to create an approver for
	 * @param approver - approver to be added to database
	 * @return promise containing added approver with id
	 */
	postProjectApprover(stageId: number, approver: ProjectApprover): Promise<ProjectApprover> {
		return this.http.post(this.baseUrl + this.projectApproverEndpoint + '/' + stageId, {data: approver}, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => response.json().data)
			.catch(error => { throw error });
	};

	/**
	 * Deletes a project approver from database
	 * @param approverId - postgres id for project approver to be deleted
	 * @return promise containing no content
	 */
	deleteProjectApprover(approverId: number): Promise<Object> {
		return this.http.delete(this.baseUrl + this.projectApproverEndpoint + '/' + approverId, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.catch(error => { throw error });
	};
};