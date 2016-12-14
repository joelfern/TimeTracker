import {Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChange} from '@angular/core';
import {Project} from '../interfaces/project';
import {Account} from '../interfaces/account';

import {ProjectSummary} from './project-summary.component';
import {TypeaheadComponent} from './typeahead.component';

import {SecurityService} from '../services/security.service';
import {ContactService} from '../services/contact.service';
import {ProjectService} from '../services/project.service';
import {AccountService} from '../services/account.service';
import {DatetimeService} from '../services/datetime.service';

import {Preloader} from './preloader.component';

@Component({
    selector: 'administration-page',
    templateUrl: '/templates/administration-page.html',
    directives: [Preloader, ProjectSummary, TypeaheadComponent]
})

/**
 * Controller for the project administration page
 */
export class AdministrationPage implements OnChanges {

	// used to flag whether or not the page is awaiting a response from an http request
	private loading: boolean;

	// map of project pg ids to projects
	private projects: Object;
	private projectPgIDs: string[];

	// string used to filter projects
	private projectFilter: string;
	// Array of options for filter list
	private filterOptions: Object[];
	// Array of option names
	private filterOptionNames: string[];

	// list of ids for the projects displayed on the UI
	private displayedProjectPgIDs: string[];

	// List of error messages
	private errorMessages: string[];

	// The new project object
	private newProject: Object;
	// Whether or not a new project is being added
	private addingNewProject: boolean;
	// Any validation error when adding a new project
	private validationError: string;

	// Configuration for typeahead components
	private filterTypeaheadConfiguration: Object;
	private accountTypeaheadConfiguration: Object;

    constructor(
		private projectService: ProjectService,
		private accountService: AccountService,
		private securityService: SecurityService,
		private datetimeService: DatetimeService
	) {};

	ngOnInit() {
		// Checks if you need to login before initializing
		if (this.securityService.loginNeeded()) return;
		// verify that the user has admin privileges
		this.securityService.checkAccessPrivileges(false, false, true);

		// Says that the page has started to load
		this.loading = true;

		// Initialize arrays and objects
		this.errorMessages = [];
		this.newProject = {};

		// Populate projects object
		this.populateProjects();

		// Configuration for typeahead component for filtering
		this.filterTypeaheadConfiguration = {
			inputs: {
				propertyToSearch: 'name',
				placeholder: 'Filter',
				alwaysShowOptions: false,
				showClearButton: true,
				focusInput: false,
				width: '100%',
				noOptionsMessage: 'No matching options',
				formatOption: (option) => {
					if (option) {
						return option['name'];
					}
				}
			},
			outputs: {
				onSelect: (event) => {
					if (event) {
						this.filterProjects(event.name);
					} else {
						this.filterProjects('');
					}
				},
				onChange: (event) => {
					this.filterProjects(event);
				}
			}
		}

		// Configuration for typeahead component for new project account
		this.accountTypeaheadConfiguration = {
			inputs: {
				propertyToSearch: 'name',
				placeholder: '',
				alwaysShowOptions: true,
				showClearButton: true,
				focusInput: false,
				width: '100%',
				formatOption: (option) => {
					if (option) {
						return option['name'];
					}
				}
			},
			outputs: {
				onSelect: (event) => {
					if (event) {
						this.newProject['account__r__pg_id__c'] = event.pg_id__c;
						this.newProject['account'] = event;
					} else {
						this.newProject['account__r__pg_id__c'] = null;
						this.newProject['account'] = null;
					}
				}
			}
		}
	};

	ngOnChanges(changes: {[propertyName: string]: SimpleChange}) {
		// Repopulates project list if update projects is set
		if (changes.hasOwnProperty('updateProjects')) {
			if (this.updateProjects) {
				this.loading = true;
				this.populateProjects();
			}
		}
	};

	/**
	 * Populates projects object with all projects and account list with all accounts
	 */
	populateProjects(): void {
		// retrieve the projects map
        this.projectService.getProjects()
            .then(response => {
				// set the master map of objects
				this.projects = response;
				this.projectPgIDs = Object.keys(this.projects);
				// the displayed projects are the same as the master project list
				this.displayedProjectPgIDs = Object.keys(this.projects);
				this.sortDisplayedProjectPgIDs();
				// populate the filter options based on the projects
				this.populateFilterOptions();
				// if there is a project filter specified, filter projects
				if (this.projectFilter) {
					this.filterProjects(this.projectFilter);
				}
				this.loading = false;
			})
            .catch(error => {
				// verify that the token is still valid
				this.securityService.checkUnauthorized(error);
				this.errorMessages.push('Could not retrieve projects.');
				this.loading = false;
			});
	};

	/**
	 * Populates project filter options array with both
	 * project names and account names
	 */
	populateFilterOptions(): void {
		// Empty filter options and filter option names arrays
		let filterOptions = [];
		this.filterOptionNames = [];

		for (let project in this.projects) {
			// Add project's name to filter options if it's not already there
			if (this.filterOptionNames.indexOf(this.projects[project].name) === -1) {
				filterOptions.push(this.projects[project]);
				this.filterOptionNames.push(this.projects[project].name);
			}
			// Add project's account's name to filter options if it's not already there
			if (this.filterOptionNames.indexOf(this.projects[project].account.name) === -1) {
				filterOptions.push(this.projects[project].account);
				this.filterOptionNames.push(this.projects[project].account.name);
			}
		}

		// Sort filter options by name
		filterOptions.sort((a, b) => {
			if (a['name'].toLowerCase() < b['name'].toLowerCase()) { return -1; }
			if (a['name'].toLowerCase() > b['name'].toLowerCase()) { return 1; }
			return 0;
		});

		this.filterOptions = filterOptions;
	};

	/**
	 * Filters displayed projects by filter input
	 * @param filter - The text to filter by
	 */
	filterProjects(filter): void {
		// Map of project ids to project objects
		let displayedProjects = {};

		// Set the component's project filter as the filter input
		this.projectFilter = filter;

		filter = filter.toLowerCase();

		// Loop through all projects, check both the project's name and the project
		// account's name to see if the filter text is found, and populate the
		// displayed projects array 
		for (let project in this.projects) {
			if (this.projects[project].name.toLowerCase().includes(filter) || this.projects[project].account.name.toLowerCase().includes(filter)) {
				displayedProjects[project] = this.projects[project];
			}
		}
		
		// Set the displayed project pg ids array to the correct displayed project pg ids
		this.displayedProjectPgIDs = Object.keys(displayedProjects);
		this.sortDisplayedProjectPgIDs();
	}

	/**
	 * Sorts displayed project ids by account name, and then by project name
	 */
	sortDisplayedProjectPgIDs(): void {
		this.displayedProjectPgIDs.sort((a, b) => {
			// Sort by account name
			if (this.projects[a].account.name.toLowerCase() < this.projects[b].account.name.toLowerCase()) { return -1; }
			if (this.projects[a].account.name.toLowerCase() > this.projects[b].account.name.toLowerCase()) { return 1; }
			// If account names are the same, sort by project name
			if (this.projects[a].account.name.toLowerCase() === this.projects[b].account.name.toLowerCase()) {
				if (this.projects[a].name.toLowerCase() < this.projects[b].name.toLowerCase()) { return -1; }
				if (this.projects[a].name.toLowerCase() > this.projects[b].name.toLowerCase()) { return 1; }
			}
			return 0;
		});
	};

	/**
	 * Adds new project and validates
	 */
	addNewProject(): void {
		// Validation error if no name
		if (!this.newProject['name']) {
			this.validationError = "A name is required to create this project.";
			return;
		}
		// Validation error if no account
		if (!this.newProject['account__r__pg_id__c']) {
			this.validationError = "A valid account is required to create this project."
			return;
		}
		// Validation error if start time is after end time
		if (this.newProject['start__c'] && this.newProject['end__c']) {
			if (this.newProject['start__c'] > this.newProject['end__c']) {
				this.validationError = "The start date must be on or before the end date of the project.";
				return;
			}
		}

		this.loading = true;

		// new projects should not be deactiveated
		this.newProject['inactive__c'] = false;

		this.projectService.putProject(this.newProject)
			.then(response => {
				// Adds account object to project response
				response['account'] = this.newProject['account'];
				// Converts start and end times to local time for display
				response = this.datetimeService.convertProjectDates(response);
				// Resets filter
				this.filterProjects('');
				// Inserts new project into project map
				this.projects[response['pg_id__c']] = response;
				// Resets project pg ids list
				this.projectPgIDs = Object.keys(this.projects);
				// Adds new project to the top of the list
				this.displayedProjectPgIDs.splice(0, 0, response['pg_id__c']);
				// Repopulates filter options
				this.populateFilterOptions();
				// Closes new project card
				this.cancelNewProject();
				// Sets loading to false
				this.loading = false;
			})
			.catch(error => this.errorMessages.push(error));
	}

	/**
	 * Cancels the new project
	 */
	cancelNewProject(): void {
		this.validationError = '';
		this.addingNewProject = false;
		this.newProject = {};
	}

	// Whether or not projects list needs to be updated
	@Input() updateProjects: boolean;

	// List of accounts
	@Input() accountList: Object[];

	// Emits when a project is clicked
	@Output() onClick = new EventEmitter<number>();

}