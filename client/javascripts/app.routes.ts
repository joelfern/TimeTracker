import {provideRouter, RouterConfig} from '@angular/router';

import {HomePage} from './components/home-page.component';
import {LoginPage} from './components/login-page.component';
import {LogoutPage} from './components/logout-page.component';
import {ResetPasswordPage} from './components/resetPassword-page.component';
import {UserManagementPage} from './components/userManagement-page.component';
import {CurrentTimesheetPage} from './components/current-timesheet-component';
import {PastTimesheets} from './components/past-timesheets.component';
import {ApprovalPage} from './components/approval-page.component';
import {AdministrationPage} from './components/administration-page.component';
import {ProjectPage} from './components/project-page.component';
import {ProjectManagementPage} from './components/project-management-page.component';
import {ForbiddenPage} from './components/forbidden-page.component';
import {NoPrivilegesPage} from './components/no-privileges-page.component';
import {RouteNotFoundPage} from './components/route-not-found-page.component';

/**
 * All page components must be imported above, and included here with an associated path for routing
 */
export const routes: RouterConfig = [
	{path: '', component: HomePage},
	{path: 'login', component: LoginPage},
	{path: 'logout', component: LogoutPage},
	{path: 'resetPassword', component: ResetPasswordPage},
	{path: 'users', component: UserManagementPage},
	{path: 'timesheet', component: CurrentTimesheetPage},
	{path: 'timesheets/:timesheetPgID', component: CurrentTimesheetPage},
	{path: 'timesheets', component: PastTimesheets},
	{path: 'approval', component: ApprovalPage},
	{path: 'projects', component: ProjectManagementPage},
	{path: 'forbidden', component: ForbiddenPage },
	{path: 'no-privileges', component: NoPrivilegesPage},
	{path: 'route-not-found', component: RouteNotFoundPage},
	{path: '**', redirectTo: 'route-not-found'}
];

export const APP_ROUTER_PROVIDERS = [
	provideRouter(routes)
];
