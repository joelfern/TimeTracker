// import model related utility functions
var modelUtils = require('./utils/model-utils');
// server wide constants for status and error messages
var constants = require('./utils/constants');
// entry hooks service
var entryHooks = require('./hooks/entry-c.hooks');
// entry services
var entryServices = require('./services/entry-c.services');

module.exports = function(Entryc) {

	/**
	 * Upserts an entry pulled in from request body
	 * @param req - the http request object
	 * @param res - the http response object
	 * @param data - the payload containing a new or updated entry
	 */
	Entryc.upsertEntry = function(req, res, data) {
		Entryc.beginTransaction({ isolationLevel: Entryc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotUpsertEntry);
			}
			entryServices.upsertEntry(data, req.headers.authorization, Entryc, tx, function(err, entry) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 200, entry, tx);
			});
		});
	};

	// sets the upsertEntry function to be called at the url /api/entries/entry
	Entryc.remoteMethod(
		'upsertEntry', {
			http: { path: '/entry', verb: 'put' },
			description: 'Upserts a single Entry',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
				{ arg: 'data', type: 'object', description: 'The entry to be created/updated.' }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'The created/updated entry.' }
			]
	});

	/**
	 * Deletes an entry
	 * @param pgID - the postgres id of the entry to be deleted
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Entryc.deleteEntry = function(pgID, req, res) {
		Entryc.beginTransaction({ isolationLevel: Entryc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotUpsertEntry);
			}
			entryServices.deleteEntry(pgID, req.headers.authorization, Entryc, tx, function(err, entry) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 204, {}, tx);
			});
		});
	};

	// sets the deleteEntry function to be called at the url /api/entries/Entry/:eid
	Entryc.remoteMethod(
		'deleteEntry', {
			http: { path: '/entry/:pgID', verb: 'del' },
			description: 'Deletes a single entry',
			accepts: [
				{ arg: 'pgID', type: 'number', required: true, description: 'The PostgreSQL ID of the entry to be deleted.' },
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
			],
			returns: []
	});

	/** 
	 * Returns the approval history for an entry
	 * @param pgID - the postgres id for the entry
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Entryc.getHistory = function(pgID, req, res) {
		entryServices.getHistory(pgID, Entryc, null, function(err, approvals) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, approvals);
		});
	};

	// sets the getHistory function to be called at the url /api/entries/:pgID/approvalHistory
	Entryc.remoteMethod(
		'getHistory', {
			http: { path: '/:pgID/approvalHistory', verb: 'get' },
			description: 'Retrieves approval history for a single entry',
			accepts: [
				{ arg: 'pgID', type: 'string', required: true, description: 'The postgres ID for the entry to have approvals retrieved for' },
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'Map of entry approvals with attached approval stages and approvers.' }
			]
	});

	// Before hook to get the previous state of the entries
	Entryc.observe('before save', entryHooks.getPreviousState);
	// Before hook for verifying that entry start times are strictly before entry end times
	Entryc.observe('before save', entryHooks.validateStartAndEndTime);
	// Before hook for verifying that no entries on a single timesheet overlap
	Entryc.observe('before save', entryHooks.validateNoOverlap);

	// After hook for updating timesheets based on entry changes
	Entryc.observe('after save', entryHooks.handleChanges);
	// After hook for creating the first stage entry approvals when an entry is submitted
	Entryc.observe('after save', entryHooks.startApprovalProcess);

	// disable out of the box endpoints
	Entryc.disableRemoteMethod('create', true);
	Entryc.disableRemoteMethod('upsert', true);
	Entryc.disableRemoteMethod('updateAll', true);
	Entryc.disableRemoteMethod('updateAttributes', false);
	
	Entryc.disableRemoteMethod('find', true);
	Entryc.disableRemoteMethod('findById', true);
	Entryc.disableRemoteMethod('findOne', true);
	
	Entryc.disableRemoteMethod('deleteById', true);
	
	Entryc.disableRemoteMethod('confirm', true);
	Entryc.disableRemoteMethod('count', true);
	Entryc.disableRemoteMethod('exists', true);
	Entryc.disableRemoteMethod('resetPassword', true);
	Entryc.disableRemoteMethod('createChangeStream', true);

	Entryc.disableRemoteMethod('__count__approvals', false);
	Entryc.disableRemoteMethod('__create__approvals', false);
	Entryc.disableRemoteMethod('__delete__approvals', false);
	Entryc.disableRemoteMethod('__destroyById__approvals', false);
	Entryc.disableRemoteMethod('__findById__approvals', false);
	Entryc.disableRemoteMethod('__get__approvals', false);
	Entryc.disableRemoteMethod('__updateById__approvals', false);

	Entryc.disableRemoteMethod('__count__timesheet', false);
	Entryc.disableRemoteMethod('__create__timesheet', false);
	Entryc.disableRemoteMethod('__delete__timesheet', false);
	Entryc.disableRemoteMethod('__destroyById__timesheet', false);
	Entryc.disableRemoteMethod('__findById__timesheet', false);
	Entryc.disableRemoteMethod('__get__timesheet', false);
	Entryc.disableRemoteMethod('__updateById__timesheet', false);
};
