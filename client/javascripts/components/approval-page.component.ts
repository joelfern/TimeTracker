import {Component} from '@angular/core';
import {Timesheet} from '../interfaces/timesheet';
import {Entry} from '../interfaces/entry';
import {Project} from '../interfaces/project';
import {Approval} from '../interfaces/approval';

import {ApprovalGroup} from './approval-group.component';

import {ApprovalService} from '../services/approval.service';
import {SecurityService} from '../services/security.service';
import {ContactService} from '../services/contact.service';
import {TimesheetService} from '../services/timesheet.service';
import {ProjectService} from '../services/project.service';
import {DatetimeService} from '../services/datetime.service';
import {Preloader} from './preloader.component'
import {TagCombobox} from './tag-combobox.component'

@Component({
    selector: 'approval-page',
    templateUrl: '/templates/approval-page.html',
    directives: [ApprovalGroup, Preloader, TagCombobox]
})

/**
 * Controller for the approval page
 */
export class ApprovalPage {

	// the projects that the logged in user can approve for.
    private approverProjects: Object;
	// list of pgids for the above map
    private approverProjectKeys: string[];

    // map of pgids to entry approval objects
    private entryApprovals: Object;
	// map of pgids to employee objects
    private entryApprovalEmployees: Object;
	// list of pgids for the above map
    private entryApprovalEmployeeKeys: string[];

	// the filtered approvals that are displayed in the ui
    private filteredApprovals: Approval[];
	// map of employee pgid to filtered entry approvals
    private filteredApprovalsByEmployee: Object;

	// map of contact pgids to contacts
	private contacts: Object;

	// map of pgids to timesheet objects
    private timesheetMap = Object;

	// object containing all filters for date and projects
    private approvalFilters: Object;

	// status messages
    private successMessage: string;
    private errorMessages: string[];

	// the options that are viewed in the combobox
	private comboboxOptions: any[];
	// array of filter options selected in combobox
	private comboboxSelections: any[];
	// options for selecting week
	private dateOptions: string[];
	// flag for checking if the projects have been retrieved from the backend
	private projectsLoaded: boolean;
	// flag for checking if the employees have been retrieved from the backend
	private employeesLoaded: boolean;

	// height of the filter div
	private filterHeight: string;
	// padding top of the page
	private pagePaddingTop: string;

	// whether or not the page is still loading via some http action
    private loading: boolean;


    constructor(
        private approvalService: ApprovalService,
        private projectService: ProjectService,
        private securityService: SecurityService,
        private contactService: ContactService,
        private timesheetService: TimesheetService,
        private datetimeService: DatetimeService
    ) {};

    ngOnInit(): void {
		// Checks if you need to login before initializing
		if (this.securityService.loginNeeded()) return;

		// verify that the user has contributor privileges
		this.securityService.checkAccessPrivileges(false, true, false);
		// init list and object values
        this.errorMessages = [];
        this.approverProjects = {};
		this.approverProjectKeys = [];
		this.comboboxOptions = [];

		// set loading flag to display spinner while we wait for responses on http requests
        this.loading = true;


		// get the projects that the logged in user can approve
        let getProjects = this.projectService.getApproverProjects()
            .then(response => {
				// set and sort the approver projects
                this.approverProjects = response;
                this.approverProjectKeys = Object.keys(this.approverProjects);
				this.approverProjectKeys.sort((a, b) => {
					if (this.approverProjects[a].name.toLowerCase() < this.approverProjects[b].name.toLowerCase()) return -1;
					if (this.approverProjects[a].name.toLowerCase() > this.approverProjects[b].name.toLowerCase()) return 1;
					return 0;
				});
				// create the combobox options
				this.createComboboxOptions(this.approverProjects, 'name', 'briefcase', 'project');
            })
            .catch(error => {
				// check for invalid token
				this.securityService.checkUnauthorized(error);
				// set error message and hide loading progress image
                this.errorMessages.push(error._body);
            });

		let getContacts = this.populateContacts();

		// get the entry approvals that the logged in user can approve for 
        let getApprovals = this.approvalService.getEntryApprovals()
            .then(response => {
				// init approval objects
                this.entryApprovals = {};
                this.approvalFilters = {
                    'weeks': [],
                    'projects': []
                };

                // gate to check if data was returned
                if (Object.keys(response['approvals']).length === 0) {
                    this.entryApprovals = null;
                    return;
                }

				// set the timesheet map
                this.timesheetMap = response['timesheets'];
                
				// set the approvals map
                this.entryApprovals = response['approvals'];
				// set the employees map
                this.entryApprovalEmployees = response['employees'];
				// create the combobox optiosn for the employees
				this.createComboboxOptions(this.entryApprovalEmployees, 'name', 'user', 'employee');
				// set flag the the employees have been loaded
				this.employeesLoaded = true;
                this.entryApprovalEmployeeKeys = Object.keys(this.entryApprovalEmployees);

				let weekStarts = {};

				// create the starting week for filter options 
				for (let t in this.timesheetMap) {
					let start = this.datetimeService.getAdjustedDate(this.timesheetMap[t].start__c);
					weekStarts[start.valueOf()] = start;
				}

				// set the date option sfor the combo box
				this.dateOptions = Object.keys(weekStarts).sort();

				// set the filtered approvals
                this.filterApprovals();
            })
            .catch(error => {
				// 401
				this.securityService.checkUnauthorized(error);
                this.errorMessages.push(error._body);
            });

		Promise.all([getProjects, getApprovals, getContacts])
			.then(() => this.loading = false)
			.catch(() => this.loading = false)
    };

	/**
	 * Populates contacts object with all contacts
	 */
	populateContacts(): any {
		// Creates empty object to hold map of contact Ids to EndUsers
		return this.contactService.getContacts()
			.then(response => {
				// set the master map of contacts
				this.contacts = response;
			})
			.catch(error => {
				// verify that the token is still valid
				this.securityService.checkUnauthorized(error);
				this.errorMessages.push("Could not retrieve contacts.");
			});
	};

	/**
	 * Creates combobox options from an object or an array of objects
	 * @param optionValues: object or array of values
	 * @param displayKey?: key of prop in value to be used as display (if left blank, value is used as display)
	 * @param icon?: icon to be used in for these options (see http://getbootstrap.com/components/#glyphicons)
	 * @param type?: type of values. used mostly for sorting selections
	 */
	createComboboxOptions(optionValues: any, displayKey?: string, icon?: string, type?: string): void {
		for (let key in optionValues) {
			let display;
			if (displayKey) display = optionValues[key][displayKey];
			else display = optionValues[key];
			this.comboboxOptions.push({
				value: optionValues[key],
				display: display,
				icon: icon,
				type: type
			});
		}
	};

    /**
     * Clears the status messages
     */
    clearMessages(): void {
        this.successMessage = null;
        this.errorMessages = null;
    };

	/**
	 * Stores comboboxSelections and filters approvals
	 * @param filters - array of selections from tagCombobox
	 */
	setFilters(filters: any[]): void {
		this.comboboxSelections = filters;
		this.filterApprovals();
		if (this.comboboxSelections.length > 0) {
			setTimeout(() => {
				this.pagePaddingTop = (document.getElementById('filters').scrollHeight + 30) + 'px';
			});
		} else {
			setTimeout(() => {
				this.pagePaddingTop = '';
			});
		}
	}

    /**
     * Filters approvals based on selected filter options
     * and sorts in reverse chronological order
     */
    filterApprovals(): void {
        let newFilteredApprovals = [];

		// Creates an empty approval filters object
		this.approvalFilters = {
			projects: [],
			employees: [],
			weeks: [],
			searchTerms: []
		};

		// Sets selections as empty array if comboboxSelections has yet to be set
		this.comboboxSelections = this.comboboxSelections || [];
		
		// Separates combobox selections into filter categories
		for (let filter of this.comboboxSelections) {
			if (filter.type == 'employee') this.approvalFilters['employees'].push(filter.value.pg_id__c);
			else if (filter.type == 'project') this.approvalFilters['projects'].push(filter.value.pg_id__c);
			else if (filter.type == 'search') this.approvalFilters['searchTerms'].push(filter.value);
			else if (filter.type == 'date') this.approvalFilters['weeks'].push(new Date(Number.parseInt(filter.value)));
		}

        // loop through all entry approvals and filter them based on selected filters
        for (let a in this.entryApprovals) {
                var approval = this.entryApprovals[a];

                // if the approval's project is not found in filter list, don't add the approval
                if (this.approvalFilters['projects'].length > 0
                && !this.approvalFilters['projects'].includes(approval.entry.project__r__pg_id__c)) {
                    continue;
                }

                // if the approval's employee is not found in filter list, don't add the approval
				if (this.approvalFilters['employees'].length > 0 
				&& !this.approvalFilters['employees'].includes(this.timesheetMap[approval.entry.timesheet__r__pg_id__c].employee__r__pg_id__c)) {
					continue;
				}

				// loops through the week filters and checks if the week of the current
				// entry matches ANY of the week filters
				// (inclusive as filtering by more than one week would be impossible otherwise)
				let succeededDate = false;
				for (let week of this.approvalFilters['weeks']) {
					if (this.datetimeService.getMondayOfWeek(approval.entry.start).valueOf() == week.valueOf()) {
						succeededDate = true;
						continue;
					}
				}
				if (this.approvalFilters['weeks'].length && !succeededDate) continue;

				// Doesn't include approval if searching by text and no description.
				//if (this.approvalFilters['searchTerms'].length && !approval.entry.description__c) continue;

				// Checks each search term to see if it is included in the entry description.
				// Includes entries where ANY search term is found
				let succeededSearch = false;
				for (let searchTerm of this.approvalFilters['searchTerms']) {
					if (this.contacts && this.approverProjects) {
						let contactName = this.contacts[this.timesheetMap[approval.entry.timesheet__r__pg_id__c].employee__r__pg_id__c].name;
						let projectName = this.approverProjects[approval.entry.project__r__pg_id__c].name;
						if ((approval.entry.description__c && approval.entry.description__c.toLowerCase().includes(searchTerm.toLowerCase()))
						|| (contactName && contactName.toLowerCase().includes(searchTerm.toLowerCase()))
						|| (projectName && projectName.toLowerCase().includes(searchTerm.toLowerCase()))) {
							succeededSearch = true;
							continue;
						}
					}
				}
				if (this.approvalFilters['searchTerms'].length && !succeededSearch) continue;

                // add approval to list of filtered approvals
                newFilteredApprovals.push(approval);
        }

        // sort filtered approvals in reverse chronological order
        newFilteredApprovals.sort(function(a, b) {
            return b.entry.start.valueOf() - a.entry.start.valueOf();
        });

		this.filteredApprovals = newFilteredApprovals;

		let newFilteredApprovalsByEmployee = {};

        // if the timesheet map is populated, build filtered approvals by employee object
        if (this.timesheetMap && this.entryApprovalEmployeeKeys.length > 0) {
            for (let emp of this.entryApprovalEmployeeKeys) {
                newFilteredApprovalsByEmployee[emp] = [];
            }

            for (let approval of this.filteredApprovals) {
                newFilteredApprovalsByEmployee[this.timesheetMap[approval.entry.timesheet__r__pg_id__c].employee__r__pg_id__c].push(approval);
            }
        }

		this.filteredApprovalsByEmployee = newFilteredApprovalsByEmployee;
    };

    /**
     * Handles rejection of an approval
     */
    handleReject(approval): void {
        this.removeApprovals([approval]);
    };

    /**
     * Submits a request to approve a list of approvals
     */
    approve(approvals): void {
        this.loading = true;
        this.approvalService.approveApprovals(approvals)
            .then(approvals => {
                this.removeApprovals(approvals);
                this.loading = false;
            })
            .catch(error => {
				// invalid token check
				this.securityService.checkUnauthorized(error);
                this.errorMessages.push('Could not update approvals.');
                this.loading = false;
            });
    };

    /**
     * Removes approvals from approval object then refilters
     */
    removeApprovals(approvals): void {
		// remove the approval
        for (let approval of approvals) {
            delete this.entryApprovals[approval.pg_id__c];
        }
		// if there are no more entries, set it to null for view purposes
		if (Object.keys(this.entryApprovals).length === 0) {
			this.entryApprovals = null;
		// otherwise filter the approvals for the view
		} else {
        	this.filterApprovals();
		}
    };
};
