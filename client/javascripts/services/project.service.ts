import {Injectable} from '@angular/core';
import {Http, Response} from '@angular/http';
import 'rxjs/add/operator/toPromise';

import {Project} from '../interfaces/project';

import {SecurityService} from './security.service';
import {DatetimeService} from './datetime.service';

@Injectable()
export class ProjectService {
	constructor(
        private http: Http,
        private securityService: SecurityService,
		private datetimeService: DatetimeService
    ) {}

	// api endpoints
    private baseUrl = '/api/projects';
    private projectsEndpoint = '/ProjectMap';
	private putProjectEndpoint = '/project/';
	private projectDetailsEndpoint = '/details/'
    private approverProjectsEndpoint = '/myApproverProjectsMap';
	private contributorProjectsEndpoint = '/myContributorProjectsMap';
	private deactivateProjectsEndpoint = '/deactivate';

    /**
	 * Returns a map of all projects and associated accounts
	 * @return - promise containing a map of objects
	 */
    getProjects(): Promise<Object> {
        return this.http.get(this.baseUrl + this.projectsEndpoint, { headers: this.securityService.getAuthHeaders() })
                .toPromise()
                .then(response => {
					let data = response.json().data;
					for (let project in data) {
						data[project] = this.datetimeService.convertProjectDates(data[project]);
					}
					return data;
				})
				.catch(error => { throw error; });
    };

	/**
	 * Returns the approver projects for the currently logged in user
	 * @return - promise containing a map of sfids to projects
	 */
	getApproverProjects(): Promise<Object> {
		return this.http.get(this.baseUrl + this.approverProjectsEndpoint, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => response.json().data)
			.catch(error => { throw error; });
	};

	/**
	 * Returns the projects with a boolean indicating whether or the currently logged in user is a contributor as a map
	* @return - promise containing a map of sfids to projects
	*/
	getContributorProjects(): Promise<Object> {
		return this.http.get(this.baseUrl + this.contributorProjectsEndpoint, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => response.json().data)
			.catch(error => { throw error; });
	};

	/**
	 * Checks whether or not the user is a contributor for any projects
	 * @param projects - the projects with an attached contributor field as a map
	 */
	hasContributorProjects(projects: Object): boolean {
		// empty projects means no contributors
		if (!projects) {
			return false;
		}
		// go through all projects passed in
		for (let projectKey in projects) {
			// just need to find one project for the user to be a contributor
			if (projects[projectKey].contributor) {
				return true;
			}
		}
		return false;	
	};

    /**
	 * Returns a single project, including important details
	 * @return - promise containing a map of objects
	 */
    getProject(projectPgID: number): Promise<Object> {
        return this.http.get(this.baseUrl + this.projectDetailsEndpoint + projectPgID, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => {
				let project = response.json().data;
				this.datetimeService.convertProjectDates(project);
				return project;
			})
			.catch(error => { throw error; });
    };

	/**
	 * Upserts a single project
	 * @param project - the project to upsert
	 * @return - promise containing the upserted project
	 */
	putProject(project: Object): Promise<Object> {
		// If no start date exists, set it to null
		if (!project['start__c']) {
			project['start__c'] = null;
		}
		// If no end date exists, set it to null
		if (!project['end__c']) {
			project['end__c'] = null;
		}
		
		return this.http.put(this.baseUrl + this.putProjectEndpoint, { data: project }, { headers : this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => {
				let data = response.json().data;
				data.contributors = project['contributors'];
				data.approvalStages = project['approvalStages'];
				return data;
			})
			.catch(error => { throw error; });
	};

	/**
	 * Calls the backend endpoint for deactivating a project
	 * @param pgID - the postgres id of the project to deactivate
	 * @return - promise containing an empty object
	 */
	deactivateProject(pgID: number): Promise<Object> {
		return this.http.post(this.baseUrl + '/' + pgID + this.deactivateProjectsEndpoint, {}, { headers : this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => response.json().data)
			.catch(error => { throw error; });
	};
};