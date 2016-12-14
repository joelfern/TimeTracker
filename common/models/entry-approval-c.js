// utility functions for model operations
var modelUtils = require('./utils/model-utils');
// server wide constants for status and error messages
var constants = require('./utils/constants');
// hooks service
var entryApprovalHooks = require('./hooks/entry-approval-c.hooks');
// service methods for use in the endpoints
var entryApprovalServices = require('./services/entry-approval-c.services');

module.exports = function(Entryapprovalc) {

	/**
	 * Retrieves all entry approvals for the logged in user
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Entryapprovalc.getMyEntryApprovals = function(req, res) {
		entryApprovalServices.getMyEntryApprovals(req.headers.authorization, Entryapprovalc, null, function(err, approvals) {
			if (err) {
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, approvals);
		});
	};

	// set the getMyEntryApprovals function to be called at the url /api/entryapprovals/myEntryApprovals
	Entryapprovalc.remoteMethod(
		'getMyEntryApprovals', {
			http: { path: '/myEntryApprovals', verb: 'get' },
			description: 'Return all entry approvals for the logged in user.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'return all entry approvals for the approver, as well as employee and timesheet information if the approver is not external.' }
			]
	});

	/**
	 * Updates approvals to the provided status
	 * @param req - the http request object
	 * @param res - the http response object
	 * @param data - object containing the where clause for approvals and the status to update to
	 */
	Entryapprovalc.updateMyEntryApprovals = function(req, res, data) {
		// begin the transaction -- read committed isolation level to prevent race conditions when writing
		Entryapprovalc.beginTransaction({ isolationLevel: Entryapprovalc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) { 
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotUpdateApprovals, tx); 
			}
			entryApprovalServices.updateMyEntryApprovals(data, req.headers.authorization, Entryapprovalc, tx, function(err, results) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				modelUtils.handleSuccess(res, 200, results, tx);
			});
		});
	};

	// set the updateMyEntryApprovals function to be called at the url /api/entryapprovals/myEntryApprovals/update
	Entryapprovalc.remoteMethod(
		'updateMyEntryApprovals', {
			http: { path: '/myEntryApprovals/update', verb: 'post' },
			description: 'updates a list of entry approvals.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
				{ arg: 'data', type: 'object', description: 'Object containing a where clause and values to be changed for updateAll.' }
			],
			returns: []
	});

	// before hooks
	Entryapprovalc.observe('before save', entryApprovalHooks.getPreviousState);

	// after hooks
	Entryapprovalc.observe('after save', entryApprovalHooks.updateEntryOrNewApproval);

	// disable out of the box endpoints
	Entryapprovalc.disableRemoteMethod('create', true);
	Entryapprovalc.disableRemoteMethod('upsert', true);
	Entryapprovalc.disableRemoteMethod('updateAll', true);
	Entryapprovalc.disableRemoteMethod('updateAttributes', false);
	
	Entryapprovalc.disableRemoteMethod('find', true);
	Entryapprovalc.disableRemoteMethod('findById', true);
	Entryapprovalc.disableRemoteMethod('findOne', true);
	
	Entryapprovalc.disableRemoteMethod('deleteById', true);
	
	Entryapprovalc.disableRemoteMethod('confirm', true);
	Entryapprovalc.disableRemoteMethod('count', true);
	Entryapprovalc.disableRemoteMethod('exists', true);
	Entryapprovalc.disableRemoteMethod('resetPassword', true);
	Entryapprovalc.disableRemoteMethod('createChangeStream', true);

	Entryapprovalc.disableRemoteMethod('__count__approvalStage', false);
	Entryapprovalc.disableRemoteMethod('__create__approvalStage', false);
	Entryapprovalc.disableRemoteMethod('__delete__approvalStage', false);
	Entryapprovalc.disableRemoteMethod('__destroyById__approvalStage', false);
	Entryapprovalc.disableRemoteMethod('__findById__approvalStage', false);
	Entryapprovalc.disableRemoteMethod('__get__approvalStage', false);
	Entryapprovalc.disableRemoteMethod('__updateById__approvalStage', false);

	Entryapprovalc.disableRemoteMethod('__count__entry', false);
	Entryapprovalc.disableRemoteMethod('__create__entry', false);
	Entryapprovalc.disableRemoteMethod('__delete__entry', false);
	Entryapprovalc.disableRemoteMethod('__destroyById__entry', false);
	Entryapprovalc.disableRemoteMethod('__findById__entry', false);
	Entryapprovalc.disableRemoteMethod('__get__entry', false);
	Entryapprovalc.disableRemoteMethod('__updateById__entry', false);
};
