// model-related utility functions
var modelUtils = require('./utils/model-utils');
var constants = require('./utils/constants');
// service methods related to projects
var projectServices = require('./services/project-c.services');

module.exports = function(Projectc) {
	/**
	 * Gets all approver projects as a map
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Projectc.getApproverProjectMap = function(req, res) {
		projectServices.getApproverProjectMap(req.headers.authorization, Projectc, null, function(err, projectMap) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, projectMap);
		});
	};

	// set the getApproverProjectMap to be called at the url /api/projects/myApproverProjects
	Projectc.remoteMethod(
		'getApproverProjectMap', {
			http: { path: '/myApproverProjectsMap', verb: 'get' },
			description: 'Return all projects that an approver is assigned to as a map.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'Map of all projects that the logged in user is a contributor for.' }
			]
	});

	/**
	 * Returns all projects as a map, adding an additional contributor flag indicating whether or not the logged in user is a contributor for each project
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Projectc.getContributorProjectMap = function(req, res) {
		projectServices.getContributorProjectMap(req.headers.authorization, Projectc, null, function(err, projectMap) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, projectMap);
		});
	};

	// set the getContributorProjectMap to be called at the url /api/projects/myContributorProjects
	Projectc.remoteMethod(
		'getContributorProjectMap', {
			http: { path: '/myContributorProjectsMap', verb: 'get' },
			description: 'Return all projects that an approver is assigned',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'Map of pg ids to projects, with each project having a boolean flag indicating whether or not the calling user is a contributor' }
			]
	});

	/**
	 * Retrieves a map of all projects
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Projectc.getProjectMap = function(req, res) {
		projectServices.getProjectMap(Projectc, null, function(err, projectMap) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, projectMap);
		});
	};

	// sets the getProjectMap method to be called at the url /api/projects/ProjectMap
	Projectc.remoteMethod(
		'getProjectMap', {
			http: { path: '/ProjectMap', verb: 'get'},
			description: 'Return all projects',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object' }
			]
	});

	/**
	 * Gets the details for a single project
	 * @param pgId - the postgres id the of the project to retrieve details for
	 * @param req - the http request object
	 * @param res - the http response
	 */
	Projectc.getProjectDetails = function(pgID, req, res) {
		projectServices.getProjectDetails(pgID, Projectc, null, function(err, details) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, details);
		});
	};

	// set the getProjectDetails method to be called at the url /api/projects/details/:pgID
	Projectc.remoteMethod(
		'getProjectDetails', {
			http: { path: '/details/:pgID', verb: 'get'},
			description: 'Returns project details for adminstration',
			accepts: [
				{ arg: 'pgID', type: 'string', required: true, description: 'The postgres id for the project to retrieve details for.'},
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'Project containing attached contributors and approval stages.' }
			]
	});

	/**
	 * Creates or updates a project
	 * @param req - the http request object
	 * @param res - the http response object
	 * @param data - data containing a new or updated project
	 */
	Projectc.upsertProject = function(req, res, data) {
		Projectc.beginTransaction({ isolationLevel: Projectc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotUpsertProject, tx);
			}
			projectServices.upsertProject(data, Projectc, tx, function(err, project) {
				if (err) {
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 200, project, tx);
			});
		});
	};

	Projectc.remoteMethod(
		'upsertProject', {
			http: { path: '/project', verb: 'put'},
			description: 'Creates or updates a project.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
				{ arg: 'data', type: 'object', description: 'Object containing the new or updated Project.'}
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'New or upated project.' }
			]
	});

	/**
	 * Deactivates a project and deletes all associated contributors, approvers, and approvals
	 * @param pgID - the postgres id of the project to deactivate 
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Projectc.deactivateProject = function(pgID, req, res) {
		Projectc.beginTransaction({ isolationLevel: Projectc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotUpsertProject, tx);
			}
			projectServices.deactivateProject(pgID, Projectc, tx, function(err, results) {
				if (err) {
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 200, {}, tx);
			});
		});
	};

	// set the deactivateProject method to be called at the url /api/projects/:pgID/deactivate
	Projectc.remoteMethod(
		'deactivateProject', {
			http: { path: '/:pgID/deactivate', verb: 'post'},
			description: 'Deactivates a project add deletes all associated contributors.',
			accepts: [
				{ arg: 'pgID', type: 'number', description: 'Postgres ID of the project to deactivate.'},
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'empty object' }
			]
	});

	// disable out of the box endpoints
	Projectc.disableRemoteMethod('create', true);
	Projectc.disableRemoteMethod('upsert', true);
	Projectc.disableRemoteMethod('updateAll', true);
	Projectc.disableRemoteMethod('updateAttributes', false);
	
	Projectc.disableRemoteMethod('find', true);
	Projectc.disableRemoteMethod('findById', true);
	Projectc.disableRemoteMethod('findOne', true);
	
	Projectc.disableRemoteMethod('deleteById', true);
	
	Projectc.disableRemoteMethod('confirm', true);
	Projectc.disableRemoteMethod('count', true);
	Projectc.disableRemoteMethod('exists', true);
	Projectc.disableRemoteMethod('resetPassword', true);
	Projectc.disableRemoteMethod('createChangeStream', true);

	Projectc.disableRemoteMethod('__count__account', false);
	Projectc.disableRemoteMethod('__create__account', false);
	Projectc.disableRemoteMethod('__delete__account', false);
	Projectc.disableRemoteMethod('__destroyById__account', false);
	Projectc.disableRemoteMethod('__findById__account', false);
	Projectc.disableRemoteMethod('__get__account', false);
	Projectc.disableRemoteMethod('__updateById__account', false);

	Projectc.disableRemoteMethod('__count__approvalStages', false);
	Projectc.disableRemoteMethod('__create__approvalStages', false);
	Projectc.disableRemoteMethod('__delete__approvalStages', false);
	Projectc.disableRemoteMethod('__destroyById__approvalStages', false);
	Projectc.disableRemoteMethod('__findById__approvalStages', false);
	Projectc.disableRemoteMethod('__get__approvalStages', false);
	Projectc.disableRemoteMethod('__updateById__approvalStages', false);

	Projectc.disableRemoteMethod('__count__contributors', false);
	Projectc.disableRemoteMethod('__create__contributors', false);
	Projectc.disableRemoteMethod('__delete__contributors', false);
	Projectc.disableRemoteMethod('__destroyById__contributors', false);
	Projectc.disableRemoteMethod('__findById__contributors', false);
	Projectc.disableRemoteMethod('__get__contributors', false);
	Projectc.disableRemoteMethod('__updateById__contributors', false);
};
