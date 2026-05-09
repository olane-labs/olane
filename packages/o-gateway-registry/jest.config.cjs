/**
 * Jest configuration for an ESM TypeScript package.
 *
 * The package is `"type": "module"`, so the jest config itself must be
 * `.cjs` for jest to load it via `require()`. ts-jest's ESM preset
 * handles the `.js` import-extension convention used in source files.
 */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Source uses `'./foo.js'` import extensions per ESM spec, but the
    // actual files on disk are `.ts`. Map them back during resolution.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  testTimeout: 30000,
};
