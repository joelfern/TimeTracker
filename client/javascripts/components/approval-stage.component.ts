import {Component, Input, Directive, ElementRef, Inject, Output, EventEmitter} from '@angular/core';

import {ProjectApproverService} from '../services/project-approver.service';
import {SecurityService} from '../services/security.service';

import {FocusDirective} from '../directives/focus.directive';

import {TypeaheadComponent} from './typeahead.component';

import {Project} from '../interfaces/project';
import {Account} from '../interfaces/account';
import {Contact} from '../interfaces/contact';
import {ProjectApprover} from '../interfaces/project-approver';
import {ApprovalStage} from '../interfaces/approval-stage';

@Component({
    selector: 'approval-stage',
    templateUrl: '/templates/approvalStage.html',
	directives: [FocusDirective, TypeaheadComponent]
})

/**
 * Controller for the approval stage component
 */
export class ApprovalStageComponent {
	
	// whether or not a contact is being added via ui
	private addingContact: boolean;

	private approvers: ProjectApprover[];

	private focusContactInput: boolean;

	// error message
	private errorMessage: string;

	private unusedContactArray: Object[];

	private typeaheadConfiguration: Object;

    constructor(
		private projectApproverService: ProjectApproverService,
		private securityService: SecurityService
	) {};

	ngOnInit() {
		this.populateApprovers();

		this.typeaheadConfiguration = {
			inputs: {
				propertyToSearch: 'name',
				placeholder: 'Name',
				alwaysShowOptions: true,
				showClearButton: false,
				focusInput: true,
				width: '140px',
				formatOption: (option) => {
					if (option) {
						return option['lastname'] + ', ' + option['firstname'];
					}
				}
			},
			outputs: {
				onSelect: (event) => {
					this.addApprover(event);
				}
			}
		}
	}

	/**
	 * Populates the approvers array and sorts by the
	 * approver's last name
	 */
	populateApprovers(): void {
		// if no approvers for the approval stage, then no need to populate and sort
		if (!this.stage['approvers']) {
			this.approvers = [];
			return;
		}
		this.approvers = this.stage['approvers'];
		// Sort the approvers by the contact's last name
		this.approvers.sort((a, b) => {
			if (this.contacts[a.contact__r__pg_id__c].lastname.toLowerCase() < this.contacts[b.contact__r__pg_id__c].lastname.toLowerCase()) { return -1; }
			if (this.contacts[a.contact__r__pg_id__c].lastname.toLowerCase() > this.contacts[b.contact__r__pg_id__c].lastname.toLowerCase()) { return 1; }
			return 0;
		});

		// Populate approver contact sfids array with all approver sfids
		let approverContactPgIDs = [];
		for (let approver of this.approvers) {
			if (approverContactPgIDs.indexOf(approver.contact__r__pg_id__c) === -1) {
				approverContactPgIDs.push(approver.contact__r__pg_id__c);
			}
		}

		// Populate and sort the unused contact array
		this.unusedContactArray = [];
		for (let contact in this.contactIdToEndUserMap) {
			if (approverContactPgIDs.indexOf(this.contactIdToEndUserMap[contact].contact__r__pg_id__c) === -1
			&& this.unusedContactArray.indexOf(this.contactIdToEndUserMap[contact].contact__r__pg_id__c) === -1
			&& this.contactIdToEndUserMap[contact].approver) {
				this.unusedContactArray.push(this.contactIdToEndUserMap[contact].contact);
			}
		}
		this.sortUnusedContactArray();
	}

	/**
	 * Sorts the unused contact array by last name
	 */
	sortUnusedContactArray(): void {
		this.unusedContactArray.sort((a, b) => {
			if (a['lastname'].toLowerCase() < b['lastname'].toLowerCase()) { return -1; }
			if (a['lastname'].toLowerCase() > b['lastname'].toLowerCase()) { return 1; }
			return 0;
		});
	}

	/**
	 * Adds the specified contact as an approver to the
	 * stage's approver list
	 * @param contact - The contact to add as an approver
	 */
	addApprover(contact): void {
		// no contact provided, or no existing approval stage, terminate
		if (!contact || !this.stage) {
			return;
		}

		this.errorMessage = '';

		// Creates an object with a contact and approval stage
		let newApprover = {
			contact__r__pg_id__c: contact.pg_id__c,
			approval_stage__r__pg_id__c: this.stage.pg_id__c
		};

		// Adds the newApprover object as an approver
		this.projectApproverService.postProjectApprover(this.stage.pg_id__c, newApprover)
			.then(response => {
				this.approvers.push(response);
				// Removes the contact from the unused contact array and sorts it
				this.unusedContactArray.splice(this.unusedContactArray.indexOf(contact), 1);
				// Sets adding contact to false so the input field is hidden
				this.addingContact = false;
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessage = error._body;
			});
	};

	/**
	 * Removes the specified approver
	 * @param approver - The approver to remove
	 */
	removeApprover(approver): void {
		// Removes the approver
		this.projectApproverService.deleteProjectApprover(approver.pg_id__c)
			.then(response => {
				this.approvers.splice(this.approvers.indexOf(approver), 1);
				// Puts the contact back in the unused contact array and sorts it
				this.unusedContactArray.push(this.contacts[approver.contact__r__pg_id__c]);
				this.sortUnusedContactArray();
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				console.log(error)
			});
	};

	/**
	 * Sets the adding contact boolean to true and focuses
	 * the new contact input box
	 */
	toggleAddingContact(): void {
		this.addingContact = true;
		this.focusContactInput = true;
	}

	/**
	 * Resets contact adding variables when closing the form
	 */
	cancelAddContact(): void {
		this.addingContact = false;
		this.errorMessage = '';
	}

	@Input() stage: ApprovalStage;
	// Map of contacts
	@Input() contacts: Object; // key of contact pg id, value of contact
	@Input() contactIdToEndUserMap: Object; // key of contact sfid, value of endUser object
	@Input() editMode: boolean;
	@Input() draggedStage: boolean; // if this is a stage that is currently being dragged
	@Input() draggingStage: boolean; // if this is the stage card for dragging
};