/**
 * Services module for before and after hooks used in the timesheet-c.js file
 * These triggers are implemented as operation hooks
 */

// server wide constants for status and error messages
var constants = require('../utils/constants');

/**
 * Before hook to set the previous state of the object(s) being operated on as both a map and a list in the loopback context.
 * Should only be accessed in after hooks, and can be found in ctx.hookState.
 * @param ctx - the loopback context
 * @param next - the node next function
 */
var getPreviousState = function(ctx, next) {
	// if this is an updateAll, where will already exist. Otherwise, we want to query based on the id of the timesheet send in via upsert/create
	var where = ctx.where || { pg_id__c: (ctx.currentInstance || ctx.instance).pg_id__c };
	// query for the timesheet(s)
	ctx.Model.app.models.tt_timesheet__c.find({ where: where }, { transaction: ctx.options.transaction }, function(err, oldTimesheets) {
		// there was an internal error - bubble up to be handled in api call
		if (err) { return next(err); }
		// set the old timesheets as a list for iterating
		ctx.hookState.oldInstances = oldTimesheets;
		// set the old timesheets map for lookups
		ctx.hookState.oldInstancesMap = {};
		for (var oldTimesheet of oldTimesheets) {
			ctx.hookState.oldInstancesMap[oldTimesheet.pg_id__c] = oldTimesheet;
		}
		// continue on to the next hook/operation
		return next();
	});
};

/**
 * Before hook to verify that all entries for a particular timesheet have an end time when a timesheet is submitted
 * @param ctx - the loopback context
 * @param next - the node next function
 */
var checkEntryEndTimes = function(ctx, next) {
	// currently doesn't handle updateAll or create calls -- only used for submitting a single timesheet (via UI)
	if ((ctx.where && !ctx.where.pg_id__c) || (ctx.where && ctx.where.pg_id__c && typeof ctx.where.pg_id__c === 'object') || ctx.isNewInstance) { return next(); }
	// get the timesheet being updated
	var timesheet = ctx.data;
	// Access the previous version of the timesheet
	var oldTimesheet = ctx.currentInstance || ctx.instance;
	// verify that the timesheet status has changed to submitted
	if (timesheet && timesheet.status__c !== oldTimesheet.status__c && timesheet.status__c === constants.status.SUBMITTED) {
		// get all of the entries for the passed in timesheet
		ctx.Model.app.models.tt_entry__c.find({ where: { timesheet__r__pg_id__c: timesheet.pg_id__c } }, { transaction: ctx.options.transaction }, function(err, entries) {
			// internal server error - bubble up to be caught in api call
			if (err) { return next(err); }
			// check all entries
			for (var entry of entries) {
				// if any entry does not have an end time, then forward the error
				if (!entry.end__c) {
					var error = new Error('Error: Timesheet cannot be submitted -- All entries must have an end time.');
					error.status = 400;
					return next(error);
				}
			}
			// if no errors were found, then this will fire after all entries are checked
			return next();
		});
	// the timesheet was not changed to submitted, so just move on.
	} else {
		return next();
	}
};

/**
 * After hook that sets the status of all non-approved entries attached to the submitted timesheet to submitted
 * @param ctx - the loopback context object
 * @param next - the node next function 
 */
var submitEntries = function(ctx, next) {
	// currently only handles a single timesheet being upserted
	// so if the where exists, it is an update all -> move on
	// if isNewInstance is true, then it is not an update upsert -> move on
	if ((ctx.where && !ctx.where.pg_id__c) || (ctx.where && ctx.where.pg_id__c && typeof ctx.where.pg_id__c === 'object') || ctx.isNewInstance) { return next(); }
	// get the timesheet 
	var timesheet = ctx.instance || ctx.currentInstance
	// if the timesheet has been submitted and the status has changed
	if (timesheet && timesheet.status__c === constants.status.SUBMITTED && timesheet.status__c !== ctx.hookState.oldInstancesMap[timesheet.pg_id__c].status__c) {
		// retrieve all of the entries attached to the timesheet being submitted
		ctx.Model.app.models.tt_entry__c.find({ where: { timesheet__r__pg_id__c: timesheet.pg_id__c } }, { transaction: ctx.options.transaction }, function(err, entries) {
			// internal db error
			if (err) { return next(err); }
			// collect the entry ids for a bulk update
			var entryIds = [];
			//  create a list of new approvals to be generated when the entries are approved
			for (var entry of entries) {
				// we only want to submit entries that are not approved
				if (entry.status__c !== constants.status.APPROVED) {
					entryIds.push(entry.pg_id__c);
				};
			}
			// if there are entries that are not already approved
			if (entryIds.length) {
				// update the entries to Submitted
				ctx.Model.app.models.tt_entry__c.updateAll({ pg_id__c: { inq: entryIds } }, { status__c: constants.status.SUBMITTED }, { transaction: ctx.options.transaction }, function(err, count) {
					if (err) { return next(err); }
					return next();
				});
			} else {
				// sets timesheet status to approved if no entries that are not approved
				var updatedTimesheet = {
					pg_id__c: timesheet.pg_id__c,
					status__c: constants.status.APPROVED
				};
				// sets status on ctx.instance to respond with correct status
				// we do this so that we get the updated instance returned in the api call
				timesheet.status__c = constants.status.APPROVED;
				ctx.Model.app.models.tt_timesheet__c.upsert(updatedTimesheet, { transaction: ctx.options.transaction }, function(err, count) {
					if (err) { return next(err); }
					return next();
				});
			}
		});
	// timesheet was not changed to submitted so move on
	} else {
		return next();
	}
};

/**
 * Sends emails if timesheet(s) status have been changed to needs attention
 * @param ctx - the looback context object
 * @param next - the node next function
 */
var sendEmailIfNeedsAttention = function(ctx, next) {
	// init our where clause and timesheet status
	var filter = {};
	var status;
	// update all with a valid status passed in
	if (ctx.where && ctx.data.status__c) {
		// set the values for query below
		filter.where = { pg_id__c: { inq: Object.keys(ctx.hookState.oldInstancesMap) } };
		status = ctx.data.status__c
	// upsert, create, etc.
	} else {
		// temp timesheet
		var ts = ctx.instance || ctx.currentInstance;
		// set the id for the where clause
		filter.where = { pg_id__c: ts.pg_id__c };
		// and the status of the timesheet
		status = ts.status__c;
	}
	// if the status is not needs attention, then we don't need to continue since emails are only fired if the timesheet needs attention
	if (status !== constants.status.NEEDS_ATTN) { return next(); }
	// add the includes statement for employee contatcts
	filter.include = 'employee';
	// get all of the timesheets based on the where clause defined above
	ctx.Model.app.models.tt_timesheet__c.find(filter, { transaction: ctx.options.transaction }, function(err, timesheets) {
		// internal DB error
		if (err) { return next(err); }
		// collect the employee ids to query for
		var employeeIds = [];
		// create a list of timesheets that have a status that has been changed to needs attention
		var filteredTimesheets = [];
		for (var timesheet of timesheets) {
			// if the status being set is different from the previous status
			if (status !== ctx.hookState.oldInstancesMap[timesheet.pg_id__c].status__c) {
				// then add the filtered timesheet
				filteredTimesheets.push(timesheet);
			}
		}
		// if there are no timesheets that need emails sent, then just move on
		if (filteredTimesheets.length === 0) { return next(); }
		sendNeedsAttentionEmails(ctx, filteredTimesheets, next);
	});
};

////////////////////////////////////////////////////////////////////////////////////////////
/**
 * END AFTER HOOKS
*/
////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////
/**
 * BEGIN HELPER METHODS
*/
////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Sends email for the timesheets passed in to notify users that their timesheet needs attention
 * @param ctx - the loopback context object
 * @param timesheets - the timesheets that need to have an email sent
 * @param next - the node next function
 */
var sendNeedsAttentionEmails = function (ctx, timesheets, next) {
	// used for bulk operations so that we can only call next() after all emails are sent
	remainingOperations = timesheets.length;
	// for each timesheet
	for (timesheet of timesheets) {
		// construct the url for the timesheet that needs attention
		var url = process.env.ROOT_DOMAIN + '/page/timesheets/' + timesheet.sfid;
		// create the message to the user 
		var message = 'Your timesheet for the week of ' +  
		(timesheet.start__c.getUTCMonth() + 1) + '/' + timesheet.start__c.getUTCDate() + '/' + timesheet.start__c.getUTCFullYear() +
			' needs attention. ' + 'Click <a href="' + url + '">here</a> to view the timesheet';
		// send the email -- continue on when all email have been fired
		ctx.Model.app.models.SendGrid.send({
			to: timesheet.toJSON().employee.email,
			from: '"TimeTracker" ' + '<' + process.env.NOREPLYEMAIL_ADDRESS + '>',
			subject: 'One of your timesheets needs attention!',
			html: message
		}, function(err) {
			// internal error
			// if there was an error, we just want to log it. and continue. We dont want to pass along the error because we dont want to rollback
			// all of the data if an email being sent failed
			if (err) {
				console.log(err); 
				return next(); 
			}
			// if all emails for all timesheets have been fired, then continue to the next hook/operation
			if (--remainingOperations === 0) {
				return next();
			}
		});
	}
};

////////////////////////////////////////////////////////////////////////////////////////////
/**
 * END HELPER METHODS
*/
////////////////////////////////////////////////////////////////////////////////////////////

// The outward facing interface
module.exports = {
	getPreviousState: getPreviousState,
	checkEntryEndTimes: checkEntryEndTimes,
	submitEntries: submitEntries,
	sendEmailIfNeedsAttention: sendEmailIfNeedsAttention
};