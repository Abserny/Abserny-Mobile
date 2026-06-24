const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .tflite model files as static assets
config.resolver.assetExts.push('tflite');

// Force CommonJS resolution — avoids import.meta issues with ESM packages
config.resolver.unstable_conditionNames = ['require', 'react-native', 'default'];

module.exports = config;
