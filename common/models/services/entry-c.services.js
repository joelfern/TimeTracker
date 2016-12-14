/**
 * Services method used in the HTTP API endpoints
 */
// import utilities methods for working with models
var modelUtils = require('../utils/model-utils');
// server wide constants for status and error messages
var constants = require('../utils/constants');

/**
 * Upserts an entry
 * @param data - entry to be upserted 
 * @param auth - the authorization headers for hte logged in user
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var upsertEntry = function(data, auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		if (err) {
			return callback(err);
		}
		// init the query options 
		var options = (tx ? { transaction: tx } : {} )
		// retrieve the timesheet for the entry so we can verify that the user can update this entry
		model.app.models.tt_timesheet__c.find({ where : { pg_id__c: data.timesheet__r__pg_id__c } }, options, function(err, timesheet) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotUpsertEntry
				});
			}
			try {
				// the current users sfid doesnt match the employee on the timesheet for the entry
				if (timesheet[0].employee__r__pg_id__c !== endUser.contact__r__pg_id__c) { 
					return callback({
						status: 403,
						message: constants.errorMessages.couldNotUpsertEntry
					});
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
			// update the entry
			model.app.models.tt_entry__c.upsert(data, options, function(err, updatedEntry) {
				if (err) { 
					console.log(err);
					return callback({
						status: (err.status ? err.status : 500),
						message: (err.message ? err.message : constants.errorMessages.couldNotUpsertEntry)
					}); 
				}
				return callback(null, updatedEntry);
			});
		});
	});
};

/**
 * deletes an entry
 * @param pgID - the postgres id of the entry to be deleted
 * @param auth - the authorization headers for hte logged in user
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var deleteEntry = function(pgID, auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		if (err) {
			return callback(err);
		}
		// init the query options 
		var options = (tx ? { transaction: tx } : {} )
		// verify that the entry exists to be deleted
		// this is an extra query, but it useful for providing better messaging to api users
		// include the timesheet for ownership check
		model.app.models.tt_entry__c.findById(pgID, { include: 'timesheet' }, options, function(err, entry) {
			if (err) { 
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotDeleteEntry
				});
			}
			// no entry to delete, return a 404
			if (!entry) { 
				return callback({
					status: 404,
					message: constants.errorMessages.couldNotDeleteEntry
				});
			}
			try {
				// if the employee on the timesheet does not match the logged in user, then the user cannot delete the entry
				if (entry.toJSON().timesheet.employee__r__pg_id__c !== endUser.contact__r__pg_id__c) { 
					return callback({
						status: 403,
						message: constants.errorMessages.couldNotDeleteEntry
					});
				}
			} catch (e) {
				var refNum = modelUtils.generateReferenceNumber();
				console.log(refNum);
				console.log(e);
				return callback({
					status: 500,
					message: constants.errorMessages.internalReferenceError + refNum + '.'
				});
			}
			// delete the entry
			model.app.models.tt_entry__c.destroyById(pgID, options, function(err, result) {;
				if (err) { 
					console.log(err);
					return callback({
						status: 500,
						message: constants.errorMessages.couldNotDeleteEntry
					});
				}
				return callback(null, null);
			});
		});
	});
};

/**
 * Method for retrieving all past approvals for a specified entry
 * @param pgID - the postgres id of the entry to get the history for
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var getHistory = function (pgID, model, tx, callback) {
	// init the query options 
	var options = (tx ? { transaction: tx } : {} )
	// filter for finding all approvals with the entry identified by sfid that are pending.
	// Sorted DESC time of response to get the most recent activity at the top of the list
	var approvalFilter = {
		where: {
			entry__r__pg_id__c: pgID,
			status__c: {
				neq: constants.status.PENDING
			}
		},
		order: "time_of_response__c DESC",
		include: ['approvingContact', 'approvalStage']
	};

	// Finds all approvals for entry, in order of time of response
	model.app.models.tt_entry_approval__c.find(approvalFilter, function (err, entryApprovals) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotGetApprovalHistory
			});
		}
		return callback(null, entryApprovals);
	});
};

module.exports = {
	upsertEntry: upsertEntry,
	deleteEntry: deleteEntry,
	getHistory: getHistory
};