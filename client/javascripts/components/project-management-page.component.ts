import {Component, OnInit} from '@angular/core';
import {Project} from '../interfaces/project';
import {Account} from '../interfaces/account';

import {SecurityService} from '../services/security.service';
import {ProjectService} from '../services/project.service';
import {ContactService} from '../services/contact.service';
import {AccountService} from '../services/account.service';
import {EndUserService} from '../services/enduser.service';

import {AdministrationPage} from './administration-page.component';
import {ProjectPage} from './project-page.component';

import {Preloader} from './preloader.component';

import {Router, ActivatedRoute} from '@angular/router';

@Component({
    selector: 'project-management-page',
    templateUrl: '/templates/project-management.html',
    directives: [Preloader, AdministrationPage, ProjectPage]
})

/**
 * Controller for the project management page
 */
export class ProjectManagementPage {

	// The selected project's sfid for the project page
	private selectedProjectPgID: number;

	// Animate the project list coming back into view
	private animateSwitchBack: boolean;

	// Project page components element to scroll
	private projectPageComponentsElement: Element;

	// Whether or not to update projects
	private updateProjects: boolean;
	
	// Map of contact objects
	private contacts: Object; // key of contact pg id, value of contact
	// Map of enduser objects
	private contactIdToEndUserMap: Object; // key of contact pg id, value of enduser
	// Map of account objects
	private accounts: Object; // key of account pg id, value of account
	// List of account objects
	private accountList: Object[];

	// Whether or not the page is loading
	private loading: boolean;

	// Checks if the page is loading for the first time to prevent slide in animation
	private initialPageLoad: boolean;

	// Whether or not you are currently on a project page
	private onProjectPage: boolean;

	// List of error messages
	private errorMessages: string[];

	// Subcription to route parameter changes
	private sub: any;

	// timeout for setting hideProjectPage variable
	private projectPageTimeout: any;
	private hideProjectPage: boolean;

    constructor(
		private securityService: SecurityService,
		private projectService: ProjectService,
		private contactService: ContactService,
		private endUserService: EndUserService,
		private accountService: AccountService,
		private route: ActivatedRoute,
        private router: Router
	) {};

	ngOnInit() {
		// Checks if you need to login before initializing
		if (this.securityService.loginNeeded()) return;
		// verify that the user has admin privileges
		this.securityService.checkAccessPrivileges(false, false, true);

		// Initializes arrays
        this.errorMessages = [];
		this.accountList = [];

		this.loading = true;
		this.initialPageLoad = true;

		this.populateAccounts();
		this.populateEndUsers();
		this.populateContacts();

		if (!this.sub) {
			// Set subscription to route parameter changes
			this.sub = this.route.params.subscribe(params => {
				let id = +params['id']; // (+) converts string 'id' to a number
				// If an id is specified, select the project, otherwise show the search list
				if (id) {
					this.selectProject(id);

					// Cancels pending change to onProjectPage
					if (this.projectPageTimeout) clearTimeout(this.projectPageTimeout);
					this.hideProjectPage = false;
					this.onProjectPage = true;
				} else {
					this.backToSearch();
					this.onProjectPage = false;
					// wait to set on project page to false to continue showing project page on slide
					this.projectPageTimeout = setTimeout(() => this.hideProjectPage = true, 500);
				}
			});
		}
	}

	ngOnDestroy() {
		// Unsubscribe from route subscription
		if (this.sub) this.sub.unsubscribe();
	}

	/**
	 * Routes to the correct project page when a project is clicked
	 */
	clickProject(projectId) {
		this.router.navigate(['/projects', {id: projectId}]);
	}

	/**
	 * Populates enduser map object with all endusers
	 */
	populateEndUsers(): void {
		// Creates empty object to hold map of contact Ids to EndUsers
		let contactIdToEndUserMap = {};
		this.endUserService.findEndUsers()
			.then(response => {
				for (let endUser of response) {
					contactIdToEndUserMap[endUser.contact__r__pg_id__c] = endUser;
				}
				this.contactIdToEndUserMap = contactIdToEndUserMap;
				this.checkInitLoading();
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessages.push("Could not retrieve endUsers.");
				this.loading = false;
			});
	};

	/**
	 * Populates contacts object with all contacts
	 */
	populateContacts(): void {
		// Creates empty object to hold map of contact Ids to EndUsers
		this.contactService.getContacts()
			.then(response => {
				this.contacts = response;
				this.checkInitLoading();
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessages.push("Could not retrieve contacts.");
				this.loading = false;
			});
	};

	/**
	 * Populates accounts object with all accounts and populates
	 * account list array
	 */
	populateAccounts(): void {
		this.accountService.getAccounts()
			.then(response => {
				this.accounts = response;
				for (let account in response) {
					this.accountList.push(response[account]);
				}
				this.accountList.sort((a, b) => {
					if (a['name'].toLowerCase() < b['name'].toLowerCase()) { return -1; }
					if (a['name'].toLowerCase() > b['name'].toLowerCase()) { return 1; }
					return 0;
				});
				this.checkInitLoading();
			})
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessages.push("Could not retrieve accounts.");
				this.loading = false;
			});
	};

	/**
	 * Checks to see if all necessary objects are loaded
	 */
	checkInitLoading(): void {
		if (this.accounts && this.contactIdToEndUserMap && this.contacts) {
			this.loading = false;
		}
	};

	/**
	 * Handle project selection when a project is clicked on
	 * @param event - The clicking event
	 */
	selectProject(event): void {
		// Don't run if navigating back to list
		if (!event) return;
	
		// Set scroll top of project page to 0 if a new project is selected
		if (event != this.selectedProjectPgID && this.projectPageComponentsElement) {
			this.projectPageComponentsElement.scrollTop = 0;
		}
		this.selectedProjectPgID = event;
		this.animateSwitchBack = false;
		this.updateProjects = false;
		this.initialPageLoad = false;
	}

	/**
	 * Switch back to the search page/project list
	 */
	backToSearch(event?): void {
		// Saves the project page component's element by grabbing the next sibling
		// of the target element passed in (the header the back button is found in).
		if (event && event.target) this.projectPageComponentsElement = event.target.nextElementSibling;
		if (!this.initialPageLoad) {
			this.animateSwitchBack = true;
			this.updateProjects = true;
		}
		// Route back to the projects list/search page
		this.router.navigate(['/projects']);
	}
}