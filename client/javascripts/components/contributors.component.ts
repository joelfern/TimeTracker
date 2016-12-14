import {Component, Input, Directive, ElementRef, Inject, OnChanges, SimpleChange} from '@angular/core';

import {ContributorService} from '../services/contributor.service';
import {SecurityService} from '../services/security.service'

import {FocusDirective} from '../directives/focus.directive';

import {TypeaheadComponent} from './typeahead.component';

import {Project} from '../interfaces/project';
import {Account} from '../interfaces/account';
import {Contact} from '../interfaces/contact';
import {Contributor} from '../interfaces/contributor';

@Component({
    selector: 'contributors',
    templateUrl: '/templates/contributors.html',
	directives: [FocusDirective, TypeaheadComponent]
})

/**
 * Controller for the contributors component
 */
export class Contributors {
	
	private addingContact: boolean; // Whether or not user is currently adding a contributor

	private contributorList: Contributor[]; // Array of contributor objects

	private focusContactInput: boolean; // Whether or not to focus the new contributor input

	private expanded: boolean; // If the card currently expaned
	private hasBeenToggled: boolean; // If the card has ever been expanded or collapsed

	private errorMessage: string; // Holds current error message if any

	private unusedContactArray: Object[]; // Array of contacts that don't have contributors for given project

	private typeaheadConfiguration: Object; // Object containing all the typeahead configuration variables

    constructor(
		private contributorService: ContributorService,
		private securityService: SecurityService
	) {};

	ngOnInit() {
		this.expanded = true;
		this.populateContributors(this.project['contributors']);

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
					this.addContributor(event);
				}
			}
		}
	}

	ngOnChanges(changes: {[propertyName: string]: SimpleChange}) {
		if (changes.hasOwnProperty('project')) {
			this.populateContributors(changes['project'].currentValue['contributors']);
			this.addingContact = false;
		}
	}

	/**
	 * Populates the contributors array and sorts by the
	 * contributor's last name
	 */
	populateContributors(contributorList?: Contributor[]): void {
		this.contributorList = contributorList || [];
		// Sort the contributors by the contact's last name
		this.contributorList.sort((a, b) => {
			if (this.contacts[a.contact__r__pg_id__c].lastname.toLowerCase() < this.contacts[b.contact__r__pg_id__c].lastname.toLowerCase()) { return -1; }
			if (this.contacts[a.contact__r__pg_id__c].lastname.toLowerCase() > this.contacts[b.contact__r__pg_id__c].lastname.toLowerCase()) { return 1; }
			return 0;
		});

		// Populate contributor contact ids of ids
		let contributorContactPgIDs = [];
		for (let contributor of this.contributorList) {
			if (contributorContactPgIDs.indexOf(contributor.contact__r__pg_id__c) === -1) {
				contributorContactPgIDs.push(contributor.contact__r__pg_id__c);
			}
		}

		// Populate and sort the unused contact array
		this.unusedContactArray = [];
		for (let contact in this.contactIdToEndUserMap) {
			if (contributorContactPgIDs.indexOf(this.contactIdToEndUserMap[contact].contact__r__pg_id__c) === -1
			&& this.unusedContactArray.indexOf(this.contactIdToEndUserMap[contact].contact__r__pg_id__c) === -1
			&& this.contactIdToEndUserMap[contact].contributor) {
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
	};

	/**
	 * Adds the specified contact as a contributor to the
	 * project's contributor list
	 * @param contact - The contact to add as a contributor
	 */
	addContributor(contact): void {
		// if no contact or no project, then we can't add a contributor
		if (!contact || !this.project) {
			return;
		}

		// Creates a contributor with a contact and project
		let newContributor = {
			contact__r__pg_id__c: contact.pg_id__c,
			project__r__pg_id__c: this.project.pg_id__c
		};

		// Adds the newContributor object as a contributor
		this.contributorService.postContributor(newContributor)
			.then(response => {
				this.contributorList.push(response);
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
	 * Removes the specified contributor
	 * @param contributor - The contributor to remove
	 */
	removeContributor(contributor): void {
		// Removes the contributor
		this.contributorService.deleteContributor(contributor.pg_id__c)
			.then(response => {
				this.contributorList.splice(this.contributorList.indexOf(contributor), 1);
				// Puts the contact back in the unused contact array and sorts it
				this.unusedContactArray.push(this.contacts[contributor.contact__r__pg_id__c]);
				this.sortUnusedContactArray();
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessage = error._body;
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

	/**
	 * Toggles whether or not contributors is currently expanded
	 */
	toggleExpanded(): void {
		this.expanded = !this.expanded;
		this.hasBeenToggled = true;
	};

	@Input() project: Project;
	// Map of contacts
	@Input() contacts: Object; // key of contact pg id, value of contact
	@Input() contactIdToEndUserMap: Object; // key of contact sfid, value of endUser object
};