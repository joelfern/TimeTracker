import {Injectable} from '@angular/core';

import {Entry} from '../interfaces/entry';
import {Timesheet} from '../interfaces/timesheet';
import {Project} from '../interfaces/project';

@Injectable()
export class DatetimeService {
    // used for converting minutes to milliseconds
    private minutesToMilli: number = 60000;

    constructor () {};
	
	/**
	 * Returns a date object from timestamp string
	 * @param timestamp - timestamp string from postgres loopback connector
	 * @return Date: date version of datetime in timestamp
	 */
    getAdjustedDate(timestamp: string): Date{
		if (!timestamp) return;
		return new Date(Date.parse(timestamp));
		
    };

	/**
	 * Pulls timestring (HH:mm) from date
	 * @param date - date object with time to be returned
	 * @return string: time string form of time component of provided date
	 */
    getTimestring(date: Date): string{
        let timearray: any = date.toTimeString().split(' ')[0].split(':');
        let hours: any = timearray[0];
        if (hours.length < 2) {hours = "0" + hours};
        let minutes: any = timearray[1];
        if (minutes.length < 2) {minutes = "0" + minutes};
        return hours + ':' + minutes;
    };

	/**
	 * Returns a postgres loopback connector ready timestamp from date
	 * @param data - date object to be converted
	 * @return string: timestamp string version of provided date
	 */
    getTimestamp(date: Date): string{
        // returns empty string if no date provided
        if (!date) { return '' };
        let year:string = '' + date.getUTCFullYear();
        let month:string = '' + (date.getUTCMonth() + 1);
        if (month.length < 2) {month = "0" + month};
        let day:string = '' + date.getUTCDate();
        if (day.length < 2) {day = "0" + day};
        let hour:string = '' + date.getUTCHours();
        if (hour.length < 2) {hour = "0" + hour};
        let minute:string = '' + date.getUTCMinutes();
        if (minute.length < 2) {minute = "0" + minute};
		let second:string = '' + date.getUTCSeconds();
		if (second.length < 2) {second = "0" + second};
        return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second;
    };

    /**
     * Converts the dates of a timesheet for use in the client
     * @param timesheet - the timesheet to be converted
     * @return the timesheet
     */
    convertTimesheetDate(timesheet: Timesheet): Timesheet {
        // offset to show as correct date locally
        timesheet.localStart = new Date(this.getAdjustedDate(timesheet.start__c).valueOf() + new Date().getTimezoneOffset() * 60000);
        return timesheet;
    };

    /**
     * Converts the dates of a project for use in the client
     * @param project - the project to be converted
     * @return the project
     */
    convertProjectDates(project: Project): Project {
        // offset to show as correct date locally
		if (project.start__c) {
        	project.localStart = new Date(this.getAdjustedDate(project.start__c).valueOf() + new Date().getTimezoneOffset() * 60000);
		}
		if (project.end__c) {
        	project.localEnd = new Date(this.getAdjustedDate(project.end__c).valueOf() + new Date().getTimezoneOffset() * 60000);
		}
        return project;
    };

	/**
	 * Nondestructively returns a new date object with the date of the provided
	 * date object and the time of the provided time string
	 * @param date - date to be used for date portion of the new datetime date object
	 * @param time - time string to be used for time portion of the new datetime date object
	 * @return Date: new date object with date of the provided date and time of the provided time
	 */
    setTimeOnDate(date: Date, time: string): Date {
        // copies date as to avoid modifying original date object
        let newDate = new Date(date.getTime());

        if (!time || time.includes('NaN')) { return null; }
        newDate.setHours(Number(time.split(':')[0]));
        newDate.setMinutes(Number(time.split(':')[1]));
        return newDate;
    }

	/**
	 * Used to check if provided date is current date
	 * @param date - date to be checked
	 * @return boolean: whether or not provided date is for current date
	 */
    isToday(date: Date): boolean {
        return date.toDateString() == new Date().toDateString();
    }

	/**
	 * Calculates and returns the UTC monday of the current week
	 * @return the UTC monday of this week
	 */
	getMondayOfWeek(day): Date {
        // creates copy of day
        day = new Date(day.valueOf());
		// get the difference between todays day and monday
		let diff = day.getUTCDate() - day.getUTCDay() + (day.getUTCDay() == 0 ? -6 : 1);
		// get the monday date
		let monday = new Date(day.setUTCDate(diff));
		// set the time to 0
		monday.setUTCHours(0);
		monday.setUTCMinutes(0);
		monday.setUTCSeconds(0);
		monday.setUTCMilliseconds(0);
		return monday;
	};
};
