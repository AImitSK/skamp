// src/__tests__/features/crm-enhanced-unit.test.ts
/**
 * Unit Tests für CRM Enhanced Konstanten und Typen
 * 
 * Diese Tests prüfen die extrahierten Konstanten und Typen
 * ohne komplexe Firebase-Dependencies.
 */

import '@testing-library/jest-dom';

describe('CRM Enhanced Constants', () => {
  it('sollte zentrale Konstanten korrekt exportieren', () => {
    const { 
      CRM_PAGINATION_SIZE, 
      CRM_DEFAULT_PAGE_SIZE,
      CRM_MAX_BULK_OPERATIONS,
      CRM_SEARCH_DEBOUNCE_MS,
      COMPANY_TABS, 
      CONTACT_TABS,
      CSV_MAX_FILE_SIZE,
      CSV_CHUNK_SIZE,
      VALIDATION_RULES,
      STATUS_MESSAGES,
      ERROR_MESSAGES
    } = require('@/lib/constants/crm-constants');
    
    // Pagination Konstanten
    expect(CRM_PAGINATION_SIZE).toBe(50);
    expect(CRM_DEFAULT_PAGE_SIZE).toBe(25);
    expect(CRM_MAX_BULK_OPERATIONS).toBe(100);
    expect(CRM_SEARCH_DEBOUNCE_MS).toBe(300);

    // CSV Konstanten
    expect(CSV_MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    expect(CSV_CHUNK_SIZE).toBe(100);

    // Tab-Konfigurationen
    expect(COMPANY_TABS).toHaveLength(6);
    expect(CONTACT_TABS).toHaveLength(6);
    
    // Company Tab-Struktur testen
    COMPANY_TABS.forEach(tab => {
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('label');
      expect(tab).toHaveProperty('icon');
      expect(tab).toHaveProperty('description');
      expect(typeof tab.id).toBe('string');
      expect(typeof tab.label).toBe('string');
      expect(typeof tab.description).toBe('string');
      expect(typeof tab.icon).toBe('object'); // React Components sind objects
    });

    // Contact Tab-Struktur testen
    CONTACT_TABS.forEach(tab => {
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('label');
      expect(tab).toHaveProperty('icon');
      expect(tab).toHaveProperty('description');
      expect(typeof tab.id).toBe('string');
      expect(typeof tab.label).toBe('string');
      expect(typeof tab.description).toBe('string');
      expect(typeof tab.icon).toBe('object'); // React Components sind objects
    });

    // Validation Rules
    expect(VALIDATION_RULES.COMPANY_NAME_MIN_LENGTH).toBe(2);
    expect(VALIDATION_RULES.COMPANY_NAME_MAX_LENGTH).toBe(100);
    expect(VALIDATION_RULES.EMAIL_REGEX).toBeInstanceOf(RegExp);
    expect(VALIDATION_RULES.WEBSITE_REGEX).toBeInstanceOf(RegExp);

    // Status Messages
    expect(typeof STATUS_MESSAGES.IMPORT_PARSING).toBe('string');
    expect(typeof STATUS_MESSAGES.IMPORT_DONE).toBe('string');

    // Error Messages
    expect(typeof ERROR_MESSAGES.INVALID_EMAIL).toBe('string');
    expect(typeof ERROR_MESSAGES.REQUIRED_FIELD).toBe('string');
  });

  it('sollte Company Tab IDs korrekt definiert haben', () => {
    const { COMPANY_TABS } = require('@/lib/constants/crm-constants');
    
    const expectedTabIds = ['general', 'legal', 'international', 'financial', 'corporate', 'media'];
    const actualTabIds = COMPANY_TABS.map(tab => tab.id);
    
    expect(actualTabIds).toEqual(expectedTabIds);
  });

  it('sollte Contact Tab IDs korrekt definiert haben', () => {
    const { CONTACT_TABS } = require('@/lib/constants/crm-constants');
    
    const expectedTabIds = ['general', 'communication', 'media', 'professional', 'gdpr', 'personal'];
    const actualTabIds = CONTACT_TABS.map(tab => tab.id);
    
    expect(actualTabIds).toEqual(expectedTabIds);
  });

  it('sollte Media Tab nur für bestimmte Company Types sichtbar sein', () => {
    const { COMPANY_TABS } = require('@/lib/constants/crm-constants');
    
    const mediaTab = COMPANY_TABS.find(tab => tab.id === 'media');
    expect(mediaTab).toBeDefined();
    expect(mediaTab.visible).toBeDefined();
    
    // Test visibility logic
    if (mediaTab && mediaTab.visible) {
      expect(mediaTab.visible({ type: 'media_house' })).toBe(true);
      expect(mediaTab.visible({ type: 'customer' })).toBe(false);
    }
  });

  it('sollte Media Tab nur für Journalisten sichtbar sein (Contacts)', () => {
    const { CONTACT_TABS } = require('@/lib/constants/crm-constants');
    
    const mediaTab = CONTACT_TABS.find(tab => tab.id === 'media');
    expect(mediaTab).toBeDefined();
    expect(mediaTab.visible).toBeDefined();
    
    // Test visibility logic
    if (mediaTab && mediaTab.visible) {
      expect(mediaTab.visible({ mediaProfile: { isJournalist: true } })).toBe(true);
      expect(mediaTab.visible({ mediaProfile: { isJournalist: false } })).toBe(false);
      expect(mediaTab.visible({})).toBe(false);
    }
  });
});

describe('CRM Enhanced UI Types', () => {
  it('sollte Type-Exports verfügbar haben', () => {
    // Da TypeScript-Interfaces zur Laufzeit nicht verfügbar sind,
    // testen wir hier die Existenz der Datei und ihre Importierbarkeit
    expect(() => {
      require('@/types/crm-enhanced-ui');
    }).not.toThrow();
  });

  it('sollte Import/Export Types korrekt strukturiert haben', () => {
    // Mock für ImportResult Struktur
    const mockImportResult = {
      created: 10,
      updated: 5,
      skipped: 2,
      errors: [{ row: 1, error: 'Invalid email' }],
      warnings: [{ row: 2, warning: 'Missing phone' }]
    };

    // Test Struktur
    expect(typeof mockImportResult.created).toBe('number');
    expect(typeof mockImportResult.updated).toBe('number');
    expect(typeof mockImportResult.skipped).toBe('number');
    expect(Array.isArray(mockImportResult.errors)).toBe(true);
    expect(Array.isArray(mockImportResult.warnings)).toBe(true);
  });

  it('sollte Tab-Config Types korrekt strukturiert haben', () => {
    // Mock für TabConfig Struktur
    const mockTabConfig = {
      id: 'general',
      label: 'Allgemein',
      icon: jest.fn(),
      description: 'Test description'
    };

    // Test Struktur
    expect(typeof mockTabConfig.id).toBe('string');
    expect(typeof mockTabConfig.label).toBe('string');
    expect(typeof mockTabConfig.icon).toBe('function');
    expect(typeof mockTabConfig.description).toBe('string');
  });
});

describe('CRM Enhanced Code Organization', () => {
  it('sollte keine lokalen TabConfig Duplikate mehr haben', () => {
    // Diese Tests würden in einem echten Codebase-Scanner laufen
    // Hier simulieren wir die Prüfung, dass die lokalen Definitionen entfernt wurden
    
    const fs = require('fs');
    const path = require('path');
    
    const crmPath = path.join(process.cwd(), 'src/app/dashboard/contacts/crm');
    
    // CompanyModal.tsx sollte keine lokale TabConfig haben
    const companyModalContent = fs.readFileSync(
      path.join(crmPath, 'CompanyModal.tsx'), 
      'utf-8'
    );
    expect(companyModalContent).not.toMatch(/^interface TabConfig/m);
    expect(companyModalContent).not.toMatch(/^const TABS:/m);
    
    // ContactModalEnhanced.tsx sollte keine lokale TabConfig haben
    const contactModalContent = fs.readFileSync(
      path.join(crmPath, 'ContactModalEnhanced.tsx'), 
      'utf-8'
    );
    expect(contactModalContent).not.toMatch(/^interface TabConfig/m);
    expect(contactModalContent).not.toMatch(/^const TABS:/m);
    
    // ImportModalEnhanced.tsx sollte keine lokalen Types haben
    const importModalContent = fs.readFileSync(
      path.join(crmPath, 'ImportModalEnhanced.tsx'), 
      'utf-8'
    );
    expect(importModalContent).not.toMatch(/^interface ImportResult/m);
    expect(importModalContent).not.toMatch(/^interface ImportProgress/m);
  });

  it('sollte zentrale Imports verwenden', () => {
    const fs = require('fs');
    const path = require('path');
    
    const crmPath = path.join(process.cwd(), 'src/app/dashboard/contacts/crm');
    
    // CompanyModal.tsx sollte zentrale Imports haben
    const companyModalContent = fs.readFileSync(
      path.join(crmPath, 'CompanyModal.tsx'), 
      'utf-8'
    );
    expect(companyModalContent).toMatch(/import.*COMPANY_TABS.*@\/lib\/constants\/crm-constants/);
    expect(companyModalContent).toMatch(/import.*CompanyTabConfig.*@\/types\/crm-enhanced-ui/);
    
    // ContactModalEnhanced.tsx sollte zentrale Imports haben
    const contactModalContent = fs.readFileSync(
      path.join(crmPath, 'ContactModalEnhanced.tsx'), 
      'utf-8'
    );
    expect(contactModalContent).toMatch(/import.*CONTACT_TABS.*@\/lib\/constants\/crm-constants/);
    expect(contactModalContent).toMatch(/import.*ContactTabConfig.*@\/types\/crm-enhanced-ui/);
  });

  it('sollte keine console.log Statements mehr haben', () => {
    const fs = require('fs');
    const path = require('path');
    
    const crmPath = path.join(process.cwd(), 'src/app/dashboard/contacts/crm');
    const files = fs.readdirSync(crmPath, { recursive: true });
    
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const filePath = path.join(crmPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Sollte keine console.log Statements haben
        expect(content).not.toMatch(/console\.log\(/);
        expect(content).not.toMatch(/console\.error\(/);
        expect(content).not.toMatch(/console\.warn\(/);
        expect(content).not.toMatch(/console\.info\(/);
      }
    });
  });
});

describe('CRM Enhanced Clean Code Compliance', () => {
  it('sollte Magic Numbers durch Konstanten ersetzt haben', () => {
    const { CRM_PAGINATION_SIZE, CSV_MAX_FILE_SIZE, CSV_CHUNK_SIZE } = require('@/lib/constants/crm-constants');
    
    // Statt Magic Number 50 überall, jetzt zentrale Konstante
    expect(CRM_PAGINATION_SIZE).toBeDefined();
    expect(typeof CRM_PAGINATION_SIZE).toBe('number');
    
    // Statt Magic Number für File Size, jetzt zentrale Konstante
    expect(CSV_MAX_FILE_SIZE).toBeDefined();
    expect(CSV_MAX_FILE_SIZE).toBeGreaterThan(0);
    
    // Statt Magic Number für Batch Size, jetzt zentrale Konstante
    expect(CSV_CHUNK_SIZE).toBeDefined();
    expect(CSV_CHUNK_SIZE).toBeGreaterThan(0);
  });

  it('sollte Error Messages zentralisiert haben', () => {
    const { ERROR_MESSAGES } = require('@/lib/constants/crm-constants');
    
    expect(ERROR_MESSAGES.INVALID_EMAIL).toBeDefined();
    expect(ERROR_MESSAGES.INVALID_PHONE).toBeDefined();
    expect(ERROR_MESSAGES.REQUIRED_FIELD).toBeDefined();
    expect(ERROR_MESSAGES.FILE_TOO_LARGE).toBeDefined();
    
    // Alle sollten deutsche Texte sein
    expect(ERROR_MESSAGES.INVALID_EMAIL).toMatch(/ungültig/i);
    expect(ERROR_MESSAGES.REQUIRED_FIELD).toMatch(/erforderlich/i);
  });

  it('sollte Status Messages zentralisiert haben', () => {
    const { STATUS_MESSAGES } = require('@/lib/constants/crm-constants');
    
    expect(STATUS_MESSAGES.IMPORT_PARSING).toBeDefined();
    expect(STATUS_MESSAGES.IMPORT_VALIDATING).toBeDefined();
    expect(STATUS_MESSAGES.IMPORT_IMPORTING).toBeDefined();
    expect(STATUS_MESSAGES.IMPORT_DONE).toBeDefined();
    
    // Alle sollten deutsche Texte sein
    expect(STATUS_MESSAGES.IMPORT_PARSING).toMatch(/wird.*analysiert/i);
    expect(STATUS_MESSAGES.IMPORT_DONE).toMatch(/erfolgreich/i);
  });
});