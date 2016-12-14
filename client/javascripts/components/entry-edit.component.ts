import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Entry} from '../interfaces/entry';
import {EntryService} from '../services/entry.service';
import {Project} from '../interfaces/project';
import {Timesheet} from '../interfaces/timesheet';
import {DatetimeService} from '../services/datetime.service';
import {TimesheetService} from '../services/timesheet.service';
import {SecurityService} from '../services/security.service';
import {Preloader} from './preloader.component';

import {FocusDirective} from '../directives/focus.directive';

import {ContributorOptionsPipe} from '../pipes/contributor-options.pipe';

@Component({ 
	selector: 'entry-edit',
    directives: [Preloader, FocusDirective],
	templateUrl: '/templates/entryEdit.html',
	pipes: [ContributorOptionsPipe]
})
export class EntryEdit {
    private start: Date;
    private startTime: string;
    private end: Date;
    private endTime: string;
    private project: number;
    private description: string;
    private projectPgids: string[];
    private validationError: string;
    private focusProject: boolean;
    private loading: boolean;
    
    constructor(
        private entryService: EntryService, 
        private datetimeService: DatetimeService,
		private timesheetService: TimesheetService,
		private securityService: SecurityService
    ) {};
    ngOnInit() {
        // sets values for temp properties based on what is already on entry
        // this allows non-destructive editting
        // retrieves the time in proper time input format from said datetime number
        this.startTime = this.datetimeService.getTimestring(this.entry.start);
        if (this.entry.end) { this.endTime = this.datetimeService.getTimestring(this.entry.end) }
        this.description = this.entry.description__c;
        this.project = this.entry.project__r__pg_id__c || null;
        this.projectPgids = Object.keys(this.projects);
        this.validationError = null;
    };
    
    /**
     * Refreshes entry-edit data and emits that cancel occured
     */
    cancel() {
        // resets values on cancel
        this.ngOnInit();
        // emits that cancel occured
        this.onCancel.emit(this.entry.pg_id__c);
    };

    /**
     * Sends save request
     */
    save() {
        // Sets start and end from entry's start time and input time
        this.start = this.datetimeService.setTimeOnDate(this.entry.start, this.startTime);
        this.end = this.datetimeService.setTimeOnDate(this.entry.start, this.endTime);

		let error = this.validate();
        if (error) {
            this.validationError = error;
			return;
        }

        this.loading = true;
		this.putEntry();
    };

	putEntry() {
        // stores what the id was prior to put to determine whether new or not later
        let id = this.entry.pg_id__c;
		// create the entry to be put from the UI variables
        let updateEntry:Entry = {
            start: this.start,
            description__c: this.description,
            project__r__pg_id__c: this.project,
            timesheet__r__pg_id__c: this.entry.timesheet__r__pg_id__c,
            pg_id__c: this.entry.pg_id__c,
			end: (this.end ? this.end : null), // sets end time to null if none is provided so that it is updated in the db
			status__c: (this.entry.status__c ? this.entry.status__c : null) // sets the status to current status or null -- backend will handle that
        }

		// update the entry
        this.entryService.putEntry(updateEntry)
            .then(response => this.handleSave(id, response))
            .catch(error => {
				this.securityService.checkUnauthorized(error); 
				this.validationError = error._body; 
				this.loading = false; 
			});
	};

    /**
     * Handles a successful save by emitting an onSave event
     */
    handleSave(id, response) {
		// if there is an id, then this is not a new entry
        if (id) {
            this.onSave.emit({entry: response, newEntry: false});
        } else {
            this.onSave.emit({entry: response, newEntry: true})
        }
        this.loading = false;
    };

    /**
     * Handles validation before save. Returns error message of issue.
     */
    validate(): string {
        if (!this.project) {
            return "Project is a required field";
        } else if (!this.start) {
            return "Start is a required field";
        } else if (this.end && this.end <= this.start) {
            return "End must be after start"
        } else {
            return;
        }
    };

    /**
     * Sends delete request
     */
    delete() {
        this.loading = true;
        this.entryService.deleteEntry(this.entry.pg_id__c)
            .then(response => {
				// make sure to emit the id for the deleted field so it can be handled appropriately when bubbled up
                this.onSave.emit({entry: null, newEntry: false, deleted: this.entry.pg_id__c});
                this.loading = false;
            })
            .catch(error => {
				this.securityService.checkUnauthorized(error);
                console.log(error);
                this.loading = false;
            });
    };

	/**
	 * Handles keydown events
	 * @param event - The keydown event
	 */
    handleKeydown(event): void {
        if (event.keyCode === 9) {
            event.preventDefault();
            this.focusProject = true;
            setTimeout(() => this.focusProject = false);
        }
    }

	@Input() entry: Entry;
    @Input() projects: Object;
    @Input() toggled: boolean;
	@Input() timesheet: Timesheet;
    @Output() onCancel = new EventEmitter<number>();
    @Output() onSave = new EventEmitter<Object>();
};