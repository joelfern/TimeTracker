/**
 * Services module for before and after hooks used in the entry-approval-c.js file
 */
// server wide constants for status and error messages
var constants = require('../utils/constants');

/**
 * Deletes the entry approvals and project approvers associated with the deleted approval stages
 * @param ctx - the loopback context object
 * @param next - the node next funtion
 */
var cascadeDelete = function(ctx, next) {
	// retrieve the approval stages that are being deleted
	ctx.Model.app.models.tt_approval_stage__c.find({ where: ctx.where }, { transaction: ctx.options.transaction }, function(err, stages) {
		if (err) { next(err); }
		// collect the ids of the stages
		var stageIds = [];
		for (var stage of stages) {
			stageIds.push(stage.pg_id__c);
		}
		// 2 async operations need to take place
		var remainingOperations = 2;
		// handler for determining whether to return or not
		var handleResults = function(err, results) {
			if (err) { return next(err); }
			if (--remainingOperations === 0) {
				return next();
			}
		}
		// delete any existing  approvers
		ctx.Model.app.models.tt_approver__c.destroyAll({ approval_stage__r__pg_id__c: { inq: stageIds } }, { transaction: ctx.options.transaction }, handleResults);
		// delete any existing approvals
		ctx.Model.app.models.tt_entry_approval__c.destroyAll({ approval_stage__r__pg_id__c: { inq: stageIds } }, { transaction: ctx.options.transaction }, handleResults);
	});
};

module.exports = {
	cascadeDelete: cascadeDelete
};