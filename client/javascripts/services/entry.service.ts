import {Injectable} from '@angular/core';
import {Http, Response, Headers} from '@angular/http';
import 'rxjs/add/operator/toPromise';

import {DatetimeService} from './datetime.service';
import {SecurityService} from './security.service';

import {Entry} from '../interfaces/entry';

@Injectable()
export class EntryService {
	constructor(
        private http: Http, 
        private datetimeService: DatetimeService,
        private securityService: SecurityService
    ) {}

	// api endpoitns
    private baseUrl = '/api/entries';
    private entryEndpoint = '/Entry';

    /**
     * Sends a put request for an entry and returns a promise with
     * the returned entry
     * @param updatedEntry entry to be put
     * @return Promise containing the entry returned from the request
     */
    putEntry(updatedEntry: Entry): Promise<Entry> {
		// set the timestamps to avoid timezone issues
        updatedEntry = this.setEntryTimestamps(updatedEntry);
        return this.http.put(this.baseUrl + this.entryEndpoint, {data: updatedEntry}, { headers: this.securityService.getAuthHeaders() })
            .toPromise()
            .then(response => this.setEntryDates(response.json().data))
            .catch(error => { throw error; });
    };

    /**
     * Sends a delete request for a specific entry;
     * @param entryToDeleteId id of entry to be deleted
     */
    deleteEntry(entryToDeleteId: Number): Promise<any> {
        return this.http.delete(this.baseUrl + this.entryEndpoint + '/' + entryToDeleteId, { headers: this.securityService.getAuthHeaders() })
            .toPromise()
			.catch(error => { throw error; });
    };

    /**
     * Converts a list of entries to an entries object (map)
     * @param entryList - a list of entry objects
     * @return map of entry objects mapped by postgres id
     */
    createEntryObject(entryList: Entry[]): Object {
        let entries = {};
        for (let entry of entryList) {
            entry = this.setEntryDates(entry);
            entries[entry.pg_id__c] = entry; 
        }
        return entries;
    };

    /**
     * Sets dates on an entry object from it's timestamps
     * @param entry
     * @retrun entry
     */
    setEntryDates (entry: Entry) {
        if (entry.end__c) {
            entry.end = this.datetimeService.getAdjustedDate(entry.end__c);
        }
        if (entry.start__c) {
            entry.start = this.datetimeService.getAdjustedDate(entry.start__c);
        }
        return entry;
    }
    
    /**
     * Sets timestamps on an entry object and removes dates
     * @param entry
     * @retrun entry
     */
    setEntryTimestamps (entry: Entry) {
        if (entry.start) {
            entry.start__c = this.datetimeService.getTimestamp(entry.start);
            delete entry.start;
        }
        if (entry.end) {
            entry.end__c = this.datetimeService.getTimestamp(entry.end);
            delete entry.end;
        } else {
			entry.end__c = null;
		}
        return entry;
    }

    /**
     * Calculates the number of hours worked on an object containing entries
     * @param entries the list of entries to be parsed
     * @return the number of hours worked
     */
    getTotalHoursWorkedFromEntriesObject(entries: Object): number {
        let hours = 0;
        // accumulate all hours from the entries contained in the object
        for (let entry in entries) {
            if (entries[entry].end) {
                hours += (entries[entry].end - entries[entry].start) / (60 * 60 * 1000);
            }
        }
        return parseFloat(hours.toFixed(2));
    };

    /**
     * Calculates the number of hours worked on an object containing entries
     * @param entries the list of entries to be parsed
     * @return the number of hours worked
     */
    getTotalHoursWorkedFromEntriesList(entries: Entry[]): number {
        let hours = 0;
        // accumulate all hours from the entries contained in the list
        for (let entry of entries) {
            if (entry.end) {
                hours += (entry.end.getTime() - entry.start.getTime()) / (60 * 60 * 1000);
            }
        }
        return parseFloat(hours.toFixed(2));
    };
};
