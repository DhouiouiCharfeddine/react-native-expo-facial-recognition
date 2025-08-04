// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Modify config here if needed
config.resolver.assetExts.push('bin');
config.resolver.assetExts.push('onnx');

module.exports = config;
