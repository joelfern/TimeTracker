import {Component, Input, Output, EventEmitter} from '@angular/core';

import {Project} from '../interfaces/project';
import {Account} from '../interfaces/account';

import {Router} from '@angular/router';

import {Pipe} from "@angular/core";

@Pipe({
    name: "splitTimeString",
})

/**
 * Converts a time value from milliseconds to hours (2 decimals)
 */
export class SplitTimeStringPipe {
    transform(value) {
        return value.split('T')[0];
    }
}

@Component({
    selector: 'project-summary',
    templateUrl: '/templates/projectSummary.html',
	pipes: [SplitTimeStringPipe]
})

/**
 * Controller for the project summary component
 */
export class ProjectSummary {

    constructor(
        private router: Router
	) {};

	ngOnInit() {}

	@Input() project: Project;
	@Input() projectAccount: Account;
	@Output() onClick = new EventEmitter<number>();
}