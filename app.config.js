/**
 * app.config.js — Dynamic Expo config
 *
 * Keys are read from environment variables at build time (EAS Secrets or .env).
 * Asset paths updated to reflect new directory structure:
 *   images → assets/images/
 *   model  → assets/models/
 *
 * HOW TO SET KEYS FOR EAS BUILDS:
 *   eas secret:create --name GEMINI_KEY_1 --value "AIza..."
 *   eas build --platform android --profile preview
 *
 * HOW TO SET KEYS FOR LOCAL DEVELOPMENT:
 *   Create .env in project root (already in .gitignore):
 *     GEMINI_KEY_1=AIzaSy...
 *   Then: npx expo start
 */

const keys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
].filter(Boolean);

module.exports = {
    expo: {
        name: 'Abserny',
        slug: 'abserny',
        version: '2.1.0',
        orientation: 'portrait',
        userInterfaceStyle: 'dark',
        icon: './assets/images/iconLogo.png',
        splash: {
            image: './assets/images/logorm.png',
            resizeMode: 'contain',
            backgroundColor: '#161717',
        },
        ios: {
            supportsTablet: false,
            bundleIdentifier: 'com.abserny.app',
            icon: './assets/images/iconLogo.png',
            infoPlist: {
                NSCameraUsageDescription: 'Abserny uses your camera to describe your surroundings.',
            },
        },
        android: {
            package: 'com.abserny.app',
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
