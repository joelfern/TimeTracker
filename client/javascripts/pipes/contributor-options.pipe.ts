import {Pipe} from "@angular/core";

@Pipe({
    name: "contributorOptions"
})

/**
 * Pipe for filtering out sfids for projects that a user is not a contributor for 
 * @param sfids - the project sfids
 * @param projects - a map of all projects
 */
export class ContributorOptionsPipe {
    transform(pgids, projects) {
		// no sfids to test, so return
        if (!pgids) {
            return;
        }
		// collect the sfids of valid projects
        var contributorProjects = [];
		for (var pgid of pgids) {
			// if the contributor field exists and is true
			if (projects[pgid].contributor) {
				// add it to the filtered list
				contributorProjects.push(pgid);
			}
		}
		// return the filtered list
		return contributorProjects;
    };
};