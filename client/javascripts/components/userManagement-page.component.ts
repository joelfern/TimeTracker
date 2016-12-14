import {Component, OnInit} from '@angular/core';
import {EndUser} from '../interfaces/enduser';
import {SecurityService} from '../services/security.service';
import {EndUserService} from '../services/enduser.service';
import {Preloader} from './preloader.component';
import {ConfirmationModal} from './confirmation-modal.component';
import {AddUsers} from './add-users.component';
import {EndUserSearch} from '../pipes/enduser-search.pipe';

import {ContactService} from '../services/contact.service';
import {AccountService} from '../services/account.service';
import {Contact} from '../interfaces/contact';
import {Account} from '../interfaces/account';
import {ContactCard} from './contact-card.component';

@Component({
	selector: 'user-management-page',
	templateUrl: '/templates/userManagement.html',
	directives: [Preloader, AddUsers, ConfirmationModal, ContactCard],
	pipes: [EndUserSearch]
})
export class UserManagementPage implements OnInit {
	private endUsers: EndUser[]; // Array of all endUsers, initially sorted by last name then first name
	private hasBeenToggled: boolean; // Tracks whether or not the current users card has been toggled
	private expanded: boolean = true; // Tracks whether or not the current users card is expanded
	private loading: boolean; // Tracks if currently loading (for displaying preloader)
	private searchText: string; // Text from search box
	private errorMessage: string; // current error message to be displayed
	private showConfirmation: boolean; // whether or not to show the delete confirmation modal
	private showAddConfirmation: boolean; // whether or not to show the add user confirmaton modal on mobile
	private userToAdd: Contact; // the user to add on mobile
	private deletionStaging: Object; // object for staging user for deletion {user: EndUser, index: number}

	private initialSearchDone: boolean; // whether or not the user initially searched (used for mobile)
	private contactSearchTerm: string; // search term for mobile user management page
	private contacts: Object; // map of contact pgids to contacts
	private contactsArray: Contact[]; // array of contact objects
	private matchingContactsArray: Contact[]; // array of contact objects that match search term
	private accounts: Object; // map of account pgids to accounts
	private updateEndUsers: boolean; // whether or not to update end users array

	constructor(
		private contactService: ContactService,
		private accountService: AccountService,
		private securityService: SecurityService,
		private endUserService: EndUserService
	) {};

	//Do this on Component Init
	ngOnInit(): void {
		// Checks if you need to login before initializing
		if (this.securityService.loginNeeded()) return;

		// verify that the user has admin privileges
		this.securityService.checkAccessPrivileges(false, false, true);

		this.contactSearchTerm = '';
		this.contactsArray = [];

		// populates contacts and accounts
		this.populateContacts();
		this.populateAccounts();

		// finds end users
		this.findEndUsers();
	};

	/**
	 * Retrives all end users and stores them
	 */
	findEndUsers(): void {
		// Filter to be used in retreiving endusers
		let filter = {
			// Orders by last name then first name
			order: "lastName ASC, firstName ASC"
		}

		this.loading = true;

		this.endUserService.findEndUsers(filter)
			.then((endUsers) => {
				this.endUsers = endUsers;
				this.loading = false;
			})
			// sends to login if unauthorized
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessage = error._body;
				this.loading = false;
			});

		this.updateEndUsers = false;
	}

	/**
	 * Toggles expansion of current users card
	 */
	toggleExpanded(): void {
		this.hasBeenToggled = true;
		this.expanded = !this.expanded;
	}

	/**
	 * Creates edits object on endUser and sets editing to true
	 * @param endUser - endUser to be put in edit mode
	 */
	startEditing(endUser: EndUser): void {
		endUser['edits'] = {
			contributor: endUser.contributor,
			approver: endUser.approver,
			admin: endUser.admin
		}
		endUser['editing'] = true;
	}

	/**
	 * Stages user for deletion and displays deletion confirmation modal
	 * @param endUser - user to be deleted
	 * @param index - user's index in endUsers array
	 */
	confirmDeletion(endUser: EndUser) {
		//console.log(this.endUsers.indexOf(endUser));
		this.deletionStaging = {};
		// Saves end user and index to deletion staging object
		this.deletionStaging['user'] = endUser;
		this.deletionStaging['index'] = this.endUsers.indexOf(endUser);
		// Shows confirmation modal
		this.showConfirmation = true;
	}

	/**
	 * Triggered by clicking continue or cancel in deletion confirmation
	 * @param confirmed - whether or not confirmation action occured
	 */
	handleConfirmation(confirmed: boolean): void {
		// saves users if continue selected
		if (confirmed) this.deleteUser();
		// resets deletion staging if canceled
		else this.deletionStaging = {};
		// Always hides confirmation modal
		this.showConfirmation = false;
	}

	/**
	 * Deletes an endUser from database and removes from local list
	 */
	deleteUser(): void {
		// Makes a copy of endUsers to assign back to end users
		// This is to force ngOnChange to occur in nested components
		let newEndUsers = this.endUsers.slice();

		// Attempts to deleteEndUser
		this.endUserService.deleteEndUser(this.deletionStaging['user'])
			.then(() => {
				// Removes from array on success
				newEndUsers.splice(this.deletionStaging['index'], 1);
				// Sets modified copy to endUsers array
				this.endUsers = newEndUsers;
				// Resets deletionStaging object
				this.deletionStaging = {};
				if (this.updateEndUsers) this.findEndUsers();
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessage = error._body;
			})
	}

	/**
	 * Updates endUser with contents of edits in database
	 * @param endUser - endUser to be updated in database
	 * @param index - index of endUser in endUsers array
	 */
	saveUser(endUser: EndUser): boolean {
		// Checks if any of the privileges were changed
		if (endUser.approver == endUser['edits'].approver &&
			endUser.contributor == endUser['edits'].contributor &&
			endUser.admin == endUser['edits'].admin
		) {
			// Cancels edit if nothing changed and does not continue
			return endUser.editing = false;
		}

		this.loading = true;
		let index = this.endUsers.indexOf(endUser);
		// Creates new user object with correct information for upsert
		var modifiedUser = {
			id: endUser.id,
			contact__r__pg_id__c: endUser.contact__r__pg_id__c,
			firstName: endUser.firstName,
			lastName: endUser.lastName,
			email: endUser.email,
			contributor: endUser['edits'].contributor,
			approver: endUser['edits'].approver,
			admin: endUser['edits'].admin
		};

		// Sends update request with modifiedUser
		this.endUserService.update(modifiedUser)
			.then((updatedUser) => {
				// if the user being updated is the current user, then updated their nav access
				if (updatedUser.contact__r__pg_id__c === this.securityService.getEndUser().contact__r__pg_id__c) {
					this.securityService.setUserIsContributor(endUser['edits'].contributor);
					this.securityService.setUserIsApprover(endUser['edits'].approver);
				}
				// Sets editing true and edits animate change in padding
				updatedUser.editing = true;
				updatedUser.edits = endUser['edits'];
				// Replaces user in endUsers array with updated user
				this.endUsers[index] = updatedUser;
				// Sets timeout of 1ms before setting editing false to allow render before
				// setting back to not editing, triggering animation
				setTimeout(() => {updatedUser['editing'] = false;}, 1);
				if (this.updateEndUsers) this.findEndUsers();
				this.loading = false;
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessage = error._body;
				this.loading = false;
			});
	}

	/**
	 * Adds new users to the beginning of the endUsers array (top of table)
	 * Called from onSave trigger of add-users card
	 * @param newUsers - array of users that were added
	 */
	addNewUsers(newUsers: EndUser[]): void {
		this.endUsers = newUsers.concat(this.endUsers);
	}

	/****
	 * 
	 * MOBILE USER MANAGEMENT STUFF BELOW
	 * 
	 ****/

	/**
	 * Retrieves all contacts from database
	 */
	populateContacts(): void {
		// 'Josh Davis' in SF Dev org has bad email (j.davis@expressl&t.net),
		// exclude him from contact list
		let contactWhere = {
			email: {
				neq: 'j.davis@expressl%26t.net'
			}
		};

		// Retrieve all contacts other than contact for signed in user
		this.contactService.getContacts(contactWhere)
			.then(contacts => {
				this.contacts = contacts;
				// generate contacts array after contact retrieval
				for (let contact in this.contacts) {
					this.contactsArray.push(this.contacts[contact]);
				}
				this.sortContactsArray();
				// sets loading to false only if accounts have also loaded
				if (this.accounts) this.loading = false;
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.loading = false;
			})
	}

	/**
	 * Sort the contacts array by last name then first name
	 */
	sortContactsArray(): void {
		this.contactsArray.sort(function (a, b) {
			if (a['lastname'].toLowerCase() < b['lastname'].toLowerCase()) return -1;
			else if (a['lastname'].toLowerCase() > b['lastname'].toLowerCase()) return 1;
			else if (a['firstname'].toLowerCase() < b['firstname'].toLowerCase()) return -1;
			else if (a['firstname'].toLowerCase() > b['firstname'].toLowerCase()) return 1;
			else return 0;
		});
	}

	/**
	 * Retrieve all acounts from the database
	 */
	populateAccounts(): void {
		this.accountService.getAccounts()
			.then(accounts => {
				this.accounts = accounts;
				// Sets loading to false only if contacts are also finished loading
				if (this.contacts) this.loading = false;
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.loading = false;
			})
	}

	/**
	 * Saves new user to the database
	 */
	addNewUser(contact: Contact): void {
		if (!contact) return;
		let newUser = {
			contact__r__pg_id__c: contact.pg_id__c,
			firstName: contact.firstname,
			lastName: contact.lastname,
			email: contact.email,
			contributor: false,
			approver: false,
			admin: false
		};
		this.loading = true;
		// Attempts to add newUser
		this.endUserService.insertEndUsers([newUser])
			.then(users => {
				if (this.updateEndUsers) this.findEndUsers();
				this.loading = false;
				// collapses card
				this.toggleExpanded();
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessage = error._body;
				this.loading = false;
			});
	}

	/**
	 * Searches list of contacts for term
	 * @param term - The term to search contacts for
	 */
	searchContacts(term: string): void {
		if ((term && !this.initialSearchDone) || this.initialSearchDone) {
			this.initialSearchDone = true;
			this.contactSearchTerm = term;
			this.matchingContactsArray = [];
			if (!term) return;
			for (let contact of this.contactsArray) {
				if ((contact['name'] && contact['name'].toLowerCase().includes(term.toLowerCase()))
				|| (contact['email'] && contact['email'].toLowerCase().includes(term.toLowerCase()))) {
					this.matchingContactsArray.push(contact);
				}
			}
		}
	}

	/**
	 * Triggered by clicking continue or cancel in add user confirmation
	 * @param confirmed - whether or not confirmation action occured
	 */
	handleAddConfirmation(confirmed: boolean): void {
		if (confirmed) {
			this.updateEndUsers = true;
			this.addNewUser(this.userToAdd);
		}
		this.userToAdd = null;
		this.showAddConfirmation = false;
	}
};
