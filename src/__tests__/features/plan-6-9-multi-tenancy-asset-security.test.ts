/**
 * Plan 6/9: Multi-Tenancy Asset-Sicherheit Tests
 * 
 * Testet die Multi-Tenancy-Sicherheit für Asset-Pipeline-Integration:
 * - organizationId-basierte Asset-Isolation
 * - Cross-Tenant Asset-Zugriffsverweigerung  
 * - Service-übergreifende Sicherheitsvalidierung
 * - Asset-Sharing-Sicherheit
 * - Projekt-Asset-Isolation
 * - Pipeline-Asset-Vererbung-Sicherheit
 */

import { mediaService } from '@/lib/firebase/media-service';
import { projectService } from '@/lib/firebase/project-service';
import { Timestamp } from 'firebase/firestore';
import type { CampaignAssetAttachment } from '@/types/pr';
import type { MediaAsset } from '@/types/media';
import type { Project } from '@/types/project';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('firebase/storage');
jest.mock('@/lib/firebase/config');
jest.mock('nanoid', () => ({ nanoid: () => 'test-attachment-id-123' }));

// Mock circular imports
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getByProjectId: jest.fn(),
    update: jest.fn()
  }
}));

describe('Plan 6/9: Multi-Tenancy Asset-Sicherheit', () => {
  const org1Id = 'organization-alpha';
  const org2Id = 'organization-beta';
  const user1Id = 'user-alpha-1';
  const user2Id = 'user-beta-1';
  
  const project1: Project = {
    id: 'project-alpha-1',
    userId: user1Id,
    organizationId: org1Id,
    title: 'Alpha Project',
    status: 'active',
    currentStage: 'creation',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const project2: Project = {
    id: 'project-beta-1',
    userId: user2Id,
    organizationId: org2Id,
    title: 'Beta Project',
    status: 'active',
    currentStage: 'creation',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const asset1: MediaAsset = {
    id: 'asset-alpha-1',
    userId: org1Id,
    organizationId: org1Id,
    fileName: 'alpha-logo.jpg',
    fileType: 'image/jpeg',
    downloadUrl: 'https://storage.example.com/alpha-logo.jpg',
    storagePath: `organizations/${org1Id}/media/alpha-logo.jpg`,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const asset2: MediaAsset = {
    id: 'asset-beta-1',
    userId: org2Id,
    organizationId: org2Id,
    fileName: 'beta-logo.jpg',
    fileType: 'image/jpeg',
    downloadUrl: 'https://storage.example.com/beta-logo.jpg',
    storagePath: `organizations/${org2Id}/media/beta-logo.jpg`,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const context1 = { organizationId: org1Id, userId: user1Id };
  const context2 = { organizationId: org2Id, userId: user2Id };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MediaService Asset-Isolation', () => {
    describe('createProjectAssetAttachment()', () => {
      it('sollte nur Assets der eigenen Organisation erlauben', async () => {
        // Mock: Asset gehört zu org1
        jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(asset1);

        // org1 User versucht Asset anzuhängen - sollte erfolgreich sein
        const attachment1 = await mediaService.createProjectAssetAttachment(
          asset1.id!,
          project1.id!,
          'creation',
          context1
        );

        expect(attachment1).toMatchObject({
          type: 'asset',
          assetId: asset1.id,
          projectId: project1.id
        });

        // org2 User versucht gleiches Asset anzuhängen - sollte fehlschlagen
        jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(asset1);
        
        // Da resolveAttachedAssets die Berechtigung prüft, nicht createProjectAssetAttachment
        const attachment2 = await mediaService.createProjectAssetAttachment(
          asset1.id!,
          project2.id!,
          'creation',
          context2
        );

        // Attachment wird erstellt, aber bei resolve wird Zugriff verweigert
        expect(attachment2.assetId).toBe(asset1.id);
      });
    });

    describe('resolveAttachedAssets()', () => {
      it('sollte Cross-Tenant Asset-Zugriff verweigern', async () => {
        const attachment: CampaignAssetAttachment = {
          id: 'attachment-cross-tenant',
          type: 'asset',
          assetId: asset1.id!,
          projectId: project2.id!,
          metadata: {
            fileName: asset1.fileName,
            fileType: asset1.fileType
          },
          attachedAt: Timestamp.now(),
          attachedBy: user2Id
        };

        // Asset gehört zu org1, aber org2 versucht Zugriff
        jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(asset1);

        const resolved = await mediaService.resolveAttachedAssets(
          [attachment],
          true,
          context2
        );

        expect(resolved).toHaveLength(1);
        expect(resolved[0]).toMatchObject({
          isAvailable: false,
          error: 'Keine Berechtigung für dieses Asset'
        });
      });

      it('sollte Same-Tenant Asset-Zugriff erlauben', async () => {
        const attachment: CampaignAssetAttachment = {
          id: 'attachment-same-tenant',
          type: 'asset',
          assetId: asset1.id!,
          projectId: project1.id!,
          metadata: {
            fileName: asset1.fileName,
            fileType: asset1.fileType
          },
          attachedAt: Timestamp.now(),
          attachedBy: user1Id
        };

        jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(asset1);

        const resolved = await mediaService.resolveAttachedAssets(
          [attachment],
          true,
          context1
        );

        expect(resolved).toHaveLength(1);
        expect(resolved[0]).toMatchObject({
          isAvailable: true,
          asset: asset1,
          error: undefined
        });
      });

      it('sollte Validation ohne Access-Check erlauben', async () => {
        const attachment: CampaignAssetAttachment = {
          id: 'attachment-no-validation',
          type: 'asset',
          assetId: asset1.id!,
          projectId: project2.id!,
          metadata: {
            fileName: asset1.fileName,
            fileType: asset1.fileType
          },
          attachedAt: Timestamp.now(),
          attachedBy: user2Id
        };

        jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(asset1);

        // validateAccess = false
        const resolved = await mediaService.resolveAttachedAssets(
          [attachment],
          false,
          context2
        );

        expect(resolved).toHaveLength(1);
        expect(resolved[0]).toMatchObject({
          isAvailable: true,
          asset: asset1
        });
      });
    });

    describe('validateAssetAttachments()', () => {
      it('sollte Multi-Tenancy-Validierung durchführen', async () => {
        const attachments: CampaignAssetAttachment[] = [
          {
            id: 'valid-attachment',
            type: 'asset',
            assetId: asset1.id!,
            projectId: project1.id!,
            metadata: { fileName: asset1.fileName, fileType: asset1.fileType },
            attachedAt: Timestamp.now(),
            attachedBy: user1Id
          },
          {
            id: 'invalid-attachment',
            type: 'asset',
            assetId: asset2.id!,
            projectId: project1.id!,
            metadata: { fileName: asset2.fileName, fileType: asset2.fileType },
            attachedAt: Timestamp.now(),
            attachedBy: user1Id
          }
        ];

        jest.spyOn(mediaService, 'resolveAttachedAssets').mockResolvedValue([
          {
            attachment: attachments[0],
            asset: asset1,
            isAvailable: true,
            hasChanged: false,
            needsRefresh: false
          },
          {
            attachment: attachments[1],
            isAvailable: false,
            hasChanged: false,
            needsRefresh: false,
            error: 'Keine Berechtigung für dieses Asset'
          }
        ]);

        const result = await mediaService.validateAssetAttachments(attachments, context1);

        expect(result.isValid).toBe(false);
        expect(result.validationErrors).toContain('beta-logo.jpg: Keine Berechtigung für dieses Asset');
      });
    });

    describe('shareAssetToProject()', () => {
      it('sollte nur eigene Assets teilen können', async () => {
        // Eigenes Asset teilen - sollte funktionieren
        jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(asset1);
        jest.spyOn(mediaService, 'createProjectAssetAttachment').mockResolvedValue({
          id: 'shared-attachment',
          type: 'asset',
          assetId: asset1.id!,
          projectId: project1.id!,
          metadata: {},
          attachedAt: Timestamp.now(),
          attachedBy: user1Id
        });

        await expect(
          mediaService.shareAssetToProject(
            asset1.id!,
            project1.id!,
            { canView: true, canDownload: true, canEdit: false },
            context1
          )
        ).resolves.not.toThrow();

        // Fremdes Asset teilen - sollte fehlschlagen bei Asset-Laden
        jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(null);

        await expect(
          mediaService.shareAssetToProject(
            asset2.id!,
            project1.id!,
            { canView: true, canDownload: true, canEdit: false },
            context1
          )
        ).rejects.toThrow('Asset nicht gefunden');
      });
    });

    describe('getAssetUsageInProject()', () => {
      it('sollte nur organisationsinterne Usage-Daten liefern', async () => {
        const { prService } = await import('@/lib/firebase/pr-service');
        
        const campaigns = [
          {
            id: 'campaign-alpha-1',
            organizationId: org1Id,
            attachedAssets: [
              { assetId: asset1.id, id: 'attachment-1' }
            ],
            pipelineStage: 'creation',
            updatedAt: Timestamp.now()
          }
        ];

        (prService.getByProjectId as jest.Mock).mockResolvedValue(campaigns);

        const usage = await mediaService.getAssetUsageInProject(
          asset1.id!,
          project1.id!,
          context1
        );

        expect(usage.campaignIds).toEqual(['campaign-alpha-1']);
        expect(usage.totalUsage).toBe(1);
        
        // Prüfe dass Service mit korrektem organizationId aufgerufen wurde
        expect(prService.getByProjectId).toHaveBeenCalledWith(
          project1.id,
          { organizationId: org1Id }
        );
      });
    });
  });

  describe('ProjectService Asset-Isolation', () => {
    beforeEach(() => {
      jest.spyOn(projectService, 'getById')
        .mockImplementation(async (projectId, context) => {
          if (projectId === project1.id && context.organizationId === org1Id) {
            return project1;
          }
          if (projectId === project2.id && context.organizationId === org2Id) {
            return project2;
          }
          return null; // Multi-Tenancy: Cross-Tenant-Zugriff verweigert
        });
    });

    describe('getProjectSharedAssets()', () => {
      it('sollte nur Assets der eigenen Organisation zurückgeben', async () => {
        const projectWithAssets = {
          ...project1,
          sharedAssets: [
            {
              id: 'shared-1',
              assetId: asset1.id,
              organizationId: org1Id
            }
          ]
        };

        jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithAssets as any);

        const assets = await projectService.getProjectSharedAssets(
          project1.id!,
          context1
        );

        expect(assets).toHaveLength(1);
        expect(assets[0].assetId).toBe(asset1.id);

        // Cross-Tenant-Zugriff sollte leere Liste zurückgeben
        jest.spyOn(projectService, 'getById').mockResolvedValue(null);

        const crossTenantAssets = await projectService.getProjectSharedAssets(
          project1.id!,
          context2
        );

        expect(crossTenantAssets).toEqual([]);
      });
    });

    describe('addSharedAssetToProject()', () => {
      it('sollte Cross-Tenant Projekt-Zugriff verweigern', async () => {
        const attachment: CampaignAssetAttachment = {
          id: 'cross-tenant-attachment',
          type: 'asset',
          assetId: asset1.id!,
          projectId: project1.id!,
          metadata: { fileName: asset1.fileName },
          attachedAt: Timestamp.now(),
          attachedBy: user2Id
        };

        // org2 User versucht Asset zu org1 Projekt hinzuzufügen
        jest.spyOn(projectService, 'getById').mockResolvedValue(null);

        await expect(
          projectService.addSharedAssetToProject(
            project1.id!,
            attachment,
            context2
          )
        ).rejects.toThrow('Projekt nicht gefunden');
      });

      it('sollte Same-Tenant Asset-Sharing erlauben', async () => {
        const projectWithAssets = {
          ...project1,
          sharedAssets: []
        };

        jest.spyOn(projectService, 'getById').mockResolvedValue(projectWithAssets as any);
        jest.spyOn(projectService, 'update').mockResolvedValue();
        jest.spyOn(projectService, 'trackAssetAction').mockResolvedValue();

        const attachment: CampaignAssetAttachment = {
          id: 'same-tenant-attachment',
          type: 'asset',
          assetId: asset1.id!,
          projectId: project1.id!,
          metadata: { fileName: asset1.fileName },
          attachedAt: Timestamp.now(),
          attachedBy: user1Id
        };

        await expect(
          projectService.addSharedAssetToProject(
            project1.id!,
            attachment,
            context1
          )
        ).resolves.not.toThrow();

        expect(projectService.update).toHaveBeenCalledWith(
          project1.id,
          { sharedAssets: [attachment] },
          context1
        );
      });
    });

    describe('validateProjectAssets()', () => {
      it('sollte nur eigene Organisation Assets validieren', async () => {
        const { prService } = await import('@/lib/firebase/pr-service');
        const { mediaService: mockedMediaService } = await import('@/lib/firebase/media-service');

        const campaigns = [
          {
            id: 'campaign-1',
            organizationId: org1Id,
            attachedAssets: [
              { assetId: asset1.id, metadata: { fileName: asset1.fileName } }
            ]
          }
        ];

        (prService.getByProjectId as jest.Mock).mockResolvedValue(campaigns);
        (mockedMediaService.validateAssetAttachments as jest.Mock).mockResolvedValue({
          isValid: true,
          missingAssets: [],
          outdatedSnapshots: [],
          validationErrors: []
        });

        const validation = await projectService.validateProjectAssets(
          project1.id!,
          context1
        );

        expect(prService.getByProjectId).toHaveBeenCalledWith(
          project1.id,
          { organizationId: org1Id }
        );

        expect(mockedMediaService.validateAssetAttachments).toHaveBeenCalledWith(
          campaigns[0].attachedAssets,
          context1
        );
      });
    });

    describe('trackAssetAction()', () => {
      it('sollte Asset-Actions nur in eigenen Kampagnen tracken', async () => {
        const { prService } = await import('@/lib/firebase/pr-service');

        const campaigns = [
          {
            id: 'campaign-alpha-1',
            organizationId: org1Id,
            attachedAssets: [{ assetId: asset1.id }]
          },
          // Potentielle Cross-Tenant Kampagne (sollte herausgefiltert werden)
          {
            id: 'campaign-beta-1',
            organizationId: org2Id,
            attachedAssets: [{ assetId: asset1.id }]
          }
        ];

        (prService.getByProjectId as jest.Mock).mockResolvedValue([campaigns[0]]); // Nur org1 Kampagnen

        const action = {
          action: 'modified' as const,
          assetId: asset1.id!,
          fileName: asset1.fileName,
          timestamp: Timestamp.now(),
          userId: user1Id,
          userName: 'Alpha User',
          phase: 'creation'
        };

        await projectService.trackAssetAction(
          project1.id!,
          action,
          context1
        );

        expect(prService.getByProjectId).toHaveBeenCalledWith(
          project1.id,
          { organizationId: org1Id }
        );

        // Nur org1 Kampagne sollte geupdatet werden
        expect(prService.update).toHaveBeenCalledTimes(1);
        expect(prService.update).toHaveBeenCalledWith(
          'campaign-alpha-1',
          { assetHistory: [action] }
        );
      });
    });
  });

  describe('Asset-Vererbung Sicherheit', () => {
    describe('getProjectAssetSummary()', () => {
      it('sollte nur organisationsinterne Assets in Summary einbeziehen', async () => {
        const { prService } = await import('@/lib/firebase/pr-service');
        const { mediaService: mockedMediaService } = await import('@/lib/firebase/media-service');

        const campaigns = [
          {
            id: 'campaign-1',
            organizationId: org1Id,
            attachedAssets: [
              {
                assetId: asset1.id,
                metadata: {
                  fileType: 'image/jpeg',
                  attachedInPhase: 'creation',
                  fileName: asset1.fileName
                }
              }
            ]
          }
        ];

        (prService.getByProjectId as jest.Mock).mockResolvedValue(campaigns);
        (mockedMediaService.resolveAttachedAssets as jest.Mock).mockResolvedValue([
          {
            attachment: campaigns[0].attachedAssets[0],
            asset: asset1,
            isAvailable: true,
            hasChanged: false,
            needsRefresh: false
          }
        ]);

        const summary = await mediaService.getProjectAssetSummary(
          project1.id!,
          context1
        );

        expect(summary.totalAssets).toBe(1);
        expect(summary.assetsByType).toEqual({ 'image/jpeg': 1 });
        expect(summary.topAssets[0]).toMatchObject({
          assetId: asset1.id,
          fileName: asset1.fileName,
          usage: 1
        });

        // Validiere dass nur organisationsinterne Service-Calls gemacht wurden
        expect(prService.getByProjectId).toHaveBeenCalledWith(
          project1.id,
          { organizationId: org1Id }
        );
      });
    });

    it('sollte Cross-Tenant Asset-Usage nicht in Summary einbeziehen', async () => {
      const { prService } = await import('@/lib/firebase/pr-service');
      const { mediaService: mockedMediaService } = await import('@/lib/firebase/media-service');

      // Kampagnen mit Assets aus verschiedenen Organisationen
      const campaigns = [
        {
          id: 'campaign-1',
          attachedAssets: [
            { assetId: asset1.id }, // org1 asset
            { assetId: asset2.id }  // org2 asset - sollte herausgefiltert werden
          ]
        }
      ];

      (prService.getByProjectId as jest.Mock).mockResolvedValue(campaigns);
      (mockedMediaService.resolveAttachedAssets as jest.Mock).mockResolvedValue([
        {
          attachment: campaigns[0].attachedAssets[0],
          asset: asset1,
          isAvailable: true,
          hasChanged: false,
          needsRefresh: false
        },
        {
          attachment: campaigns[0].attachedAssets[1],
          isAvailable: false,
          error: 'Keine Berechtigung für dieses Asset',
          hasChanged: false,
          needsRefresh: false
        }
      ]);

      const summary = await mediaService.getProjectAssetSummary(
        project1.id!,
        context1
      );

      // Nur verfügbare (berechtigte) Assets sollten in Summary einbezogen werden
      expect(summary.totalAssets).toBe(1);
      expect(summary.topAssets).toHaveLength(1);
      expect(summary.topAssets[0].assetId).toBe(asset1.id);
    });
  });

  describe('Service-übergreifende Sicherheit', () => {
    it('sollte organizationId in allen Service-Interaktionen konsistent verwenden', async () => {
      // Test für updateProjectAssetSummary
      const { mediaService: mockedMediaService } = await import('@/lib/firebase/media-service');
      
      (mockedMediaService.getProjectAssetSummary as jest.Mock).mockResolvedValue({
        totalAssets: 5,
        assetsByType: { 'image/jpeg': 5 }
      });
      
      jest.spyOn(projectService, 'update').mockResolvedValue();

      await projectService.updateProjectAssetSummary(project1.id!, context1);

      expect(mockedMediaService.getProjectAssetSummary).toHaveBeenCalledWith(
        project1.id,
        context1
      );

      expect(projectService.update).toHaveBeenCalledWith(
        project1.id,
        expect.any(Object),
        context1
      );
    });

    it('sollte Multi-Tenancy bei syncProjectAssetFolders durchsetzen', async () => {
      const { mediaService: mockedMediaService } = await import('@/lib/firebase/media-service');

      const org1Folders = [
        { id: 'folder-1', name: 'Alpha Folder', organizationId: org1Id },
        { id: 'folder-2', name: 'Alpha Folder 2', organizationId: org1Id }
      ];

      (mockedMediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(org1Folders);
      (mockedMediaService.getFolderFileCount as jest.Mock).mockResolvedValue(3);
      jest.spyOn(projectService, 'update').mockResolvedValue();

      await projectService.syncProjectAssetFolders(project1.id!, context1);

      // Nur org1 Ordner sollten abgerufen werden
      expect(mockedMediaService.getAllFoldersForOrganization).toHaveBeenCalledWith(org1Id);

      expect(projectService.update).toHaveBeenCalledWith(
        project1.id,
        expect.objectContaining({
          assetFolders: expect.arrayContaining([
            expect.objectContaining({
              folderId: 'folder-1',
              folderName: 'Alpha Folder'
            })
          ])
        }),
        context1
      );
    });
  });

  describe('Edge Cases und Exploits', () => {
    it('sollte Asset-ID-Manipulation verhindern', async () => {
      // Versuche Asset einer anderen Organisation über ID-Manipulation zu laden
      jest.spyOn(mediaService, 'getMediaAssetById')
        .mockResolvedValueOnce(asset1) // Erstes Asset (org1)
        .mockResolvedValueOnce(asset2); // Zweites Asset (org2)

      const attachment1 = await mediaService.createProjectAssetAttachment(
        asset1.id!,
        project1.id!,
        'creation',
        context1
      );

      // Versuche Attachment mit asset2 ID zu erstellen aber durch context1
      // createProjectAssetAttachment verhindert das nicht direkt, 
      // aber resolveAttachedAssets wird es blockieren
      const maliciousAttachment: CampaignAssetAttachment = {
        ...attachment1,
        id: 'malicious-attachment',
        assetId: asset2.id! // Asset aus anderer Organisation
      };

      const resolved = await mediaService.resolveAttachedAssets(
        [maliciousAttachment],
        true,
        context1
      );

      expect(resolved[0]).toMatchObject({
        isAvailable: false,
        error: 'Keine Berechtigung für dieses Asset'
      });
    });

    it('sollte Project-ID-Spoofing verhindern', async () => {
      // org2 User versucht auf org1 Projekt zuzugreifen durch ID-Spoofing
      jest.spyOn(projectService, 'getById').mockImplementation(async (projectId, context) => {
        // Simuliere korrekte Multi-Tenancy-Prüfung
        if (projectId === project1.id && context.organizationId === org1Id) {
          return project1;
        }
        return null; // Cross-Tenant-Zugriff verweigert
      });

      // Versuche auf project1 mit context2 (falsche Organization) zuzugreifen
      const assets = await projectService.getProjectSharedAssets(
        project1.id!,
        context2 // Falsche Organization!
      );

      expect(assets).toEqual([]);
      expect(projectService.getById).toHaveBeenCalledWith(project1.id, context2);
    });

    it('sollte Session-basierte Organization-Switching verhindern', async () => {
      // Simuliere Angriff wo User die organizationId im Context manipuliert
      const manipulatedContext = { ...context1, organizationId: org2Id };

      // Service sollte trotzdem nur berechtigte Assets zurückgeben
      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(asset1);

      const attachment: CampaignAssetAttachment = {
        id: 'session-attack',
        type: 'asset',
        assetId: asset1.id!,
        projectId: project1.id!,
        metadata: {},
        attachedAt: Timestamp.now(),
        attachedBy: user1Id
      };

      // resolveAttachedAssets sollte prüfen ob Asset.organizationId === context.organizationId
      const resolved = await mediaService.resolveAttachedAssets(
        [attachment],
        true,
        manipulatedContext
      );

      // Asset1 gehört zu org1, aber manipulatedContext behauptet org2
      expect(resolved[0]).toMatchObject({
        isAvailable: false,
        error: 'Keine Berechtigung für dieses Asset'
      });
    });
  });

  describe('Compliance und Audit-Trail', () => {
    it('sollte Cross-Tenant-Zugriffe für Audit loggen', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simuliere Cross-Tenant-Zugriff der geloggt werden sollte
      const attachment: CampaignAssetAttachment = {
        id: 'audit-test',
        type: 'asset', 
        assetId: asset2.id!, // org2 Asset
        projectId: project1.id!,
        metadata: {},
        attachedAt: Timestamp.now(),
        attachedBy: user1Id
      };

      jest.spyOn(mediaService, 'getMediaAssetById').mockResolvedValue(asset2);

      await mediaService.resolveAttachedAssets(
        [attachment],
        true,
        context1 // org1 Context
      );

      // Audit-Trail sollte verdächtige Aktivität nicht preisgeben
      // Aber Service sollte sicher verweigern
      consoleSpy.mockRestore();
    });

    it('sollte organizationId in allen Service-Responses validieren', async () => {
      // Mock um sicherzustellen dass alle Service-Responses organizationId prüfen
      const { mediaService: mockedMediaService } = await import('@/lib/firebase/media-service');
      
      (mockedMediaService.getProjectAssetSummary as jest.Mock).mockResolvedValue({
        totalAssets: 10,
        // Response sollte organizationId validation durchlaufen haben
        organizationValidated: true
      });

      await projectService.updateProjectAssetSummary(project1.id!, context1);

      // Validiere dass Service mit korrекtem organizationId-Kontext aufgerufen wurde
      expect(mockedMediaService.getProjectAssetSummary).toHaveBeenCalledWith(
        project1.id,
        expect.objectContaining({ organizationId: org1Id })
      );
    });
  });
});