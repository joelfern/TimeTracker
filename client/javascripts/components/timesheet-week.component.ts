import {Component, Input, Output, EventEmitter, OnChanges, SimpleChange} from '@angular/core';
import {DayOfWeek} from './day-of-week.component';
import {Entry} from '../interfaces/entry';
import {Timesheet} from '../interfaces/timesheet';
import {DatetimeService} from '../services/datetime.service';
import {EntryService} from '../services/entry.service';
import {ScrollService} from '../services/scroll.service';
import {CORE_DIRECTIVES} from '@angular/common';
import {TAB_DIRECTIVES} from 'ng2-bootstrap/components/tabs';


@Component({
	selector: 'timesheet-week',
	templateUrl: '/templates/timesheetWeek.html',
	directives: [DayOfWeek, TAB_DIRECTIVES, CORE_DIRECTIVES]
})

export class TimesheetWeek implements OnChanges{

    private daysOfWeek: Entry[][];
	private weekStartDate: Date;
	private days: Date[];
	private totalHoursPerDay: number[];
	private selectedTab: number;
	private alertAnimated: boolean;
	private numberOfDays: number; // number of days not in future

	private lastLeft: number; // leftScroll of previous scroll event
	private fingerDown: boolean; // if page is currently being touched

	private scrollTimeout: any; // timeout used in watching for scroll stop

	private fixNavPosition: number; // position at which to fix the week nav
	
	// /**
	//  * Checks whether or not the window has hit the break point for mobile devices
	//  */
	// private checkResize = function() {
	// 	// we have resized to mobile
	// 	if (window.innerWidth < 1080) {
	// 		// wait until the mobile div has loaded
	// 		setTimeout(() => {
	// 			let container = document.getElementsByClassName('days-of-week-container-mobile')[0];
	// 			container.scrollLeft = container.scrollWidth / this.numberOfDays * this.selectedTab;
	// 		});
	// 	} else if (window.innerWidth >= 1080) {
	// 		setTimeout(() => {
	// 			let container = document.getElementsByClassName('days-of-week-container')[0];
	// 			container.scrollLeft = container.scrollWidth / this.numberOfDays * this.selectedTab;
	// 		});
	// 	}
	// }.bind(this);
	
	constructor(
		private entryService: EntryService,
		private datetimeService: DatetimeService,
		private scrollService: ScrollService
	) {};


	ngOnInit(): void {
		this.days = [];
		this.totalHoursPerDay = [];
		this.weekStartDate = this.timesheet.localStart;
		this.daysOfWeek = [];

		// window.addEventListener("resize", this.checkResize);

		// Set fix nav on load
		this.setFixNavPosition();
		// Also set fix nav on resize
		window.addEventListener("resize", this.setFixNavPosition);

		this.numberOfDays = 0;

		// Inserts an empty ray into each day of the week
		for (var i = 0; i < 7; i++) {
			this.daysOfWeek.push([]);
		}
		// Adds each entry to it's dayOfWeek array (0 being Sunday)
        for (let entry in this.entries) {
			var date = new Date(Date.parse(this.entries[entry].start__c));
			this.daysOfWeek[date.getDay()].push(this.entries[entry]);
		}

		// Defaults selected tab to 0 (the first tab)
		this.selectedTab = 0;

		// Populates an array of dates to display on carousel
		for (var i=0; i<7; i++) {
			var date = new Date(this.weekStartDate.getTime() + i * 86400000);
			// sets selected tab to tab for today if a tab for today exists
			if (this.datetimeService.isToday(date)) {
				this.selectedTab = i;
			}

			this.days.push(date);

			// Counts the days that are clickable
			if (!this.isFutureDay(i)) this.numberOfDays++;
		}
		this.updateHoursPerDay();

		// scroll to correct day imediately after current opperations finish
		setTimeout(() => {
			let container = document.getElementsByClassName('days-of-week-container-mobile')[0];
			if (container) container.scrollLeft = container.scrollWidth / this.numberOfDays * this.selectedTab
		}, 0);
	};

	ngOnChanges(changes: {[propertyName: string]: SimpleChange}): void {
		if(changes.hasOwnProperty("timesheetErrorMessages") || changes.hasOwnProperty("timesheetSuccessMessage")) {
			this.alertAnimated = false;
		}
	};

	ngOnDestroy(): void {
		window.removeEventListener('resize', this.setFixNavPosition);
	}

	/**
	 * Method that sets the fixNavPosition variable on init and resize
	 */
	setFixNavPosition(): void {
		// Set position at which to fix nav
		this.fixNavPosition = document.getElementById('timesheet-info').scrollHeight;
	}


	/**
	 * Updates list of entries
	 * @param event: list of entries for a specific day
	 */
	updateEntries(event): void {
		// if deleted, then remove from this list
		if (event.deleted) {
			for (let day of this.daysOfWeek) {
				for (var i = 0; i < day.length; i++) {
					if (day[i].pg_id__c === event.deleted) {
						day.splice(i, i);
					}
				}
			}
			delete this.entries[event.deleted]
		// otherwise update the entries
		} else {
			for (let entry of event.entries) {
				this.entries[entry.pg_id__c] = entry;
			}
		}
		// update  hours in case of delete or hour change
		this.updateHoursPerDay();
		this.onUpdate.emit(this.entries);
	};

	/**
	 * Checks to see if the given day has any rejected entries
	 * @param day: the day to check
	 */
	hasRejectedEntries(day): boolean {
		for (let entry of this.daysOfWeek[day]) {
			if (entry.status__c == 'Rejected') {
				return true;
			}
		}
		return false;
	};

	/**
	 * Checks to see if the given day is in the future
	 * @param day: the day to check
	 */
	isFutureDay(day): boolean {
		return this.days[day] > new Date();
	};

	/**
	 * Checks if given tab is selected tab
	 * @param tab: the tab to check
	 */
	isActiveTab(tab): boolean {
		return this.selectedTab === tab;
	};

	/**
	 * Calculates the total hours for dates. Abstracted out so that it can react to events bubbled up
	 */
	updateHoursPerDay(): void {
		for (let i = 0; i < 7; i++) {
			// calculate the total hours per day for displaying
			this.totalHoursPerDay[i] = this.entryService.getTotalHoursWorkedFromEntriesList(this.daysOfWeek[i]);
		}
	};

	/**
	 * Clears the error and success messages
	 */
	clearAlertMessages(): void {
		this.timesheetSuccessMessage = null;
		this.timesheetErrorMessages = [];
	};

	/**
	 * Returns entrys for day of week
	 * @param day - integer form of day
	 * @return Entry[] - entrys for day
	 */
	getEntriesForDay(day: number): Entry[] {
		if (day !== 6) {
			return this.daysOfWeek[day + 1];
		} else {
			return this.daysOfWeek[0];
		}
	}

	/**
	 * Handles click on day of week tab header
	 * @param event - click event
	 * @param day - integer form of day
	 */
	handleTabClick(event: any, day: number) {
		if (!this.isFutureDay(day)) { 
			this.alertAnimated = true; 
			this.selectedTab = day;
		}
	}

	/**
	 * Handles pan event on days-of-week container
	 * @param event - pan event
	 * @param pages - number of days to move (negative would be left)
	 */
	handlePan(event, pages) {
		console.log(event);
		console.log(event.isFinal);
		if (event.isFinal) this.pageDays(pages);
	}

	/**
	 * Handles clicks on page buttons that show on mobile version
	 * @param pages - number of days to move (negative would be left)
	 */
	pageDays(pages: number): void {
		if (this.selectedTab + pages >= 0 && this.selectedTab + pages < this.numberOfDays) {
			this.alertAnimated = true; 
			this.selectedTab += pages;
		}
	}

	/**
	 * Helper function for determining if the screen is mobile
	 */
	isMobile(): boolean {
		return window.innerWidth < 1080;
	};

	/**
	 * Returns the width if on a mobile screen
	 */
	getDaysOfWeekWidth(): string {
		if (this.isMobile()) {
			return this.numberOfDays * 100 + 'vw';
		} else {
			return null;
		}
	};

	/**
	 * Returns a left margin if screen is desktop size
	 */
	getDaysOfWeekMarginLeft(): string {
		return this.selectedTab * -100 + 'vw';
	};
	

	@Input() entries: Object;
	@Input() projects: Object;
	@Input() timesheet: Timesheet;
	@Input() hasContributorProjects: boolean;
	@Input() timesheetSuccessMessage: string;
	@Input() timesheetErrorMessages: string[];
	@Output() onUpdate = new EventEmitter<Object>();
}
