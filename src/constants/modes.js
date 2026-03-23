/**
 * constants/modes.js
 * MODES array — single definition used by useModes, MainScreen, ModeBanner.
 * Previously split between useModes.js and App.js — now one place.
 */

export const MODES = [
    { id: 'scene',  label: 'Scene mode',  instruction: 'Double tap to describe surroundings.', icon: 'scene'  },
    { id: 'object', label: 'Object mode', instruction: 'Hold an object close and double tap.',  icon: 'object' },
    { id: 'read',   label: 'Read mode',   instruction: 'Point at text and double tap to read.', icon: 'read'   },
    { id: 'people', label: 'People mode', instruction: 'Double tap to detect people nearby.',   icon: 'people' },
];
