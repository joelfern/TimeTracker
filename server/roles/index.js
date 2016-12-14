var admin = require( './admin' );
var contributor = require('./contributor');
var approver = require('./approver');

module.exports = function configRoles( app ) {
	//Configure all pre-defined App Roles
	admin( app ); //Configure Admin Role
	// Configure the contributor Role
	contributor( app );
	// Configure the approver Role
	approver ( app );
};
