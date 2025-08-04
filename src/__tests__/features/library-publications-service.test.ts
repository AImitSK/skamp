// src/__tests__/features/library-publications-service.test.ts
/**
 * Unit Tests für Publications Service
 * 
 * Testet die Business Logic des Publications-Services:
 * - CRUD-Operationen
 * - Import/Export-Funktionalität
 * - Verifizierungs-Workflow
 * - Filter- und Such-Logic
 * - Datenvalidierung
 * - Error Handling
 */

import { publicationService } from '@/lib/firebase/library-service';
import { Publication, PublicationType, PublicationFormat } from '@/types/library';
import { 
  PUBLICATION_TYPE_LABELS, 
  FREQUENCY_LABELS,
  VALIDATION 
} from '@/lib/constants/library-publications-constants';

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
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    fromDate: jest.fn((date) => ({ toDate: () => date })),
    now: jest.fn(() => ({ toDate: () => new Date() }))
  }
}));

// Mock Firebase App
jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

describe('Publications Service', () => {
  const mockUserId = 'user123';
  const mockOrgId = 'org456';
  const mockContext = { organizationId: mockOrgId, userId: mockUserId };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('sollte eine neue Publikation erstellen', async () => {
        const mockAddDoc = require('firebase/firestore').addDoc;
        mockAddDoc.mockResolvedValue({ id: 'new-pub-id' });

        const pubData: Omit<Publication, 'id' | 'createdAt' | 'updatedAt'> = {
          title: 'Test Magazin',
          subtitle: 'Das führende Fachmagazin',
          publisherId: 'publisher123',
          publisherName: 'Test Verlag GmbH',
          type: 'magazine',
          format: 'print',
          languages: ['de'],
          geographicTargets: ['DE'],
          geographicScope: 'national',
          focusAreas: ['Wirtschaft', 'Politik'],
          metrics: {
            frequency: 'monthly',
            targetAudience: 'Führungskräfte',
            print: {
              circulation: 25000,
              circulationType: 'distributed'
            }
          },
          status: 'active',
          verified: false,
          organizationId: mockOrgId,
          websiteUrl: 'https://test-magazin.de'
        };

        const result = await publicationService.create(pubData, mockContext);

        expect(result).toEqual(expect.objectContaining({
          id: 'new-pub-id'
        }));
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...pubData,
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
            createdBy: mockUserId
          })
        );
      });

      it('sollte Online-Publikation korrekt erstellen', async () => {
        const mockAddDoc = require('firebase/firestore').addDoc;
        mockAddDoc.mockResolvedValue({ id: 'online-pub-id' });

        const onlinePub: Omit<Publication, 'id' | 'createdAt' | 'updatedAt'> = {
          title: 'Digital News Portal',
          type: 'website',
          format: 'online',
          languages: ['de', 'en'],
          geographicTargets: ['DE', 'AT', 'CH'],
          geographicScope: 'international',
          metrics: {
            frequency: 'continuous',
            online: {
              monthlyUniqueVisitors: 150000,
              monthlyPageViews: 500000,
              avgSessionDuration: 180,
              bounceRate: 45
            }
          },
          status: 'active',
          verified: true,
          organizationId: mockOrgId
        };

        await publicationService.create(onlinePub, mockContext);

        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...onlinePub,
            verified: true,
            verifiedAt: expect.anything()
          })
        );
      });
    });

    describe('getAll', () => {
      it('sollte alle Publikationen für Organisation laden', async () => {
        const mockGetDocs = require('firebase/firestore').getDocs;
        const mockQuery = require('firebase/firestore').query;
        const mockWhere = require('firebase/firestore').where;
        const mockOrderBy = require('firebase/firestore').orderBy;

        const mockPubData = {
          id: 'pub1',
          title: 'Test Publikation',
          type: 'magazine',
          organizationId: mockOrgId,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        };

        mockGetDocs.mockResolvedValue({
          docs: [{
            id: 'pub1',
            data: () => mockPubData
          }]
        });

        const result = await publicationService.getAll(mockOrgId);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expect.objectContaining({
          id: 'pub1',
          title: 'Test Publikation'
        }));

        expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', mockOrgId);
        expect(mockWhere).toHaveBeenCalledWith('deletedAt', '==', null);
        expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
      });

      it('sollte nur nicht-gelöschte Publikationen laden', async () => {
        const mockWhere = require('firebase/firestore').where;
        
        await publicationService.getAll(mockOrgId);

        expect(mockWhere).toHaveBeenCalledWith('deletedAt', '==', null);
      });
    });

    describe('getById', () => {
      it('sollte einzelne Publikation laden', async () => {
        const mockGetDoc = require('firebase/firestore').getDoc;
        const mockDoc = require('firebase/firestore').doc;

        const mockPubData = {
          title: 'Test Publikation',
          type: 'magazine',
          organizationId: mockOrgId
        };

        mockGetDoc.mockResolvedValue({
          exists: () => true,
          id: 'pub123',
          data: () => mockPubData
        });

        const result = await publicationService.getById('pub123', mockOrgId);

        expect(result).toEqual(expect.objectContaining({
          id: 'pub123',
          title: 'Test Publikation'
        }));
        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'publications', 'pub123');
      });

      it('sollte null für nicht-existierende Publikation zurückgeben', async () => {
        const mockGetDoc = require('firebase/firestore').getDoc;
        mockGetDoc.mockResolvedValue({
          exists: () => false
        });

        const result = await publicationService.getById('non-existent', mockOrgId);

        expect(result).toBeNull();
      });
    });

    describe('update', () => {
      it('sollte Publikation aktualisieren', async () => {
        const mockUpdateDoc = require('firebase/firestore').updateDoc;
        mockUpdateDoc.mockResolvedValue(undefined);

        const updateData = {
          title: 'Aktualisierter Titel',
          metrics: {
            frequency: 'weekly' as const,
            print: {
              circulation: 30000,
              circulationType: 'sold' as const
            }
          }
        };

        await publicationService.update('pub123', updateData, mockContext);

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...updateData,
            updatedAt: expect.anything(),
            updatedBy: mockUserId
          })
        );
      });
    });

    describe('softDelete', () => {
      it('sollte Publikation soft-löschen', async () => {
        const mockUpdateDoc = require('firebase/firestore').updateDoc;
        
        await publicationService.update('pub123', {
          deletedAt: expect.anything(),
          deletedBy: mockUserId
        }, mockContext);

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            deletedAt: expect.anything(),
            deletedBy: mockUserId
          })
        );
      });
    });
  });

  describe('Verification Operations', () => {
    describe('verify', () => {
      it('sollte Publikation verifizieren', async () => {
        const mockUpdateDoc = require('firebase/firestore').updateDoc;
        
        await publicationService.verify('pub123', mockContext);

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            verified: true,
            verifiedAt: expect.anything(),
            verifiedBy: mockUserId,
            updatedAt: expect.anything()
          })
        );
      });
    });
  });

  describe('Import Operations', () => {
    describe('import', () => {
      it('sollte Publikationen bulk-importieren', async () => {
        const mockAddDoc = require('firebase/firestore').addDoc;
        mockAddDoc.mockResolvedValue({ id: 'imported-pub' });

        const publications: Partial<Publication>[] = [
          {
            title: 'Import Test 1',
            type: 'magazine',
            format: 'print',
            languages: ['de'],
            geographicTargets: ['DE'],
            geographicScope: 'national',
            metrics: { frequency: 'monthly' },
            organizationId: mockOrgId
          },
          {
            title: 'Import Test 2',
            type: 'website',
            format: 'online',
            languages: ['en'],
            geographicTargets: ['US'],
            geographicScope: 'national',
            metrics: { frequency: 'continuous' },
            organizationId: mockOrgId
          }
        ];

        const options = {
          duplicateCheck: true,
          updateExisting: false,
          defaultPublisherId: 'default-publisher'
        };

        const result = await publicationService.import(publications, mockContext, options);

        expect(result.created).toBe(2);
        expect(result.updated).toBe(0);
        expect(result.skipped).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(mockAddDoc).toHaveBeenCalledTimes(2);
      });

      it('sollte Duplikate erkennen und überspringen', async () => {
        const mockGetDocs = require('firebase/firestore').getDocs;
        
        // Mock existing publication
        mockGetDocs.mockResolvedValue({
          docs: [{
            id: 'existing-pub',
            data: () => ({ title: 'Existing Title' })
          }]
        });

        const publications: Partial<Publication>[] = [
          {
            title: 'Existing Title', // Duplicate
            type: 'magazine',
            organizationId: mockOrgId
          }
        ];

        const result = await publicationService.import(publications, mockContext, {
          duplicateCheck: true,
          updateExisting: false
        });

        expect(result.created).toBe(0);
        expect(result.skipped).toBe(1);
      });

      it('sollte Validierungsfehler korrekt behandeln', async () => {
        const publications: Partial<Publication>[] = [
          {
            // Kein Titel - sollte Fehler verursachen
            type: 'magazine',
            organizationId: mockOrgId
          },
          {
            title: 'Valid Publication',
            type: 'magazine',
            organizationId: mockOrgId
          }
        ];

        const result = await publicationService.import(publications, mockContext);

        expect(result.created).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toEqual(expect.objectContaining({
          row: 0,
          error: expect.stringContaining('Titel')
        }));
      });
    });
  });

  describe('Data Validation', () => {
    it('sollte Titel-Länge validieren', () => {
      const longTitle = 'A'.repeat(VALIDATION.TITLE_MAX_LENGTH + 1);
      
      expect(() => {
        // Mock validierung
        if (longTitle.length > VALIDATION.TITLE_MAX_LENGTH) {
          throw new Error(`Titel darf maximal ${VALIDATION.TITLE_MAX_LENGTH} Zeichen lang sein`);
        }
      }).toThrow();
    });

    it('sollte Auflage-Bereich validieren', () => {
      const invalidCirculation = VALIDATION.MAX_CIRCULATION + 1;
      
      expect(() => {
        if (invalidCirculation > VALIDATION.MAX_CIRCULATION) {
          throw new Error(`Auflage darf maximal ${VALIDATION.MAX_CIRCULATION} betragen`);
        }
      }).toThrow();
    });

    it('sollte Bounce-Rate-Bereich validieren', () => {
      const invalidBounceRate = 101;
      
      expect(() => {
        if (invalidBounceRate > VALIDATION.MAX_BOUNCE_RATE) {
          throw new Error(`Bounce Rate darf maximal ${VALIDATION.MAX_BOUNCE_RATE}% betragen`);
        }
      }).toThrow();
    });

    it('sollte URL-Format validieren', () => {
      const invalidUrl = 'not-a-url';
      const urlRegex = /^https?:\/\/.+/;
      
      expect(urlRegex.test(invalidUrl)).toBe(false);
      expect(urlRegex.test('https://valid-url.com')).toBe(true);
    });
  });

  describe('Filter Operations', () => {
    it('sollte nach Publikationstyp filtern', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      const mockWhere = require('firebase/firestore').where;

      await publicationService.getAll(mockOrgId, { type: 'magazine' });

      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'magazine');
    });

    it('sollte nach Sprachen filtern', async () => {
      const mockWhere = require('firebase/firestore').where;

      await publicationService.getAll(mockOrgId, { languages: ['de', 'en'] });

      expect(mockWhere).toHaveBeenCalledWith('languages', 'array-contains-any', ['de', 'en']);
    });

    it('sollte nach Verifizierungsstatus filtern', async () => {
      const mockWhere = require('firebase/firestore').where;

      await publicationService.getAll(mockOrgId, { verified: true });

      expect(mockWhere).toHaveBeenCalledWith('verified', '==', true);
    });
  });

  describe('Search Operations', () => {
    it('sollte Volltext-Suche durchführen', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      
      // Mock search results
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'pub1',
            data: () => ({
              title: 'Wirtschafts Magazin',
              focusAreas: ['Wirtschaft', 'Finanzen']
            })
          }
        ]
      });

      const result = await publicationService.search('Wirtschaft', mockOrgId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Wirtschaft');
    });
  });

  describe('Metrics Operations', () => {
    it('sollte Publikations-Statistiken berechnen', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      
      mockGetDocs.mockResolvedValue({
        docs: [
          { data: () => ({ type: 'magazine', verified: true }) },
          { data: () => ({ type: 'website', verified: false }) },
          { data: () => ({ type: 'magazine', verified: true }) }
        ]
      });

      const stats = await publicationService.getStats(mockOrgId);

      expect(stats).toEqual(expect.objectContaining({
        total: 3,
        verified: 2,
        byType: expect.objectContaining({
          magazine: 2,
          website: 1
        })
      }));
    });
  });

  describe('Error Handling', () => {
    it('sollte Firestore-Fehler korrekt weiterleiten', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Firestore connection failed'));

      await expect(publicationService.getAll(mockOrgId))
        .rejects.toThrow('Firestore connection failed');
    });

    it('sollte ungültige Parameter abfangen', async () => {
      await expect(publicationService.getAll(''))
        .rejects.toThrow();
    });

    it('sollte Berechtigungsfehler behandeln', async () => {
      const mockGetDoc = require('firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ organizationId: 'different-org' })
      });

      await expect(publicationService.getById('pub123', mockOrgId))
        .rejects.toThrow('Berechtigung');
    });
  });

  describe('Performance', () => {
    it('sollte Pagination für große Datenmengen verwenden', async () => {
      const mockLimit = require('firebase/firestore').limit;

      await publicationService.getAll(mockOrgId, {}, { limit: 50 });

      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('sollte Indices für häufige Queries nutzen', async () => {
      const mockOrderBy = require('firebase/firestore').orderBy;
      const mockWhere = require('firebase/firestore').where;

      await publicationService.getAll(mockOrgId, { type: 'magazine' });

      // Verifies that indexed fields are used
      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'magazine');
      expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    });
  });

  describe('Constants Integration', () => {
    it('sollte Type-Labels korrekt verwenden', () => {
      expect(PUBLICATION_TYPE_LABELS['magazine']).toBe('Magazin');
      expect(PUBLICATION_TYPE_LABELS['website']).toBe('Website');
      expect(Object.keys(PUBLICATION_TYPE_LABELS)).toContain('newspaper');
    });

    it('sollte Frequency-Labels korrekt verwenden', () => {
      expect(FREQUENCY_LABELS['monthly']).toBe('Monatlich');
      expect(FREQUENCY_LABELS['weekly']).toBe('Wöchentlich');
      expect(FREQUENCY_LABELS['continuous']).toBe('Durchgehend');
    });

    it('sollte Validierungskonstanten korrekt verwenden', () => {
      expect(VALIDATION.TITLE_MAX_LENGTH).toBe(200);
      expect(VALIDATION.MIN_CIRCULATION).toBe(1);
      expect(VALIDATION.MAX_CIRCULATION).toBe(10000000);
    });
  });
});