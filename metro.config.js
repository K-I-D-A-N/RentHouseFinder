const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [
  ...new Set([
    ...config.resolver.sourceExts,
    'android.js',
    'ios.js',
    'native.js',
    'cjs',
  ]),
];

module.exports = config;
