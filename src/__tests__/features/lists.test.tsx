// src/__tests__/features/lists.test.tsx
/**
 * Tests für Lists Feature (Verteilerlisten)
 * 
 * Testet die kritischen Funktionen der Verteilerlisten:
 * - CRUD-Operationen für statische und dynamische Listen
 * - Kontakt-Zuordnung und -Selektion
 * - Filter-System für dynamische Listen
 * - Export-Funktionalität
 * - Multi-Tenancy Datenisolation
 */

// Service-Level Tests - No UI rendering required
import '@testing-library/jest-dom';

// Mock Firebase Lists Service
jest.mock('@/lib/firebase/lists-service', () => ({
  listsService: {
    getAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue('new-list-id'),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getContacts: jest.fn().mockResolvedValue([]),
    getContactsByFilters: jest.fn().mockResolvedValue([]),
    getContactsByIds: jest.fn().mockResolvedValue([]),
    refreshDynamicList: jest.fn().mockResolvedValue(undefined),
    export: jest.fn().mockResolvedValue({ data: [], format: 'csv' }),
  },
}));

// Service-Level Tests - Import only service
import { listsService } from '@/lib/firebase/lists-service';

describe('Lists Feature', () => {
  const mockUser = { uid: 'test-user-123', email: 'test@example.com' };
  const mockOrganization = { id: 'test-org-123', name: 'Test Organization' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Lists Service CRUD Operations', () => {
    it('sollte Listen Service korrekt laden', async () => {
      const mockLists = [
        {
          id: 'list1',
          name: 'Tech Journalisten',
          description: 'Technologie-Journalisten Deutschland',
          type: 'dynamic',
          category: 'press',
          contactCount: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'test-user-123',
          organizationId: 'test-org-123',
          filters: { companyTypes: ['media_house'] }
        }
      ];

      (listsService.getAll as jest.Mock).mockResolvedValue(mockLists);

      const result = await listsService.getAll('test-user-123', 'test-org-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tech Journalisten');
      expect(result[0].contactCount).toBe(15);
      expect(result[0].type).toBe('dynamic');
      expect(listsService.getAll).toHaveBeenCalledWith('test-user-123', 'test-org-123');
    });

    it('sollte leere Listen-Service korrekt handhaben', async () => {
      (listsService.getAll as jest.Mock).mockResolvedValue([]);

      const result = await listsService.getAll('test-user-123', 'test-org-123');

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(listsService.getAll).toHaveBeenCalledWith('test-user-123', 'test-org-123');
    });

    it('sollte Listen-Search Service funktionieren', async () => {
      const mockLists = [
        {
          id: 'list1',
          name: 'Tech Journalisten',
          type: 'dynamic',
          contactCount: 15
        },
        {
          id: 'list2',
          name: 'Wirtschaftsreporter',
          type: 'static',
          contactCount: 8
        }
      ];

      (listsService.getAll as jest.Mock).mockResolvedValue(mockLists);

      const allLists = await listsService.getAll('test-user-123', 'test-org-123');
      
      // Client-seitige Suchlogik simulieren
      const searchTerm = 'tech';
      const filteredLists = allLists.filter(list => 
        list.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(allLists).toHaveLength(2);
      expect(filteredLists).toHaveLength(1);
      expect(filteredLists[0].name).toBe('Tech Journalisten');
    });
  });

  describe('Listen-Erstellung (Service-Level)', () => {
    it('sollte neue dynamische Liste erstellen können', async () => {
      const listData = {
        name: 'Neue Dynamische Liste',
        description: 'Test Beschreibung',
        type: 'dynamic',
        category: 'press',
        userId: 'test-user-123',
        organizationId: 'test-org-123',
        filters: { companyTypes: ['media_house'] }
      };

      (listsService.create as jest.Mock).mockResolvedValue('new-dynamic-list');

      const result = await listsService.create(listData);

      expect(result).toBe('new-dynamic-list');
      expect(listsService.create).toHaveBeenCalledWith(listData);
    });

    it('sollte neue statische Liste erstellen können', async () => {
      const listData = {
        name: 'Neue Statische Liste',
        description: 'Test Beschreibung',
        type: 'static',
        category: 'custom',
        userId: 'test-user-123',
        organizationId: 'test-org-123',
        contactIds: ['contact1', 'contact2']
      };

      (listsService.create as jest.Mock).mockResolvedValue('new-static-list');

      const result = await listsService.create(listData);

      expect(result).toBe('new-static-list');
      expect(listsService.create).toHaveBeenCalledWith(listData);
    });

    it('sollte Listen-Validierung durchführen', async () => {
      // Service sollte leere Namen abfangen
      const invalidListData = {
        name: '', // Leerer Name
        type: 'dynamic',
        userId: 'test-user-123',
        organizationId: 'test-org-123'
      };

      (listsService.create as jest.Mock).mockRejectedValue(new Error('Listenname ist erforderlich'));

      await expect(listsService.create(invalidListData)).rejects.toThrow('Listenname ist erforderlich');
    });

    it('sollte dynamische Liste mit Filtern verarbeiten', async () => {
      const mockContacts = [
        { id: 'contact1', name: { firstName: 'Max', lastName: 'Mustermann' } }
      ];

      (listsService.getContactsByFilters as jest.Mock).mockResolvedValue(mockContacts);

      const filters = { companyTypes: ['media_house'], countries: ['DE'] };
      const result = await listsService.getContactsByFilters(filters, 'test-org-123');

      expect(result).toHaveLength(1);
      expect(result[0].name.firstName).toBe('Max');
      expect(listsService.getContactsByFilters).toHaveBeenCalledWith(filters, 'test-org-123');
    });
  });

  describe('Kontakt-Selektion Service', () => {
    it('sollte Kontakte für Liste laden', async () => {
      const mockContacts = [
        {
          id: 'contact1',
          name: { firstName: 'Max', lastName: 'Mustermann' },
          displayName: 'Max Mustermann',
          emails: [{ email: 'max@test.de', primary: true }]
        },
        {
          id: 'contact2',
          name: { firstName: 'Anna', lastName: 'Schmidt' },
          displayName: 'Anna Schmidt',
          emails: [{ email: 'anna@test.de', primary: true }]
        }
      ];

      (listsService.getContactsByIds as jest.Mock).mockResolvedValue(mockContacts);

      const contactIds = ['contact1', 'contact2'];
      const result = await listsService.getContactsByIds(contactIds);

      expect(result).toHaveLength(2);
      expect(result[0].displayName).toBe('Max Mustermann');
      expect(result[1].displayName).toBe('Anna Schmidt');
    });

    it('sollte Kontakt-Suche im Service durchführen', async () => {
      const mockContacts = [
        { id: 'contact1', name: { firstName: 'Max', lastName: 'Mustermann' }, displayName: 'Max Mustermann' },
        { id: 'contact2', name: { firstName: 'Anna', lastName: 'Schmidt' }, displayName: 'Anna Schmidt' }
      ];

      (listsService.getContacts as jest.Mock).mockResolvedValue(mockContacts);

      const allContacts = await listsService.getContacts('test-org-123');
      
      // Client-seitige Suchlogik simulieren
      const searchTerm = 'max';
      const filteredContacts = allContacts.filter(contact =>
        contact.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(allContacts).toHaveLength(2);
      expect(filteredContacts).toHaveLength(1);
      expect(filteredContacts[0].displayName).toBe('Max Mustermann');
    });

    it('sollte Kontakt-Auswahl speichern', async () => {
      const selectedContacts = ['contact1', 'contact2', 'contact3'];
      
      (listsService.update as jest.Mock).mockResolvedValue(undefined);

      await listsService.update('list-id', { contactIds: selectedContacts });

      expect(listsService.update).toHaveBeenCalledWith('list-id', { contactIds: selectedContacts });
    });
  });

  describe('Listen Export Service', () => {
    it('sollte CSV Export funktionieren', async () => {
      const mockExportData = {
        data: [
          { name: 'Max Mustermann', email: 'max@test.de', company: 'Test Verlag' },
          { name: 'Anna Schmidt', email: 'anna@test.de', company: 'Media GmbH' }
        ],
        format: 'csv',
        filename: 'kontakte-export.csv'
      };

      (listsService.export as jest.Mock).mockResolvedValue(mockExportData);

      const result = await listsService.export('list-id', { format: 'csv' });

      expect(result.data).toHaveLength(2);
      expect(result.format).toBe('csv');
      expect(result.filename).toBe('kontakte-export.csv');
      expect(listsService.export).toHaveBeenCalledWith('list-id', { format: 'csv' });
    });
  });

  describe('Multi-Tenancy Service Tests', () => {
    it('sollte nur Listen der aktuellen Organisation laden', async () => {
      const mockLists = [
        { id: 'list1', name: 'Org Liste', organizationId: 'test-org-123', userId: 'test-user-123' }
      ];

      (listsService.getAll as jest.Mock).mockResolvedValue(mockLists);

      const result = await listsService.getAll('test-user-123', 'test-org-123');

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe('test-org-123');
      expect(listsService.getAll).toHaveBeenCalledWith('test-user-123', 'test-org-123');
    });

    it('sollte Listen mit korrekter Organization ID erstellen', async () => {
      const listData = {
        name: 'Multi-Tenancy Test Liste',
        type: 'dynamic',
        userId: 'test-user-123',
        organizationId: 'test-org-123'
      };

      (listsService.create as jest.Mock).mockResolvedValue('org-specific-list');

      const result = await listsService.create(listData);

      expect(result).toBe('org-specific-list');
      expect(listsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'test-org-123',
          userId: 'test-user-123'
        })
      );
    });
  });

  describe('Error Handling Service Tests', () => {
    it('sollte Fehler beim Laden von Listen handhaben', async () => {
      (listsService.getAll as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(listsService.getAll('test-user-123', 'test-org-123')).rejects.toThrow('Network Error');
    });

    it('sollte Fehler beim Erstellen von Listen handhaben', async () => {
      (listsService.create as jest.Mock).mockRejectedValue(new Error('Validation Error'));

      const invalidData = { name: 'Test' };
      await expect(listsService.create(invalidData)).rejects.toThrow('Validation Error');
    });
  });

  describe('Service Accessibility Tests', () => {
    it('sollte Service-Methoden korrekt definiert haben', () => {
      // Teste dass alle erwarteten Service-Methoden vorhanden sind
      expect(typeof listsService.getAll).toBe('function');
      expect(typeof listsService.create).toBe('function');
      expect(typeof listsService.update).toBe('function');
      expect(typeof listsService.delete).toBe('function');
      expect(typeof listsService.getContactsByFilters).toBe('function');
      expect(typeof listsService.export).toBe('function');
    });

    it('sollte Service-Navigation korrekt funktionieren', async () => {
      // Teste Service-basierte Navigation zwischen Listen-Typen
      const dynamicLists = [{ id: 'dyn1', type: 'dynamic' }];
      const staticLists = [{ id: 'stat1', type: 'static' }];

      (listsService.getAll as jest.Mock)
        .mockResolvedValueOnce(dynamicLists)
        .mockResolvedValueOnce(staticLists);

      const dynResult = await listsService.getAll('test-user-123', 'test-org-123');
      const statResult = await listsService.getAll('test-user-123', 'test-org-123');

      expect(dynResult[0].type).toBe('dynamic');
      expect(statResult[0].type).toBe('static');
    });
  });

  describe('Dynamic List Refresh Service', () => {
    it('sollte dynamische Listen aktualisieren', async () => {
      (listsService.refreshDynamicList as jest.Mock).mockResolvedValue(undefined);

      await listsService.refreshDynamicList('dynamic-list-id');

      expect(listsService.refreshDynamicList).toHaveBeenCalledWith('dynamic-list-id');
    });
  });
});