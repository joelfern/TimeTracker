// Location for all constants widely used through out the app

// all error message related constants
const errorMessages = {
// error text for when a user is not logged in
	notLoggedIn: 'Unauthorized. Please log in',
	// error text for when a user has an invalid access token
	invalidAccessToken: 'Could not find authorization token.',
	// error text for when an end user can not be found for an access token
	endUserNotFound: 'End user could not be retrieved.',
	// generic error text for when a timesheet could not be retrieved
	couldNotGetTimesheet: 'Could not retrieve timesheet(s).',
	// error text for multiple timesheets for the same week
	multipleTimesheetsForWeek: 'Multiple timesheets for queried week.',
	// generic error text for when a timesheet could not be created
	couldNotCreateTimesheet: 'Could not create timesheet.',
	// generic error text for when a timesheet could not be submitted
	couldNotSubmitTimesheet: 'Could not submit timesheet.',
	// generic error text for when approver projects could not be retrieved
	couldNotGetApproverProjects: 'Could not get approver projects.',
	// generic error text for when contributor projects could not be retrieved
	couldNotGetContributorProjects: 'Could not retrieve contributor projects.',
	// getneric error text for when all projects map could not get retrieved
	couldNotGetProjects: 'Could not retrieve projects.',
	// generic error text for when project details could not be retrieved
	couldNotGetProjectDetails: 'Could not retreive project details',
	// generic error text for when a project approver could not be created
	couldNotCreateApprover: 'Could not create project approver.',
	// error message for when a project approver already exists
	approverExists: 'Project approver already exists',
	// error message for when a contact fk is not pass in as an argument
	contactRequired: 'Contact field required.',
	// error message for when an approver can not be delted
	couldNotDeleteApprover: 'Could not delete approver.',
	// error message for being unable to upsert entry
	couldNotUpsertEntry: 'Could not create or update the entry.',
	// error message for not being able to delete an entry
	couldNotDeleteEntry: 'Could not delete entry.',
	// error message for not being bale to get approval history fro mentry
	couldNotGetApprovalHistory: 'Could not retrieve approval history.',
	// error message for not being able to retrieve entry approvals
	couldNotGetApprovals: 'Could not retrieve approvals.',
	// error message for not being able to update entry approvals
	couldNotUpdateApprovals: 'Could not update approvals.',
	// error message for when an enduser isnt available when required
	endUserRequired: 'Enduser requred for update',
	// error message for when an id is required on an end user object
	endUserIDRequired: 'ID required on endUser for update.',
	// error message for when a password is incorrectly provided
	passwordProvided: 'Password cannot be updated via update endpoint.',
	// error message for when a user cannot be updated
	couldNotUpdateUser: 'Could not update user: ',
	// error message for when a user could not be created
	couldNotCreateUser: 'Could not create user.',
	// error message for when an array is required
	mustBeAnArray: 'Arguments must be an array.',
	// error message for when an email is required
	emailRequired: 'Email required.',
	// error message for when a first name is required
	firstNameRequired: 'First name required.',
	// error message for when a last name is required
	lastNameRequired: 'Last name required.',
	// error message for requiring a contact id on an enduser
	contactIDRequired: 'Contact postgres id required for end user.',
	// error message for when a user has an email that is not unique
	uniqueEmail: 'Email must be unique.',
	// error message for when a salesforce contact has multiple users
	multipleUsersForContact: 'Multiple users for the same Salesforce contact.',
	// for when a duplicate end user is found
	duplicateUser: 'User for one or more provided emails or salesforce contact ids already exists.',
	// error message for when contributors could not be created
	couldNotCreateContributor: 'Could not create Contributor.',
	// project field required for operation
	projectRequired: 'Project field required.',
	// error for when a contributor already exists
	contributorExists: 'Project contributor already exists.',
	// error when a contributor could not be deleted
	couldNotDeleteContributor: 'Could not delete contributor.',
	// error when trying to retrieve contact information
	couldNotGetContacts: 'Could not retrieve contact information.',
	// error when trying to get account map information
	couldNotGetAccounts: 'Could not retrieve account information.',
	// error when trying to get approval stages
	couldNotGetApprovalStages: 'Could not retrieve approval stages.',
	// error when not including field array of approval stages
	stagesRequired: 'Array of approval stages required.',
	// error when display name not included as field
	displayNameRequired: 'Display name required and must be unique.',
	// error when a stage already belongs to another project, but is trying to be set to another
	stageBelongsToAnotherProject: 'Approval stage already belongs to a project.',
	// error when approval stages could not be set
	couldNotSetApprovalStages: 'Approval stages could not be set.',
	// error for when id field is not provided
	idRequired: 'Postgres id is required.',
	// error for when invalid data is passed in as args
	invalidArgs: 'Invalid arguments passed in.',
	// error when just trying to set the approval stage names
	couldNotSetApprovalStageNames: 'Could not set approval stage names.',
	// error when trying to upsert a project
	couldNotUpsertProject: 'Could not create or update project.',
	// error when there was some sort of data integrity issue
	internalReferenceError: 'We have encountered an error. Please contact a server admin with reference #',
	// error when a project could not be deactivated
	couldNotDeactivateProject: 'Could not deactivate project.'
};

// constants for timesheet, entry, and entry approval status
const status = {
	SUBMITTED: 'Submitted',
	REJECTED: 'Rejected',
	UNDER_REVIEW: 'Under Review',
	APPROVED: 'Approved',
	PENDING: 'Pending',
	OPEN: 'Open',
	NEEDS_ATTN: 'Needs Attention'
};

// public interface
module.exports = {
	errorMessages: errorMessages,
	status: status
};