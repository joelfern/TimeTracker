// import utilities methods for working with models
var modelUtils = require('./utils/model-utils');
// server wide constants for status and error messages
var constants = require('./utils/constants');
// timesheet endpoints module
var timesheetServices= require('./services/timesheet-c.services');
// timesheet operation hooks module
var timesheetHooks = require('./hooks/timesheet-c.hooks');

module.exports = function(Timesheetc) {
	
	/**
	 * Endpoint for retrieving a timesheet for the currently logged in user
	 * @param pgID - the postgresql ID for the timesheet to be retrieved -- current weeks timesheet if no value provided
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Timesheetc.getMyTimesheet = function(pgID, req, res) {
		timesheetServices.getMyTimesheet(pgID, req.headers.authorization, Timesheetc, null, function(err, timesheet) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, timesheet);
		});
	};

	// Set the getMyTimesheet so it can be accessed at the url /api/timesheets/myTimesheet/:pgID
	Timesheetc.remoteMethod(
		'getMyTimesheet', {
			http: { path: '/myTimesheet/:pgID', verb: 'get' },
			description: 'Returns all information for a single timesheet that belongs to the calling user.',
			accepts: [
				{ arg: 'pgID', type: 'string', required: false, description: 'The postgres id for the timesheet to be retrieved. No id means get current timesheet.' },
				{ arg: 'req', type: 'object', http: { source:'req' } },
				{ arg: 'res', type: 'object', http: { source:'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'Object containing a single timesheet object, and a list of associated entry objects.' }
			]
	});

	/**
	 * Retrieves all of the timesheets for the logged in user
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Timesheetc.getMyTimesheets = function(req, res) {
		timesheetServices.getMyTimesheets(req.headers.authorization, Timesheetc, null, function(err, timesheets) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, timesheets);
		});
	};

	// set the getMyTimesheets function to be called at the api endpoint /api/timesheets/myTimesheets
	Timesheetc.remoteMethod(
		'getMyTimesheets', {
			http: { path: '/myTimesheets', verb: 'get' },
			description: 'Return all timesheets for the logged in user.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source:'req' } },
				{ arg: 'res', type: 'object', http: { source:'res' } }
			],
			returns: [
				{ arg: 'data', type: 'array', description: 'List of all timesheets for the logged in user' }
			]
	});

	/**
	 * Endpoint for creating a new timesheet for hte current week 
	 * @param req - the http request object
	 * @param res - the http response
	 */
	Timesheetc.createCurrentTimesheet = function(req, res) {
		// begin the transaction so we can roll back in case something breaks
		Timesheetc.beginTransaction({ isolationLevel: Timesheetc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotCreateTimesheet, tx);
			}
			// create a timesheet for the new week based off the currently logged in user
			timesheetServices.createCurrentTimesheet(req.headers.authorization, Timesheetc, tx, function(err, newTimesheet) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 201, newTimesheet, tx);
			});
		});
	};

	// Set the createCurrentTimesheet method to be called at the url /api/timesheets/myTimesheet/current/create
	Timesheetc.remoteMethod(
		'createCurrentTimesheet', {
			http: { path: '/myTimesheet/current/create', verb: 'post' },
			description: 'Creates a new timesheet for the current week.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source:'req' } },
				{ arg: 'res', type: 'object', http: { source:'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'The single created timesheet.' }
			]
	});

	/**
	 * Endpoint for submitting a timesheet
	 * @param pgId - the postgres id for the timesheet to be submitted
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Timesheetc.submitMyTimesheet = function(pgID, req, res) {
		// begin the transaction so we can roll back in case something breaks
		Timesheetc.beginTransaction({ isolationLevel: Timesheetc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotSubmitTimesheet, tx);
			}
			// submit the timesheet
			timesheetServices.submitMyTimesheet(pgID, req.headers.authorization, Timesheetc, tx, function(err, updatedTimesheet) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx); 
				}
				return modelUtils.handleSuccess(res, 200, updatedTimesheet, tx);
			});
		});
	};

	// set the submitMyTimesheet method to be called at the url /api/timesheets/myTimesheet/:tid/submit
	Timesheetc.remoteMethod(
		'submitMyTimesheet', {
			http: { path: '/myTimesheet/:pgID/submit', verb: 'post' },
			description: 'Submits a timesheet, and updates all of the child entries to submitted',
			accepts: [
				{ arg: 'pgID', type: 'number', required: true , description: 'The PostgreSQL id for the timesheet to be submitted' },
				{ arg: 'req', type: 'object', http: { source:'req' } },
				{ arg: 'res', type: 'object', http: { source:'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'The submitted timesheet.' }
			]
	});

	// Before hook to store the previous state of the records operating on as both a map and a list
	Timesheetc.observe('before save', timesheetHooks.getPreviousState);
	// Before hook to validate that the entries for a submitted timesheets all have end times
	Timesheetc.observe('before save', timesheetHooks.checkEntryEndTimes);

	// After hook that sets the status of all attached, non-approved entries to submitted
	Timesheetc.observe('after save', timesheetHooks.submitEntries);
	// After hook that sends an email to users with timesheets that have had their status set to Needs Attention
	Timesheetc.observe('after save', timesheetHooks.sendEmailIfNeedsAttention);
	
	// disable out of the box endpoints
	Timesheetc.disableRemoteMethod('create', true);
	Timesheetc.disableRemoteMethod('upsert', true);
	Timesheetc.disableRemoteMethod('updateAll', true);
	Timesheetc.disableRemoteMethod('updateAttributes', false);
	
	Timesheetc.disableRemoteMethod('find', true);
	Timesheetc.disableRemoteMethod('findById', true);
	Timesheetc.disableRemoteMethod('findOne', true);
	
	Timesheetc.disableRemoteMethod('deleteById', true);
	
	Timesheetc.disableRemoteMethod('confirm', true);
	Timesheetc.disableRemoteMethod('count', true);
	Timesheetc.disableRemoteMethod('exists', true);
	Timesheetc.disableRemoteMethod('resetPassword', true);
	Timesheetc.disableRemoteMethod('createChangeStream', true);

	Timesheetc.disableRemoteMethod('__count__employee', false);
	Timesheetc.disableRemoteMethod('__create__employee', false);
	Timesheetc.disableRemoteMethod('__delete__employee', false);
	Timesheetc.disableRemoteMethod('__destroyById__employee', false);
	Timesheetc.disableRemoteMethod('__findById__employee', false);
	Timesheetc.disableRemoteMethod('__get__employee', false);
	Timesheetc.disableRemoteMethod('__updateById__employee', false);

	Timesheetc.disableRemoteMethod('__count__entries', false);
	Timesheetc.disableRemoteMethod('__create__entries', false);
	Timesheetc.disableRemoteMethod('__delete__entries', false);
	Timesheetc.disableRemoteMethod('__destroyById__entries', false);
	Timesheetc.disableRemoteMethod('__findById__entries', false);
	Timesheetc.disableRemoteMethod('__get__entries', false);
	Timesheetc.disableRemoteMethod('__updateById__entries', false);
};
