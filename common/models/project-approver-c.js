// import functions for working with db models
var modelUtils = require('./utils/model-utils');
// app wide constants
var constants = require('./utils/constants');
// import functions for working with project approvers
var approverServices = require('./services/project-approver-c.services');

module.exports = function(Approverc) {
	/**
	 * Creates a new approver
	 * @param stageID - the postgres id for the the approval stage to insert for
	 * @param req - the http request object
	 * @param res - the http response object
	 * @param data - payload containing the contact and optional approval stage id
	 */
	Approverc.createApprover = function(pgID, req, res, data) {
		// begin the transaction so we can roll back in case something breaks
		Approverc.beginTransaction({ isolationLevel: Approverc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotCreateApprover, tx);
			}
			approverServices.createApprover(pgID, data, Approverc, tx, function(err, approver) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 201, approver, tx);
			});
		});
	};

	// set the insertApprover function to be called at the url /api/projectapprovers/ProjectApprover/:stageId
	Approverc.remoteMethod(
		'createApprover', {
			http: { path: '/projectApprover/:pgID', verb: 'post'},
			description: 'Inserts a single project approver',
			accepts: [
				{ arg: 'pgID', type: 'number', description: 'Approval stage Postgres id'},
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
				{ arg: 'data', type: 'object', description: 'Object containing a contact__r__pg_id__c and optional approval_stage__r__pg_id__c fields'}
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'The new project approver object.' }
			]
	});

	Approverc.deleteApprover = function(pgID, req, res) {
		// begin the transaction so we can roll back in case something breaks
		Approverc.beginTransaction({ isolationLevel: Approverc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotCreateApprover, tx);
			}
			approverServices.deleteApprover(pgID, Approverc, tx, function(err, approver) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 204, {}, tx);
			});
		});
	};

	// set the deleteApprover function to be called at the url /api/projectapprovers/ProjectApprover/:id
	Approverc.remoteMethod(
		'deleteApprover', {
			http: { path: '/projectApprover/:pgID', verb: 'del'},
			description: 'Deletes a single project approver',
			accepts: [
				{ arg: 'pgID', type: 'number', required: true, description: 'Postgres Id for project approver' },
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			]
	});
	
	// disable out of the box endpoints
	Approverc.disableRemoteMethod('create', true);
	Approverc.disableRemoteMethod('upsert', true);
	Approverc.disableRemoteMethod('updateAll', true);
	Approverc.disableRemoteMethod('updateAttributes', false);
	
	Approverc.disableRemoteMethod('find', true);
	Approverc.disableRemoteMethod('findById', true);
	Approverc.disableRemoteMethod('findOne', true);
	
	Approverc.disableRemoteMethod('deleteById', true);
	
	Approverc.disableRemoteMethod('confirm', true);
	Approverc.disableRemoteMethod('count', true);
	Approverc.disableRemoteMethod('exists', true);
	Approverc.disableRemoteMethod('resetPassword', true);
	Approverc.disableRemoteMethod('createChangeStream', true);

	Approverc.disableRemoteMethod('__count__approvalStage', false);
	Approverc.disableRemoteMethod('__create__approvalStage', false);
	Approverc.disableRemoteMethod('__delete__approvalStage', false);
	Approverc.disableRemoteMethod('__destroyById__approvalStage', false);
	Approverc.disableRemoteMethod('__findById__approvalStage', false);
	Approverc.disableRemoteMethod('__get__approvalStage', false);
	Approverc.disableRemoteMethod('__updateById__approvalStage', false);
};
