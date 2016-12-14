var constants = require('./utils/constants');
var modelUtils = require('./utils/model-utils');
var contributorServices = require('./services/contributor-c.services');

module.exports = function(Contributorc) {
	/**
	 * Inserts an contributor
	 * @param req - the http request object
	 * @param res - the http response object
	 * @param data - the contributor to be created or found. Must contain contact__c and project__c fields
	 */
	Contributorc.createContributor = function (req, res, data) {
		// Begins transaction to rollback changes if any errors occur
		Contributorc.beginTransaction({ isolationLevel: Contributorc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotCreateContributor, tx);
			}
			contributorServices.createContributor(data, Contributorc, tx, function(err, contributor) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 201, contributor, tx);
			});
		});
	};

	// set the insertContributor function to be called at the url /api/contributors/Contributor
	Contributorc.remoteMethod(
		'createContributor', {
			http: { path: '/contributor', verb: 'post'},
			description: 'Inserts a single project contributor',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } },
				{ arg: 'data', type: 'object', description: 'The project approver object containing contact__c and project__c fields.' }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'The found or created project approver object.' }
			]
	});

	/**
	 * Deletes an contributor
	 * @param pgID - the postgresql id for the contributor object
	 * @param req - the http request object
	 * @param res - the http response object
	 */
	Contributorc.deleteContributor = function (pgID, req, res) {
		// Begins transaction to rollback changes if any errors occur
		Contributorc.beginTransaction({ isolationLevel: Contributorc.Transaction.READ_COMMITTED }, function(err, tx) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, 500, constants.errorMessages.couldNotCreateContributor, tx);
			}
			contributorServices.deleteContributor(pgID, Contributorc, tx, function(err, results) {
				if (err) {
					console.log(err);
					return modelUtils.handleError(res, err.status, err.message, tx);
				}
				return modelUtils.handleSuccess(res, 204, {}, tx);
			});
		});
	};

	// set the deleteContributor function to be called at the url /api/contributor/Contributor/:id
	Contributorc.remoteMethod(
		'deleteContributor', {
			http: { path: '/Contributor/:pgID', verb: 'del'},
			description: 'Deletes a single project contributor',
			accepts: [
				{ arg: 'pgID', type: 'number', required: true, description: 'Postgres Id for project contributor' },
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			]
	});

	// disable out of the box endpoints
	Contributorc.disableRemoteMethod('create', true);
	Contributorc.disableRemoteMethod('upsert', true);
	Contributorc.disableRemoteMethod('updateAll', true);
	Contributorc.disableRemoteMethod('updateAttributes', false);
	
	Contributorc.disableRemoteMethod('find', true);
	Contributorc.disableRemoteMethod('findById', true);
	Contributorc.disableRemoteMethod('findOne', true);
	
	Contributorc.disableRemoteMethod('deleteById', true);
	
	Contributorc.disableRemoteMethod('confirm', true);
	Contributorc.disableRemoteMethod('count', true);
	Contributorc.disableRemoteMethod('exists', true);
	Contributorc.disableRemoteMethod('resetPassword', true);
	Contributorc.disableRemoteMethod('createChangeStream', true);

	Contributorc.disableRemoteMethod('__count__project', false);
	Contributorc.disableRemoteMethod('__create__project', false);
	Contributorc.disableRemoteMethod('__delete__project', false);
	Contributorc.disableRemoteMethod('__destroyById__project', false);
	Contributorc.disableRemoteMethod('__findById__project', false);
	Contributorc.disableRemoteMethod('__get__project', false);
	Contributorc.disableRemoteMethod('__updateById__project', false);
};
