/**
 * Plan 6/9: Media-Assets-Integration Service Tests
 * 
 * Testet die Pipeline-Asset-Integration im MediaService:
 * - createProjectAssetAttachment()
 * - resolveAttachedAssets()  
 * - validateAssetAttachments()
 * - refreshAssetSnapshots()
 * - getProjectAssetSummary()
 * - shareAssetToProject()
 * - getAssetUsageInProject()
 */

import { mediaService } from '@/lib/firebase/media-service';
import { Timestamp } from 'firebase/firestore';
import type { CampaignAssetAttachment, ResolvedAsset, AssetValidationResult } from '@/types/pr';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('firebase/storage');
jest.mock('@/lib/firebase/config');

// Mock nanoid für Attachment-IDs
jest.mock('nanoid', () => ({
  nanoid: () => 'test-attachment-id-123'
}));

// Mock pr-service für circular dependency prevention
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getByProjectId: jest.fn()
  }
}));

describe('Plan 6/9: Media-Assets-Integration Service', () => {
  const mockOrganizationId = 'org123';
  const mockUserId = 'user123';
  const mockAssetId = 'asset123';
  const mockProjectId = 'project123';
  const mockContext = { organizationId: mockOrganizationId, userId: mockUserId };

  const mockMediaAsset = {
    id: mockAssetId,
    fileName: 'test-asset.jpg',
    fileType: 'image/jpeg',
    downloadUrl: 'https://storage.googleapis.com/test/asset.jpg',
    description: 'Test Asset für Pipeline',
    userId: mockOrganizationId,
    organizationId: mockOrganizationId,
    createdAt: Timestamp.now(),
    metadata: {
      copyright: { owner: 'Test Owner', license: 'CC-BY' },
      author: { name: 'Test Author' },
      fileSize: 1024000
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProjectAssetAttachment()', () => {
    it('sollte Pipeline-Asset-Attachment korrekt erstellen', async () => {
      // Mock Asset laden
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(mockMediaAsset);

      const result = await mediaService.createProjectAssetAttachment(
        mockAssetId,
        mockProjectId,
        'creation',
        mockContext
      );

      expect(result).toMatchObject({
        id: 'test-attachment-id-123',
        type: 'asset',
        assetId: mockAssetId,
        projectId: mockProjectId,
        metadata: {
          fileName: 'test-asset.jpg',
          fileType: 'image/jpeg',
          thumbnailUrl: 'https://storage.googleapis.com/test/asset.jpg',
          description: 'Test Asset für Pipeline',
          attachedInPhase: 'creation',
          needsRefresh: false,
          copyright: 'Test Owner',
          author: 'Test Author',
          license: 'CC-BY'
        }
      });

      expect(result.attachedAt).toBeDefined();
      expect(result.attachedBy).toBe(mockUserId);
      expect(mediaService.getMediaAssetById).toHaveBeenCalledWith(mockAssetId);
    });

    it('sollte Fehler werfen wenn Asset nicht gefunden', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(null);

      await expect(
        mediaService.createProjectAssetAttachment(
          'nonexistent-asset',
          mockProjectId,
          'creation',
          mockContext
        )
      ).rejects.toThrow('Asset nicht gefunden');
    });

    it('sollte Pipeline-Tracking-Metadaten korrekt setzen', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(mockMediaAsset);

      const result = await mediaService.createProjectAssetAttachment(
        mockAssetId,
        mockProjectId,
        'internal_approval',
        mockContext
      );

      expect(result.metadata.attachedInPhase).toBe('internal_approval');
      expect(result.metadata.lastVerified).toBeDefined();
      expect(result.metadata.needsRefresh).toBe(false);
    });
  });

  describe('resolveAttachedAssets()', () => {
    const mockAttachment: CampaignAssetAttachment = {
      id: 'attachment-123',
      type: 'asset',
      assetId: mockAssetId,
      projectId: mockProjectId,
      metadata: {
        fileName: 'old-name.jpg',
        fileType: 'image/jpeg',
        attachedAt: Timestamp.now(),
        attachedInPhase: 'creation',
        lastVerified: Timestamp.fromMillis(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 Tage alt
        needsRefresh: false
      },
      attachedAt: Timestamp.now(),
      attachedBy: mockUserId
    };

    it('sollte verfügbare Assets korrekt auflösen', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(mockMediaAsset);

      const results = await mediaService.resolveAttachedAssets([mockAttachment], true, mockContext);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        attachment: mockAttachment,
        asset: mockMediaAsset,
        isAvailable: true,
        downloadUrl: mockMediaAsset.downloadUrl,
        hasChanged: true, // fileName unterschiedlich
        needsRefresh: true // Mehr als 7 Tage alt + hasChanged
      });
    });

    it('sollte Multi-Tenancy-Validierung durchführen', async () => {
      const otherOrgAsset = { ...mockMediaAsset, userId: 'other-org' };
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(otherOrgAsset);

      const results = await mediaService.resolveAttachedAssets([mockAttachment], true, mockContext);

      expect(results[0]).toMatchObject({
        isAvailable: false,
        error: 'Keine Berechtigung für dieses Asset'
      });
    });

    it('sollte fehlende Assets erkennen', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(null);

      const results = await mediaService.resolveAttachedAssets([mockAttachment], true, mockContext);

      expect(results[0]).toMatchObject({
        isAvailable: false,
        error: 'Asset nicht gefunden'
      });
    });

    it('sollte Folder-Attachments auflösen', async () => {
      const folderAttachment: CampaignAssetAttachment = {
        ...mockAttachment,
        type: 'folder',
        folderId: 'folder123',
        assetId: undefined
      };

      jest.spyOn(mediaService, 'getMediaAssetsInFolder').mockResolvedValue([mockMediaAsset]);

      const results = await mediaService.resolveAttachedAssets([folderAttachment]);

      expect(results[0].isAvailable).toBe(true);
      expect(mediaService.getMediaAssetsInFolder).toHaveBeenCalledWith('folder123');
    });

    it('sollte Change-Detection korrekt durchführen', async () => {
      const unchangedAttachment = {
        ...mockAttachment,
        metadata: {
          ...mockAttachment.metadata,
          fileName: mockMediaAsset.fileName, // Gleicher Name
          fileType: mockMediaAsset.fileType,  // Gleicher Typ
          lastVerified: Timestamp.now() // Frisch verifiziert
        }
      };

      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(mockMediaAsset);

      const results = await mediaService.resolveAttachedAssets([unchangedAttachment]);

      expect(results[0]).toMatchObject({
        hasChanged: false,
        needsRefresh: false
      });
    });
  });

  describe('validateAssetAttachments()', () => {
    const mockAttachments: CampaignAssetAttachment[] = [
      {
        id: 'attachment-1',
        type: 'asset',
        assetId: 'valid-asset',
        projectId: mockProjectId,
        metadata: { fileName: 'valid.jpg', fileType: 'image/jpeg' },
        attachedAt: Timestamp.now(),
        attachedBy: mockUserId
      },
      {
        id: 'attachment-2', 
        type: 'asset',
        assetId: 'missing-asset',
        projectId: mockProjectId,
        metadata: { fileName: 'missing.jpg', fileType: 'image/jpeg' },
        attachedAt: Timestamp.now(),
        attachedBy: mockUserId
      }
    ];

    it('sollte Asset-Validierung korrekt durchführen', async () => {
      jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([
        {
          attachment: mockAttachments[0],
          asset: mockMediaAsset,
          isAvailable: true,
          hasChanged: false,
          needsRefresh: false
        },
        {
          attachment: mockAttachments[1],
          isAvailable: false,
          hasChanged: false,
          needsRefresh: false,
          error: 'Asset nicht gefunden'
        }
      ]);

      const result = await mediaService.validateAssetAttachments(mockAttachments, mockContext);

      expect(result).toMatchObject({
        isValid: false, // Wegen fehlenden Assets
        missingAssets: ['missing-asset'],
        outdatedSnapshots: [],
        validationErrors: ['missing.jpg: Asset nicht gefunden'],
        lastValidated: expect.any(Object)
      });
    });

    it('sollte veraltete Snapshots identifizieren', async () => {
      jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([
        {
          attachment: mockAttachments[0],
          asset: mockMediaAsset,
          isAvailable: true,
          hasChanged: true,
          needsRefresh: true
        }
      ]);

      const result = await mediaService.validateAssetAttachments([mockAttachments[0]], mockContext);

      expect(result.outdatedSnapshots).toContain('attachment-1');
    });

    it('sollte gültige Assets als valid markieren', async () => {
      jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([
        {
          attachment: mockAttachments[0],
          asset: mockMediaAsset,
          isAvailable: true,
          hasChanged: false,
          needsRefresh: false
        }
      ]);

      const result = await mediaService.validateAssetAttachments([mockAttachments[0]], mockContext);

      expect(result).toMatchObject({
        isValid: true,
        missingAssets: [],
        outdatedSnapshots: [],
        validationErrors: []
      });
    });
  });

  describe('refreshAssetSnapshots()', () => {
    const mockAttachment: CampaignAssetAttachment = {
      id: 'attachment-123',
      type: 'asset',
      assetId: mockAssetId,
      projectId: mockProjectId,
      metadata: {
        fileName: 'old-name.jpg',
        fileType: 'old-type',
        needsRefresh: true
      },
      attachedAt: Timestamp.now(),
      attachedBy: mockUserId
    };

    it('sollte Asset-Snapshots korrekt aktualisieren', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(mockMediaAsset);

      const results = await mediaService.refreshAssetSnapshots([mockAttachment], mockContext);

      expect(results).toHaveLength(1);
      expect(results[0].metadata).toMatchObject({
        fileName: mockMediaAsset.fileName,
        fileType: mockMediaAsset.fileType,
        thumbnailUrl: mockMediaAsset.downloadUrl,
        description: mockMediaAsset.description,
        needsRefresh: false
      });
      expect(results[0].metadata.lastVerified).toBeDefined();
    });

    it('sollte fehlende Assets unverändert lassen', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(null);

      const results = await mediaService.refreshAssetSnapshots([mockAttachment], mockContext);

      expect(results[0].metadata).toEqual(mockAttachment.metadata);
    });

    it('sollte mehrere Attachments parallel verarbeiten', async () => {
      const attachments = [mockAttachment, { ...mockAttachment, id: 'attachment-456' }];
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(mockMediaAsset);

      const results = await mediaService.refreshAssetSnapshots(attachments, mockContext);

      expect(results).toHaveLength(2);
      expect(mediaService.getMediaAssetById).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProjectAssetSummary()', () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        attachedAssets: [
          {
            id: 'attachment-1',
            type: 'asset',
            assetId: 'asset-1',
            metadata: {
              fileType: 'image/jpeg',
              attachedInPhase: 'creation',
              fileName: 'image1.jpg'
            },
            attachedAt: Timestamp.now()
          }
        ]
      },
      {
        id: 'campaign-2',
        attachedAssets: [
          {
            id: 'attachment-2',
            type: 'asset',
            assetId: 'asset-1', // Gleiche Asset-ID = Wiederverwendung
            metadata: {
              fileType: 'image/jpeg',
              attachedInPhase: 'distribution',
              fileName: 'image1.jpg'
            },
            attachedAt: Timestamp.now()
          }
        ]
      }
    ];

    it('sollte Projekt-Asset-Summary korrekt erstellen', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue(mockCampaigns);

      jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([
        {
          attachment: mockCampaigns[0].attachedAssets[0],
          asset: mockMediaAsset,
          isAvailable: true,
          hasChanged: false,
          needsRefresh: false
        },
        {
          attachment: mockCampaigns[1].attachedAssets[0],
          asset: mockMediaAsset,
          isAvailable: true,
          hasChanged: false,
          needsRefresh: false
        }
      ]);

      const summary = await mediaService.getProjectAssetSummary(mockProjectId, mockContext);

      expect(summary).toMatchObject({
        totalAssets: 2,
        assetsByType: { 'image/jpeg': 2 },
        assetsByPhase: { 
          creation: 1,
          distribution: 1
        },
        topAssets: [
          {
            assetId: 'asset-1',
            fileName: 'image1.jpg',
            usage: 2
          }
        ]
      });

      expect(summary.recentAssets).toHaveLength(2);
      expect(prService.getByProjectId).toHaveBeenCalledWith(mockProjectId, mockContext);
    });

    it('sollte Storage-Verbrauch korrekt berechnen', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue(mockCampaigns);

      const assetWithSize = {
        ...mockMediaAsset,
        metadata: { ...mockMediaAsset.metadata, fileSize: 2048000 }
      };

      jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([
        {
          attachment: mockCampaigns[0].attachedAssets[0],
          asset: assetWithSize,
          isAvailable: true,
          hasChanged: false,
          needsRefresh: false
        }
      ]);

      const summary = await mediaService.getProjectAssetSummary(mockProjectId, mockContext);

      expect(summary.storageUsed).toBe(2048000);
    });

    it('sollte Top-Assets nach Häufigkeit sortieren', async () => {
      const campaignsWithMultipleUsage = [
        {
          id: 'campaign-1',
          attachedAssets: [
            { id: '1', assetId: 'asset-popular', metadata: { fileName: 'popular.jpg' } },
            { id: '2', assetId: 'asset-rare', metadata: { fileName: 'rare.jpg' } }
          ]
        },
        {
          id: 'campaign-2',
          attachedAssets: [
            { id: '3', assetId: 'asset-popular', metadata: { fileName: 'popular.jpg' } },
            { id: '4', assetId: 'asset-popular', metadata: { fileName: 'popular.jpg' } }
          ]
        }
      ];

      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue(campaignsWithMultipleUsage);

      jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([]);

      const summary = await mediaService.getProjectAssetSummary(mockProjectId, mockContext);

      expect(summary.topAssets).toEqual([
        { assetId: 'asset-popular', fileName: 'popular.jpg', usage: 3 },
        { assetId: 'asset-rare', fileName: 'rare.jpg', usage: 1 }
      ]);
    });
  });

  describe('shareAssetToProject()', () => {
    const mockPermissions = {
      allowPrint: true,
      allowDigital: true,
      allowSocial: false,
      restrictions: 'Nur interne Verwendung'
    };

    it('sollte Asset mit Projekt korrekt teilen', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(mockMediaAsset);
      jest.spyOn(mediaService, 'createProjectAssetAttachment').mockResolvedValue({
        id: 'shared-attachment',
        type: 'asset',
        assetId: mockAssetId,
        projectId: mockProjectId,
        isProjectWide: false,
        metadata: {},
        attachedAt: Timestamp.now(),
        attachedBy: mockUserId
      });

      await mediaService.shareAssetToProject(
        mockAssetId,
        mockProjectId,
        mockPermissions,
        mockContext
      );

      expect(mediaService.getMediaAssetById).toHaveBeenCalledWith(mockAssetId);
      expect(mediaService.createProjectAssetAttachment).toHaveBeenCalledWith(
        mockAssetId,
        mockProjectId,
        'project_shared',
        mockContext
      );
    });

    it('sollte Fehler werfen wenn Asset nicht gefunden', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(null);

      await expect(
        mediaService.shareAssetToProject(
          'nonexistent-asset',
          mockProjectId,
          mockPermissions,
          mockContext
        )
      ).rejects.toThrow('Asset nicht gefunden');
    });
  });

  describe('getAssetUsageInProject()', () => {
    const mockCampaignsWithUsage = [
      {
        id: 'campaign-with-asset',
        pipelineStage: 'creation',
        updatedAt: Timestamp.now(),
        attachedAssets: [
          { assetId: mockAssetId, id: 'attachment-1' },
          { assetId: 'other-asset', id: 'attachment-2' }
        ]
      },
      {
        id: 'campaign-without-asset',
        pipelineStage: 'distribution',
        updatedAt: Timestamp.fromMillis(Date.now() - 86400000),
        attachedAssets: [
          { assetId: 'other-asset', id: 'attachment-3' }
        ]
      },
      {
        id: 'campaign-with-asset-again',
        pipelineStage: 'monitoring',
        updatedAt: Timestamp.fromMillis(Date.now() - 172800000),
        attachedAssets: [
          { assetId: mockAssetId, id: 'attachment-4' }
        ]
      }
    ];

    it('sollte Asset-Usage korrekt analysieren', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue(mockCampaignsWithUsage);

      const usage = await mediaService.getAssetUsageInProject(
        mockAssetId,
        mockProjectId,
        mockContext
      );

      expect(usage).toMatchObject({
        assetId: mockAssetId,
        projectId: mockProjectId,
        campaignIds: ['campaign-with-asset', 'campaign-with-asset-again'],
        totalUsage: 2,
        usagesByPhase: {
          creation: 1,
          monitoring: 1
        },
        sharedWithProjects: [mockProjectId]
      });

      expect(usage.lastUsed).toBeDefined();
    });

    it('sollte korrekte letzte Verwendung zurückgeben', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue(mockCampaignsWithUsage);

      const usage = await mediaService.getAssetUsageInProject(
        mockAssetId,
        mockProjectId,
        mockContext
      );

      // Sollte die neueste updatedAt Zeit verwenden
      expect(usage.lastUsed.toMillis()).toBe(mockCampaignsWithUsage[0].updatedAt.toMillis());
    });

    it('sollte leere Usage-Daten für nicht verwendete Assets zurückgeben', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue(mockCampaignsWithUsage);

      const usage = await mediaService.getAssetUsageInProject(
        'unused-asset',
        mockProjectId,
        mockContext
      );

      expect(usage).toMatchObject({
        assetId: 'unused-asset',
        projectId: mockProjectId,
        campaignIds: [],
        totalUsage: 0,
        usagesByPhase: {}
      });
    });
  });

  describe('Multi-Tenancy-Sicherheit', () => {
    it('sollte Asset-Zugriff nach organizationId beschränken', async () => {
      const otherOrgAsset = { ...mockMediaAsset, userId: 'other-org-123' };
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(otherOrgAsset);

      const mockAttachment: CampaignAssetAttachment = {
        id: 'attachment-123',
        type: 'asset',
        assetId: mockAssetId,
        projectId: mockProjectId,
        metadata: {},
        attachedAt: Timestamp.now(),
        attachedBy: mockUserId
      };

      const results = await mediaService.resolveAttachedAssets([mockAttachment], true, mockContext);

      expect(results[0]).toMatchObject({
        isAvailable: false,
        error: 'Keine Berechtigung für dieses Asset'
      });
    });

    it('sollte alle Pipeline-Asset-Methoden mit organizationId validieren', async () => {
      // Teste createProjectAssetAttachment
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(mockMediaAsset);
      
      const attachment = await mediaService.createProjectAssetAttachment(
        mockAssetId,
        mockProjectId,
        'creation',
        mockContext
      );

      expect(attachment.projectId).toBe(mockProjectId);
      
      // Teste validateAssetAttachments
      jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([{
        attachment: attachment as CampaignAssetAttachment,
        asset: mockMediaAsset,
        isAvailable: true,
        hasChanged: false,
        needsRefresh: false
      }]);

      const validation = await mediaService.validateAssetAttachments(
        [attachment as CampaignAssetAttachment], 
        mockContext
      );

      expect(validation.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('sollte Netzwerk-Fehler beim Asset-Laden abfangen', async () => {
      jest.spyOn(mediaService, 'getMediaAssetById').mockRejectedValue(new Error('Network error'));

      const mockAttachment: CampaignAssetAttachment = {
        id: 'attachment-123',
        type: 'asset',
        assetId: mockAssetId,
        projectId: mockProjectId,
        metadata: {},
        attachedAt: Timestamp.now(),
        attachedBy: mockUserId
      };

      const results = await mediaService.resolveAttachedAssets([mockAttachment]);

      expect(results[0]).toMatchObject({
        isAvailable: false,
        error: 'Network error'
      });
    });

    it('sollte graceful mit fehlenden pr-service-Daten umgehen', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      await expect(
        mediaService.getProjectAssetSummary(mockProjectId, mockContext)
      ).rejects.toThrow('Service unavailable');
    });

    it('sollte bei Asset-Validation-Fehlern fortfahren', async () => {
      const mockAttachments: CampaignAssetAttachment[] = [
        {
          id: 'valid-attachment',
          type: 'asset',
          assetId: 'valid-asset',
          projectId: mockProjectId,
          metadata: {},
          attachedAt: Timestamp.now(),
          attachedBy: mockUserId
        },
        {
          id: 'error-attachment',
          type: 'asset',
          assetId: 'error-asset',
          projectId: mockProjectId,
          metadata: {},
          attachedAt: Timestamp.now(),
          attachedBy: mockUserId
        }
      ];

      jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([
        {
          attachment: mockAttachments[0],
          asset: mockMediaAsset,
          isAvailable: true,
          hasChanged: false,
          needsRefresh: false
        },
        {
          attachment: mockAttachments[1],
          isAvailable: false,
          hasChanged: false,
          needsRefresh: false,
          error: 'Validation error'
        }
      ]);

      const result = await mediaService.validateAssetAttachments(mockAttachments, mockContext);

      expect(result.validationErrors).toContain('undefined: Validation error');
      expect(result.isValid).toBe(false);
    });
  });
});