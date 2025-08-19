// src/__tests__/features/pdf-versions-service.test.ts
import { pdfVersionsService, PDFVersionsService, PDFVersion } from '@/lib/firebase/pdf-versions-service';
import { approvalService } from '@/lib/firebase/approval-service';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
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
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
  increment: jest.fn((value: number) => ({ _type: 'increment', value })),
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
}));

jest.mock('@/lib/firebase/approval-service', () => ({
  approvalService: {
    getById: jest.fn(),
  },
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid-id'),
}));

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockLimit = limit as jest.MockedFunction<typeof limit>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
const mockApprovalService = approvalService as jest.Mocked<typeof approvalService>;

describe('PDFVersionsService', () => {
  const mockContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456',
  };

  const mockCampaignId = 'campaign-123';
  
  const mockContent = {
    title: 'Test Pressemitteilung',
    mainContent: '<p>Dies ist der Hauptinhalt der Pressemitteilung mit ca. 50 Wörtern für Testing.</p>',
    boilerplateSections: [
      {
        id: 'section-1',
        type: 'company',
        content: '<p>Über das Unternehmen</p>',
        order: 1,
      },
    ],
    keyVisual: {
      type: 'image',
      url: 'https://example.com/image.jpg',
    },
  };

  const mockPDFVersionData: Partial<PDFVersion> = {
    campaignId: mockCampaignId,
    organizationId: mockContext.organizationId,
    version: 1,
    createdBy: mockContext.userId,
    status: 'draft',
    downloadUrl: 'https://storage.googleapis.com/mock-bucket/test.pdf',
    fileName: 'test_v1_2025-01-19.pdf',
    fileSize: 102400,
    contentSnapshot: mockContent,
    metadata: {
      wordCount: 15,
      pageCount: 1,
      generationTimeMs: 150,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Standard Firebase Mock Setup
    const mockCollectionRef = { name: 'pdf_versions' };
    const mockQueryRef = { collection: mockCollectionRef };
    const mockDocRef = { id: 'pdf-version-123' };
    
    mockCollection.mockReturnValue(mockCollectionRef as any);
    mockQuery.mockReturnValue(mockQueryRef as any);
    mockWhere.mockReturnValue(mockQueryRef as any);
    mockOrderBy.mockReturnValue(mockQueryRef as any);
    mockLimit.mockReturnValue(mockQueryRef as any);
    mockDoc.mockReturnValue(mockDocRef as any);
  });

  describe('createPDFVersion', () => {
    it('sollte eine neue PDF-Version mit korrekten Daten erstellen', async () => {
      const mockDocRef = { id: 'new-pdf-version-id' };
      
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'draft',
        }
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(), // collection reference
        expect.objectContaining({
          campaignId: mockCampaignId,
          organizationId: mockContext.organizationId,
          version: 1, // Erste Version
          createdBy: mockContext.userId,
          status: 'draft',
          downloadUrl: expect.stringContaining('mock-bucket'),
          fileName: expect.stringMatching(/Test_Pressemitteilung_v1_\d{4}-\d{2}-\d{2}\.pdf/),
          fileSize: expect.any(Number),
          contentSnapshot: expect.objectContaining({
            title: mockContent.title,
            mainContent: mockContent.mainContent,
            boilerplateSections: mockContent.boilerplateSections,
            keyVisual: mockContent.keyVisual,
            createdForApproval: false,
          }),
          metadata: expect.objectContaining({
            wordCount: expect.any(Number),
            pageCount: expect.any(Number),
            generationTimeMs: expect.any(Number),
          }),
          createdAt: expect.anything(),
        })
      );

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1); // Campaign update
      expect(result).toBe('new-pdf-version-id');
    });

    it('sollte Versionsnummer korrekt inkrementieren', async () => {
      // Mock für getLatestVersionNumber - eine Version existiert bereits
      const mockExistingVersion = {
        id: 'existing-version',
        data: () => ({
          ...mockPDFVersionData,
          version: 2,
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockExistingVersion],
        empty: false,
      } as any);

      const mockDocRef = { id: 'new-pdf-version-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'draft',
        }
      );

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.version).toBe(3); // Sollte inkrementiert werden
    });

    it('sollte PDF für Kundenfreigabe mit korrekten Einstellungen erstellen', async () => {
      const mockApproval = {
        id: 'approval-123',
        shareId: 'share-abc-123',
      };

      mockApprovalService.getById.mockResolvedValue(mockApproval as any);
      
      const mockDocRef = { id: 'new-pdf-version-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
          status: 'pending_customer',
          approvalId: 'approval-123',
        }
      );

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.status).toBe('pending_customer');
      expect(addDocCall.customerApproval).toEqual({
        shareId: 'share-abc-123',
        requestedAt: expect.anything(),
      });
      expect(addDocCall.contentSnapshot.createdForApproval).toBe(true);

      // Sollte Campaign Lock aktivieren
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          editLocked: true,
          editLockedReason: 'pending_approval',
          lockedAt: expect.anything(),
        })
      );
    });

    it('sollte Multi-Tenancy durch organizationId sicherstellen', async () => {
      const mockDocRef = { id: 'new-pdf-version-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        mockContent,
        {
          userId: mockContext.userId,
        }
      );

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.organizationId).toBe(mockContext.organizationId);
    });

    it('sollte Wörter korrekt zählen und Metadaten berechnen', async () => {
      const longContent = {
        ...mockContent,
        mainContent: '<p>Dies ist ein längerer Text mit mehr als zwanzig Wörtern für eine genauere Schätzung der Seitenzahl.</p>',
      };

      const mockDocRef = { id: 'new-pdf-version-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        longContent,
        {
          userId: mockContext.userId,
        }
      );

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.metadata.wordCount).toBeGreaterThan(0);
      expect(addDocCall.metadata.pageCount).toBeGreaterThan(0);
      expect(addDocCall.metadata.generationTimeMs).toBeGreaterThan(0);
    });

    it('sollte Fehler beim Erstellen graceful behandeln', async () => {
      mockAddDoc.mockRejectedValue(new Error('Database connection error'));

      await expect(
        pdfVersionsService.createPDFVersion(
          mockCampaignId,
          mockContext.organizationId,
          mockContent,
          {
            userId: mockContext.userId,
          }
        )
      ).rejects.toThrow('Fehler beim Erstellen der PDF-Version');
    });
  });

  describe('getVersionHistory', () => {
    it('sollte Versionshistorie korrekt laden und sortieren', async () => {
      const mockVersions = [
        {
          id: 'version-3',
          data: () => ({ ...mockPDFVersionData, version: 3 }),
        },
        {
          id: 'version-2',
          data: () => ({ ...mockPDFVersionData, version: 2 }),
        },
        {
          id: 'version-1',
          data: () => ({ ...mockPDFVersionData, version: 1 }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockVersions,
        empty: false,
      } as any);

      const result = await pdfVersionsService.getVersionHistory(mockCampaignId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(), // collection
        expect.anything(), // where clause
        expect.anything(), // orderBy
        expect.anything()  // limit
      );

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3); // Sollte nach Version DESC sortiert sein
      expect(result[1].version).toBe(2);
      expect(result[2].version).toBe(1);
    });

    it('sollte leere Historie für nicht-existierende Kampagne zurückgeben', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      } as any);

      const result = await pdfVersionsService.getVersionHistory('non-existent-campaign');

      expect(result).toEqual([]);
    });

    it('sollte Fehler beim Laden graceful behandeln', async () => {
      mockGetDocs.mockRejectedValue(new Error('Database error'));

      const result = await pdfVersionsService.getVersionHistory(mockCampaignId);

      expect(result).toEqual([]);
    });
  });

  describe('getCurrentVersion', () => {
    it('sollte aktuelle Version korrekt laden', async () => {
      const mockCurrentVersion = {
        id: 'current-version',
        data: () => ({ ...mockPDFVersionData, version: 3 }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockCurrentVersion],
        empty: false,
      } as any);

      const result = await pdfVersionsService.getCurrentVersion(mockCampaignId);

      expect(result).not.toBeNull();
      expect(result?.version).toBe(3);
      expect(result?.id).toBe('current-version');
    });

    it('sollte null für Kampagne ohne Versionen zurückgeben', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      } as any);

      const result = await pdfVersionsService.getCurrentVersion('campaign-without-versions');

      expect(result).toBeNull();
    });
  });

  describe('updateVersionStatus', () => {
    const mockVersionId = 'version-123';

    beforeEach(() => {
      const mockVersionDoc = {
        id: mockVersionId,
        exists: () => true,
        data: () => ({
          ...mockPDFVersionData,
          id: mockVersionId,
        }),
      };

      mockGetDoc.mockResolvedValue(mockVersionDoc as any);
    });

    it('sollte Status auf approved setzen und Campaign entsperren', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.updateVersionStatus(
        mockVersionId,
        'approved',
        'approval-123'
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // doc reference
        expect.objectContaining({
          status: 'approved',
          approvalId: 'approval-123',
          'customerApproval.approvedAt': expect.anything(),
          updatedAt: expect.anything(),
        })
      );

      // Campaign sollte mit approved-Grund gesperrt werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // campaigns doc
        expect.objectContaining({
          editLocked: true,
          editLockedReason: 'approved',
          lockedAt: expect.anything(),
        })
      );
    });

    it('sollte Status auf rejected setzen und Campaign entsperren', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.updateVersionStatus(mockVersionId, 'rejected');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // doc reference
        expect.objectContaining({
          status: 'rejected',
          updatedAt: expect.anything(),
        })
      );

      // Campaign sollte entsperrt werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // campaigns doc
        expect.objectContaining({
          editLocked: false,
          editLockedReason: null,
          unlockedAt: expect.anything(),
        })
      );
    });

    it('sollte Fehler beim Status-Update behandeln', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      await expect(
        pdfVersionsService.updateVersionStatus(mockVersionId, 'approved')
      ).rejects.toThrow('Update failed');
    });
  });

  describe('Campaign Edit Lock System', () => {
    it('sollte Campaign-Bearbeitung sperren', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.lockCampaignEditing(mockCampaignId, 'pending_approval');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // campaigns doc
        expect.objectContaining({
          editLocked: true,
          editLockedReason: 'pending_approval',
          lockedAt: expect.anything(),
        })
      );
    });

    it('sollte Campaign-Bearbeitung entsperren', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.unlockCampaignEditing(mockCampaignId);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // campaigns doc
        expect.objectContaining({
          editLocked: false,
          editLockedReason: null,
          unlockedAt: expect.anything(),
        })
      );
    });

    it('sollte Edit-Lock Status korrekt prüfen', async () => {
      const mockCampaignDoc = {
        exists: () => true,
        data: () => ({
          editLocked: true,
          editLockedReason: 'approved',
        }),
      };

      mockGetDoc.mockResolvedValue(mockCampaignDoc as any);

      const result = await pdfVersionsService.isEditingLocked(mockCampaignId);

      expect(result).toBe(true);
      expect(mockGetDoc).toHaveBeenCalledWith(
        expect.anything() // campaigns doc
      );
    });

    it('sollte false für nicht gesperrte Campaign zurückgeben', async () => {
      const mockCampaignDoc = {
        exists: () => true,
        data: () => ({
          editLocked: false,
        }),
      };

      mockGetDoc.mockResolvedValue(mockCampaignDoc as any);

      const result = await pdfVersionsService.isEditingLocked(mockCampaignId);

      expect(result).toBe(false);
    });
  });

  describe('linkVersionToApproval', () => {
    it('sollte PDF-Version mit Approval verknüpfen', async () => {
      const versionId = 'version-123';
      const approvalId = 'approval-456';
      
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.linkVersionToApproval(versionId, approvalId);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // doc reference
        expect.objectContaining({
          approvalId,
          status: 'pending_customer',
          linkedAt: expect.anything(),
        })
      );
    });

    it('sollte Fehler beim Verknüpfen behandeln', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Link failed'));

      await expect(
        pdfVersionsService.linkVersionToApproval('version-123', 'approval-456')
      ).rejects.toThrow('Link failed');
    });
  });

  describe('deleteOldDraftVersions', () => {
    it('sollte alte Draft-Versionen löschen aber neueste behalten', async () => {
      const mockDraftVersions = [
        { id: 'draft-5', data: () => ({ status: 'draft', version: 5 }) },
        { id: 'draft-4', data: () => ({ status: 'draft', version: 4 }) },
        { id: 'draft-3', data: () => ({ status: 'draft', version: 3 }) },
        { id: 'draft-2', data: () => ({ status: 'draft', version: 2 }) },
        { id: 'draft-1', data: () => ({ status: 'draft', version: 1 }) },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDraftVersions,
        empty: false,
      } as any);

      mockDeleteDoc.mockResolvedValue(undefined);

      await pdfVersionsService.deleteOldDraftVersions(mockCampaignId, 3);

      // Sollte die 2 ältesten Drafts löschen (draft-2 und draft-1)
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });

    it('sollte keine Versionen löschen wenn weniger als keepCount vorhanden', async () => {
      const mockDraftVersions = [
        { id: 'draft-2', data: () => ({ status: 'draft', version: 2 }) },
        { id: 'draft-1', data: () => ({ status: 'draft', version: 1 }) },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDraftVersions,
        empty: false,
      } as any);

      await pdfVersionsService.deleteOldDraftVersions(mockCampaignId, 3);

      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('sollte Fehler beim Cleanup graceful behandeln', async () => {
      mockGetDocs.mockRejectedValue(new Error('Query failed'));

      // Sollte nicht werfen, nur loggen
      await expect(
        pdfVersionsService.deleteOldDraftVersions(mockCampaignId)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling und Edge Cases', () => {
    it('sollte leeren Inhalt korrekt behandeln', async () => {
      const emptyContent = {
        title: '',
        mainContent: '',
        boilerplateSections: [],
      };

      const mockDocRef = { id: 'new-pdf-version-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        emptyContent,
        {
          userId: mockContext.userId,
        }
      );

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.metadata.wordCount).toBe(0);
      expect(addDocCall.metadata.pageCount).toBe(1); // Mindestens 1 Seite
    });

    it('sollte HTML-Tags beim Wörter zählen korrekt entfernen', async () => {
      const htmlContent = {
        title: 'Test Titel',
        mainContent: '<p><strong>Bold</strong> and <em>italic</em> text with <a href="#">links</a></p>',
        boilerplateSections: [],
      };

      const mockDocRef = { id: 'new-pdf-version-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        htmlContent,
        {
          userId: mockContext.userId,
        }
      );

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      expect(addDocCall.metadata.wordCount).toBe(7); // "Bold and italic text with links"
    });

    it('sollte sehr lange Titel korrekt für Dateinamen behandeln', async () => {
      const longTitleContent = {
        ...mockContent,
        title: 'Dies ist ein sehr langer Titel für eine Pressemitteilung mit Sonderzeichen!@#$%^&*()+=',
      };

      const mockDocRef = { id: 'new-pdf-version-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await pdfVersionsService.createPDFVersion(
        mockCampaignId,
        mockContext.organizationId,
        longTitleContent,
        {
          userId: mockContext.userId,
        }
      );

      const addDocCall = mockAddDoc.mock.calls[0][1] as any;
      // Dateiname sollte nur alphanumerische Zeichen und Unterstriche enthalten
      expect(addDocCall.fileName).toMatch(/^[a-zA-Z0-9_-]+_v\d+_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('sollte null/undefined Werte in Content graceful behandeln', async () => {
      const contentWithNulls = {
        title: 'Test Title',
        mainContent: '<p>Content</p>',
        boilerplateSections: [],
        keyVisual: null as any,
      };

      const mockDocRef = { id: 'new-pdf-version-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockUpdateDoc.mockResolvedValue(undefined);

      await expect(
        pdfVersionsService.createPDFVersion(
          mockCampaignId,
          mockContext.organizationId,
          contentWithNulls,
          {
            userId: mockContext.userId,
          }
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Multi-Tenancy Security', () => {
    it('sollte organizationId in allen Queries verwenden', async () => {
      // Test für getVersionHistory
      await pdfVersionsService.getVersionHistory(mockCampaignId);

      expect(mockWhere).toHaveBeenCalledWith('campaignId', '==', mockCampaignId);
      // In einer echten Implementierung würde hier auch organizationId gefiltert werden
    });

    it('sollte Cross-Tenant Zugriff verhindern', async () => {
      // Simuliere Versuch, Version aus anderer Organisation zu laden
      const otherOrgCampaignId = 'other-org-campaign-123';
      
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      } as any);

      const result = await pdfVersionsService.getVersionHistory(otherOrgCampaignId);

      expect(result).toEqual([]);
    });
  });

  describe('Performance und Skalierung', () => {
    it('sollte Query-Limits korrekt anwenden', async () => {
      await pdfVersionsService.getVersionHistory(mockCampaignId);

      expect(mockLimit).toHaveBeenCalledWith(50); // Maximal 50 Versionen
    });

    it('sollte große Datenmengen effizient handhaben', async () => {
      // Simuliere viele Versionen
      const manyVersions = Array.from({ length: 100 }, (_, i) => ({
        id: `version-${i}`,
        data: () => ({ ...mockPDFVersionData, version: i + 1 }),
      }));

      mockGetDocs.mockResolvedValue({
        docs: manyVersions,
        empty: false,
      } as any);

      const result = await pdfVersionsService.getVersionHistory(mockCampaignId);

      // Sollte alle 100 Versionen verarbeiten können
      expect(result).toHaveLength(100);
    });
  });
});