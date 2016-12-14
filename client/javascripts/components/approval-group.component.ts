import {Component, Input, Output, EventEmitter, OnChanges, SimpleChange} from '@angular/core';
import {EntryView} from './entry-view.component';
import {ConfirmationModal} from './confirmation-modal.component';
import {Entry} from '../interfaces/entry';
import {Approval} from '../interfaces/approval';
import {Contact} from '../interfaces/contact'

import {MsToHoursPipe} from '../pipes/msToHours.pipe';
import {FilterApprovalPipe} from '../pipes/filterApproval.pipe';

@Component({
	selector: 'approval-group',
	templateUrl: '/templates/approval-group.html',
	directives: [EntryView, ConfirmationModal],
	pipes: [MsToHoursPipe, FilterApprovalPipe]
})

export class ApprovalGroup implements OnChanges {
	// Keys: project.sfid
	// Value: project summary object (includes project and total time in ms)
	private projectSummaries: Object;

	// array of sfids of projects that have been summarized
	private summarizedProjects: string[];

	// Total time in ms of all entries in approval-group
	private totalTime: number;

	// Used for toggling whether of not to display entries
	private showDetails: boolean;

	// Represents if group has been toggled (expanded or unexpanded)
	// Used for only animating selection after initial load of page
	private hasBeenToggled: boolean;
	
	// Filter object used in filterApproval pipe with locally filtered projects[]
	private filter;

	// Staging area to hold project sfid user is trying to approver before confirmation
	private stagedApproveProject: string;

	// Confirmation modal to be displayed
	private displayedConfirmation: string;

	constructor() {};

	ngOnInit(): void {
		this.summarize();
		this.filter = {
			projects: []
		};
	};

	/**
	 * Watches for changes in input and output values. Runs summarize if
	 * approvals has changed
	 */
	ngOnChanges(changes: {[propertyName: string]: SimpleChange}): void {
		if (changes.hasOwnProperty('approvals')) {
			this.summarize();
		}
	};

	/**
	 * Summarizes entries into projects and also gets total time
	 * Run whenever there is a change to approvals
	 */
	summarize(): void {
		// Starts total time at 0. will be added to;
		this.totalTime = 0;
		this.projectSummaries = {};

		// Creates project summaries for ALL projects if no employee is chosen
		if (!this.employee) {
			// If projects are being filtered on the page level only loop over projects in filters
			if (this.filters && this.filters.projects && this.filters.projects.length > 0) {
				for (let projectId of this.filters.projects) {
					this.projectSummaries[projectId] = {
						project: this.projects[projectId],
						entryCount: 0,
						time: 0
					}
				}
			// If projects are not being filtered, include all projects user has approver for
			} else {
				for (let projectId in this.projects) {
					this.projectSummaries[projectId] = {
						project: this.projects[projectId],
						entryCount: 0,
						time: 0
					}
				}
			}
		}

		// Loops over all approvals to summarize
		for (let approval of this.approvals) {
			let projectId = approval.entry.project__r__pg_id__c;

			// Creates summary object if one has yet to be created
			if (!this.projectSummaries[projectId]) {
				this.projectSummaries[projectId] = {
					project: this.projects[projectId],
					entryCount: 0,
					time: 0
				}
			}

			let durationInMs = approval.entry.end.valueOf() - approval.entry.start.valueOf();

			this.projectSummaries[projectId].entryCount++;
			// Adds duration of current approval to both project summary and totalTime
			this.projectSummaries[projectId].time += durationInMs;
			this.totalTime += durationInMs;
		}

		// Creates array of summarized project sfids
		this.summarizedProjects = Object.keys(this.projectSummaries);

		// sort the project by name
		this.summarizedProjects.sort((a,b) => {
			if (this.projects[a].name.toLowerCase() < this.projects[b].name.toLowerCase()) return -1;
			if (this.projects[a].name.toLowerCase() > this.projects[b].name.toLowerCase()) return 1;
			return 0;
		});
	};

	/**
	 * Checks if you should always be showing the entries
	 */
	alwaysShowDetails(): boolean {
		// Never true if you have no employee
		// True when the page has 1 or less projects or you are currently filtering by exactly one project
		return (this.filters.projects.length == 1 || Object.keys(this.projects).length == 1) && this.employee;
	};

	/**
	 * Toggles whether or not group is currently expanded
	 */
	toggleExpanded(): void {
		this.expanded = !this.expanded;
		this.showDetails = false;
		this.hasBeenToggled = true;
	};

	/**
	 * Handles adding/removing project to/from filter object
	 */
	toggleProjectFilter(project): void {
		if (this.projectSummaries[project].time == 0) {
			return;
		}
		let projectIndex = this.filter.projects.indexOf(project);
		if (projectIndex >= 0) {
			this.filter.projects.splice(projectIndex, 1);
		} else {
			this.filter.projects.push(project);
		}
	};

	/**
	 * Hides the entries and resets the project filters
	 */
	hideDetails(): void {
		this.filter.projects = [];
		this.showDetails = false;
	};

	/**
	 * Emits that approve needs to occur with all approvals
	 */
	approveAll(): void {
		this.onApprove.emit(this.approvals);
	};

	/**
	 * Emits that approve needs to occur with approvals of selected project
	 */
	approveProject(project): void {
		let approvalsToApprove = [];
		for (let approval of this.approvals) {
			if (approval.entry.project__r__pg_id__c == project) {
				approvalsToApprove.push(approval);
			}
		}
		this.onApprove.emit(approvalsToApprove);
	};

	/**
	 * Emits that approve needs to occur with single approval
	 */
	approveEntry(approval): void {
		this.onApprove.emit([approval]);
	};

	/**
	 * Emits that reject happened with which approval it happened with
	 */
	handleReject(approval): void {
		this.onReject.emit(approval);
	};

	/**
	 * Triggered by clicking approve or cancel in confirmation
	 * @param event - onConfirmation event object with confirmed and name
	 */
	handleConfirmation(event): void {
		// approves approvals if approve selected
		if (event.confirmed) {
			if (event.name === 'approveAll') {
				this.approveAll();
			} else if (event.name === 'approveProject') {
				this.approveProject(this.stagedApproveProject);
			}
		}
		// Always hides confirmation modal
		this.displayedConfirmation = "";
	};

	// Approvals for approval-group
	@Input() approvals: Approval[];
	// All projects in on the approval-page
	@Input() projects;
	// Employee the approval-group is grouping (expected null for all employees)
	@Input() employee;
	// Sets whether or not expanded
	@Input() expanded: boolean;
	// Current page level filters
	@Input() filters;
	// Input of all related employees
	@Input() employees: Contact[];
	// Input of all related timesheets
	@Input() timesheets;

	@Output() onApprove = new EventEmitter<Approval[]>();
	@Output() onReject = new EventEmitter<Approval>();
}
