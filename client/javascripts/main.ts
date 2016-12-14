import {bootstrap} from '@angular/platform-browser-dynamic';
import {HammerGestureConfig, HAMMER_GESTURE_CONFIG} from '@angular/platform-browser';
import {provide} from '@angular/core';
import {APP_BASE_HREF} from '@angular/common';
import {HTTP_PROVIDERS} from '@angular/http';
import {MainApp} from './app.component';
import {APP_ROUTER_PROVIDERS} from './app.routes';
import {EndUserService} from './services/enduser.service';
import {SecurityService} from './services/security.service';
import {EntryService} from './services/entry.service';
import {ProjectService} from './services/project.service';
import {DatetimeService} from './services/datetime.service';
import {TimesheetService} from './services/timesheet.service';
import {ContributorService} from './services/contributor.service';
import {ScrollSpyService} from 'ng2-scrollspy';
import {ScrollService} from './services/scroll.service';
import {ApprovalService} from './services/approval.service';
import {ContactService} from './services/contact.service';
import {ApprovalStageService} from './services/approval-stage.service';
import {AccountService} from './services/account.service';
import {ProjectApproverService} from './services/project-approver.service';
import {HammerConfig} from './configs/hammer.config';

bootstrap(MainApp, [
	HTTP_PROVIDERS,
	APP_ROUTER_PROVIDERS,
	provide(APP_BASE_HREF, {useValue:'/page'}),
	provide(HAMMER_GESTURE_CONFIG, {
        useClass: HammerConfig
    }),
	EndUserService,
	SecurityService,
	EntryService,
	ProjectService,
	DatetimeService,
	TimesheetService,
	ContributorService,
	ScrollSpyService,
	ScrollService,
	ApprovalService,
	ContactService,
	ApprovalStageService,
	AccountService,
	ProjectApproverService
]);
