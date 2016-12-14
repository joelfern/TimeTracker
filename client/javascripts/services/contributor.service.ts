import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/toPromise';

import {Contributor} from '../interfaces/contributor';

import {SecurityService} from './security.service';

@Injectable()
export class ContributorService {

	constructor(
        private http: Http,
        private securityService: SecurityService
    ) {}

	// api endpoints
	private baseUrl = '/api/Contributors';
	private contributorEndpoint = '/Contributor';

	/**
	 * Posts a new contributor to database
	 * @param contributor - contributor to be added to database
	 * @return promise containing added contributor with id
	 */
	postContributor(contributor: Contributor): Promise<Contributor> {
		return this.http.post(this.baseUrl + this.contributorEndpoint, { data: contributor }, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => response.json().data)
			.catch(error => { throw error });
	};

	/**
	 * Deletes a contributor from database
	 * @param contributorId - postgres id for contributor to be deleted
	 * @return promise containing no content
	 */
	deleteContributor(contributorId: number): Promise<Object> {
		return this.http.delete(this.baseUrl + this.contributorEndpoint + '/' + contributorId, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.catch(error => { throw error });
	};
};
