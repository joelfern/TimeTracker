/**
 * Service module for before and after hooks used when working with entries
 */
// server wide constants
var constants = require('../utils/constants');


/**
 * Before hook for handling the comparison of dates. Right now passes on an error or nothing, depending on validation
 * @param ctx - the loopback context object
 * @param next - mechanism for continuing on the chain
 */
var validateStartAndEndTime = function(ctx, next) {
	// Currently does not check for an update all -- only for a create or upsert
	// this is because currently only single entries can be upserted with start/end times via UI
	if ((ctx.where && !ctx.where.pg_id__c) || (ctx.where && ctx.where.pg_id__c && typeof ctx.where.pg_id__c === 'object')) { return next(); }
	// get the entry that is being updated
	var entry = ctx.data;
	// verify that the entry and that the end time exists
	if (entry && entry.end__c) {
		// create the datetimes for comparison
		var startTime = new Date(entry.start__c);
		var endTime = new Date(entry.end__c);
		// start time must be strictly before the endtime
		if (startTime >= endTime) {
			// bubble up an error 
			var error = new Error('Error: Start time must be before end time.');
			error.status = 400;
			return next(error);
		}
		// otherwise continue
		return next();
	}
	// not a valid entry to check
	return next();
};

/**
 * Validation hook for preventing the overlap of entries on the same day
 * @param ctx - the loopback context object
 * @param next - the node next function
 */
var validateNoOverlap = function (ctx, next) {
	// since upserts send in a where, check if the where is from an upsert or updateAll. If updateAll, terminate the function
	if ((ctx.where && !ctx.where.pg_id__c) || (ctx.where && ctx.where.pg_id__c && typeof ctx.where.pg_id__c === 'object')) { return next(); }
	// set the entry to the data being saved
	var entry = ctx.data || ctx.instance || ctx.currentInstance;
	// if the entry exists and has a start time
	if (entry && entry.start__c) {
		// Filter for all entries that are on this timesheet
		var filter = {
			where: {
				timesheet__r__pg_id__c: entry.timesheet__r__pg_id__c
			}
		};
		// Excludes current entry if current entry has an id
		if (entry.pg_id__c) { filter.where.pg_id__c = { neq: entry.pg_id__c }; }

		// Saves the start and end as dates for comparison
		var start = new Date(entry.start__c);
		if (entry.end__c) { var end = new Date(entry.end__c); }

		// Retrieves all entries on timesheet
		ctx.Model.app.models.tt_entry__c.find(filter, { transaction: ctx.options.transaction }, function (err, entries) {
			if (err) { return next(err); }
			var	currentStart,
				currentEnd;
			// Checks each entry for overlap
			for (var i = 0; i < entries.length; i++) {
				// start for the entry currently being checked against the new/updated entry
				currentStart = new Date(entries[i].start__c);
				// if the end exists on the entry currently being checked, then set it
				if (entries[i].end__c) { 
					currentEnd = new Date(entries[i].end__c);
				// otherwise set no end time
				} else { 
					currentEnd = null; 
				}

				// Checks each valid overlap condition, if none fire, then there is an overlap
				// the valid situations for the created/updated entry are as follows:
				// 	1) there exists an end time and the end time is before the start time
				// 	2) there exists end on the current entry being checked against and the start is after that end time
				// 	3) there exists no end on the cureated/updated timesheet and the start is before the start of the entry currently being checked against
				//  4) neither entry has an end time, but the start times do not match
				//  5) an entry does not have an end time and the new entry is after the open entry
				if (!((end && end <= currentStart) || (currentEnd && start >= currentEnd) || (!end && start < currentStart) || 
				(!end && !currentEnd && (start.valueOf() !== currentStart.valueOf())) || (!currentEnd && start >= currentStart))) {
					// responds with error, and exits the for-loop
					console.log('Entry to upsert:');
					console.log('Start time -> ' + start);
					console.log('End time -> ' + end);
					console.log('Conflicting entry:');
					console.log('Start time -> ' + currentStart);
					console.log('End time -> ' + currentEnd);
					var error = new Error('Error: Entry overlaps with an existing entry.');
					error.status = 400;
					return next(error);
				}
			}
			// no error was thrown so move on
			return next();
		});
	// null entry or start time
	} else {
		return next();
	}
};

/**
 * before hook for saving the old values to the context object for use in after hooks
*  @param ctx - the loopback context object
 * @param next - mechanism for continuing on the chain
 */
var getPreviousState = function (ctx, next) {
	//if this is an updateAll, where will already exist. Otherwise, we want to query based on the id of the entry send in via upsert/create
	var where = ctx.where || { pg_id__c: (ctx.currentInstance || ctx.instance).pg_id__c };
	// query for the entries
	ctx.Model.app.models.tt_entry__c.find({ where: where }, { transaction: ctx.options.transaction }, function(err, oldEntries) {
		// there was an internal error - bubble up to be handled in api call
		if (err) { return next(err); }
		// set the old entries as a list for iterating
		ctx.hookState.oldInstances = oldEntries;
		// set the old entries map for lookups
		ctx.hookState.oldInstancesMap = {};
		for (var oldEntry of oldEntries) {
			ctx.hookState.oldInstancesMap[oldEntry.pg_id__c] = oldEntry;
		}
		// continue on to the next hook/operation
		return next();
	});
};

/**
 * after hook that watches for specific changes and calls helper functions based on them
 * @param ctx - the loopback context object
 * @param next - mechanism for continuing on the chain
 */
var handleChanges = function (ctx, next) {
	// Stores old instances for better readability
	var oldInstancesMap = ctx.hookState.oldInstancesMap || {};
	// Runs during update all
	if (ctx.where) {
		// Retrieves the new values of all entries
		// Uses the keys from old instances in case original where clause was by something other than id
		ctx.Model.app.models.tt_entry__c.find({ where: { pg_id__c: { inq: Object.keys(oldInstancesMap) } } }, { transaction: ctx.options.transaction }, function (err, newInstances) {
			// internal db error
			if (err) { return next(new Error('Error handling saved entries.')); }
			// Puts all timesheetsSfids as keys in object to prevent duplicates for all entries with changed status
			var timesheets = {};
			for (var i = 0; i < newInstances.length; i++) {
				if (!oldInstancesMap[newInstances[i].pg_id__c] || newInstances[i].status__c !== oldInstancesMap[newInstances[i].pg_id__c].status__c) {
					timesheets[newInstances[i].timesheet__r__pg_id__c] = true;
				}
			}
			// Runs updateTimesheetsStatuses with needed timesheets if any timesheets need to be updated
			if (Object.keys(timesheets).length) {
				updateTimesheetsStatuses(ctx, Object.keys(timesheets), next);
			} else {
				return next();
			}
		});
	// Runs during insert or update
	} else {
		// Stores inserted or updated entry as entry
		var entry = ctx.instance || ctx.currentInstance;
		// Runs updateTimesheetsStatuses if entry status has changed
		if (!oldInstancesMap[entry.pg_id__c] || entry.status__c && entry.status__c !== oldInstancesMap[entry.pg_id__c].status__c) {
			updateTimesheetsStatuses(ctx, [entry.timesheet__r__pg_id__c], next);
		// Continues when the status has not changed
		} else {
			return next();
		}
	}
};

/**
 * Helper method for updating timesheets statuses based on entry statuses
 * Called when entry status is changed
 * @param ctx - the loopback context object
 * @param timesheetPgIDs - the postgres ids of timesheets to be updated
 * @param next - mechanism for continuing on the chain
 */
var updateTimesheetsStatuses = function (ctx, timesheetPgIDs, next) {
	// Filter to retrieve all entries related to any timesheets in our entry set
	var entryFilter = {
		where: {
			timesheet__r__pg_id__c: {
				inq: timesheetPgIDs
			}
		}
	};

	// get the entries for the timesheets
	ctx.Model.app.models.tt_entry__c.find(entryFilter, { transaction: ctx.options.transaction }, function(err, entries) {
		// internal db error
		if (err) { return next(new Error('Error updating timesheet status')); }
		// Arrays to hold the timesheets for each status
		var submittedTimesheets = [],
			approvedTimesheets = [],
			openTimesheets = [],
			needsAttnTimesheets = [],
			underReviewTimesheets = [],
			// Object that will hold what entry statuses each timesheet has
			timesheets = {},
			// Object that will hold current entry being looked at for readability
			entry;

		// iterate through all entries and set the status flags on each timesheet based off entry status
		for (var i = 0; i < entries.length; i++) {
			entry = entries[i];

			// Adds a timesheet object if one does not already exist
			if (!timesheets[entry.timesheet__r__pg_id__c]) {
				timesheets[entry.timesheet__r__pg_id__c] = {};
			}

			// Stores flags for different possible status on the timesheet object
			if (entry.status__c === constants.status.REJECTED) {
				timesheets[entry.timesheet__r__pg_id__c].hasRejected = true;
			} else if (entry.status__c === constants.status.APPROVED) {
				timesheets[entry.timesheet__r__pg_id__c].hasApproved = true;
			} else if (entry.status__c === constants.status.OPEN) {
				timesheets[entry.timesheet__r__pg_id__c].hasOpen = true;
			} else if (entry.status__c === constants.status.SUBMITTED) {
				timesheets[entry.timesheet__r__pg_id__c].hasSubmitted = true;
			} else {
				// Flags that an entry has a different status for server errors
				timesheets[entry.timesheet__r__pg_id__c].hasOther = true;
			}
		}

		// iterate through all timesheets and place them in boxes for status change operations
		for (var i = 0; i < timesheetPgIDs.length; i++) {
			// Stores timesheetSfid and timesheet object containing flags for readability
			var timesheetPgID = timesheetPgIDs[i],
				timesheet = timesheets[timesheetPgID];

			// Needs Attention:
			//		a. there are rejected entries
			//		b. there are entries with an unknown status
			if (timesheet.hasRejected || timesheet.hasOther ) {
				needsAttnTimesheets.push(timesheetPgID);
			// Open: any entries open
			} else if (timesheet.hasOpen) {
				openTimesheets.push(timesheetPgID)
			// Under Review: entries that are approved and entries that are submitted
			} else if (timesheet.hasApproved && timesheet.hasSubmitted) {
				underReviewTimesheets.push(timesheetPgID);
			// Approved: all entries approved
			} else if (timesheet.hasApproved) {
				approvedTimesheets.push(timesheetPgID);
			// Submitted: all entries submitted
			} else if (timesheet.hasSubmitted) {
				submittedTimesheets.push(timesheetPgID)
			}
		}

		// Keeps track of how many updates need to occur
		var updatesNeeded = 0;
		// How many have occured
		var updatesRun = 0;
		//	How many did not throw an error
		var updatesSucceeded = 0;

		// Bases updates needed on how many statuses have timesheets
		if (submittedTimesheets.length) { updatesNeeded++; }
		if (approvedTimesheets.length) { updatesNeeded++; }
		if (needsAttnTimesheets.length) { updatesNeeded++; }
		if (openTimesheets.length) { updatesNeeded++; }
		if (underReviewTimesheets.length) { updatesNeeded++; }

		// Callback to be run in each timesheet status based update
		var updateCallback = function (err, info) {
			// increment the number of updates that have been run
			updatesRun++;
			// if there is an error, log it here. We want to be able to see each individual error
			if (err) {
				console.log(err);
			// otherwise tally that the update succeeded
			} else {
				updatesSucceeded++;
			}
			// Calls next without error when all updates succeed
			if (updatesSucceeded === updatesNeeded) {
				return next();
			// Calls next with error when all updates run, but not all succeeded
			} else if (updatesRun === updatesNeeded) {
				return next(new Error('Error updating timesheet status'));
			}
		};

		// Runs an updateAll for each timesheet status that has timesheets, runing the callback defined above for each operation
		if (submittedTimesheets.length) {
			ctx.Model.app.models.tt_timesheet__c.updateAll(
				{ pg_id__c: { inq: submittedTimesheets } }, 
				{ status__c: constants.status.SUBMITTED }, 
				{ transaction: ctx.options.transaction}, 
				updateCallback);
		}
		if (approvedTimesheets.length) {
			ctx.Model.app.models.tt_timesheet__c.updateAll(
				{ pg_id__c: { inq: approvedTimesheets } }, 
				{ status__c: constants.status.APPROVED }, 
				{ transaction: ctx.options.transaction }, 
				updateCallback);
		}
		if (needsAttnTimesheets.length) {
			ctx.Model.app.models.tt_timesheet__c.updateAll(
				{ pg_id__c: { inq: needsAttnTimesheets } }, 
				{ status__c: constants.status.NEEDS_ATTN }, 
				{ transaction: ctx.options.transaction }, 
				updateCallback);
		}
		if (openTimesheets.length) {
			ctx.Model.app.models.tt_timesheet__c.updateAll(
				{ pg_id__c: { inq: openTimesheets } }, 
				{ status__c: constants.status.OPEN }, 
				{ transaction: ctx.options.transaction }, 
				updateCallback);
		}
		if (underReviewTimesheets.length) {
			ctx.Model.app.models.tt_timesheet__c.updateAll(
				{ pg_id__c: { inq: underReviewTimesheets } }, 
				{ status__c: constants.status.UNDER_REVIEW }, 
				{ transaction: ctx.options.transaction }, 
				updateCallback);
		}
	});
};


/**
 * Creates the first stage entry approvals when an entry's status is changed to submitted
 * If there are not stages, just approves entries.
 * @param ctx - the loopback context object
 * @param next - mechanism for continuing on the chain
 */
var startApprovalProcess = function(ctx, next) {
	// declare the where clause and status to be used in the queries below
	var where,
		status;
	// if an update and the update has a status
	if (ctx.where && ctx.data.status__c) {
		// set the where clause and status
		where = { pg_id__c: { inq: Object.keys(ctx.hookState.oldInstancesMap) } };;
		status = ctx.data.status__c
	} else {
		// otherwise it is a single operation
		// temp entry variable for retrieving fields
		var en = ctx.instance || ctx.currentInstance;
		// set the where clause to look based off entry pg_id__c, and the status to the status of the entry
		where = { pg_id__c: en.pg_id__c };
		status = en.status__c;
	}
	// only care if the status is submitted
	if (status !== constants.status.SUBMITTED) { return next(); }
	// retrieve the queries
	ctx.Model.app.models.tt_entry__c.find({ where: where }, { transaction: ctx.options.transaction }, function(err, entries) {
		// internal db error -- bubble up
		if (err) { return next(err); }
		// collect the project ids for the entries
		var projectIds = [];
		for (var entry of entries) {
			projectIds.push(entry.project__r__pg_id__c);
		}
		// filter for getting the approval stages based on projects, sorted ascending by stage number
		var stageFilter = {
			where: { project__r__pg_id__c: { inq: projectIds } },
			order: 'stage_number__c ASC' 
		};
		// retrieve first approval stage for the entry projects
		ctx.Model.app.models.tt_approval_stage__c.find(stageFilter, { transaction: ctx.options.transaction }, function(err, stages) {
			// internal db error -- bubble up
			if (err) { return next(err); }
			// create a map of project ids to a list of stages
			var stageMap = {};
			for (var stage of stages) {
				// key does not exist yet
				if (!stageMap[stage.project__r__pg_id__c]) {
					// init with a list
					stageMap[stage.project__r__pg_id__c] = [];
				}
				stageMap[stage.project__r__pg_id__c].push(stage);
			}
			//  create a list of new approvals to be generated when the entries are submitted
			var newApprovals = [];
			var entriesToApprove = [];
			try {
				for (var entry of entries) {
					// we only want to create approvals for entries with a status that changed to submitted
					if (status !== ctx.hookState.oldInstancesMap[entry.pg_id__c].status__c) {
						// If there is an array of stages for the entry's project
						if (stageMap[entry.project__r__pg_id__c]) {
							// create the new entry approvals for the newly submitted entry
							newApprovals.push({
								status__c: constants.status.PENDING,
								entry__r__pg_id__c: entry.pg_id__c,
								approval_stage__r__pg_id__c: stageMap[entry.project__r__pg_id__c][0].pg_id__c
							});
						// If there are no stages, add entry's id to list of entries to be approved
						} else {
							entriesToApprove.push(entry.pg_id__c);
						}
					}
				}
			} catch (e) {
				var refNum = modelUtils.generateReferenceNumber();
				console.log('Error: ' + refNum);
				console.log(e.stack);
				return callback({
					status: 500,
					message: constants.errorMessages.internalReferenceError + refNum + '.'
				});
			}
			var approvalsCreated, entriesApproved;
			// create the approvals
			ctx.Model.app.models.tt_entry_approval__c.create(newApprovals, { transaction: ctx.options.transaction }, function(err, createdApprovals) {
				if (err) { return next(err); }
				approvalsCreated = true;
				if (entriesApproved) return next();
			});

			// approve entries for projects that don't have any approval stages
			ctx.Model.app.models.tt_entry__c.updateAll({pg_id__c: {inq: entriesToApprove}}, {status__c: constants.status.APPROVED}, { transaction: ctx.options.transaction }, function(err) {
				if (err) { return next(err); }
				entriesApproved = true;
				if (approvalsCreated) return next();
			})
		});
	});
};

// module interface
module.exports = {
	validateStartAndEndTime: validateStartAndEndTime,
	validateNoOverlap: validateNoOverlap,
	getPreviousState: getPreviousState,
	handleChanges: handleChanges,
	startApprovalProcess: startApprovalProcess
};