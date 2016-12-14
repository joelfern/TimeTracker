import {Component, Input, Output, EventEmitter, OnChanges, SimpleChange} from '@angular/core';
import {Entry} from '../interfaces/entry';
import {Timesheet} from '../interfaces/timesheet';
import {EntryContainer} from './entry-container.component';
import {EntryService} from '../services/entry.service';
import {ProjectService} from '../services/project.service';
import {DatetimeService} from '../services/datetime.service';

@Component({
	selector: 'day-of-week',
	templateUrl: '/templates/dayOfWeek.html',
	directives: [EntryContainer]
})
export class DayOfWeek implements OnChanges{

	// whether or not the day has a new entry card open
	private hasNewEntry: boolean;

	constructor(
		private entryService: EntryService,
		private datetimeService: DatetimeService
	) {};

	ngOnInit() {
		this.sortEntries();
		// if today, then create a new entry card by default
		if (this.datetimeService.isToday(this.date)) {
			// unless it is a resize, then the new entry would have already been created on load
			this.createNewEntry();
		}
	};

	/**
	 * Watches for changes
	 */
	ngOnChanges(changes: {[propertyName: string]: SimpleChange}): void {
		// Checks if timesheet has changed at all
		if(changes.hasOwnProperty('timesheet')) {
			// Checks if the timesheet status has changed
			if (changes['timesheet']['currentValue']['status__c'] !== changes['timesheet']['previousValue']['status__c']) {
				// Cancels new entry if the timesheet status has changed
				if (this.hasNewEntry) {
					this.handleCancelNew();
				}
			}
		}
	};

	/**
	 * Creates a new empty entry and unshifts it to the
	 * entriesForDay array
	 */
	createNewEntry() {
		// if the timesheet is editable
		if (this.timesheet.isEditable) {
			// the set the default start to day passed into the day component
			let start = new Date(this.date.getTime());
			// set the flag for the ui to show a new entry card
			this.hasNewEntry = true;
			// if the datetime is not today
			if (!this.datetimeService.isToday(start)) {
				// then set the default to 9 am
				start = new Date(this.date.setHours(9));
			}
			// if here are entries for this day and the most recent entry has an end
			if (this.entriesForDay[0] && this.entriesForDay[0].end) {
				// then set start to the end of the most recent entry
				start = this.entriesForDay[0].end;
			}
			// otherwise if the the date is today and we have no existing entries
			if (this.datetimeService.isToday(start) && this.entriesForDay.length === 0) {
				// set the create card default time to now
				start = new Date();
			}
			// push the card to the beginning of the list so that it appears at the top in the UI
			this.entriesForDay.unshift({timesheet__r__pg_id__c: this.timesheet.pg_id__c, start: start, status__c: 'Open'});
		}
	};

	/**
	 * Saves an entry to the entriesForDay array, reorders,
	 * updates the new entry, then emits that 
	 */
	saveEntry(event) {
		// Emits the timesheet recieved an sfid if timesheet does
		// not already have sfid and new entry does
		if (!this.timesheet.pg_id__c && event.entry.timesheet__r__pg_id__c) {
			this.onTimesheetPgID.emit(event.entry.timesheet__r__pg_id__c);
		}

		// Only saves updated entry if not deleting an entry
		if (!event.deleted) {
			// if new entry, save new entry to entriesForDay and mark having
			// new entry as false
			if (event.newEntry) {
				this.entriesForDay[0] = event.entry;
				this.hasNewEntry = false;
			} else {
				// temporary removes "new" entry
				if (this.hasNewEntry) {
					this.entriesForDay.shift();
					this.hasNewEntry = false;
				}
				// saves new entry over old entry
				for (let i in this.entriesForDay) {
					if (event.entry.pg_id__c === this.entriesForDay[i].pg_id__c) {
						this.entriesForDay[i] = event.entry;
					}
				}
			}
			this.sortEntries();
		}
		// Emits that an update to the day of week entriesForDay array has occured
		this.onUpdate.emit({
			entries: this.entriesForDay.slice(),
			deleted: event.deleted
		});

		// Add another new entry if you weren't deleting an entry and day of week is current date
		// (this works because the new entry card is removed whenever not deleting an entry)
		if (!event.deleted && this.datetimeService.isToday(this.date)) {
			this.createNewEntry();
		}
	};

	/**
	 * Sorts entries in reverse chronological order
	 */
	sortEntries() {
		this.entriesForDay.sort(function(a,b) {
			return b.start.valueOf() - a.start.valueOf();
		});
	};

	/**
	 * Cancel the creation of a new component - closes the new entry card and removes it from the list of entries
	 */
	handleCancelNew() {
		this.entriesForDay.shift();
		this.hasNewEntry = false;
	};

	/**
	 * Clears all alert messages
	 */
	clearAlertMessages() {
		this.clearAlerts.emit(true);
	};


	@Input() timesheet: Timesheet;
	@Input() entriesForDay: Entry[];
	@Input() projects: Object;
	@Input() date: Date;
	@Input() animateAlert: boolean;
	@Input() hasContributorProjects: boolean;
	@Input() timesheetSuccessMessage: string;
	@Input() timesheetErrorMessages: string[];
	@Output() clearAlerts = new EventEmitter();
	@Output() onUpdate = new EventEmitter<Object>();
	@Output() onTimesheetPgID = new EventEmitter<string>();
}
