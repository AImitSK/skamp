const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js', 
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/setupFirebaseMocks.ts'
  ],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    // Mock Firebase modules
    '^@/lib/firebase/config$': '<rootDir>/src/__tests__/__mocks__/firebase/config.ts',
    '^firebase/firestore$': '<rootDir>/src/__tests__/__mocks__/firebase/firestore.ts',
    '^firebase/storage$': '<rootDir>/src/__tests__/__mocks__/firebase/storage.ts',
    '^firebase/app$': '<rootDir>/src/__tests__/__mocks__/firebase/app.ts',
    // Mock react-dnd
    '^react-dnd$': '<rootDir>/src/__mocks__/react-dnd.ts',
    '^react-dnd-html5-backend$': '<rootDir>/src/__mocks__/react-dnd-html5-backend.ts',
    '^react-dnd-touch-backend$': '<rootDir>/src/__mocks__/react-dnd-touch-backend.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/node_modules/**',
    '!src/**/.next/**',
    '!src/**/types/**',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    // E2E Tests im src Verzeichnis (nur mit Playwright ausführen)
    '<rootDir>/src/__tests__/e2e/',
    // Setup-Dateien und Utilities ausschließen (keine echten Tests)
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/setupFirebaseMocks.ts',
    '<rootDir>/src/__tests__/test-utils.tsx',
    '<rootDir>/src/__tests__/__mocks__/',
    '<rootDir>/src/components/projects/__tests__/test-utils.tsx',
    '.*helpers/mock-data\\.ts$',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(nanoid|@firebase|firebase|react-dnd|dnd-core|@react-dnd|react-dnd-touch-backend)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)