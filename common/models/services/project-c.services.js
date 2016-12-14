/**
 * Services method used in the HTTP API endpoints
 */
// import utilities methods for working with models
var modelUtils = require('../utils/model-utils');
// server wide constants for status and error messages
var constants = require('../utils/constants');

/**
 * Retrieves all projects that the logged in user can approve for as a map of pg ids to projects
 * @param auth - the authorization headers for hte logged in user
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var getApproverProjectMap = function(auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		if (err) {
			return callback(err);
		}
		// init the query options 
		var options = (tx ? { transaction: tx } : {} );
		// include the approval stages and projects for the project approver
		var filter = {
			where: { contact__r__pg_id__c: endUser.contact__r__pg_id__c },
			include: { relation: 'approvalStage', scope: {
					include: { relation: 'project', scope: {
						// entries is only included for a check later
						include: { relation: 'entries', scope: {
							// and for that check, we only want non-approved entries
							where: { status__c : { neq: constants.status.APPROVED } }
						} }
					} }
				}
			}
		};
		// query the project approvers based off the enduser pg id
		model.app.models.tt_approver__c.find(filter, options, function(err, approvers) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotGetApproverProjects
				});
			}
			// init our project map
			var projectMap = {};
			// iterate through the approvers and pull out the projects
			try {
				for (var approver of approvers) {
					// parse the approver so we can access relations, and set the project for readability
					var project = approver.toJSON().approvalStage.project;
					// if we have an inactive project, it must have existing non-approved entries in order to be retrieved
					if (project.entries.length || !project.inactive__c) {
						// delete the entries -- they are not needed after the check
						delete project.entries;
						projectMap[project.pg_id__c] = project;
					}
				}
				return callback(null, projectMap);
			} catch (e) {
				var refNum = modelUtils.generateReferenceNumber();
				console.log('Error: ' + refNum);
				console.log(e.stack)
				return callback({
					status: 500,
					message: constants.errorMessages.internalReferenceError + refNum + '.'
				});
			}
		});
	});
};

/**
 * Returns all projects as a map with each project containing a boolean flag field indicating whether or not the user is a contributor for that project
 * @param auth - the authorization headers for hte logged in user
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var getContributorProjectMap = function(auth, model, tx, callback) {
	// retrieve the end user from the headers token
	modelUtils.getEndUserFromHeaders(auth, model, function (err, endUser) {
		if (err) {
			return callback(err);
		}
		// init the query options 
		var options = (tx ? { transaction: tx } : {} );
		// get all of the projects
		model.app.models.tt_project__c.find({}, options, function(err, projects) {
			if (err) { 
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotGetContributorProjects
				});
			}
			
			// convert the projects list to a map
			var projectMap = {};
			for (var project of projects) {
				projectMap[project.pg_id__c] = project;
			}
			// now query the contributors to set flags
			model.app.models.tt_contributor__c.find({ where: { contact__r__pg_id__c: endUser.contact__r__pg_id__c } }, function(err, contributors) {
				if (err) { 
					console.log(err);
					return callback({
						status: 500,
						message: constants.errorMessages.couldNotGetContributorProjects
					});
				}
				// convert the contributors to a map of project pg id to contributor objects
				var contributorMap = {};
				for (var contributor of contributors) {
					contributorMap[contributor.project__r__pg_id__c] = contributor;
				}
				// now loop through all the projects and set the boolean flags
				for (var projectKey in projectMap) {
					// set whether or not the user is a contributor for the projects based on if the projeckey exists in the contributor map
					projectMap[projectKey].contributor = (contributorMap[projectKey] ? true : false);
				}
				return callback(null, projectMap);
			});
		});
	});
};

/**
 * Retrieves all projects with attached accounts as a map 
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var getProjectMap = function(model, tx, callback) {
	// init the query options 
	var options = (tx ? { transaction: tx } : {} );
	// include the account with the projects
	var filter = {
		where: { inactive__c: false },
		include: 'account'
	}
	// get all projects and accounts
	model.app.models.tt_project__c.find(filter, options, function(err, projects) {
		if (err) { 
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotGetProjects
			});
		}
		// create the project map
		var projectMap = {};
		for (var project of projects) {
			// map the project og id to the project object
			projectMap[project.pg_id__c] = project;
		}
		return callback(null, projectMap);
	});
};

/**
 * Gets a project and all the related fields
 * @param pgID - the postgres id of the project
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries
 * @param callback - callback function
 */
var getProjectDetails = function (pgID, model, tx, callback) {
	// init query transaction options
	var options = (tx ? { transaction: tx } : {} );
	// filter for retrieving all related fields for the project
	var filter = {
		include: [
			{
				relation: 'approvalStages', scope: {
					order: 'stage_number__c ASC',
					include: 'approvers'
				}
			},
			'contributors',
		]
	}
	// Retrieves all project details for project with provided pgId
	model.app.models.tt_project__c.findById(pgID, filter, function (err, project) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotGetProjectDetails
			});
		}
		// Returns error if no project found or the project is inactive
		if (!project || project.inactive__c) { 
			return callback({
				status: 404,
				message: constants.errorMessages.couldNotGetProjectDetails
			});
		}
		callback(null, project);
	});
};

/**
 * Creates or updates a project
 * @param data - data object containing the new or updated project
 * @param model - object used for loopback operations
 * @param tx - transaction object
 * @param callback - callback function
 */
var upsertProject = function(data, model, tx, callback) {
	// init query transaction options
	var options = (tx ? { transaction: tx } : {} );
	model.app.models.tt_project__c.upsert(data, options, function(err, project) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				messages: constants.errorMessages.couldNotUpsertProject
			});
		}
		return callback(null, project);
	});
};

/**
 * Deactivates a project and destroys all associated contributors
 * @param pgID - the postgres id of the project to deactivate 
 * @param model - the loopback object model
 * @param tx - the transaction being passed in (null if no transaction)
 * @param callback - callback function
 */
var deactivateProject = function(pgID, model, tx, callback) {
	// init query transaction options
	var options = (tx ? { transaction: tx } : {} );
	// required fields for the object
	var fields = { 
		pg_id__c: true, 
		inactive__c: true
	};
	// query to make sure the project to deactive exists
	model.app.models.tt_project__c.findById(pgID, { fields: fields }, options, function(err, project) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotDeactivateProject
			});
		}
		// no project exists for the provided pgId
		if (!project) {
			return callback({
				status: 404,
				message: constants.errorMessages.couldNotDeactivateProject
			});
		}
		// change the inactive field and update the project
		project.inactive__c = true;
		model.app.models.tt_project__c.upsert(project, options, function(err, updatedProject) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotDeactivateProject
				});
			}
			// delete all contributors
			model.app.models.tt_contributor__c.destroyAll({ project__r__pg_id__c: pgID }, options, function(err, results) {
				if (err) {
					console.log(err);
					return callback({
						status: 500,
						message: constants.errorMessages.couldNotDeactivateProject
					});
				}
				return callback(null, null);
			});
		});
	});
};

module.exports = {
	getApproverProjectMap: getApproverProjectMap,
	getContributorProjectMap: getContributorProjectMap,
	getProjectMap: getProjectMap,
	getProjectDetails: getProjectDetails,
	upsertProject: upsertProject,
	deactivateProject: deactivateProject
};