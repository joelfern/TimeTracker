import {Component, Input, Output, EventEmitter, OnChanges, SimpleChange} from '@angular/core';

import {ContactService} from '../services/contact.service';
import {AccountService} from '../services/account.service';
import {EndUserService} from '../services/enduser.service';
import {SecurityService} from '../services/security.service';

import {Project} from '../interfaces/project';
import {Contact} from '../interfaces/contact';
import {Account} from '../interfaces/account';
import {EndUser} from '../interfaces/endUser';

@Component({
    selector: 'contact-card',
    templateUrl: '/templates/contactCard.html'
})

/**
 * Controller for the project summary component
 */
export class ContactCard {

	private expanded: boolean;
    private hasBeenToggled: boolean;
	private editing: boolean;
	private functionPerformed: string;
    
    private endUser: EndUser;

	constructor(
		private contactService: ContactService,
		private accountService: AccountService,
		private securityService: SecurityService,
		private endUserService: EndUserService
	) {};

	ngOnInit() {
        this.endUser = this.getEndUser(this.contact);
    }

	ngOnChanges(changes: {[propertyName: string]: SimpleChange}) {
		// Repopulates project list if update projects is set
		if (changes.hasOwnProperty('endUsers')) {
			this.endUser = this.getEndUser(this.contact);
			if (this.functionPerformed === 'save') {
				this.editing = false;
			} else if (this.functionPerformed === 'deactivate') {
				this.hasBeenToggled = true;
				this.expanded = false;
				this.editing = false;
			} else if (this.functionPerformed === 'add') {
				this.startEditing();
			}
		}
	};

	/**
	 * Gets the end user for a contact
	 * @param contact - The contact to get the end user for
	 */
	getEndUser(contact: Contact): EndUser {
		for (let endUser of this.endUsers) {
			if (endUser.contact__r__pg_id__c && endUser.contact__r__pg_id__c === contact.pg_id__c) {
				return endUser;
			}
		}
		return null;
	}

	/**
	 * Toggles expansion of contact's card
	 */
	toggleExpanded(): void {
		this.hasBeenToggled = true;
		this.expanded = !this.expanded;
	}

	/**
	 * Creates edits object on endUser and sets editing to true
	 */
	startEditing(): void {
        if (!this.endUser) return;
        this.endUser['edits'] = {
            contributor: this.endUser.contributor,
            approver: this.endUser.approver,
            admin: this.endUser.admin
        }
        this.editing = true;
	}

	saveUser(): void {
		// Checks if any of the privileges were changed
		if (this.endUser.approver == this.endUser['edits'].approver &&
			this.endUser.contributor == this.endUser['edits'].contributor &&
			this.endUser.admin == this.endUser['edits'].admin) {
			// Cancels edit if nothing changed and does not continue
			this.editing = false;
			return;
		} else {
			this.functionPerformed = 'save';
		}
		if (!this.endUser['edits'].approver) this.endUser['edits'].approver = false;
		if (!this.endUser['edits'].contributor) this.endUser['edits'].contributor = false;
		if (!this.endUser['edits'].admin) this.endUser['edits'].admin = false;
		this.onSave.emit(this.endUser);
	}

	deactivateUser(): void {
		this.functionPerformed = 'deactivate';
		this.onDeactivate.emit(this.endUser);
	}

	addUser(): void {
		this.functionPerformed = 'add';
		this.onAdd.emit(this.contact);
	}

	@Input() contact: Contact; // the contact's object
    @Input() endUsers: EndUser[]; // list of end users
	@Input() accounts: Object; // map of account pgids to accounts

	@Output() onSave = new EventEmitter<EndUser>();
	@Output() onDeactivate = new EventEmitter<EndUser>();
	@Output() onAdd = new EventEmitter<Contact>();
}