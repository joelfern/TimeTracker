var connect = require( '../connect/index' );

module.exports = function discoverHerokuConnectDB( app ) {
	//Primary Key management for Heroku Connect
	connect( app );
};
