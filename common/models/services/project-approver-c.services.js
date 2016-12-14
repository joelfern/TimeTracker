/**
 * Services method used in the HTTP API endpoints
 */
// import utilities methods for working with models
var modelUtils = require('../utils/model-utils');
// server wide constants for status and error messages
var constants = require('../utils/constants');

/**
 * Inserts an approver
 * @param pgID - the id for the stage to have an approver created for
 * @param data - object containing a contact and optional approval stage field
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var createApprover = function (pgID, data, model, tx, callback) {
	// init the query options 
	var options = (tx ? { transaction: tx } : {} );
	// Strips out all extra data for new approver to be used for both where and insert
	var newApprover = {
		contact__r__pg_id__c: data.contact__r__pg_id__c,
		approval_stage__r__pg_id__c: data.approval_stage__r__pg__id__c
	}
	// no contact provided for the approver
	if (!data.contact__r__pg_id__c) { 
		return callback({
			status: 400,
			message: constants.errorMessages.contactRequired
		});
	}
	// if an approval stage was not provided, then find by the provided url stage id
	if (!data.approval_stage__r__pg__id__c) {
		model.app.models.tt_approval_stage__c.findById(pgID, options, function (err, instance) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					messsage: constants.errorMessages.couldNotCreateApprover
				});
			}
			// the provided url param does not have a stage record
			if (!instance) { 
				return callback({
					status: 404,
					message: constants.errorMessages.couldNotCreateApprover
				});
			}
			// set the approval stage 
			newApprover.approval_stage__r__pg_id__c = instance.pg_id__c;
			// save to the db
			return saveApprover(newApprover, model, options, callback);
		});
	// otherwise just save the provided fields to the db
	} else {
		return saveApprover(newApprover, model, options, callback);
	}
};

// Function to be called for saving approver to database
/**
 * @param approver - approver to be saved
 * @param model - looback object model used for db operations
 * @param options - options containing transaction
 * @param callback - callback function
 */
var saveApprover = function(approver, model, options, callback) {
	// find the approver if it already exists, or create a new one
	model.app.models.tt_approver__c.findOrCreate({ where: approver }, approver, options, function (err, instance, created) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotCreateApprover
			})
		}
		// if the project approver already exists, let the user know 
		if (!created) { 
			return callback({
				status: 400,
				message: constants.errorMessages.approverExists
			});
		}
		// send the data
		return callback(null, instance)
	});
};

/**
 * Deletes an approver
 * @param pgID - the postgres id for the approver
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var deleteApprover = function (pgID, model, tx, callback) {
	// init the query options 
	var options = (tx ? { transaction: tx } : {} );
	// query to validate that the approver exists prior to deletion
	model.app.models.tt_approver__c.findById(pgID, options, function(err, approver) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotDeleteApprover
			});
		}
		if (!approver) {
			return callback({
				status: 404,
				message: constants.errorMessages.couldNotDeleteApprover
			});
		}
		// delete the approver identified by the provided id
		model.app.models.tt_approver__c.destroyById(pgID, options, function (err) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotDeleteApprover
				});
			}
			return callback(null, null);
		});
	});
}; 

module.exports = {
	createApprover: createApprover,
	deleteApprover: deleteApprover
};