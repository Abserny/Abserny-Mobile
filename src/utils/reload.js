/**
 * utils/reload.js
 * Full JS bundle reload — works in both dev and production builds.
 */

import * as Updates from 'expo-updates';

export async function reloadApp() {
    try {
        await Updates.reloadAsync();
    } catch {
        try {
            const { DevSettings } = require('react-native');
            DevSettings.reload();
        } catch {
            console.warn('[Abserny] Could not reload app. User must manually restart.');
        }
    }
}
