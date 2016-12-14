// import error handling and commit handling
var modelUtils = require('./utils/model-utils');
// server wide constants
var constants = require('./utils/constants');
var accountServices = require('./services/account.services');

module.exports = function(Account) {
	/**
	 * Retrieves all accounts as a map
	 * @param req - the http request object 
	 * @param res - the http response object
	 */
	Account.getAccountMap = function(req, res) {
		accountServices.getAccountMap(Account, null, function(err, accountMap) {
			if (err) {
				console.log(err);
				return modelUtils.handleError(res, err.status, err.message);
			}
			return modelUtils.handleSuccess(res, 200, accountMap);
		})
	};

	/**
	 * Registers the getAccountsMap method
	 */
	Account.remoteMethod(
		'getAccountMap', {
			http: { path: '/accountMap', verb: 'get' },
			description: 'Return all accounts as a map.',
			accepts: [
				{ arg: 'req', type: 'object', http: { source: 'req' } },
				{ arg: 'res', type: 'object', http: { source: 'res' } }
			],
			returns: [
				{ arg: 'data', type: 'object', description: 'Map of all sfids to accounts.' }
			]
	});

	// disable out of the box endpoints
	Account.disableRemoteMethod('create', true);
	Account.disableRemoteMethod('upsert', true);
	Account.disableRemoteMethod('updateAll', true);
	Account.disableRemoteMethod('updateAttributes', false);
	
	Account.disableRemoteMethod('find', true);
	Account.disableRemoteMethod('findById', true);
	Account.disableRemoteMethod('findOne', true);
	
	Account.disableRemoteMethod('deleteById', true);
	
	Account.disableRemoteMethod('confirm', true);
	Account.disableRemoteMethod('count', true);
	Account.disableRemoteMethod('exists', true);
	Account.disableRemoteMethod('resetPassword', true);
	Account.disableRemoteMethod('createChangeStream', true);

	Account.disableRemoteMethod('__count__projects', false);
	Account.disableRemoteMethod('__create__projects', false);
	Account.disableRemoteMethod('__delete__projects', false);
	Account.disableRemoteMethod('__destroyById__projects', false);
	Account.disableRemoteMethod('__findById__projects', false);
	Account.disableRemoteMethod('__get__projects', false);
	Account.disableRemoteMethod('__updateById__projects', false);
};