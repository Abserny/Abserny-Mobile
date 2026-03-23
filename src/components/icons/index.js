/**
 * components/icons/index.js
 * Re-exports all icons and the two lookup maps used by the app.
 * Import from here — never directly from ModeIcons or GestureIcons.
 */

export { IconScene, IconObject, IconRead, IconPeople } from './ModeIcons';
export {
    IconDoubleTap, IconLongPress, IconSwipe,
    IconTripleTap, IconSwipeUp, IconWave, IconCheck, IconFinish,
} from './GestureIcons';

import { IconScene, IconObject, IconRead, IconPeople } from './ModeIcons';
import { IconDoubleTap, IconLongPress, IconSwipe, IconTripleTap, IconSwipeUp, IconWave, IconCheck, IconFinish } from './GestureIcons';

export const MODE_ICONS = {
    scene:  IconScene,
    object: IconObject,
    read:   IconRead,
    people: IconPeople,
};

export const GESTURE_ICONS = {
    // Onboarding intro & info steps
    welcome:      IconWave,
    app_intro:    IconWave,
    repeat_intro: IconWave,
    modes_detail: IconCheck,
    offline_note: IconCheck,
    // Gesture tutorial steps
    intro:       IconWave,
    double_tap:  IconDoubleTap,
    double_done: IconCheck,
    long_press:  IconLongPress,
    long_done:   IconCheck,
    swipe:       IconSwipe,
    swipe_done:  IconCheck,
    triple_tap:  IconTripleTap,
    swipe_up:    IconSwipeUp,
    finish:      IconFinish,
};
