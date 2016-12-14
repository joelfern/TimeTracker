import {Component} from '@angular/core';
import {Timesheet} from '../interfaces/timesheet';
import {Entry} from '../interfaces/entry';
import {Preloader} from './preloader.component'

import {EntryService} from '../services/entry.service';
import {TimesheetService} from '../services/timesheet.service';
import {SecurityService} from '../services/security.service';
import {DatetimeService} from '../services/datetime.service';

import {Router} from '@angular/router';


@Component({
    selector: 'past-timesheets',
    templateUrl: '/templates/pastTimesheets.html',
    directives: [Preloader]
})

/**
 * Controller for the current timesheet component
 * Queries for timesheet, entries, and projects data and passes that on to the
 * timesheet-week component
 */
export class PastTimesheets {
	private loading: boolean;
	private timesheets: Timesheet[];
	private errorMessage: string;

    constructor(
        private router: Router,
        private entryService: EntryService,
        private timesheetService: TimesheetService,
        private securityService: SecurityService,
        private datetimeService: DatetimeService
    ) {};

	ngOnInit() {
		// Checks if you need to login before initializing
		if (this.securityService.loginNeeded()) return;

		// verify that the user has contributor privileges
		this.securityService.checkAccessPrivileges(true, false, false);
		
		// indicates page is loading
        this.loading = true;

        // get this weeks timesheet for hte logged in user
        this.timesheetService.getTimesheets()
            .then(timesheets => {
				this.loading = false;
				this.timesheets = timesheets;
			})
            // error handling for failure to retrieve timesheet
            .catch(error => {
				this.securityService.checkUnauthorized(error);
                this.errorMessage = 'Could not retrieve timesheets.';
                this.loading = false;
            });
	};
    
	/**
	 * Navigates a user to the timesheet view page when they select a timesheet to look at
	 * @param timesheet - the clicked timesheet object
	 */
	selectTimesheet(timesheet) {
        this.router.navigate(['timesheets', timesheet.pg_id__c]);
    };
};