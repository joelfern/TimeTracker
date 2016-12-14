import {Injectable} from '@angular/core';
import {Http, Headers} from '@angular/http';
import 'rxjs/add/operator/toPromise';

import {Timesheet} from '../interfaces/timesheet';

import {DatetimeService} from './datetime.service';
import {SecurityService} from './security.service';
import {EntryService} from './entry.service';

@Injectable()
export class TimesheetService {

    // define urls and endpoints
    private baseUrl = '/api/timesheets';
    private timesheetEndpoint = '/myTimesheet'
    // note this is plural
    private timesheetsEndpoint = '/myTimesheets'

    constructor(
        private http: Http,
        private datetimeService: DatetimeService,
        private securityService: SecurityService,
        private entryService: EntryService
    ) {};

    /**
	 * Returns a timesheet and the associated entries
	 * @param timesheetId  - the id of the timesheet (current for this week)
	 * @return Promise containing the results object
	 */
    getTimesheet(timesheetId: string): Promise<Object> {
        return this.http.get(this.baseUrl + this.timesheetEndpoint + '/' + timesheetId, { 'headers': this.securityService.getAuthHeaders() })
            .toPromise()
            .then(response => {
                // parse the response
                let timesheet = response.json().data;
				let data = { timesheet: null, entries: {} };
				// if a timesheet was found, the add the custom timesheet and entry date fields
				if (timesheet) {
					data.timesheet = this.datetimeService.convertTimesheetDate(timesheet)
					data.entries = this.entryService.createEntryObject(timesheet.entries);
				}
                return data;
            })
			.catch(error => { throw error; });
    };

    /**
     * Returns the list of timesheets without their associated entries
     * @return promise containing a list of timesheets
     */
    getTimesheets(): Promise<Timesheet[]> {
        return this.http.get(this.baseUrl + this.timesheetsEndpoint, { 'headers': this.securityService.getAuthHeaders() })
            .toPromise()
            .then(response => {
                let data = response.json().data;
                // convert all dates
                for (let timesheet of data) {
                    timesheet = this.datetimeService.convertTimesheetDate(timesheet);
					for (let entry of timesheet.entries) {
						entry = this.entryService.setEntryDates(entry);
					}
					timesheet.totalHours = this.entryService.getTotalHoursWorkedFromEntriesList(timesheet.entries);
                }
                return data;
            })
			.catch(error => { throw error; });
    };

    /**
     * submits a timesheet
     * @param Timesheet timesheet - the timesheet to be updated. 
     * @return promise containing the resulting timesheet object
     */
    submitTimesheet(timesheetId: number): Promise<Timesheet> {
        return this.http.post(this.baseUrl + this.timesheetEndpoint + '/' + timesheetId + '/submit', {}, { headers: this.securityService.getAuthHeaders() })
            .toPromise()
            .then(response => response.json().data)
			.catch(error => { throw error; });
    };

	/**
	 * Retrieves sfid when provided timesheet postgres id
	 * @param timesheetId - the postgres id of the timesheet
	 */
	getTimesheetSfid(timesheetId: number): Promise<string> {
		return this.http.get(this.baseUrl + '/' + timesheetId + '/sfid', { headers: this.securityService.getAuthHeaders()})
			.toPromise()
			.then(response => response.json().data)
			.catch(error => { throw error; });
	};

	/**
	 * Creates a timesheet for the current week based on the logged in user
	 */
	createCurrentTimesheet(): Promise<Timesheet> {
		return this.http.post(this.baseUrl + this.timesheetEndpoint + '/current/create', {}, { headers: this.securityService.getAuthHeaders() })
			.toPromise()
			.then(response => {
				// parse the response
                let timesheet = response.json().data;
				// set the start field on the timesheet
                timesheet = this.datetimeService.convertTimesheetDate(timesheet)
                return timesheet;
			})
			.catch(error => { throw error; });
	};
};
