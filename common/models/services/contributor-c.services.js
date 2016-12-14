/**
 * Services method used in the HTTP API endpoints
 */
// import utilities methods for working with models
var modelUtils = require('../utils/model-utils');
// server wide constants for status and error messages
var constants = require('../utils/constants');


/**
 * creates a new contributor
 * @param data - object containing endUser for update at prop endUser
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var createContributor = function (data, model, tx, callback) {
	// contact and project fields must exist on the passed in data object
	if (!data.contact__r__pg_id__c) { 
		return callback({
			status: 400,
			message: constants.errorMessages.contactRequired
		})
	}
	if (!data.project__r__pg_id__c) { 
		return callback({
			status: 400,
			message: constants.errorMessages.projectRequired
		});
	}
	// Strips out all extra data for new contributor to be used for both where and insert
	var newContributor = {
		contact__r__pg_id__c: data.contact__r__pg_id__c,
		project__r__pg_id__c: data.project__r__pg_id__c
	};
	
	// init query transaction options
	var options = (tx ? { transaction: tx } : {} );
	// find the contributor if it exists, or create a new one
	model.app.models.tt_contributor__c.findOrCreate({ where: newContributor }, newContributor, options, function (err, instance, created) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotCreateContributor
			});
		}
		// if the contributor was already found, return an error (cant have duplicates)
		if (!created) { 
			return callback({
				status: 400,
				message: constants.errorMessages.contributorExists
			})
		}
		// send the new contributor
		return callback(null, instance);
	});
};

/**
 * deletes a contributor
 * @param pgID - postgres id of the contributor to delete
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var deleteContributor = function (pgID, model, tx, callback) {
	// init query transaction options
	var options = (tx ? { transaction: tx } : {} );
	model.app.models.tt_contributor__c.findById(pgID, options, function(err, contributor) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotDeleteContributor
			});
		}
		if (!contributor) {
			return callback({
				status: 404,
				message: constants.errorMessages.couldNotDeleteContributor
			});
		}
		model.app.models.tt_contributor__c.destroyById(pgID, options, function (err, results) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotDeleteContributor
				});
			}
			// Success as long as no error (success if project contributor already did not exist)
			return callback(null, null)
		});
	})
};

module.exports = {
	createContributor: createContributor,
	deleteContributor: deleteContributor
};