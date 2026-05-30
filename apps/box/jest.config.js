module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  // setup.ts is the setupFilesAfterEnv entry and mocks/ holds moduleNameMapper
  // targets — both are support files the first testMatch glob would otherwise
  // collect as (empty) test suites. Exclude them so they aren't run as tests.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/mocks/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock React Native modules
    '^react-native$': '<rootDir>/src/__tests__/mocks/react-native.js',
    '^@react-native/(.*)$': '<rootDir>/src/__tests__/mocks/react-native.js',
    '^react-native-(.*)$': '<rootDir>/src/__tests__/mocks/react-native.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@testing-library|@metamask|ethers)/)',
  ],
  globals: {
    __DEV__: true,
    'ts-jest': {
      useESM: false,
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
};
