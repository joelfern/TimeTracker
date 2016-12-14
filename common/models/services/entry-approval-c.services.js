/**
 * Services method used in the HTTP API endpoints
 */
// import utilities methods for working with models
var modelUtils = require('../utils/model-utils');
// server wide constants for status and error messages
var constants = require('../utils/constants');

/**
 * Returns the entry approvals and the attached entries. Also, if the calling user is not an external reviewer,
 * then it also returns timesheet and employee information
 * @param auth - authorization headers
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var getMyEntryApprovals = function(auth, model, tx ,callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		if (err) {
			return callback(err);
		}
		// init query transaction options
		var options = (tx ? { transaction: tx } : {} );
		// build our query, what we really want is the approvals, entries, timesheets and employees
		filter = {
			where: { contact__r__pg_id__c: endUser.contact__r__pg_id__c },
			include: { relation: 'approvalStage', scope: {
				include: { relation: 'approvals', scope: {
					where: { status__c: constants.status.PENDING, approving_contact__r__pg_id__c: null },
					include: { relation: 'entry', scope: {
						include: { relation: 'timesheet', scope: {
							include: { relation: 'employee' }
						}}
					}}
				}}
			}}
		};
		model.app.models.tt_approver__c.find(filter, options, function(err, approvers) {
			if (err) { 
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotGetApprovals
				});
			}
			// unpackage the data
			var data = { approvals: {}, employees: {}, timesheets: {}};
			try {
				for (var approver of approvers) {
					for (var approval of approver.toJSON().approvalStage.approvals) {
						// This is a check to handle the odd situation where we get a dirty read on data
						if (approval.entry.status__c !== constants.status.REJECTED) {
							data.timesheets[approval.entry.timesheet.pg_id__c] = approval.entry.timesheet;
							data.employees[approval.entry.timesheet.employee.pg_id__c] = approval.entry.timesheet.employee;
							// remove fields so we dont have weird dupe data
							delete approval.entry.timesheet;
							data.approvals[approval.pg_id__c] = approval;
						}
					}
				}
				return callback(null, data);
			} catch (e) {
				var refNum = modelUtils.generateReferenceNumber();
				console.log('Error: ' + refNum);
				console.log(e.stack);
				return callback({
					status: 500,
					message: constants.errorMessages.internalReferenceError + refNum + '.'
				});
			}
		});
	});
};

/**
 * Updates a list of entry approvals
 * @param data - contains the where filter and the values that should be changed for records matching the filter. Must contain a status field
 * @param auth - authorization headers
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var updateMyEntryApprovals = function(data, auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		if (err) {
			return callback(err);
		}
		// init query transaction options
		var options = (tx ? { transaction: tx } : {} );
		// verify that the user has the right to update all of the approvals
		// retrieve their project approver records
		model.app.models.tt_approver__c.find({ where: { contact__r__pg_id__c: endUser.contact__r__pg_id__c } }, options, function(err, approvers) {
			if (err) { 
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotUpdateApprovals
				});
			}
			// create a map of approval stages to booleans, just to check if they exist
			var approverMap = {};
			for (var approver of approvers) {
				approverMap[approver.approval_stage__c] = true;
			}
			// now find all of the entries approvals being updated
			model.app.models.tt_entry_approval__c.find({ where: data.where }, options, function(err, approvals) {
				if (err) { 
					console.log(err);
					return callback({
						status: 500,
						message: constants.errorMessages.couldNotUpdateApprovals
					}); 
				}
				// go through each approval and verify that the user has approval rights for this approval stage
				for (var approval of approvals) {
					if (!approverMap[approval.approval_stage__c]) {
						// not an approver, so return an error
						return callback({
							status: 403,
							message: constants.errorMessages.couldNotUpdateApprovals
						});
					}
				}

				// update the entry approvals
				model.app.models.tt_entry_approval__c.updateAll(data.where, data.values, options, function(err, results) {
					if (err) { 
						console.log(err);
						return callback({
							status: (err.status ? err.status : 500),
							message: (err.message ? err.message : constants.errorMessages.couldNotUpdateApprovals)
						});
					}
					return callback(null, results);
				});
			});
		});
	});
};

module.exports = {
	getMyEntryApprovals: getMyEntryApprovals,
	updateMyEntryApprovals: updateMyEntryApprovals
};