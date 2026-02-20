module.exports = {
  displayName: 'integration',
  preset: './jest.preset.js',
  testEnvironment: 'node',
  rootDir: '../..',
  roots: ['<rootDir>/tests/integration'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.base.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
  testTimeout: 30000,
};
