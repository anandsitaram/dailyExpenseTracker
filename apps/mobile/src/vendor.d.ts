declare module 'react-native-fs';
declare module '*.png';

// react-native-get-random-values polyfills a global.crypto.getRandomValues
// at runtime; no upstream types are shipped for it.
declare const crypto: {
  getRandomValues: <T extends ArrayBufferView>(array: T) => T;
};
