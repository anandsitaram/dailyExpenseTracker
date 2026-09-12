const path = require('path');

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = {
  projectRoot,

  watchFolders: [workspaceRoot, path.resolve(workspaceRoot, 'apps/core')],

  resolver: {
    unstable_enableSymlinks: false,

    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
