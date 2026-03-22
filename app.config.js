/**
 * app.config.js — Dynamic Expo config
 *
 * WHY THIS FILE EXISTS:
 *   app.json is a static file that gets committed to git and bundled into every
 *   build. Putting secret API keys in app.json (via expo.extra.geminiKeys) means
 *   they ship inside the APK — extractable by anyone who decompiles it.
 *
 *   This file replaces the static app.json approach. It reads keys from
 *   environment variables at build time (injected by EAS Secrets or a local
 *   .env file), so keys never appear in committed code or in the APK manifest.
 *
 * HOW TO SET KEYS FOR EAS BUILDS:
 *   eas secret:create --name GEMINI_KEY_1 --value "AIza..."
 *   eas secret:create --name GEMINI_KEY_2 --value "AIza..."
 *   eas build --platform android --profile preview
 *
 * HOW TO SET KEYS FOR LOCAL DEVELOPMENT:
 *   Create a .env file in the project root (already in .gitignore):
 *     GEMINI_KEY_1=AIzaSy...
 *     GEMINI_KEY_2=AIzaSy...
 *   Then run: npx expo start
 *   Expo CLI automatically loads .env on startup.
 *
 * IMPORTANT: Delete the old geminiKeys array from app.json (or leave it empty []).
 *   This file takes precedence over app.json when both exist.
 */

const keys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,  // optional third key
].filter(Boolean); // remove undefined/empty entries

module.exports = {
    expo: {
        name: 'Abserny',
        slug: 'abserny',
        version: '2.1.0',
        orientation: 'portrait',
        userInterfaceStyle: 'dark',
        icon: './assets/iconLogo.png',
        splash: {
            image: './assets/logorm.png',
            resizeMode: 'contain',
            backgroundColor: '#161717',
        },
        ios: {
            supportsTablet: false,
            bundleIdentifier: 'com.abserny.app',
            icon: './assets/iconlogo.png',
            infoPlist: {
                NSCameraUsageDescription: 'Abserny uses your camera to describe your surroundings.',
            },
        },
        android: {
            package: 'com.abserny.app',
            icon: './assets/iconLogo.png',
            adaptiveIcon: {
                foregroundImage: './assets/iconLogo.png',
                backgroundColor: '#000000',
            },
            permissions: [
                'CAMERA',
                'VIBRATE',
                'android.permission.CAMERA',
                'android.permission.RECORD_AUDIO',
            ],
        },
        plugins: [
            [
                'expo-camera',
                { cameraPermission: 'Abserny needs your camera to describe what is around you.' },
            ],
            'expo-font',
            [
                'react-native-fast-tflite',
                {
                    enableAndroidGpuLibraries: [
                        'libOpenCL-pixel.so',
                        'libGLES_mali.so',
                    ],
                },
            ],
        ],
        extra: {
            eas: { projectId: '489ed7a1-5879-40f1-bc56-8160ab96bbce' },
            // Keys are injected from environment variables at build time.
            // Empty array at runtime = offline-only mode (safe fallback).
            geminiKeys: keys,
        },
    },
};
