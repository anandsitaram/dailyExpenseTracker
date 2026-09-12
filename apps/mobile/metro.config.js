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

    // Force a single resolution for React and RN regardless of hoisting
    extraNodeModules: {
      react: path.resolve(projectRoot, 'node_modules/react'),
      'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
    },

    // Prevent Metro from walking up past projectRoot's node_modules for these
    disableHierarchicalLookup: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
