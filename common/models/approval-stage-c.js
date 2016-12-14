// import error handling and commit handling
var modelUtils = require('./utils/model-utils');
// server wide constants
var constants = require('./utils/constants');
var approvalStageServices = require('./services/approval-stage-c.services');
var approvalStageHooks = require('./hooks/approval-stage-c.hooks');

module.exports = function(Approvalstagec) {
	/**
	 * Returns a map of approval stage ids to approval stages
	 * @param req - the http request object
	 * @param res - the http response object
	 * @param where - the where clause for filtering which approval stages to get
	 */
	Approvalstagec.getApprovalStageMap = function (req, res, where) {
		approvalStageServices.getApprovalStageMap(where, Approvalstagec, null, function(err, stageMap) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, stageMap);
		});
	};
	
	// set the getApprovalStageMap function to be called at the url /api/approvalstages/ApprovalStageMap
	Approvalstagec.remoteMethod(
		'getApprovalStageMap', {
			http: { path: '/approvalStageMap', verb: 'get' },
			description: 'returns a map of pg IDs to approval stages.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
				{ arg: 'where', type: 'object', description: 'Where clause for filtering approval stages.' }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'Map of sfids to approval stages.' }
			]
	});

	/**
	 * Method that deletes all existing stages, creates all current stages,
	 * deletes all approvals for project, sets all entries that are not approved
	 * back to open to be resubmitted
	 * @param req - the http request object
	 * @param res - the http response object
	 * @param reqData - data object containing a project and stages
	 */
	Approvalstagec.setApprovalStages = function (req, res, reqData) {
		// Begins transaction to be used in rolling back changes if any database opperation fails
		Approvalstagec.beginTransaction({ isolationLevel: Approvalstagec.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotSetApprovalStages, tx);
			}
			approvalStageServices.setApprovalStages(reqData, Approvalstagec, tx, function(err, updatedStages) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 200, updatedStages, tx);
			});
		});
	};

	// set the setApprovalStages function to be called at the url /api/approvalstages/setStages
	Approvalstagec.remoteMethod(
		'setApprovalStages', {
			http: { path: '/setStages', verb: 'post' },
			description: 'Sets stages for a project from an array of approval stages.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
				{ arg: 'data', type: 'object', description: 'An object containing a project property (sfid) and a stages property (ordered array of stage objects)'}
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'List of updated approval stages.' }
			]
	});

	/**
	 * Method to update only display names for approval stages
	 * @param req - the http request object
	 * @param res - the http response object
	 * @param stages - array of approval stage objects containing only id and display_name__c
	 */
	Approvalstagec.setApprovalStageNames = function (req, res, stages) {
		// Begins transaction to be used in rolling back changes if any database opperation fails
		Approvalstagec.beginTransaction({ isolationLevel: Approvalstagec.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.couldNotSetApprovalStageNames, tx);
			}
			approvalStageServices.setApprovalStageNames(stages, Approvalstagec, tx, function(err, updatedStages) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 200, updatedStages, tx);
			});
		});
	};

	/**
	 * Registers the setApprovalStageNames method at path /display_name__c
	 */
	Approvalstagec.remoteMethod(
		'setApprovalStageNames', {
			http: { path: '/display_name__c', verb: 'post' },
			description: 'Updates stages from an array of stages with only id and display names',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
				{ arg: 'data', type: 'object', description: 'An array of approval stages that only have id and display_name__c'}
			],
			returns: [
				{ arg: 'data', type: 'array', description: 'List of updated approval stages.' }
			]
	});

	Approvalstagec.observe('before delete', approvalStageHooks.cascadeDelete);

	// disable out of the box endpoints
	Approvalstagec.disableRemoteMethod('create', true);
	Approvalstagec.disableRemoteMethod('upsert', true);
	Approvalstagec.disableRemoteMethod('updateAll', true);
	Approvalstagec.disableRemoteMethod('updateAttributes', false);
	
	Approvalstagec.disableRemoteMethod('find', true);
	Approvalstagec.disableRemoteMethod('findById', true);
	Approvalstagec.disableRemoteMethod('findOne', true);
	
	Approvalstagec.disableRemoteMethod('deleteById', true);
	
	Approvalstagec.disableRemoteMethod('confirm', true);
	Approvalstagec.disableRemoteMethod('count', true);
	Approvalstagec.disableRemoteMethod('exists', true);
	Approvalstagec.disableRemoteMethod('resetPassword', true);
	Approvalstagec.disableRemoteMethod('createChangeStream', true);

	Approvalstagec.disableRemoteMethod('__count__approvals', false);
	Approvalstagec.disableRemoteMethod('__create__approvals', false);
	Approvalstagec.disableRemoteMethod('__delete__approvals', false);
	Approvalstagec.disableRemoteMethod('__destroyById__approvals', false);
	Approvalstagec.disableRemoteMethod('__findById__approvals', false);
	Approvalstagec.disableRemoteMethod('__get__approvals', false);
	Approvalstagec.disableRemoteMethod('__updateById__approvals', false);

	Approvalstagec.disableRemoteMethod('__count__approvers', false);
	Approvalstagec.disableRemoteMethod('__create__approvers', false);
	Approvalstagec.disableRemoteMethod('__delete__approvers', false);
	Approvalstagec.disableRemoteMethod('__destroyById__approvers', false);
	Approvalstagec.disableRemoteMethod('__findById__approvers', false);
	Approvalstagec.disableRemoteMethod('__get__approvers', false);
	Approvalstagec.disableRemoteMethod('__updateById__approvers', false);

	Approvalstagec.disableRemoteMethod('__count__project', false);
	Approvalstagec.disableRemoteMethod('__create__project', false);
	Approvalstagec.disableRemoteMethod('__delete__project', false);
	Approvalstagec.disableRemoteMethod('__destroyById__project', false);
	Approvalstagec.disableRemoteMethod('__findById__project', false);
	Approvalstagec.disableRemoteMethod('__get__project', false);
	Approvalstagec.disableRemoteMethod('__updateById__project', false);
};
