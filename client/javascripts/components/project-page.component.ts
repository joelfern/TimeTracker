import {Component, Input, Output, EventEmitter, OnChanges, SimpleChange} from '@angular/core';

import {ProjectApprovers} from './project-approvers.component';
import {Contributors} from './contributors.component';
import {TypeaheadComponent} from './typeahead.component';
import {ConfirmationModal} from './confirmation-modal.component';


import {SecurityService} from '../services/security.service';
import {ProjectService} from '../services/project.service';
import {ContactService} from '../services/contact.service';
import {AccountService} from '../services/account.service';
import {ScrollService} from '../services/scroll.service';
import {DatetimeService} from '../services/datetime.service';

import {Project} from '../interfaces/project';

import {Router, ActivatedRoute} from '@angular/router';

@Component({
    selector: 'project-page',
    templateUrl: '/templates/project-page.html',
	directives: [ProjectApprovers, Contributors, TypeaheadComponent, ConfirmationModal]
})

/**
 * Controller for the project page component
 */
export class ProjectPage implements OnChanges {

	// Selected project pg id
	private projectPgID: number;

	// Selected project object
	private project: Project;

	// Map of approvers
	private approvers: Object; // key of stage pg id, value of approvers
	// Keys from map of approvers
	private approverKeys: string[];

	// List of error messages
    private errorMessages: string[];

	// Whether or not edit mode is enabled
	private editMode: boolean;
	// Used for animating the edit mode header
	private leavingEditMode: boolean;
	
	// Page loading or not
	private loading: boolean;

	// Project object to use when editing
	private projectToEdit: Project;
	// Validation error when editing a project
	private validationError: string;
	// Project was not retrieved
	private projectNotFound: boolean;

	// Typeahead configuraton object for account list
	private typeaheadConfiguration: Object;

	// If drag is happening in project approvers
	private dragging: boolean;

	// config for the deactivate confirmation modal
	private deactivateConfirmation: Object;
	// flag for whether or not to show the deactivate modal
	private showDeactivateConfirmation: boolean;

    constructor(
        private route: ActivatedRoute,
		private securityService: SecurityService,
		private projectService: ProjectService,
		private contactService: ContactService,
		private accountService: AccountService,
		private scrollService: ScrollService,
		private datetimeService: DatetimeService,
        private router: Router
	) {};

	ngOnInit() {
		// Checks if you need to login before initializing
		if (this.securityService.loginNeeded()) return;
		// verify that the user has admin privileges
		this.securityService.checkAccessPrivileges(false, false, true);

		// Initializes arrays and objects
        this.errorMessages = [];
		this.projectToEdit = {};

		if (this.selectedProjectPgID) {
			this.projectPgID = this.selectedProjectPgID;
		}

		// Says that the page has started to load
		this.loading = true;

		// Populates all necessary objects
		this.populateProject();

		// Configuration for typeahead component for edit project account
		this.typeaheadConfiguration = {
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
						this.projectToEdit['account__r__pg_id__c'] = event.pg_id__c;
					} else {
						this.projectToEdit['account__r__pg_id__c'] = null;
					}
				}
			}
		};
		
		this.showDeactivateConfirmation = false;

		this.deactivateConfirmation = {
			title: 'WARNING',
			body: 'Deactivating a project will remove any ability to create any new entries for a project, but existing entries can still be approved. Projects can only be reactivated through Salesforce.',
			confirm: 'Deactivate',
			reject: 'Cancel',
			name: 'deactivate'
		};
	};

	ngOnChanges(changes: {[propertyName: string]: SimpleChange}) {
		if (changes.hasOwnProperty('selectedProjectPgID')) {
			this.projectNotFound = false;
			this.projectPgID = changes['selectedProjectPgID'].currentValue;
			this.populateProject();
		}
		// Resets editMode and
		if (changes.hasOwnProperty('displayed')) {
			this.editMode = false;
		}
	}

	/**
	 * Populates project object with project from url
	 */
	populateProject(): void {
		if (this.projectPgID) {
			this.projectService.getProject(this.projectPgID)
				.then(response => {
					this.project = response;
					this.populateApprovers();
					this.loading = false;
				})
				.catch(error => {
					this.securityService.checkUnauthorized(error);
					//this.errorMessages.push("Could not retrieve project.");
					this.projectNotFound = true;
					this.loading = false;
				});
		}
	};

	/**
	 * Builds the project to edit object
	 */
	buildProjectToEdit(): void {
		for (let property in this.project) {
			this.projectToEdit[property] = this.project[property];
		}
		if (this.projectToEdit.start__c) {
			this.projectToEdit.start__c = this.projectToEdit.start__c.split('T')[0];
		}
		if (this.projectToEdit.end__c) {
			this.projectToEdit.end__c = this.projectToEdit.end__c.split('T')[0];
		}
	}

	/**
	 * Populates approvers object with all approvers for each stage
	 */
	populateApprovers(): void {
		// no project to populate approvers for
		if (!this.project) {
			return;
		}
		this.approvers = {};
		// Loops through all stages and sets the approver object at
		// the stage id to the approvers of that stage
		for (let stage of this.project['approvalStages']) {
			this.approvers[stage.pg_id__c] = stage['approvers'];
		}
		this.approverKeys = Object.keys(this.approvers);
	};

	/**
	 * Handles what happens when the back button is clicked
	 */
	clickBack(event?): void {
		// ignore if drag on project approvers is in progress
		if (this.dragging) return;
		
		// event.target is the back button, its first parent element
		// is the header, and the second is the container (which
		// we want to emit)
		let target = (event ? event.target.parentElement.parentElement : null);
		this.leavingEditMode = false;
		this.onClickBack.emit({target: target});
	}

	/**
	 * Toggles edit mode and animation related variables
	 * @param ignore - if toggle should ignore the toggle request
	 */
	toggleEditMode(ignore?: boolean): void {
		if (ignore) return;

		this.editMode = !this.editMode;
		if (!this.editMode) {
			this.leavingEditMode = true;
		} else {
			this.buildProjectToEdit();
			this.leavingEditMode = false;
		}
		this.validationError = '';
	}

	/**
	 * Deactivates a project
	 */
	deactivateProject(): void {
		this.projectService.deactivateProject(this.project.pg_id__c)
			.then(response => {
				// the current project is no longer viewable, so reroute to projects page
				this.clickBack();
			})
			.catch(error => {
				this.errorMessages.push(error._body);
			});
	};

	/**
	 * Updates current project
	 */
	updateProject(): void {
		// Validation error if no name
		if (!this.projectToEdit['name']) {
			this.validationError = "A name is required to update this project.";
			return;
		}
		// Validation error if no account
		if (!this.projectToEdit['account__r__pg_id__c']) {
			this.validationError = "A valid account is required to update this project.";
			return;
		}
		// Validation error if start date is after end date
		if (this.projectToEdit['start__c'] && this.projectToEdit['end__c']) {
			if (this.projectToEdit['start__c'] > this.projectToEdit['end__c']) {
				this.validationError = "The start date must be on or before the end date of the project.";
				return;
			}
		}

		this.projectService.putProject(this.projectToEdit)
			.then(response => {
				// Converts dates to local start and end time on current project for display
				this.project = this.datetimeService.convertProjectDates(response);
				this.buildProjectToEdit();
				this.toggleEditMode();
			})
			.catch(error => this.errorMessages.push(error));
	};

	checkPan(event: any): void {
		if (event.deltaX > 100) {
			this.clickBack();
		}
	}

	/**
	 * Handles when a user is interacting with the modal
	 * @param response - the response from the modal button clicks
	 */
	handleConfirmation(response): void {
		if (response.confirmed) {
			this.deactivateProject();
		}
		this.showDeactivateConfirmation = false;
	};

	@Input() selectedProjectPgID: number;

	// Used to animate the header in
	@Input() animateIn: boolean;
	// Used to animate the header out
	@Input() animateOut: boolean;
	// If the header is out of view or not
	@Input() outOfView: boolean;
	// Map of contacts
	@Input() contacts: Object; // key of contact pg id, value of contact
	// Map of contact ids to endUsers
	@Input() contactIdToEndUserMap: Object; // key of contact pg id, value of endUser
	// Map of accounts
	@Input() accounts: Object; // key of account pg id, value of account
	// List of account objects
	@Input() accountList: Object[];
	// Whether or not page is currently being displayed
	@Input() displayed: boolean;

	// Emitted when the back button is clicked
	@Output() onClickBack = new EventEmitter();
};