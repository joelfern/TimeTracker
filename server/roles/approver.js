// initializes the approver role within the app
module.exports = function ( app, callback ) {
	// Create a new approver role if one does not already exist
	app.models.Role.findOrCreate(
		// filter fields for finding the role
		{
			fields: {
				id: true
			},
			limit: 1,
			where: {
				name: 'approver'
			}
		},
		// values for what to set if the role does not exist
		{
			name: 'approver',
			description: 'Project approver'
		},
		function ( err, approver, created ) {
			// there was an error finding or creating the role. Log and stop execution of the function
			if ( err ) {
				return console.log( err );
			}
			// if the role was created and not found
			if ( created ) {
				// notify via log
				console.log( 'Approver role not found, was created.' );
			} else {
				console.log( 'Approver role found.' );
			}
		}
	);
};