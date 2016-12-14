/**
 * Services method used in the HTTP API endpoints
 */
// import utilities methods for working with models
var modelUtils = require('../utils/model-utils');
// server wide constants for status and error messages
var constants = require('../utils/constants');


/**
 * Gets a single timesheet for the logged in user -- either the current or a specified timesheet, including the associated entries and, if necessary, 
 * most recent rejected entry approval for those entries
 * @param auth - the authorization headers for hte logged in user
 * @param pgIDD - the postgres id for the timesheet to find -- retrieves current timesheet for undefined
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries - set to null for no transaction
 * @param callback - callback function
 */
var getMyTimesheet = function(pgID, auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		// if there was an error retrieving the enduser from the token, then just bubble the error up
		if (err) {
			return callback(err);
		}
		// init the query options 
		var options = (tx ? { transaction: tx } : {} );
		// init the filter to be used in getting timesheets
		var filter = { where: {} };
		// only retrieve logged in user's contact's timesheet
		filter.where.employee__r__pg_id__c = endUser.contact__r__pg_id__c;
		// request the current timesheet for the week
		if (pgID === 'current') filter.where.start__c = getMondayOfCurrentWeek();
		// use the provided timesheet postgres id via URL
		else filter.where.pg_id__c = pgID;
		// set the filter for retrieving the related objects
		filter.include = {
			relation: 'entries', scope: {
				include: { relation: 'approvals', scope: {
					// only want the most recent rejection
					where: { status__c: constants.status.REJECTED },
					order: 'time_of_response__c DESC',
					limit: 1
				}}
			}
		};
		// retrieve the timesheet, attached entries, and attached approvals if required
		model.app.models.tt_timesheet__c.find(filter, options, function(err, timesheets) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotGetTimesheet
				}); 
			}
			// should never have more than one timesheet returned for this endpoint -- most commonly this will happen for getting the current with bad data
			if (timesheets.length > 1) { 
				return callback({
					status: 400,
					message: constants.errorMessages.multipleTimesheetsForWeek
				}); 
			}
			// if no timesheet was found, just return null
			if (timesheets.length === 0) { 
				return callback(null, null); 
			}
			return callback(null, timesheets[0]);
		});
	});
};

/**
 * Gets all timesheets that belong to the logged in user
 * @param auth - the authorization headers for hte logged in user
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var getMyTimesheets = function(auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		// if there was an error retrieving the enduser from the token, then just bubble the error up
		if (err) {
			return callback(err);
		}
		// init the query options 
		var options = (tx ? { transaction: tx } : {} );
		// get all timesheets and entries for the current 
		// order in descending order for front end viewing
		var timesheetFilter = {
			where: { employee__r__pg_id__c: endUser.contact__r__pg_id__c }, 
			order: 'start__c DESC',
			include: 'entries'
		};
		// get the timesheet
		model.app.models.tt_timesheet__c.find(timesheetFilter, options, function(err, timesheets) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotGetTimesheet
				});
			}
			return callback(null, timesheets);
		});
	});
};

/**
 * Creates a new timesheet for the current week for the logged in user
 * @param auth - the authorization headers for hte logged in user
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var createCurrentTimesheet = function(auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		// if there was an error retrieving the enduser from the token, then just bubble the error up
		if (err) {
			return callback(err);
		}
		// init the query options 
		var options = (tx ? { transaction: tx } : {} );
		// the new timesheet to be created with the logged in employee, open status, and a start time for the current week
		var timesheet = {
			employee__r__pg_id__c: endUser.contact__r__pg_id__c,
			status__c: constants.status.OPEN,
			start__c: getMondayOfCurrentWeek()
		};
		// create the new timesheet
		model.app.models.tt_timesheet__c.create(timesheet, options, function(err, newTimesheet) {
			if (err) { 
				console.log(err);
				// since this callback involves hooks, we want to bubble up the hook errors if they occur
				return callback({
					status: (err.status ? err.status : 500),
					message: (err.message ? err.message : constants.errorMessages.couldNotCreateTimesheet)
				});
			}
			return callback(null, newTimesheet);
		});	
	});
};

/**
 * Submits a single timesheet
 * @param pgID - the postgres id for the timesheet
 * @param auth - the authorization headers for hte logged in user
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var submitMyTimesheet = function(pgID, auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		// if there was an error retrieving the enduser from the token, then just bubble the error up
		if (err) {
			return callback(err);
		}
		// init the query options 
		var options = (tx ? { transaction: tx } : {} );
		// filter to retrieve the timesheet that is being submitted
		var filter = {
			where: { pg_id__c: pgID },
			// we need to not include these fields because they break the DB locally (should work on live, but not positive)
			fields: { systemmodstamp: false, createddate: false, start__c: false }
		};
		// get the timesheet
		model.app.models.tt_timesheet__c.find(filter, options, function(err, timesheets) {
			if (err) { 
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotSubmitTimesheet
				}); 
			}
			// if there are no timesheets, then let the user no that a timesheet for the provided id could not be found
			if (timesheets.length === 0) { 
				return callback({
					status: 404,
					message: constants.errorMessages.couldNotSubmitTimesheet
				});
			}
			// verify the user has access rights to submit this timesheet
			if (endUser.contact__r__pg_id__c !== timesheets[0].employee__r__pg_id__c) { 
				return callback({
					status: 403,
					message: constants.errorMessages.couldNotSubmitTimesheet
				});
			}
			// submit and update the timesheet
			timesheets[0].status__c = constants.status.SUBMITTED;
			model.app.models.tt_timesheet__c.upsert(timesheets[0], options, function(err, updatedTimesheet) {
				if (err) { 
					console.log(err);
					// since this callback involves hooks, we want to bubble up the hook errors if they occur
					return callback({
						status: (err.status ? err.status : 500),
						message: (err.message ? err.message : constants.errorMessages.couldNotSubmitTimesheet)
					});
				}
				return callback(null, updatedTimesheet);
			});	
		});
	});
};

/**
 * Calculates and returns the UTC monday of the current week
 * @return the UTC monday of this week
 */
var getMondayOfCurrentWeek = function() {
	// get todays date
	var today = new Date();
	// get the difference between todays day and monday
	var diff = today.getUTCDate() - today.getUTCDay() + (today.getUTCDay() == 0 ? -6 : 1);
	// get the monday date
	var monday = new Date(today.setUTCDate(diff));
	// set the time to 0
	monday.setUTCHours(0);
	monday.setUTCMinutes(0);
	monday.setUTCSeconds(0);
	monday.setUTCMilliseconds(0);
	return monday;
};

module.exports = {
	getMyTimesheet: getMyTimesheet,
	getMyTimesheets: getMyTimesheets,
	createCurrentTimesheet: createCurrentTimesheet,
	submitMyTimesheet: submitMyTimesheet
};