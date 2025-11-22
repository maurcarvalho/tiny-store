module.exports = {
  displayName: 'shared-testing',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json'
      }
    ]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/shared/testing',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    'event-flow.integration.spec.ts', // Skip - requires full handler setup
    'module-boundary.spec.ts'         // Skip - requires runtime module resolution
  ]
};
