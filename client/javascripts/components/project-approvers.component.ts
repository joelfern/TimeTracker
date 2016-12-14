import {Component, Input, OnChanges, SimpleChange, Output, EventEmitter} from '@angular/core';

import {ApprovalStageService} from '../services/approval-stage.service';

import {ApprovalStageComponent} from './approval-stage.component';
import {ConfirmationModal} from './confirmation-modal.component';

import {Project} from '../interfaces/project';
import {Account} from '../interfaces/account';
import {ApprovalStage} from '../interfaces/approval-stage';

@Component({
    selector: 'project-approvers',
    templateUrl: '/templates/projectApprovers.html',
	directives: [ApprovalStageComponent, ConfirmationModal]
})

/**
 * Controller for the project approvers component
 */
export class ProjectApprovers implements OnChanges {

	private loading: boolean;

	private stagesToEdit: ApprovalStage[];

	private errorMessage: string;

	private expanded: boolean;
	private hasBeenToggled: boolean;

	private editMode: boolean;

	private editConfirmation: Object;
	private showEditConfirmation: boolean;
	private saveConfirmation: Object;
	private showSaveConfirmation: boolean;

	// VARIABLES USED IN DRAGGING FOR REORDER
	private draggingStage: ApprovalStage;
	private draggingPosition: Object;
	private draggingWidth: number; 
	private lastMoveY: number;
	private moving: boolean;
	private hitDraggingStage: boolean;
	private deleting: boolean;

    constructor(
		private approvalStageService: ApprovalStageService
	) {};

	ngOnInit() {
		this.expanded = true;

		this.editConfirmation = {
			title: 'WARNING',
			body: 'Saving any stage ordering changes (including adding and deleting stages) will reset all approval process for this project. There is no way to undo this action.',
			confirm: 'That\'s fine',
			reject: 'Nevermind',
			name: 'edit'
		}

		this.saveConfirmation = {
			title: 'WARNING',
			body: '',
			confirm: 'Continue',
			reject: 'Cancel',
			name: 'save'
		}
	}

	ngOnChanges(changes: {[propertyName: string]: SimpleChange}) {
		if (changes.hasOwnProperty('project')) {
			this.cancelChanges();
			if (changes['project'].currentValue['approvalStages'] && !changes['project'].currentValue['approvalStages'].length) {
				this.enterEditMode();
			}
		}
	}

	/**
	 * Toggles whether or not approvers is currently expanded
	 */
	toggleExpanded(): void {
		this.errorMessage = "";
		this.expanded = !this.expanded;
		this.hasBeenToggled = true;
	};

	/**
	 * Switches the view to edit mode and clones the stages
	 * array to an array of editable stages
	 */
	enterEditMode(): void {
		this.editMode = true;
		this.stagesToEdit = [];
		// Populates list of stages to edit
		for (let stage of this.project['approvalStages']) {
			let stageToEdit: ApprovalStage = { pg_id__c: null };
			for (let property in stage) {
				stageToEdit[property] = stage[property];
			}
			this.stagesToEdit.push(stageToEdit);
		}
	};

	/**
	 * Shifts the stage in the list of stages for a project
	 * @param stage - The sfid of the stage being shifted
	 * @param delta - How far to move the stage
	 */
	shiftStage(stage, delta): void {
		let index = this.stagesToEdit.indexOf(stage);
		if (index + delta >= 0 && index + delta <= this.stagesToEdit.length) {
			this.stagesToEdit.splice(index, 1);
			this.stagesToEdit.splice(index + delta, 0, stage);
		}
	};

	/**
	 * Handles the saving of stages if the order has changed or if
	 * any names were changed
	 */
	saveEditedStages(): void {
		let orderChanged: boolean = false;
		let namesChanged: boolean = false;
		
		// verify that there are actual edited stages that need to be saved
		/* if (this.stagesToEdit.length > 0) {
			this.loading = true;
		} else {
			this.errorMessage = "There must be at least one approval stage in order to save.";
			return;
		} */

		// If the length of stagesToEdit is different than the length
		// of stages on the project, set orderChanged to true (this
		// will occur if a stage was added or deleted)
		if (this.project['approvalStages'].length !== this.stagesToEdit.length) {
			orderChanged = true;
		} else {
			// Checks to see if the stage at an index in the stages
			// array and at the same index in the stagesToEdit array are
			// different, meaning the ordering has changed; Also checks
			// if stage names were changed
			for (let i in this.project['approvalStages']) {
				if (this.project['approvalStages'][i].pg_id__c !== this.stagesToEdit[i].pg_id__c) {
					orderChanged = true;
					break;
				} else if (this.project['approvalStages'][i].display_name__c !== this.stagesToEdit[i].display_name__c) {
					namesChanged = true;
				}
			}
		}

		// If the order of the stages was not changed, check if any
		// stage names changed, and if they did change their display
		// names; If the order has changed, call the service that
		// resets the stages completely to the array of new stages
		if (orderChanged) {
			this.approvalStageService.setApprovalStagesForProject(this.project.pg_id__c, this.stagesToEdit)
				.then(response => {
					this.project['approvalStages'] = response;
					this.loading = false;
					this.editMode = false;
				})
				.catch(error => {
					this.errorMessage = error._body;
					this.loading = false;
				});
		} else if (namesChanged) {
			this.approvalStageService.setApprovalStageDisplayNames(this.stagesToEdit)
				.then(response => {
					for (let i in this.project['approvalStages']) {
						this.project['approvalStages'][i].display_name__c = this.stagesToEdit[i].display_name__c;
					}
					this.loading = false;
					this.editMode = false;
				})
				.catch(error => {
					this.errorMessage = error._body;
					this.loading = false;
				});
		} else {
			this.editMode = false;
			this.loading = false;
		}
	};

	/**
	 * Deletes the specified stage
	 * @param stage - The stage to be deleted
	 */
	deleteStage(stage): void {
		this.stagesToEdit.splice(this.stagesToEdit.indexOf(stage), 1);
	};

	/**
	 * Adds a new, empty stage to the end of the list
	 */
	addStage(): void {
		this.stagesToEdit.push({
			pg_id__c: null,
			approvers: []
		});
	};

	/**
	 * Cancels all changes
	 */
	cancelChanges(): void {
		this.stagesToEdit = [];
		this.editMode = false;
		this.errorMessage = '';
	};

	/**
	 * Checks the ordering of the stages to determine if the save
	 * confirmaton modal needs to be shown
	 */
	checkStageOrderForSaveConfirmation(): void {
		this.errorMessage = "";

		// Set confirmation modal body based on presence of stages
		if (this.stagesToEdit.length === 0) {
			this.saveConfirmation['body'] = 'You are saving a project without any approval stages. Any entries submitted for this project will be automatically approved.';
		} else {
			this.saveConfirmation['body'] = 'Saving these changes to approval stages will reset all in-progress approval processes for this project. There is no way to undo this action.';
		}

		// If the length of stagesToEdit is different than the length
		// of stages on the project, or if there are no stages, show the
		// confirmation modal (this will occur if a stage was added or deleted)
		if (this.project['approvalStages'].length !== this.stagesToEdit.length || this.project['approvalStages'].length === 0) {
			this.showSaveConfirmation = true;
		} else {
			// Checks to see if the stage at an index in the stages
			// array and at the same index in the stagesToEdit array are
			// different, meaning the ordering has changed
			for (let i in this.project['approvalStages']) {
				if (this.project['approvalStages'][i].pg_id__c !== this.stagesToEdit[i].pg_id__c) {
					this.showSaveConfirmation = true;
					break;
				}
			}
		}

		// If show stage confirmation is false (meaning the stage order
		// wasn't changed), save the stages
		if (!this.showSaveConfirmation) {
			this.saveEditedStages();
		}
	}

	/**
	 * Handles confirmation message response
	 * @param response - The response object
	 */
	handleConfirmation(response): void {
		if (response.name.toLowerCase() === 'edit') {
			if (response.confirmed) {
				this.enterEditMode();
			}
			this.showEditConfirmation = false;
		} else if (response.name.toLowerCase() === 'save') {
			if (response.confirmed) {
				this.saveEditedStages();
			}
			this.showSaveConfirmation = false;
		}
	}

	dragStage(event: any, stage: ApprovalStage) {
		if (this.editMode) {
			if (event.isFinal) {
				if (this.deleting) {
					this.deleteStage(stage);
				}
				this.deleting = false;
				this.draggingStage = null;
				this.hitDraggingStage = false;
				this.lastMoveY = null;
				this.onDragging.emit(false);
			} else if (this.draggingStage !== stage) {
				this.draggingStage = stage;
				this.onDragging.emit(true);
			}

			this.draggingWidth = document.getElementsByClassName("stage-card")[0].clientWidth - 2;

			this.draggingPosition = event.center;

			let direction = 0;

			if (this.lastMoveY) {
				if (event.deltaY - this.lastMoveY > 0) direction = 1;
				else if (event.deltaY - this.lastMoveY < 0) direction = -1;
			} else {
				if (event.deltaY > 0) direction = 1;
				else if (event.deltaY < 0) direction = -1;
			}
			
			if (document.getElementsByClassName("dragging-stage").length) {
				var offset = this.draggingWidth / 2;
			};

			let hoveredElements = [];
			hoveredElements.push(document.elementFromPoint(event.center.x + offset + 1, event.center.y));
			hoveredElements.push(document.elementFromPoint(event.center.x - offset - 1, event.center.y));
			
			console.log(hoveredElements);
			for (let hoveredElement of hoveredElements) {
				if (hoveredElement
					&& hoveredElement.classList.contains("stage-card")
					&& hoveredElement.hasAttribute("data-dragged-stage")
				) {
					this.deleting = false;
					let draggedStage = JSON.parse(hoveredElement.getAttribute("data-dragged-stage"));
					if (draggedStage) {
						this.moving = false;
						this.hitDraggingStage = true;
					} else if (!this.moving && this.hitDraggingStage) {
						this.moving = true;
						this.shiftStage(stage, direction);
						this.lastMoveY = event.deltaY + direction * 50;
					}
				}
				if (hoveredElement && hoveredElement.id === "dragging-delete-button") {
					this.deleting = true;
				}
			}
		}
	}

	handleDragOver(event) {
		console.log(event);
	}

	@Input() project: Project;
	@Input() contactIdToEndUserMap: Object;
	// Map of contacts
	@Input() contacts: Object; // key of contact pg id, value of contact

	@Output() onDragging = new EventEmitter<boolean>();
}