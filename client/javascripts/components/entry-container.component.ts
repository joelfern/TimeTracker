import {Component, Input, Output, EventEmitter} from '@angular/core';
import {EntryView} from './entry-view.component';
import {EntryEdit} from './entry-edit.component';
import {Entry} from '../interfaces/entry';
import {Project} from '../interfaces/project';
import {Timesheet} from '../interfaces/timesheet';

@Component({
	selector: 'entry-container',
	templateUrl: '/templates/entryContainer.html',
	directives: [EntryView, EntryEdit]
})

export class EntryContainer {

	private editMode: boolean;
	private toggled: boolean;

	constructor(
	) {};

	ngOnInit(): void {
		// sets edit mode to true by default if no id (indicating new entry)
		if (!this.entry.pg_id__c && this.hasContributorProjects) {
			this.editMode = true;
		}
	};

	/**
	 * Toggles whether or not entry is currently being editted
	 */
	toggleEdit(): void {
		// Only toggles if the timesheet is editable
		if (this.timesheet.isEditable) {
			this.editMode = !this.editMode;
			this.toggled = true;
		}
	};

	/**
	 * Method for handling canceling edit of entry
	 * @param entryId - PostgreSQL id of entry that user is canceling editing of
	 */
	handleCancel(entryId: number) {
		// Emits that user is trying to cancel new if entry is new.
		// This is because canceling new does not show view but deletes
		// entry from day of week array.
		if (!entryId) {
			this.onCancelNew.emit(true);
		// If not new, just toggleEdit mode.
		} else {
			this.toggleEdit();
		}
	};
	
	/**
	 * Handles saving an entry (new or update)
	 * @param event - event from onSave of editEntry card
	 */
	handleSave(event) {
		this.entry = event.entry;
		this.onSave.emit(event);
		this.toggleEdit();
	};

	@Input() entry: Entry;
	@Input() projects: Object;
	@Input() timesheet: Timesheet;
	@Input() hasContributorProjects: boolean;
	@Output() onSave = new EventEmitter<Object>();
	@Output() onCancelNew = new EventEmitter<boolean>();
};
