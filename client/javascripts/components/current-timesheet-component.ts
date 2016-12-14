import {Component, Input} from '@angular/core';
import {Router, ActivatedRoute, ROUTER_DIRECTIVES} from '@angular/router'
import {Timesheet} from '../interfaces/timesheet';
import {Entry} from '../interfaces/entry';
import {Project} from '../interfaces/project';
import {TimesheetWeek} from './timesheet-week.component';
import {Preloader} from './preloader.component'

import {EntryService} from '../services/entry.service';
import {ProjectService} from '../services/project.service';
import {TimesheetService} from '../services/timesheet.service';
import {ContributorService} from '../services/contributor.service';
import {SecurityService} from '../services/security.service';
import {DatetimeService} from '../services/datetime.service';
import {ApprovalService} from '../services/approval.service';
import {ContactService} from '../services/contact.service';


@Component({
    selector: 'current-timesheet',
    templateUrl: '/templates/current-timesheet.html',
    directives: [TimesheetWeek, Preloader, ROUTER_DIRECTIVES]
})

/**
 * Controller for the current timesheet component
 * Queries for timesheet, entries, and projects data and passes that on to the
 * timesheet-week component
 */
export class CurrentTimesheetPage {
    private entries: Object;
    // this is returned as an object for hashing purposes
    private projects: Object;

    private timesheetPgID: number;
    private currentTimesheet: Timesheet;
    // used to display a cleaner date
    private formattedDateString: string;
    // used to display the total hours for a timesheet
    private totalHours: number;
    // used to display error messages when retrieving/updating objects
    private errorMessages: string[];
	// whether or not the timesheet exists
	private timesheetNotFound: boolean;

	private timesheetSuccessMessage: string;
	private timesheetErrorMessages: string[];

    // used to track if anything is currently loading
    private loading: boolean;
	// whether or not there are any contributor projects in the projects returned
	private hasContributorProjects: boolean;
    
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private entryService: EntryService,
        private projectService: ProjectService,
        private timesheetService: TimesheetService,
        private contributorService: ContributorService,
        private securityService: SecurityService,
        private datetimeService: DatetimeService
    ) {};

    ngOnInit(): void {
		// Checks if you need to login before initializing
		if (this.securityService.loginNeeded()) return;

		// checks whether or not the contributor has contributor priviledge
		this.securityService.checkAccessPrivileges(true, false, false);
        // init the error message list
        this.clearMessages();
        // pulls timesheet sfid out of url
        this.timesheetPgID = this.route.snapshot.params['timesheetPgID'];
        // indicates page is loading
        this.loading = true;
        
        let timesheetId;
        // if no timesheet, get this weeks timesheet for the logged in user
        if (this.timesheetPgID) {
            timesheetId = this.timesheetPgID;
        } else {
			timesheetId = 'current';
		}
        this.timesheetService.getTimesheet(timesheetId)
            .then(response => {
				// if a timesheet was found
				if (response['timesheet']) {
					// then set the timesheet and entries
					this.currentTimesheet = response['timesheet'];
					this.entries = response['entries'];
					// caclulate the total hours for entries
					this.totalHours = this.entryService.getTotalHoursWorkedFromEntriesObject(this.entries);
					// set the ui edit status based on the status of the timesheet
					this.updateEditable();
					// hide the preloader
					this.loading = false;
				// timesheet does not exist, so if the api call is looking for current, then create a new current timesheet
				} else if (timesheetId === 'current') {
					this.timesheetService.createCurrentTimesheet()
						.then(timesheet => {
							// set the timesheet returned
							this.currentTimesheet = timesheet;
							// no entries because its a new timesheet
							this.entries = {};
							// no hours since we have no entries
							this.totalHours = 0;
							this.updateEditable();
							this.loading = false;
						})
						.catch(error => {
							this.securityService.checkUnauthorized(error);
							this.errorMessages.push('Could not create new Timesheet.');
							this.loading = false;
						});
				// couldn't find a timesheet with a specific id
				} else {
					this.timesheetNotFound = true;
					this.loading = false;
				}
            })
            // error handling for failure to retrieve timesheet
            .catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessages.push('Could not retrieve timesheet.');
				this.loading = false;
            });
		// retrieve all of the contributor projects
        this.projectService.getContributorProjects()
            .then(response => {
				this.projects = response;
				this.hasContributorProjects = this.projectService.hasContributorProjects(this.projects);
			})
            .catch(error => { 
				this.securityService.checkUnauthorized(error);
				this.errorMessages.push('Could not retrieve projects.') 
			});
    };

    /**
     * Submits the timesheet being viewed
     */
    submitTimesheet(): void {
        // clear the status messages prior to each operation to prevent weird ux
        this.clearMessages();
		// if the timesheet passes the validation check for all entries having end times
        if (this.entriesWithEmptyEndTimes().length == 0) {
			// then set the preloader for the http request
            this.loading = true;
			// submit the current timesheet
            this.timesheetService.submitTimesheet(this.currentTimesheet.pg_id__c)
                .then(response => this.currentTimesheet = response)
                .then(timesheet => this.timesheetSuccessMessage = 'Timesheet submitted successfully!')
                .then(timesheet => {
                    this.updateEditable();
					// go through the entries and update the view
					for (let entryKey in this.entries) {
						// if a timesheet successfully submitted, all entries are also submitted
						if (this.entries[entryKey].status__c !== 'Approved') {
							this.entries[entryKey].status__c = 'Submitted';
							// go through and clear any rejects if they exist
							delete this.entries[entryKey].rejection;
						}
					}
                    this.loading = false;
                })
                .catch(error => {
					this.securityService.checkUnauthorized(error);
                    this.timesheetErrorMessages.push('Could not submit timesheet. ' + error._body);
                    this.loading = false;
                });
        } else {
            for (var i=0; i < this.entriesWithEmptyEndTimes().length; i++) {
                let entryStart = this.datetimeService.getAdjustedDate(this.entriesWithEmptyEndTimes()[i].start__c)
				let timeStringArray = entryStart.toLocaleTimeString().split(':');
				let timeString = timeStringArray[0] + ':' + timeStringArray[1] + ' ' + timeStringArray[2].split(' ')[1];
                this.timesheetErrorMessages.push('End time missing from entry starting on ' + entryStart.toDateString() + ', ' + timeString + '.');
            }
        }
    };

    /**
     * Checks to see if any entries on the timesheet have an empty end time
     * @return a list of Entries with empty end times
     */
    entriesWithEmptyEndTimes(): Entry[] {
        let badEntries = [];
        for (let entry in this.entries) {
            if (!this.entries[entry].end__c) {
                badEntries.push(this.entries[entry]);
            }
        }
        return badEntries;
    };

    /**
     * Sets timesheetEditable based on the timesheet's status -- this should happen if
     * the timesheet is submitted, approved, or under review
     */
    updateEditable(): void {
        this.currentTimesheet.isEditable = (
            this.currentTimesheet.status__c !== 'Submitted' &&
            this.currentTimesheet.status__c !== 'Approved' &&
            this.currentTimesheet.status__c !== 'Under Review'
        );
    };

    /**
     * Clears the status messages
     */
    clearMessages(): void {
        this.errorMessages = [];
		this.timesheetSuccessMessage = null;
		this.timesheetErrorMessages = [];
    };

    /**
     * Updates the list of entries and totalhours for entries. This is called when there is an update event bubbled
     * up from child components
     * @param entries the updated entries
     */
    updateEntries(entries: Object) {
        this.entries = entries;
        this.totalHours = this.entryService.getTotalHoursWorkedFromEntriesObject(entries);
    };
};
