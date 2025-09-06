// jest.config.kanban.js
// Spezialisierte Jest-Konfiguration für Kanban Board Tests

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Pfad zur Next.js App für loading von next.config.js und .env Dateien
  dir: './',
})

// Custom Jest-Konfiguration für Kanban Tests
const customJestConfig = {
  // Test-Environment
  testEnvironment: 'jsdom',
  
  // Setup-Dateien
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test-Pattern für Kanban Tests
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)(spec|test).{js,jsx,ts,tsx}',
    '<rootDir>/src/components/projects/kanban/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/lib/kanban/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/hooks/**/use*Board*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/hooks/**/useDragAndDrop*.test.{js,jsx,ts,tsx}'
  ],
  
  // Module Name Mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // Transform-Konfiguration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Module-Erweiterungen
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Coverage-Konfiguration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/kanban',
  coverageReporters: [
    'text',
    'text-summary', 
    'html',
    'lcov',
    'json',
    'clover'
  ],
  
  // Coverage-Pfade (nur Kanban-related Code)
  collectCoverageFrom: [
    'src/components/projects/kanban/**/*.{js,jsx,ts,tsx}',
    'src/lib/kanban/**/*.{js,jsx,ts,tsx}',
    'src/hooks/useBoardRealtime.{js,jsx,ts,tsx}',
    'src/hooks/useDragAndDrop.{js,jsx,ts,tsx}',
    
    // Exclusions
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!**/node_modules/**'
  ],
  
  // Coverage-Thresholds für Kanban Board
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/lib/kanban/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/components/projects/kanban/': {
      branches: 95,
      functions: 95, 
      lines: 95,
      statements: 95
    },
    'src/hooks/useBoardRealtime.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/hooks/useDragAndDrop.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // Test-Environment-Optionen
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Global Setup
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Mocking-Konfiguration
  moduleNameMapping: {
    // Firebase Mock
    '^firebase/(.*)$': '<rootDir>/__mocks__/firebase/$1',
    
    // Static Assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js'
  },
  
  // Setup für spezielle Mocks
  setupFiles: ['<rootDir>/jest.kanban.setup.js'],
  
  // Test-Timeout für Performance-Tests
  testTimeout: 30000,
  
  // Parallel Test Execution
  maxWorkers: '50%',
  
  // Watch-Modus Konfiguration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/'
  ],
  
  // Verbose Output für detailliertes Logging
  verbose: true,
  
  // Reporter-Konfiguration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/kanban/html-report',
        filename: 'kanban-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Kanban Board Test Report',
        logoImgPath: undefined,
        inlineSource: true
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage/kanban/junit',
        outputName: 'kanban-junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: false,
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  
  // Error-Handling
  errorOnDeprecated: true,
  
  // Cache-Konfiguration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Snapshot-Konfiguration
  updateSnapshot: false,
  
  // Custom Resolver für Module
  resolver: undefined,
  
  // Transform ignorieren für bestimmte Module
  transformIgnorePatterns: [
    '/node_modules/(?!(react-dnd|dnd-core|@react-dnd)/)',
  ],
  
  // Test-Sequenziality
  runInBand: false,
  
  // Bail-Konfiguration für CI/CD
  bail: 0,
  
  // Force Exit für sauberen Shutdown
  forceExit: true,
  
  // Clear Mocks zwischen Tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
}

// Export-Konfiguration mit Next.js Integration
module.exports = createJestConfig(customJestConfig)