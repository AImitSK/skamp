/**
 * Plan 6/9: ProjectService Asset-Management Tests
 * 
 * Testet die erweiterten ProjectService Methoden:
 * - updateProjectAssetSummary()
 * - getProjectSharedAssets()
 * - addSharedAssetToProject()
 * - removeSharedAssetFromProject()
 * - validateProjectAssets()
 * - trackAssetAction()
 * - syncProjectAssetFolders()
 */

import { projectService } from '@/lib/firebase/project-service';
import { Timestamp } from 'firebase/firestore';
import type { Project } from '@/types/project';
import type { CampaignAssetAttachment } from '@/types/pr';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('@/lib/firebase/client-init');

// Mock dependencies für circular imports
jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    getProjectAssetSummary: jest.fn(),
    validateAssetAttachments: jest.fn(),
    getAllFoldersForOrganization: jest.fn(),
    getFolderFileCount: jest.fn()
  }
}));

jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getByProjectId: jest.fn(),
    update: jest.fn()
  }
}));

describe('Plan 6/9: ProjectService Asset-Management', () => {
  const mockOrganizationId = 'org123';
  const mockUserId = 'user123';
  const mockProjectId = 'project123';
  const mockContext = { organizationId: mockOrganizationId, userId: mockUserId };

  const mockProject: Project = {
    id: mockProjectId,
    userId: mockUserId,
    organizationId: mockOrganizationId,
    title: 'Test Project',
    description: 'Test Project für Asset-Management',
    status: 'active',
    currentStage: 'creation',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    sharedAssets: [],
    assetFolders: [],
    mediaConfig: {
      allowAssetSharing: true,
      assetLibraryId: 'library123',
      defaultFolder: 'project-assets',
      assetNamingPattern: '{{date}}_{{filename}}',
      assetRetentionDays: 365
    }
  };

  const mockAssetAttachment: CampaignAssetAttachment = {
    id: 'attachment-123',
    type: 'asset',
    assetId: 'asset-123',
    projectId: mockProjectId,
    metadata: {
      fileName: 'test-asset.jpg',
      fileType: 'image/jpeg',
      description: 'Test Asset für Projekt',
      attachedAt: Timestamp.now(),
      attachedInPhase: 'creation',
      lastVerified: Timestamp.now(),
      needsRefresh: false
    },
    attachedAt: Timestamp.now(),
    attachedBy: mockUserId
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Standard Mock für getById
    jest.spyOn(projectService, 'getById').mockResolvedValue(mockProject);
    jest.spyOn(projectService, 'update').mockResolvedValue();
  });

  describe('updateProjectAssetSummary()', () => {
    it('sollte Asset-Summary korrekt aktualisieren', async () => {
      const mockSummary = {
        totalAssets: 5,
        assetsByType: { 'image/jpeg': 3, 'application/pdf': 2 },
        lastAssetAdded: Timestamp.now(),
        storageUsed: 1024000,
        topAssets: [
          { assetId: 'asset-1', fileName: 'popular.jpg', usage: 3 }
        ]
      };

      const { mediaService } = await import('@/lib/firebase/media-service');
      (mediaService.getProjectAssetSummary as jest.Mock).mockResolvedValue(mockSummary);

      await projectService.updateProjectAssetSummary(mockProjectId, mockContext);

      expect(mediaService.getProjectAssetSummary).toHaveBeenCalledWith(mockProjectId, mockContext);
      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        { assetSummary: mockSummary },
        mockContext
      );
    });

    it('sollte Fehler beim MediaService-Aufruf weiterleiten', async () => {
      const { mediaService } = await import('@/lib/firebase/media-service');
      (mediaService.getProjectAssetSummary as jest.Mock).mockRejectedValue(
        new Error('MediaService nicht verfügbar')
      );

      await expect(
        projectService.updateProjectAssetSummary(mockProjectId, mockContext)
      ).rejects.toThrow('MediaService nicht verfügbar');
    });
  });

  describe('getProjectSharedAssets()', () => {
    it('sollte geteilte Assets korrekt zurückgeben', async () => {
      const projectWithAssets = {
        ...mockProject,
        sharedAssets: [mockAssetAttachment]
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithAssets);

      const sharedAssets = await projectService.getProjectSharedAssets(mockProjectId, mockContext);

      expect(sharedAssets).toEqual([mockAssetAttachment]);
      expect(projectService.getById).toHaveBeenCalledWith(mockProjectId, mockContext);
    });

    it('sollte leeres Array für Projekt ohne Assets zurückgeben', async () => {
      const sharedAssets = await projectService.getProjectSharedAssets(mockProjectId, mockContext);

      expect(sharedAssets).toEqual([]);
    });

    it('sollte leeres Array für nicht gefundenes Projekt zurückgeben', async () => {
      jest.spyOn(projectService, 'getById').mockResolvedValue(null);

      const sharedAssets = await projectService.getProjectSharedAssets(mockProjectId, mockContext);

      expect(sharedAssets).toEqual([]);
    });
  });

  describe('addSharedAssetToProject()', () => {
    it('sollte neues geteiltes Asset korrekt hinzufügen', async () => {
      const trackAssetActionSpy = jest.spyOn(projectService, 'trackAssetAction').mockResolvedValue();

      await projectService.addSharedAssetToProject(
        mockProjectId,
        mockAssetAttachment,
        mockContext
      );

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        { sharedAssets: [mockAssetAttachment] },
        mockContext
      );

      expect(trackAssetActionSpy).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({
          action: 'shared',
          assetId: mockAssetAttachment.assetId,
          fileName: mockAssetAttachment.metadata.fileName,
          userId: mockUserId,
          phase: 'project_shared',
          reason: 'Asset wurde projekt-weit geteilt'
        }),
        mockContext
      );
    });

    it('sollte Duplikate vermeiden', async () => {
      const projectWithExistingAsset = {
        ...mockProject,
        sharedAssets: [mockAssetAttachment]
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithExistingAsset);
      const trackAssetActionSpy = jest.spyOn(projectService, 'trackAssetAction').mockResolvedValue();

      await projectService.addSharedAssetToProject(
        mockProjectId,
        mockAssetAttachment,
        mockContext
      );

      // Sollte nicht geupdated werden da Asset bereits existiert
      expect(projectService.update).not.toHaveBeenCalled();
      expect(trackAssetActionSpy).not.toHaveBeenCalled();
    });

    it('sollte mehrere Assets korrekt handhaben', async () => {
      const secondAsset = {
        ...mockAssetAttachment,
        id: 'attachment-456',
        assetId: 'asset-456',
        metadata: { ...mockAssetAttachment.metadata, fileName: 'second-asset.jpg' }
      };

      const projectWithOneAsset = {
        ...mockProject,
        sharedAssets: [mockAssetAttachment]
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithOneAsset);
      jest.spyOn(projectService, 'trackAssetAction').mockResolvedValue();

      await projectService.addSharedAssetToProject(
        mockProjectId,
        secondAsset,
        mockContext
      );

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        { sharedAssets: [mockAssetAttachment, secondAsset] },
        mockContext
      );
    });

    it('sollte Fehler bei nicht gefundenem Projekt werfen', async () => {
      jest.spyOn(projectService, 'getById').mockResolvedValue(null);

      await expect(
        projectService.addSharedAssetToProject(
          mockProjectId,
          mockAssetAttachment,
          mockContext
        )
      ).rejects.toThrow('Projekt nicht gefunden');
    });
  });

  describe('removeSharedAssetFromProject()', () => {
    it('sollte geteiltes Asset korrekt entfernen', async () => {
      const projectWithAssets = {
        ...mockProject,
        sharedAssets: [mockAssetAttachment]
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithAssets);
      const trackAssetActionSpy = jest.spyOn(projectService, 'trackAssetAction').mockResolvedValue();

      await projectService.removeSharedAssetFromProject(
        mockProjectId,
        mockAssetAttachment.id,
        mockContext
      );

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        { sharedAssets: [] },
        mockContext
      );

      expect(trackAssetActionSpy).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({
          action: 'removed',
          assetId: mockAssetAttachment.assetId,
          fileName: mockAssetAttachment.metadata.fileName,
          userId: mockUserId,
          phase: 'project_shared',
          reason: 'Asset-Sharing wurde entfernt'
        }),
        mockContext
      );
    });

    it('sollte korrektes Asset aus mehreren entfernen', async () => {
      const secondAsset = {
        ...mockAssetAttachment,
        id: 'attachment-456',
        assetId: 'asset-456'
      };

      const projectWithMultipleAssets = {
        ...mockProject,
        sharedAssets: [mockAssetAttachment, secondAsset]
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithMultipleAssets);
      jest.spyOn(projectService, 'trackAssetAction').mockResolvedValue();

      await projectService.removeSharedAssetFromProject(
        mockProjectId,
        mockAssetAttachment.id,
        mockContext
      );

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        { sharedAssets: [secondAsset] },
        mockContext
      );
    });

    it('sollte graceful mit nicht existierenden Assets umgehen', async () => {
      const projectWithAssets = {
        ...mockProject,
        sharedAssets: [mockAssetAttachment]
      };

      jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithAssets);
      const trackAssetActionSpy = jest.spyOn(projectService, 'trackAssetAction').mockResolvedValue();

      await projectService.removeSharedAssetFromProject(
        mockProjectId,
        'nonexistent-attachment',
        mockContext
      );

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        { sharedAssets: [mockAssetAttachment] }, // Unverändert
        mockContext
      );

      expect(trackAssetActionSpy).not.toHaveBeenCalled();
    });
  });

  describe('validateProjectAssets()', () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Test Campaign 1',
        attachedAssets: [mockAssetAttachment]
      },
      {
        id: 'campaign-2',
        title: 'Test Campaign 2',
        attachedAssets: [
          {
            ...mockAssetAttachment,
            id: 'attachment-456',
            assetId: 'invalid-asset'
          }
        ]
      }
    ];

    it('sollte Asset-Validierung für alle Kampagnen durchführen', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      const { mediaService } = await import('@/lib/firebase/media-service');

      (prService.getByProjectId as jest.Mock).mockResolvedValue(mockCampaigns);
      (mediaService.validateAssetAttachments as jest.Mock)
        .mockResolvedValueOnce({
          isValid: true,
          missingAssets: [],
          outdatedSnapshots: [],
          validationErrors: []
        })
        .mockResolvedValueOnce({
          isValid: false,
          missingAssets: ['invalid-asset'],
          outdatedSnapshots: [],
          validationErrors: ['Asset nicht gefunden']
        });

      const validation = await projectService.validateProjectAssets(mockProjectId, mockContext);

      expect(validation).toMatchObject({
        projectId: mockProjectId,
        totalAssets: 2,
        validAssets: 1, // Nur erste Kampagne ist valid
        missingAssets: 1,
        outdatedAssets: 0,
        validationDetails: [
          {
            campaignId: 'campaign-1',
            campaignTitle: 'Test Campaign 1',
            assetIssues: expect.objectContaining({ isValid: true })
          },
          {
            campaignId: 'campaign-2',
            campaignTitle: 'Test Campaign 2',
            assetIssues: expect.objectContaining({ isValid: false })
          }
        ]
      });

      expect(prService.getByProjectId).toHaveBeenCalledWith(
        mockProjectId,
        { organizationId: mockOrganizationId }
      );
      expect(mediaService.validateAssetAttachments).toHaveBeenCalledTimes(2);
    });

    it('sollte Kampagnen ohne Assets überspringen', async () => {
      const campaignsWithoutAssets = [
        { id: 'campaign-empty', title: 'Empty Campaign', attachedAssets: [] },
        { id: 'campaign-null', title: 'Null Campaign' } // Kein attachedAssets Feld
      ];

      const { prService } = await import('@/lib/firebase/pr-service');
      const { mediaService } = await import('@/lib/firebase/media-service');

      (prService.getByProjectId as jest.Mock).mockResolvedValue(campaignsWithoutAssets);

      const validation = await projectService.validateProjectAssets(mockProjectId, mockContext);

      expect(validation).toMatchObject({
        totalAssets: 0,
        validAssets: 0,
        missingAssets: 0,
        outdatedAssets: 0,
        validationDetails: []
      });

      expect(mediaService.validateAssetAttachments).not.toHaveBeenCalled();
    });

    it('sollte mit veralteten Snapshots umgehen', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      const { mediaService } = await import('@/lib/firebase/media-service');

      (prService.getByProjectId as jest.Mock).mockResolvedValue(mockCampaigns);
      (mediaService.validateAssetAttachments as jest.Mock)
        .mockResolvedValue({
          isValid: false,
          missingAssets: [],
          outdatedSnapshots: ['attachment-123'],
          validationErrors: []
        });

      const validation = await projectService.validateProjectAssets(mockProjectId, mockContext);

      expect(validation.outdatedAssets).toBe(2); // Beide Kampagnen haben outdated snapshots
    });
  });

  describe('trackAssetAction()', () => {
    const mockAction = {
      action: 'added' as const,
      assetId: 'asset-123',
      fileName: 'test.jpg',
      timestamp: Timestamp.now(),
      userId: mockUserId,
      userName: 'Test User',
      phase: 'creation',
      reason: 'Asset wurde hinzugefügt'
    };

    it('sollte Asset-Action zu relevanten Kampagnen hinzufügen', async () => {
      const campaignsWithAsset = [
        {
          id: 'campaign-with-asset',
          attachedAssets: [{ assetId: 'asset-123' }],
          assetHistory: []
        },
        {
          id: 'campaign-without-asset',
          attachedAssets: [{ assetId: 'other-asset' }],
          assetHistory: []
        }
      ];

      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue(campaignsWithAsset);

      await projectService.trackAssetAction(mockProjectId, mockAction, mockContext);

      expect(prService.update).toHaveBeenCalledTimes(1);
      expect(prService.update).toHaveBeenCalledWith(
        'campaign-with-asset',
        { assetHistory: [mockAction] }
      );
    });

    it('sollte History zu bestehender History hinzufügen', async () => {
      const existingAction = {
        action: 'modified' as const,
        assetId: 'asset-123',
        fileName: 'test.jpg',
        timestamp: Timestamp.fromMillis(Date.now() - 86400000),
        userId: mockUserId,
        userName: 'Test User',
        phase: 'creation'
      };

      const campaignWithHistory = {
        id: 'campaign-with-history',
        attachedAssets: [{ assetId: 'asset-123' }],
        assetHistory: [existingAction]
      };

      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue([campaignWithHistory]);

      await projectService.trackAssetAction(mockProjectId, mockAction, mockContext);

      expect(prService.update).toHaveBeenCalledWith(
        'campaign-with-history',
        { assetHistory: [existingAction, mockAction] }
      );
    });

    it('sollte Fehler beim prService graceful behandeln', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockRejectedValue(new Error('Service error'));

      // Sollte nicht werfen, da nur Logging
      await expect(
        projectService.trackAssetAction(mockProjectId, mockAction, mockContext)
      ).resolves.toBeUndefined();
    });
  });

  describe('syncProjectAssetFolders()', () => {
    const mockFolders = [
      {
        id: 'folder-1',
        name: 'Marketing Assets',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        id: 'folder-2',
        name: 'Empty Folder',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    ];

    it('sollte Asset-Folders korrekt synchronisieren', async () => {
      const { mediaService } = await import('@/lib/firebase/media-service');
      (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(mockFolders);
      (mediaService.getFolderFileCount as jest.Mock)
        .mockResolvedValueOnce(5) // folder-1 hat 5 Assets
        .mockResolvedValueOnce(0); // folder-2 ist leer

      await projectService.syncProjectAssetFolders(mockProjectId, mockContext);

      expect(mediaService.getAllFoldersForOrganization).toHaveBeenCalledWith(mockOrganizationId);
      expect(mediaService.getFolderFileCount).toHaveBeenCalledTimes(2);

      // Nur Ordner mit Assets sollten gespeichert werden
      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        {
          assetFolders: [
            {
              folderId: 'folder-1',
              folderName: 'Marketing Assets',
              assetCount: 5,
              lastModified: mockFolders[0].updatedAt
            }
          ]
        },
        mockContext
      );
    });

    it('sollte fallback auf createdAt verwenden wenn updatedAt fehlt', async () => {
      const folderWithoutUpdated = {
        id: 'folder-3',
        name: 'Old Folder',
        createdAt: Timestamp.now()
        // Kein updatedAt
      };

      const { mediaService } = await import('@/lib/firebase/media-service');
      (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue([folderWithoutUpdated]);
      (mediaService.getFolderFileCount as jest.Mock).mockResolvedValue(3);

      await projectService.syncProjectAssetFolders(mockProjectId, mockContext);

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        {
          assetFolders: [
            expect.objectContaining({
              lastModified: folderWithoutUpdated.createdAt
            })
          ]
        },
        mockContext
      );
    });

    it('sollte leere Ordner-Liste bei Fehlern setzen', async () => {
      const { mediaService } = await import('@/lib/firebase/media-service');
      (mediaService.getAllFoldersForOrganization as jest.Mock).mockRejectedValue(
        new Error('Folders not accessible')
      );

      await expect(
        projectService.syncProjectAssetFolders(mockProjectId, mockContext)
      ).rejects.toThrow('Folders not accessible');
    });
  });

  describe('Multi-Tenancy-Sicherheit', () => {
    it('sollte organizationId in allen Service-Aufrufen verwenden', async () => {
      const { mediaService } = await import('@/lib/firebase/media-service');
      const { prService } = await import('@/lib/firebase/pr-service');

      (mediaService.getProjectAssetSummary as jest.Mock).mockResolvedValue({});
      (prService.getByProjectId as jest.Mock).mockResolvedValue([]);

      // Test updateProjectAssetSummary
      await projectService.updateProjectAssetSummary(mockProjectId, mockContext);
      expect(mediaService.getProjectAssetSummary).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({ organizationId: mockOrganizationId })
      );

      // Test validateProjectAssets
      await projectService.validateProjectAssets(mockProjectId, mockContext);
      expect(prService.getByProjectId).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({ organizationId: mockOrganizationId })
      );
    });

    it('sollte Asset-Actions nur für eigene Organisation tracken', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockResolvedValue([]);

      const action = {
        action: 'added' as const,
        assetId: 'asset-123',
        fileName: 'test.jpg',
        timestamp: Timestamp.now(),
        userId: mockUserId,
        userName: 'Test User',
        phase: 'creation'
      };

      await projectService.trackAssetAction(mockProjectId, action, mockContext);

      expect(prService.getByProjectId).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({ organizationId: mockOrganizationId })
      );
    });
  });

  describe('Edge Cases und Error Handling', () => {
    it('sollte mit null/undefined Projekten graceful umgehen', async () => {
      jest.spyOn(projectService, 'getById').mockResolvedValue(null);

      await expect(
        projectService.addSharedAssetToProject(mockProjectId, mockAssetAttachment, mockContext)
      ).rejects.toThrow('Projekt nicht gefunden');

      await expect(
        projectService.removeSharedAssetFromProject(mockProjectId, 'attachment-123', mockContext)
      ).rejects.toThrow('Projekt nicht gefunden');

      const sharedAssets = await projectService.getProjectSharedAssets(mockProjectId, mockContext);
      expect(sharedAssets).toEqual([]);
    });

    it('sollte mit fehlenden sharedAssets-Feldern umgehen', async () => {
      const projectWithoutSharedAssets = {
        ...mockProject
      };
      delete (projectWithoutSharedAssets as any).sharedAssets;

      jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithoutSharedAssets);
      jest.spyOn(projectService, 'trackAssetAction').mockResolvedValue();

      const sharedAssets = await projectService.getProjectSharedAssets(mockProjectId, mockContext);
      expect(sharedAssets).toEqual([]);

      await projectService.addSharedAssetToProject(
        mockProjectId,
        mockAssetAttachment,
        mockContext
      );

      expect(projectService.update).toHaveBeenCalledWith(
        mockProjectId,
        { sharedAssets: [mockAssetAttachment] },
        mockContext
      );
    });

    it('sollte Service-Ausfälle robust behandeln', async () => {
      // MediaService Ausfall
      const { mediaService } = await import('@/lib/firebase/media-service');
      (mediaService.getProjectAssetSummary as jest.Mock).mockRejectedValue(
        new Error('MediaService down')
      );

      await expect(
        projectService.updateProjectAssetSummary(mockProjectId, mockContext)
      ).rejects.toThrow('MediaService down');

      // prService Ausfall bei trackAssetAction sollte nicht werfen
      const { prService } = await import('@/lib/firebase/pr-service');
      (prService.getByProjectId as jest.Mock).mockRejectedValue(new Error('prService down'));

      const action = {
        action: 'added' as const,
        assetId: 'asset-123',
        fileName: 'test.jpg',
        timestamp: Timestamp.now(),
        userId: mockUserId,
        userName: 'Test User',
        phase: 'creation'
      };

      await expect(
        projectService.trackAssetAction(mockProjectId, action, mockContext)
      ).resolves.toBeUndefined();
    });
  });
});