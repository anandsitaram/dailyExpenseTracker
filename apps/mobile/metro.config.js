const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const config = {
  watchFolders: [path.resolve(__dirname, '../../packages/core')],
  resolver: {
    unstable_enableSymlinks: false,
  },
};
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
