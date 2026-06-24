/**
 * app.config.js — Dynamic Expo config
 *
 * Keys are read from environment variables at build time (EAS Secrets or .env).
 *
 * HOW TO SET KEYS FOR LOCAL DEVELOPMENT:
 *   1. Create .env in project root (already in .gitignore):
 *        GEMINI_KEY_1=AIzaSy...your_key
 *        GEMINI_KEY_2=AIzaSy...second_key   (optional)
 *   2. Run: npx expo start --clear
 *
 * HOW TO SET KEYS FOR EAS BUILDS (no .env file needed):
 *   eas secret:create --name GEMINI_KEY_1 --value "AIza..."
 *   eas build --platform android --profile preview
 *
 * WHY dotenv HERE:
 *   app.config.js runs in Node.js at Metro startup. The dotenv call here
 *   loads .env into process.env so the geminiKeys array below is populated.
 *   Without this line, process.env.GEMINI_KEY_1 is always undefined locally
 *   even if .env exists — dotenv is NOT loaded automatically by Expo.
 */

require('dotenv').config();

const keys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
].filter(Boolean);

module.exports = {
    expo: {
        name: 'Abserny',
        slug: 'abserny',
        version: '2.0.0',
        orientation: 'portrait',
        userInterfaceStyle: 'dark',
        icon: './assets/images/iconLogo.png',
        splash: {
            image: './assets/images/logorm.png',
            resizeMode: 'contain',
            backgroundColor: '#0e0f11',   // ← was '#161717', now pure dark
        },
        ios: {
            supportsTablet: false,
            bundleIdentifier: 'com.abserny.app',
            buildNumber: '2.0.0',
            icon: './assets/images/iconlogo.png',
            infoPlist: {
                NSCameraUsageDescription: 'Abserny uses your camera to describe your surroundings.',
            },
        },
        android: {
            package: 'com.abserny.app',
            versionCode: 2,
            icon: './assets/images/iconLogo.png',
            adaptiveIcon: {
                foregroundImage: './assets/images/iconLogo.png',
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
            geminiKeys: keys,
        },
    },
};
