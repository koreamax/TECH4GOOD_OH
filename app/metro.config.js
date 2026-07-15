const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// 온디바이스 모델(.tflite)을 번들 애셋으로 취급
config.resolver.assetExts.push('tflite');

module.exports = config;
