/**
 * Services method used in the HTTP API endpoints
 */
// import utilities methods for working with models
var modelUtils = require('../utils/model-utils');
// server wide constants for status and error messages
var constants = require('../utils/constants');

/**
 * Returns a map of approval stage sfids to approval stages
 * @param where - the where clause for filtering which approval stages to get
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries - set to null for no transaction
 * @param callback - callback function
 */
var getApprovalStageMap = function (where, model, tx, callback) {
	// init the query options 
	var options = (tx ? { transaction: tx } : {} );
	// get approval stages based off the where provided in the request
	model.app.models.tt_approval_stage__c.find({ where : where}, options, function (err, stages) {
		if (err) {
			console.log(err);
			return callback({
				status: 500,
				message: constants.errorMessages.couldNotGetApprovalStages
			});
		}
		// creat a map of stage ids to stages
		var approvalStageMap = {};
		for (var stage of stages) {
			approvalStageMap[stage.pg_id__c] = stage;
		}
		return callback(null, getApprovalStageMap);
	});
};

/**
 * Method that deletes all existing stages, creates all current stages,
 * deletes all approvals for project, sets all entries that are not approved
 * back to open to be resubmitted
 * @param reqData - data object containing a project and stages
 * @param model - db model used to call Loopback functions
 * @param tx - optional transaction for database queries - set to null for no transaction
 * @param callback - callback function
 */
var setApprovalStages = function (reqData, model, tx, callback) {
	// Response with error if required fields not supplied
	if (!reqData.project) { 
		return callback({
			status: 400,
			message: constants.errorMessages.projectRequired
		});
	}
	if (!reqData.stages) { 
		return callback({
			status: 400,
			message: constants.errorMessages.stagesRequired
		});
	}

	// Creates empty array to store stage objects in
	var stages = [];
	var stageByDisplayNameMap = {};
	var stageIds = [];
	// loops over all provided stages
	for (var i in reqData.stages) {
		// Response with error if stageName is not a string
		if (!reqData.stages[i].display_name__c || stageByDisplayNameMap[reqData.stages[i].display_name__c]) { 
			return callback({
				status: 400,
				message: constants.errorMessages.displayNameRequired
			});
		}
		stageByDisplayNameMap[reqData.stages[i].display_name__c] = reqData.stages[i];
		// Adds stage object to stages array
		stages.push({
			project__r__pg_id__c: reqData.project,
			display_name__c: reqData.stages[i].display_name__c,
			stage_number__c: Number.parseInt(i) + 1,
			approvers: reqData.stages[i].approvers
		})
		// Sets id if included
		if (reqData.stages[i].pg_id__c) {
			stages[i].pg_id__c = reqData.stages[i].pg_id__c;
			stageIds.push(stages[i].pg_id__c);
		}
	}
	// init the query options 
	var options = (tx ? { transaction: tx } : {} );
	
	// Finds all current approval stages to be used in removing existing approvals
	model.app.models.tt_approval_stage__c.find({ where: { project__r__pg_id__c: reqData.project } }, options, function(err, data) {
		if (err) {
			console.log(err);
			return modelUtils.handleError(res, 500, 'Error setting project approval stages.', tx);
		}

		// Collects all ids of stages currently in database
		var oldStagePgIDs = [];
		var oldStagesMap = {};
		for (var stage of data) {
			oldStagePgIDs.push(stage.pg_id__c);
			oldStagesMap[stage.pg_id__c] = stage;
		}

		// If stage has id but id is not of stage on this project send error
		for (var stage of stages) {
			if (stage.pg_id__c && !oldStagesMap[stage.pg_id__c]) {
				return callback({
					status: 400,
					message: constants.errorMessages.stageBelongsToAnotherProject
				})
			} else if (stage.pg_id__c) {
				// sets passed in approvers on oldStagesMap
				oldStagesMap[stage.pg_id__c].projectApprovers = stage.approvers;
			}
		}

		// filter to be used in destruction of existing approval stages for project
		var approvalStageWhere = {
			project__r__pg_id__c: reqData.project,
			// does not include stages that are still being used to prevent
			pg_id__c: {
				nin: stageIds
			}
		};

		// destroys all approval stages for project that are not in new array of stages
		model.app.models.tt_approval_stage__c.destroyAll(approvalStageWhere, options, function(err, info) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotSetApprovalStages
				});
			}
			
			// where to be used in updating status of entries that have not yet
			// been approved back to open
			var entryWhere = {
				project__r__pg_id__c: reqData.project,
				status__c: {
					neq: constants.status.APPROVED
				}
			};

			// data object to set status to open.
			// Does not set to pending as if the first stage is a new 
			var entryData = {
				status__c: constants.status.OPEN
			};

			// Updates entries back to status of open
			model.app.models.tt_entry__c.updateAll(entryWhere, entryData, options, function (err, data) {
				if (err) {
					console.log(err);
					return callback({
						status: 500,
						message: constants.errorMessages.couldNotSetApprovalStages
					});
				}

				// array to hold stages after update or create
				var updatedStages = [];

				// Function for creating/updating a single stage to be called in loop.
				// Written as function for closure purposes
				var createOrUpdate = function (stage) {
					// sets which method to use to updated database
					if (stage.pg_id__c) {
						var method = 'upsert';
					} else {
						var method = 'create';
					}

					// Runs either upsert or create with new approval stage
					model.app.models.tt_approval_stage__c[method](stage, options, function (err, obj) {
						if (err) {
							console.log(err);
							return callback({
								status: 500,
								message: constants.errorMessages.couldNotSetApprovalStages
							});
						}
						// this needs to happen in order to add the field
						// Sets approvers if they were present on oldStages
						if (oldStagesMap[obj.pg_id__c] && oldStagesMap[obj.pg_id__c].projectApprovers) {
							obj.projectApprovers = oldStagesMap[obj.pg_id__c].projectApprovers;
						} else {
							obj.projectApprovers = [];
						}

						// Adds updated/created stage to updated stage array
						updatedStages.push(obj);

						// if the number of stages to update matches the number of stages updated
						if (updatedStages.length === stages.length) {
							// sorts updated stages by stage number, ascending
							updatedStages.sort(function (a, b) {
								return a.stage_number__c - b.stage_number__c;
							});
							// responds with updated stages
							return callback(null, updatedStages);
						}
					});
				};

				// Loops over each stage in stages
				for (var loopStage of stages) {
					// creates or updates each stage
					createOrUpdate(loopStage);
				}
				
				if (!stages.length) {
					return callback(null, []);
				}
			});
		});
	});
};

/**
 * Method to update only display names for approval stages
 * @param stages - array of approval stage objects containing only id and display_name__c
 */
var setApprovalStageNames = function (stages, model, tx, callback) {
	// Verifies all stages have id, display_name__c, and nothing else
	for (var stage of stages) {
		if (!stage.pg_id__c) {
			return callback({
				status: 400,
				message: constants.errorMessages.idRequired 
			});
		}
		if (!stage.display_name__c) {
			return callback({
				status: 400,
				message: constants.errorMessages.displayNameRequired
			});
		}
		for (var key in stage) {
			if (key !== 'pg_id__c' && key !== 'display_name__c') {
				return callback({
					status: 400,
					message: constants.errorMessages.invalidArgs
				});
			}
		}
	}
	var updatedStages = [];
	// init the query options 
	var options = (tx ? { transaction: tx } : {} );
	// upserts each stage
	for (var stage of stages) {
		model.app.models.tt_approval_stage__c.upsert(stage, options, function (err, updatedStage) {
			if (err) {
				console.log(err);
				return callback({
					status: 500,
					message: constants.errorMessages.couldNotSetApprovalStageNames
				});
			}			
			updatedStages.push(updatedStage);
			// returns updated stages when all stages successfully upserted
			if (stages.length == updatedStages.length) {
				return callback(null, updatedStages);
			}
		});
	}
};

module.exports = {
	getApprovalStageMap: getApprovalStageMap,
	setApprovalStages: setApprovalStages,
	setApprovalStageNames: setApprovalStageNames
};