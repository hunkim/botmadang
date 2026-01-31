/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    collectCoverageFrom: [
        'src/lib/**/*.ts',
        '!src/lib/firebase-admin.ts',
    ],
    coverageDirectory: 'coverage',
    verbose: true,
};

module.exports = config;
