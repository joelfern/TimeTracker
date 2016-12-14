var model = require( './model' );

module.exports = function ( app ) {
	// all of the tables that need to be configured should be added here
	var modelNames = [ 'contact', 'account', 'tt_approval_stage__c', 'tt_approver__c', 
					   'tt_contributor__c', 'tt_entry__c', 'tt_entry_approval__c', 
					   'tt_project__c', 'tt_timesheet__c' ];
	// go through all of them and configure if necessary
	for ( var i = 0; i < modelNames.length; i++ ) {
		model( app, modelNames[ i ] );
	}
};
