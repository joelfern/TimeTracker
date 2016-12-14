import {Component, Input, Output, EventEmitter} from '@angular/core';

@Component({
	selector: 'tag-combobox',
	templateUrl: '/templates/tag-combobox.html'
})

export class TagCombobox{
	// Text typed in input
	private typedText: string;
	// Selected tags
	private selections: any[];
	// Copy of options to be manipulated while maintaining original options
	private unusedOptions: any[];
	// Date options created from dates provided
	private dateOptions: any[];
	// Whether or not date is currently being added
	private addingDate: boolean;
	// The selected option in the list of options
	private selectedOption: number;

	constructor () {}

	ngOnInit() {
		this.unusedOptions = this.options.slice();
		this.generateDateOptions();
		this.sortOptions();
		this.selections = [];
		this.placeholder = this.placeholder || "";
	};

	/**
	 * Searches for text in display of options and gathers results
	 * @param text - search paramater for partial text match
	 * @return list of display options
	 */
	search(text: string): any[] {
		let results: any[] = [];
		for (let i in this.unusedOptions) {
			let option = this.unusedOptions[i];
			// To be used temporarily if option is selected to remove option
			option.index = i;
			if (option.display.toLowerCase().includes(text.toLowerCase())) {
				results.push(option);
			}
		}
		return results;
	};

	/**
	 * Moves selected option from unused options to selections
	 * Emits that selection occured and resets input
	 * @param selection - option to be moved
	 */
	select(selection: any): void {
		this.selections.push(selection);
		// Removes option based on index (which is specific to current results/search)
		if (selection.index >= 0) this.unusedOptions.splice(selection.index, 1);
		this.onSelect.emit(this.selections);
		this.typedText = "";
		this.selectedOption = -1;
	}

	/**
	 * Moves date option from dateOptions to selections
	 * Emits that selection occured and turns off addingDate
	 * @param selection - selected date option to be moved
	 */
	selectDate(selection: any): void {
		for (let d in this.dateOptions) {
			// found the selected option, remove it from the selectable date options
			if (this.dateOptions[d].value == selection.value) {
				this.dateOptions.splice(Number.parseInt(d), 1);
				continue;
			}
		}
		// add it to selections and close the date add window
		this.selections.push(selection);
		this.addingDate = false;
		this.onSelect.emit(this.selections);
	};

	/**
	 * Adds a selection of type search for typedText
	 * (selection for searching by text input)
	 */
	selectSearchText(): void {
		if (!this.typedText) return;
		this.select({
			value: this.typedText,
			display: "\"" + this.typedText + "\"",
			icon: "search",
			type: "search",
			index: -1
		});
	};

	/**
	 * Adds selection back into correct options array and
	 * removes from selections. Emits selection occured 
	 * @param selectionIndex - index of a selected option
	 */
	remove(selectionIndex: number): void {
		if (this.selections[selectionIndex].type == 'date') this.dateOptions.push(this.selections[selectionIndex]);
		else if (this.selections[selectionIndex].index >= 0) this.unusedOptions.push(this.selections[selectionIndex]);
		this.sortOptions();
		this.selections.splice(selectionIndex, 1);
		this.onSelect.emit(this.selections);
	};

	/**
	 * Resets all selections and option lists
	 */
	clear(): void {
		this.ngOnInit();
		this.onSelect.emit(this.selections);
	};

	/**
	 * Creates a class for the icon span bassed on they icon provided
	 * @param icon: icon name (see http://getbootstrap.com/components/#glyphicons)
	 */
	createIconClass(icon: string): string {
		if (!icon) return "";
		return "glyphicon glyphicon-" + icon;
	};

	/**
	 * Sorts the unusedOptions array alphabetically by display name
	 * Sorts the dateOptions chronologically by date
	 */
	sortOptions(): void {
		this.unusedOptions.sort(function (a, b): number {
			if (a.display.toLowerCase() > b.display.toLowerCase()) return 1;
			else if (a.display.toLowerCase() < b.display.toLowerCase()) return -1;
			else return 0;
		});

		this.dateOptions.sort(function (a, b): number {
			return a.value - b.value;
		});
	};

	/**
	 * Generates date options from provided dates
	 */
	generateDateOptions(): void {
		this.dateOptions = [];
		for (let date of this.dates) {
			this.dateOptions.push({
				display: date,
				value: date,
				icon: 'calendar',
				type: 'date'
			});
		}
	};

	/**
	 * Handles input events
	 * @event - The input event
	 * @text - The text in the input field
	 */
	handleInput(event, text): void {
		// Resets the selected option to the first on the list and
		// populates the displayed search options list
		this.typedText = text;
		this.selectedOption = -1;
	}

	/**
	 * Handles keydown events
	 * @param event - The keydown event
	 */
	handleKeydown(event): void {
		if (event.keyCode === 13) {
			// Enter key
			// Adds the currently selected option as an approver
			if (this.selectedOption !== -1) {
				this.select(this.search(this.typedText)[this.selectedOption]);
			} else {
				this.selectSearchText();
			}
		} else if (event.keyCode === 38) {
			// Up arrow key
			// Moves the selected option up in the list
			event.preventDefault();
			if (this.typedText && this.selectedOption - 1 >= -1) {
				this.selectedOption--;
			}
		} else if (event.keyCode === 40) {
			// Down arrow key
			// Moves the selected option down in the list
			event.preventDefault();
			if (this.typedText && this.selectedOption + 1 <= this.search(this.typedText).length - 1) {
				this.selectedOption++;
			}
		}
	}

	/**
	 * Handles mouseenter events
	 * @param index - The index of the option that was moused over
	 */
	handleMouseenter(index): void {
		this.selectedOption = index;
	}

	/**
	 * Handles mouseleave events
	 * @param index - The index of the option that the mouse left
	 */
	handleMouseleave(index): void {
		this.selectedOption = index;
	}

	/**
	 * Checks to see if the current option should have the
	 * selected class
	 * @param index - The index of the option to check
	 */
	checkSelectedOption(index): boolean {
		if (index === this.selectedOption) {
			return true;
		}
		return false;
	}

	// Option objects for combobox formatted as:
	// {
	// 		value: value represented by option,
	// 		display: string to display and search,
	// 		icon: icon for tags, (see http://getbootstrap.com/components/#glyphicons)
	// 		type: used for tracking what type of option it is
	// }
	@Input() options: any[];
	// Optional placeholder text in input field
	@Input() placeholder: string;
	// Dates there should be date options for
	@Input() dates: Date[];
	// Optional text to appear before date in date options
	@Input() datePreText: string;

	@Output() onSelect = new EventEmitter<any[]>();

}