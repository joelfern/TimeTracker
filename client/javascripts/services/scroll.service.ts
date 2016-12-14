/**
 * To use scroll service, include ScrollService in the compoent.
 * Then you can use scrollService.scrollY to get scroll position.
 * See timesheet-week for example
 */

import {Injectable} from '@angular/core';

@Injectable()
export class ScrollService {
	public scrollY: number = 0;

	setScrollPostion(e): number {
		return this.scrollY = e.target.scrollingElement.scrollTop;
	}

	/**
	 * Returns a boolean representing if the browser has scroll-snap support
	 */
	scrollSnapSupported(): boolean {
		if ('style' in document.documentElement) {
			return 'scrollSnapType' in document.documentElement.style ||
				'webkitScrollSnapType' in document.documentElement.style || 
				'msScrollSnapType' in document.documentElement.style;
		}
		return false;
	}
}
