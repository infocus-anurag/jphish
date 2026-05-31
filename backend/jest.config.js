/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  projects: [
    {
      displayName: 'unit',
      rootDir: '<rootDir>',
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'e2e',
      rootDir: '<rootDir>',
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    'src/common/**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 70,
    },
  },
};
