/**
 * Services module for before and after hooks used in the entry-approval-c.js file
 */
// server wide constants for status and error messages
var constants = require('../utils/constants');

/**
 * Before hook that gets the previous state of updated approvals and stores them as a list and map
 * @param ctx - the loopback context
 * @param next - the node next function
 */
var getPreviousState = function(ctx, next) {
	// if this is an updateAll, where will already exist. Otherwise, we want to query based on the id of the approval send in via upsert/create
	var where = ctx.where || { pg_id__c: (ctx.currentInstance || ctx.instance).pg_id__c };
	// query for the approvals
	ctx.Model.app.models.tt_entry_approval__c.find({ where: where }, { transaction: ctx.options.transaction }, function(err, oldApprovals) {
		// there was an internal error - bubble up to be handled in api call
		if (err) { return next(err); }
		// set the old approvals as a list for iterating
		ctx.hookState.oldInstances = oldApprovals;
		// set the old approvals map for lookups
		ctx.hookState.oldInstancesMap = {};
		for (var oldApproval of oldApprovals) {
			ctx.hookState.oldInstancesMap[oldApproval.pg_id__c] = oldApproval;
		}
		// continue on to the next hook/operation
		return next();
	});
};

/**
 * After hook which, when an updateAll operation fires, either updates an entries status to Rejected/Approved, or generates a new entry approval
 * @param ctx - the loopback context
 * @param next - the node next function
 * @param Entryapprovalc - the entry approval loopback persisted model object
 */
var updateEntryOrNewApproval = function(ctx, next) {
	if (ctx.isNewInstance) { return next(); }
	var entryApproval = ctx.instance || ctx.currentInstance;
	filter = {
		where: (ctx.where ? { pg_id__c: { inq: Object.keys(ctx.hookState.oldInstancesMap) } } : { pg_id__c: entryApproval.pg_id__c }),
		include: ['approvalStage', 'entry']
	};
	// retrieve the approvals and associated stages and entries
	ctx.Model.app.models.tt_entry_approval__c.find(filter, { transaction: ctx.options.transaction }, function(err, approvals) {
		if (err) { return next(err); }
		// go through and filter out the hooks that have not changed
		var filteredApprovals = [];
		for (var approval of approvals) {
			if (approval.status__c !== ctx.hookState.oldInstancesMap[approval.pg_id__c]) {
				filteredApprovals.push(approval);
			}
		}
		// get the status from the data passed into the update all operation and check which path to take
		if (ctx.data) {
			if (ctx.data.status__c === constants.status.REJECTED) {
				rejectEntries(ctx, filteredApprovals, next);
			} else if (ctx.data.status__c === constants.status.APPROVED) {
				approveEntries(ctx, filteredApprovals, next);
			} else {
				return next();
			}
		} else {
			return next();
		}
	});
};

/**
 * Helper method to reject entries based on having the entry approval rejected
 * @param ctx - the looback context object
 * @param approvals - the list of approvals that need to have entries rejected
 * @param next - the node next function
 */
var rejectEntries = function(ctx, approvals, next) {
	// collect the ids for entries that need to be rejected
	var entryIds = [];
	try {
		for (var approval of approvals) {
			entryIds.push(approval.toJSON().entry.pg_id__c);
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
	// update the entries and return an empty object
	ctx.Model.app.models.tt_entry__c.updateAll(
		{ pg_id__c: { inq: entryIds } }, 
		{ status__c: constants.status.REJECTED },
		{ transaction: ctx.options.transaction }, 
		function(err, count) {
			if (err) { return next(err); }
			return next();
	});
};

/**
 * Helper method to approve entries, or create new entry approvals, based on the approved entry approvals provided
 * Only should be used in update approval (would not work for create);
 * @param ctx - the looback context object
 * @param approvals - the list of approvals that have been approved
 * @param next - the node next function
 */
var approveEntries = function(ctx, approvals, next) {
	// possible to have approvals with a next stage, and some without
	// so collect all ids for those that do not have a next stage
	var entryIds = [];
	// and collect new approvals to create if there is a next stage
	var newApprovals = [];
	var stagesByProject = {};
	var approvalStages = {};
	// holds approving approver
	var approverContactPgID = null;
	try {
		// Creates empty array to hold stages for each project
		for (var approval of approvals) {
			stagesByProject[approval.toJSON().entry.project__r__pg_id__c] = [];
			// stores approver contact pg id if not yet stored
			if (!approverContactPgID) {
				approverContactPgID = approval.final_approver__r__pg_id__c;
			// throws error if mupltiple approvers approving in one transaction
			} else if (approverContactPgID !== approval.final_approver__r__pg_id__c) {
				return next(new Error("Approvals can only be approved by single approver at a time."));
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
	// Stores projects as array of Sfids
	var projects = Object.keys(stagesByProject);

	var filter = {
		where: {
			project__r__pg_id__c: {
				inq: projects
			}
		},
		order: 'stage_number__c ASC'
	};

	// Queries for all approval stages on related projects
	ctx.Model.app.models.tt_approval_stage__c.find(filter, { transaction: ctx.options.transaction }, function (err, data) {
		if (err) { next(err); }
		// Loops through stages and adds them to both objects
		for (var i = 0; i < data.length; i++) {
			stagesByProject[data[i].project__r__pg_id__c][data[i].stage_number__c] = data[i];
			approvalStages[data[i].pg_id__c] = data[i];
		}

		// Loops over all approvals
		for (var approval of approvals) {
			var approvalStage = approvalStages[approval.approval_stage__r__pg_id__c];
			// Error is thrown if approval stage project and entry project don't match
			if (!approvalStage) { return next(new Error('Error creating next approval')); }
			// if there is a next stage (length - 1 because includes stage 0)
			if (approvalStage.stage_number__c < stagesByProject[approvalStage.project__r__pg_id__c].length - 1) {
				// sets the stage number to the next existing stage (prevents app breaking if admin deletes middle stage)
				var nextStageNumber = approvalStage.stage_number__c + 1;
				while (!stagesByProject[approvalStage.project__r__pg_id__c][nextStageNumber]) {
					nextStageNumber++;
				}

				// add a new approval to be created
				newApprovals.push({
					approval_stage__r__pg_id__c: stagesByProject[approvalStage.project__r__pg_id__c][nextStageNumber].pg_id__c,
					entry__r__pg_id__c: approval.entry__r__pg_id__c,
					status__c: constants.status.PENDING
				});
			// otherwise, approve the entry
			} else {
				entryIds.push(approval.entry__r__pg_id__c);
			}
		}
		// init the remainingOperations -- will be either 1 or 2, depending on actions (should never be 0, but an error is caught below just in case)
		var remainingOperations = (newApprovals.length === 0 ? 0 : 1) + (entryIds.length === 0 ? 0 : 1);
		if (!remainingOperations) { return next(new Error('No entries attached to approvals.')); }
		// if there are new approvals, then create them
		if (newApprovals.length) {
			ctx.Model.app.models.tt_entry_approval__c.create(newApprovals, { transaction: ctx.options.transaction }, function(err, createdApproval) {
				if (err) { return next(err); }
				if (--remainingOperations === 0) {
					return next();
				}
			});
		}
		// if entries need to be approved, then approve them
		if (entryIds.length) {
			ctx.Model.app.models.tt_entry__c.updateAll(
				{ pg_id__c: { inq: entryIds } }, 
				{ 
					status__c: constants.status.APPROVED,
					// save status of approving contact when updating entry
					final_approver__r__pg_id__c: approverContactPgID
				}, 
				{ transaction: ctx.options.transaction }, 
				function(err, count) {
					if (err) { return next(err); }
					if (--remainingOperations === 0) {
						return next();
					}
			});
		}
	});
};

module.exports = {
	getPreviousState: getPreviousState,
	updateEntryOrNewApproval: updateEntryOrNewApproval
};