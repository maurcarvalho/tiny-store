module.exports = {
  displayName: 'api-e2e',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['**/e2e/**/*.e2e.spec.ts'],
  coverageDirectory: '../../coverage/apps/api/e2e',
  globals: {},
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/app/$1',
  },
};

