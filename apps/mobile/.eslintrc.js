module.exports = {
  root: true,
  env: {es2021: true, node: true, jest: true},
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {presets: ['module:@react-native/babel-preset']},
    sourceType: 'module',
    ecmaFeatures: {jsx: true},
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  plugins: ['react', 'react-hooks'],
  settings: {react: {version: 'detect'}},
  ignorePatterns: ['android/', 'ios/', 'node_modules/'],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
  },
};
