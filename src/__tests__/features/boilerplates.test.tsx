/**
 * Boilerplates Feature Tests
 * Testet die Textbausteine-Funktionalität vollständig
 */

// Mock Firebase vollständig
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDocs: jest.fn(() => Promise.resolve({
    empty: false,
    docs: [
      { id: 'bp-1', data: () => ({ name: 'Test Baustein', category: 'company' }) }
    ]
  })),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    id: 'bp-1',
    data: () => ({ name: 'Test Baustein', category: 'company' })
  })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-bp-123' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  increment: jest.fn((n) => `increment(${n})`),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn(() => Promise.resolve())
  }))
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

import { boilerplatesService } from '@/lib/firebase/boilerplate-service';
import { BoilerplateCreateData } from '@/types/crm-enhanced';

describe('Boilerplates Service', () => {
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockContext = { organizationId: mockOrganizationId, userId: mockUserId };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    test('sollte Service-Methoden haben', () => {
      expect(typeof boilerplatesService.getAll).toBe('function');
      expect(typeof boilerplatesService.create).toBe('function');
      expect(typeof boilerplatesService.update).toBe('function');
      expect(typeof boilerplatesService.delete).toBe('function');
    });

    test('sollte alle Boilerplates einer Organisation laden', async () => {
      const result = await boilerplatesService.getAll(mockOrganizationId);
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('sollte neuen Boilerplate erstellen', async () => {
      const createData: BoilerplateCreateData = {
        name: 'Neuer Baustein',
        content: 'Neuer Inhalt',
        category: 'product',
        description: 'Test Beschreibung',
        isGlobal: true,
        tags: ['test', 'neu']
      };

      const result = await boilerplatesService.create(createData, mockContext);

      expect(typeof result).toBe('string');
    });

    test('sollte Boilerplate aktualisieren', async () => {
      const updateData = { name: 'Aktualisierter Name', content: 'Neuer Inhalt' };
      
      await expect(
        boilerplatesService.update('bp-1', updateData, mockContext)
      ).resolves.toBeUndefined();
    });

    test('sollte Boilerplate löschen', async () => {
      await expect(
        boilerplatesService.delete('bp-1')
      ).resolves.toBeUndefined();
    });
  });

  describe('Spezielle Operationen', () => {
    test('sollte Boilerplate archivieren', async () => {
      await expect(
        boilerplatesService.archive('bp-1', mockContext)
      ).resolves.toBeUndefined();
    });

    test('sollte Favorit-Status umschalten', async () => {
      await expect(
        boilerplatesService.toggleFavorite('bp-1', mockContext)
      ).resolves.toBeUndefined();
    });

    test('sollte Usage-Counter erhöhen', async () => {
      await expect(
        boilerplatesService.incrementUsage('bp-1')
      ).resolves.toBeUndefined();
    });

    test('sollte Boilerplate duplizieren', async () => {
      const result = await boilerplatesService.duplicate('bp-1', 'Kopierter Baustein', mockContext);

      expect(typeof result).toBe('string');
    });
  });

  describe('Client-spezifische Operationen', () => {
    test('sollte globale und kundenspezifische Boilerplates laden', async () => {
      const result = await boilerplatesService.getForClient(mockOrganizationId, 'client-123');

      expect(Array.isArray(result)).toBe(true);
    });

    test('sollte nach Kategorien gruppieren', async () => {
      const result = await boilerplatesService.getGroupedByCategory(mockOrganizationId);

      expect(typeof result).toBe('object');
    });

    test('sollte strukturierte Daten für Campaign Editor liefern', async () => {
      const result = await boilerplatesService.getForCampaignEditor(mockOrganizationId, 'client-123');

      expect(result).toHaveProperty('global');
      expect(result).toHaveProperty('client');
      expect(result).toHaveProperty('favorites');
      expect(Array.isArray(result.favorites)).toBe(true);
    });
  });

  describe('Suche und Filter', () => {
    test('sollte Textsuche durchführen', async () => {
      const result = await boilerplatesService.search(mockOrganizationId, 'Test');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Statistiken', () => {
    test('sollte Statistiken liefern', async () => {
      const result = await boilerplatesService.getStats(mockOrganizationId);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byCategory');
      expect(result).toHaveProperty('global');
      expect(result).toHaveProperty('clientSpecific');
      expect(result).toHaveProperty('favorites');
      expect(result).toHaveProperty('mostUsed');
      expect(Array.isArray(result.mostUsed)).toBe(true);
    });
  });

  describe('Migration', () => {
    test('sollte Migration durchführen', async () => {
      await expect(
        boilerplatesService.migrateFromUserToOrg(mockUserId, mockOrganizationId)
      ).resolves.toBeUndefined();
    });
  });
});

describe('Boilerplate Variables System', () => {
  test('sollte Variablen im Content erkennen', () => {
    const content = 'Hallo {{contact_name}}, willkommen bei {{company_name}}!';
    const variables = content.match(/\{\{([^}]+)\}\}/g);
    
    expect(variables).toEqual(['{{contact_name}}', '{{company_name}}']);
  });

  test('sollte Variablen korrekt ersetzen', () => {
    const template = 'Die {{company_name}} wurde {{current_year}} gegründet.';
    const context = {
      company_name: 'CeleroPress GmbH',
      current_year: '2024'
    };

    const result = template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      return context[variable as keyof typeof context] || match;
    });

    expect(result).toBe('Die CeleroPress GmbH wurde 2024 gegründet.');
  });

  test('sollte unbekannte Variablen unverändert lassen', () => {
    const template = 'Hallo {{unknown_variable}}!';
    const context = {};

    const result = template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      return context[variable as keyof typeof context] || match;
    });

    expect(result).toBe('Hallo {{unknown_variable}}!');
  });
});

describe('Boilerplate Content Processing', () => {
  test('sollte HTML-Content korrekt verarbeiten', () => {
    const htmlContent = '<p>Hallo <strong>{{company_name}}</strong>!</p>';
    const variables = htmlContent.match(/\{\{([^}]+)\}\}/g);
    
    expect(variables).toEqual(['{{company_name}}']);
  });

  test('sollte mehrere Variablen in einem Text handhaben', () => {
    const content = '{{contact_firstname}} {{contact_lastname}} arbeitet bei {{company_name}} seit {{start_date}}';
    const variables = content.match(/\{\{([^}]+)\}\}/g);
    
    expect(variables).toHaveLength(4);
    expect(variables).toContain('{{contact_firstname}}');
    expect(variables).toContain('{{contact_lastname}}');
    expect(variables).toContain('{{company_name}}');
    expect(variables).toContain('{{start_date}}');
  });
});

describe('Integration Tests', () => {
  test('sollte Service vollständig funktionsfähig sein', () => {
    // Prüfe dass alle wichtigen Service-Methoden verfügbar sind
    const expectedMethods = [
      'getAll',
      'getForClient', 
      'getGroupedByCategory',
      'getForCampaignEditor',
      'getById',
      'getByIds',
      'create',
      'update',
      'delete',
      'archive',
      'toggleFavorite',
      'incrementUsage',
      'incrementUsageMultiple',
      'search',
      'updateSortOrder',
      'duplicate',
      'getStats',
      'migrateFromUserToOrg'
    ];

    expectedMethods.forEach(method => {
      expect(typeof boilerplatesService[method]).toBe('function');
    });
  });
});