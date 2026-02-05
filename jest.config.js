/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    testPathIgnorePatterns: [
        '/node_modules/',
        'api-comprehensive.test.ts',  // 실행 중인 서버 필요 (npm run test:api로 별도 실행)
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    collectCoverageFrom: [
        'src/lib/**/*.ts',
        '!src/lib/firebase-admin.ts',
        '!src/lib/__tests__/**',
    ],
    coverageDirectory: 'coverage',
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    verbose: true,
};

module.exports = config;
