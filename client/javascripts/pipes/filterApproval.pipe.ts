import {Pipe} from "@angular/core";

@Pipe({
    name: "filterApproval",
    pure: false
})
/**
 * Filters approvals by projects
 * @param value - array of approvals
 * @param filters - filter object containing projects prop with 
 */
export class FilterApprovalPipe {
    transform(value, filters) {
        if (!Array.isArray(value)) {
            return; 
        }
		// Returns the filtered sorted array
        return value.filter(approval => {
			// If there are project filters
            if (filters['projects'] && filters['projects'].length > 0) {
				// Returns true if the approval's entry's project is in project filters
                return (filters['projects'].indexOf(String(approval.entry.project__r__pg_id__c)) > -1);
            }
			// If no project filters, return true;
            return true;
        }).sort(function(a, b) {
			// Sort by start datetime
            return a.entry.start - b.entry.start;
        });
    };
};