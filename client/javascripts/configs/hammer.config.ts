import { HammerGestureConfig } from '@angular/platform-browser';

/**
 * Creates a configuration class that sets hammer to recognize vertical swipe
 */
export class HammerConfig extends HammerGestureConfig  {
    overrides = <any> {
		// DIRECTION_VERTICAL == 24
        'swipe': { direction:  24 },
		// DIRECTION_ALL == 30
		'pan': { direction: 30, threshold: 1 }
    }
}