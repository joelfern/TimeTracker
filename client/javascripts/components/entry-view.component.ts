import {Component, Input, Output, EventEmitter} from '@angular/core';
import {Entry} from '../interfaces/entry';
import {Project} from '../interfaces/project';
import {Timesheet} from '../interfaces/timesheet';
import {Approval} from '../interfaces/approval';
import {ApprovalStage} from '../interfaces/approval-stage';
import {Contact} from '../interfaces/contact'

import {DatetimeService} from '../services/datetime.service';
import {ApprovalService} from '../services/approval.service';
import {ContactService} from '../services/contact.service';
import {SecurityService} from '../services/security.service';
import {ApprovalStageService} from '../services/approval-stage.service';

import {Preloader} from './preloader.component'


@Component({ 
	selector: 'entry-view',
	templateUrl: '/templates/entryView.html',
	directives: [Preloader]
})
export class EntryView {
	// used to display the prelaoder during an http request
	private loading: boolean;
	// display variables related to the entry
	private start: number;
	private end: number;
	private hours: number;
	private errorMessage: string;
	private displayHistory: boolean;
	private rejecting: boolean;
	private approvalHistory: Approval[];
	private approvers: Object;
	private approvalStages: Object;
	private comment: string;

	constructor(
		private datetimeService: DatetimeService,
		private approvalService: ApprovalService,
		private contactService: ContactService,
		private approvalStageService: ApprovalStageService,
		private securityService: SecurityService
	) {};

	ngOnInit() {
		// hours between start and end rounded to nearest 100th
		if (this.entry.end) {
			this.hours = Math.round((this.entry.end.valueOf() - this.entry.start.valueOf()) / 36000)/100;
		}
		this.loading = false;
	};

	/**
	 * toggles the card based on click
	 */
	handleClick() {
		if(this.entry.status__c != 'Submitted' && this.entry.status__c != 'Approved' && this.timesheet.isEditable) {
			this.onCardClick.emit(true);
		}
	};

	/**
	 * Sets display variables for rejection process -- used in approvals ,not entries
	 */ 
	startReject() {
		this.rejecting = true;
		this.displayHistory = false;
	};

	/**
	 * Sets display variables to stop rejection process -- used in approvals, not entries
	 */
	cancelReject() {
		this.rejecting = false;
		this.comment = null;
	};

	/**
	 * Sends reject approval request this is used in approvals, not entries
	 */
	reject() {
		// set the 
		this.loading = true;
		this.approval.comment__c = this.comment;
		this.approvalService.rejectApproval(this.approval)
			.then(approval => this.onReject.emit(approval))
			.catch(error => {
				this.securityService.checkUnauthorized(error);
				this.errorMessage = error._body
				this.loading = false;
			});
	};

	/**
	 * Gets and sorts approvalHistory if approvalHistory has not yet been set
	 * Sets display history to true;
	 * Used in approvals, not entries
	 */
	showHistory(): void {
		this.displayHistory = true;
		if (!this.approvalHistory) {
		// Only gets history if history not already set
			this.approvalService.getApprovalHistory(this.entry)
				.then(approvals => this.approvalHistory = approvals)
				.catch(error => {
					this.securityService.checkUnauthorized(error);
					this.errorMessage = error._body;
				});
		}
	};

	@Input() entry: Entry;
    @Input() project: Project;
    @Input() showDate: boolean;
    @Input() toggled: boolean;
	@Input() timesheet: Timesheet;
	@Input() approval: Approval;
	@Input() employee: Contact;
	@Input() hideStatus: boolean; // whether or not to show status watermark
	@Output() onCardClick = new EventEmitter<boolean>();
	@Output() onReject = new EventEmitter<Approval>();
	@Output() onApprove = new EventEmitter<Approval>();
};
