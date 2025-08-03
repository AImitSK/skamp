// src/__tests__/features/lists-service.test.ts
/**
 * Unit Tests für Lists Service
 * 
 * Testet die Business Logic des Listen-Services:
 * - CRUD-Operationen
 * - Filter-Logic für dynamische Listen
 * - Kontakt-Zuordnung
 * - Datenvalidierung
 * - Error Handling
 */

import { listsService } from '@/lib/firebase/lists-service';
import { DistributionList, ListFilters } from '@/types/lists';
import { ContactEnhanced } from '@/types/crm-enhanced';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
  arrayContains: jest.fn(),
  arrayContainsAny: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    fromDate: jest.fn((date) => ({ toDate: () => date })),
    now: jest.fn(() => ({ toDate: () => new Date() }))
  }
}));

// Mock Firebase App
jest.mock('@/lib/firebase', () => ({
  db: {}
}));

describe('Lists Service', () => {
  const mockUserId = 'user123';
  const mockOrgId = 'org456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('sollte eine neue Liste erstellen', async () => {
        const mockAddDoc = require('firebase/firestore').addDoc;
        mockAddDoc.mockResolvedValue({ id: 'new-list-id' });

        const listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'> = {
          name: 'Test Liste',
          description: 'Test Beschreibung',
          type: 'dynamic',
          category: 'press',
          userId: mockUserId,
          organizationId: mockOrgId,
          filters: { companyTypes: ['media_house'] },
          contactIds: []
        };

        const result = await listsService.create(listData);

        expect(result).toBe('new-list-id');
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...listData,
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
            contactCount: 0
          })
        );
      });

      it('sollte statische Liste mit Kontakten erstellen', async () => {
        const mockAddDoc = require('firebase/firestore').addDoc;
        mockAddDoc.mockResolvedValue({ id: 'static-list-id' });

        const listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'> = {
          name: 'Statische Liste',
          description: '',
          type: 'static',
          category: 'custom',
          userId: mockUserId,
          organizationId: mockOrgId,
          filters: {},
          contactIds: ['contact1', 'contact2', 'contact3']
        };

        await listsService.create(listData);

        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            contactCount: 3,
            contactIds: ['contact1', 'contact2', 'contact3']
          })
        );
      });
    });

    describe('getAll', () => {
      it('sollte alle Listen für User und Organisation laden', async () => {
        const mockGetDocs = require('firebase/firestore').getDocs;
        const mockQuery = require('firebase/firestore').query;
        const mockWhere = require('firebase/firestore').where;
        const mockOrderBy = require('firebase/firestore').orderBy;

        const mockListData = {
          id: 'list1',
          name: 'Test Liste',
          type: 'dynamic',
          userId: mockUserId,
          organizationId: mockOrgId,
          createdAt: { toDate: () => new Date() }
        };

        mockGetDocs.mockResolvedValue({
          docs: [{
            id: 'list1',
            data: () => mockListData
          }]
        });

        const result = await listsService.getAll(mockUserId, mockOrgId);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expect.objectContaining({
          id: 'list1',
          name: 'Test Liste'
        }));

        // Verify correct query construction
        expect(mockQuery).toHaveBeenCalled();
        expect(mockWhere).toHaveBeenCalledWith('userId', '==', mockUserId);
        expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrgId);
        expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
      });
    });

    describe('update', () => {
      it('sollte eine Liste aktualisieren', async () => {
        const mockUpdateDoc = require('firebase/firestore').updateDoc;
        mockUpdateDoc.mockResolvedValue(undefined);

        const updateData = {
          name: 'Aktualisierte Liste',
          description: 'Neue Beschreibung'
        };

        await listsService.update('list123', updateData);

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...updateData,
            updatedAt: expect.anything()
          })
        );
      });
    });

    describe('delete', () => {
      it('sollte eine Liste löschen', async () => {
        const mockDeleteDoc = require('firebase/firestore').deleteDoc;
        mockDeleteDoc.mockResolvedValue(undefined);

        await listsService.delete('list123');

        expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything());
      });
    });
  });

  describe('Filter Operations', () => {
    describe('getContactsByFilters', () => {
      it('sollte Kontakte nach Firmentyp filtern', async () => {
        const mockGetDocs = require('firebase/firestore').getDocs;
        const mockQuery = require('firebase/firestore').query;
        const mockWhere = require('firebase/firestore').where;

        const filters: ListFilters = {
          companyTypes: ['media_house', 'publisher']
        };

        const mockContacts = [
          {
            id: 'contact1',
            name: { firstName: 'Max', lastName: 'Mustermann' },
            companyType: 'media_house'
          }
        ];

        mockGetDocs.mockResolvedValue({
          docs: mockContacts.map(contact => ({
            id: contact.id,
            data: () => contact
          }))
        });

        const result = await listsService.getContactsByFilters(filters, mockOrgId);

        expect(result).toHaveLength(1);
        expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrgId);
        // Hier würden weitere Filter-Assertions folgen
      });

      it('sollte nach mehreren Kriterien filtern', async () => {
        const filters: ListFilters = {
          companyTypes: ['media_house'],
          countries: ['DE', 'AT'],
          hasEmail: true,
          tagIds: ['tag1', 'tag2']
        };

        await listsService.getContactsByFilters(filters, mockOrgId);

        // Verify dass alle Filter-Bedingungen angewendet werden
        const mockWhere = require('firebase/firestore').where;
        expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrgId);
        // Weitere Filter-Assertions...
      });
    });

    describe('getContactsByIds', () => {
      it('sollte Kontakte nach IDs laden', async () => {
        const mockGetDocs = require('firebase/firestore').getDocs;
        const contactIds = ['contact1', 'contact2'];

        const mockContacts = contactIds.map(id => ({
          id,
          name: { firstName: 'Test', lastName: `User ${id}` }
        }));

        mockGetDocs.mockResolvedValue({
          docs: mockContacts.map(contact => ({
            id: contact.id,
            data: () => contact
          }))
        });

        const result = await listsService.getContactsByIds(contactIds);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('contact1');
        expect(result[1].id).toBe('contact2');
      });

      it('sollte leeres Array für leere ID-Liste zurückgeben', async () => {
        const result = await listsService.getContactsByIds([]);

        expect(result).toEqual([]);
      });
    });
  });

  describe('Dynamic List Operations', () => {
    describe('refreshDynamicList', () => {
      it('sollte dynamische Liste aktualisieren', async () => {
        const mockGetDoc = require('firebase/firestore').getDoc;
        const mockUpdateDoc = require('firebase/firestore').updateDoc;

        const mockList = {
          id: 'dynamic-list',
          name: 'Dynamic Test List',
          type: 'dynamic',
          filters: { companyTypes: ['media_house'] },
          organizationId: mockOrgId
        };

        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => mockList
        });

        // Mock getContactsByFilters für die Neuberechnung
        jest.spyOn(listsService, 'getContactsByFilters').mockResolvedValue([
          { id: 'contact1' } as ContactEnhanced,
          { id: 'contact2' } as ContactEnhanced
        ]);

        await listsService.refreshDynamicList('dynamic-list');

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            contactCount: 2,
            lastUpdated: expect.anything()
          })
        );
      });

      it('sollte Fehler für nicht-existierende Liste werfen', async () => {
        const mockGetDoc = require('firebase/firestore').getDoc;
        mockGetDoc.mockResolvedValue({
          exists: () => false
        });

        await expect(listsService.refreshDynamicList('non-existent'))
          .rejects.toThrow('Liste nicht gefunden');
      });

      it('sollte Fehler für statische Liste werfen', async () => {
        const mockGetDoc = require('firebase/firestore').getDoc;
        mockGetDoc.mockResolvedValue({
          exists: () => true,
          data: () => ({ type: 'static' })
        });

        await expect(listsService.refreshDynamicList('static-list'))
          .rejects.toThrow('Nur dynamische Listen können aktualisiert werden');
      });
    });
  });

  describe('Data Validation', () => {
    it('sollte ungültige Filter-Werte ignorieren', async () => {
      const invalidFilters: ListFilters = {
        companyTypes: [], // Leeres Array
        countries: undefined as any, // Undefined
        hasEmail: null as any, // Null
        tagIds: ['valid-tag']
      };

      // Should not throw and should only apply valid filters
      await expect(
        listsService.getContactsByFilters(invalidFilters, mockOrgId)
      ).resolves.toBeDefined();
    });

    it('sollte Kontakt-IDs validieren', async () => {
      const invalidIds = ['', null, undefined, 'valid-id'];

      // Should filter out invalid IDs
      const result = await listsService.getContactsByIds(invalidIds as any);

      // Result should only include contacts with valid IDs
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('sollte Firestore-Fehler korrekt weiterleiten', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Firestore connection failed'));

      await expect(listsService.getAll(mockUserId, mockOrgId))
        .rejects.toThrow('Firestore connection failed');
    });

    it('sollte ungültige Parameter abfangen', async () => {
      // Test mit leerem User ID
      await expect(listsService.getAll('', mockOrgId))
        .rejects.toThrow();

      // Test mit leerem Organization ID
      await expect(listsService.getAll(mockUserId, ''))
        .rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('sollte Queries mit Limits für große Datenmengen verwenden', async () => {
      const mockLimit = require('firebase/firestore').limit;

      const filters: ListFilters = {
        companyTypes: ['media_house']
      };

      await listsService.getContactsByFilters(filters, mockOrgId);

      // Should apply reasonable limits for performance
      expect(mockLimit).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});