// src/lib/firebase/__tests__/media-pipeline-service.test.ts
// Phase 4a.4: Service Tests für Media Pipeline Service
import {
  createProjectAssetAttachment,
  resolveAttachedAssets,
  validateAssetAttachments,
  refreshAssetSnapshots,
  getProjectAssetSummary,
  shareAssetToProject,
  getAssetUsageInProject,
} from '../media-pipeline-service';
import { Timestamp } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0, toMillis: () => Date.now() })),
    fromMillis: jest.fn((ms) => ({ seconds: ms / 1000, nanoseconds: 0, toMillis: () => ms })),
  },
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-attachment-id'),
}));

// Mock media-assets-service
jest.mock('../media-assets-service', () => ({
  getMediaAssetById: jest.fn(),
  getMediaAssetsInFolder: jest.fn(),
}));

// Mock pr-service
jest.mock('../pr-service', () => ({
  prService: {
    getByProjectId: jest.fn().mockResolvedValue([]),
  },
}));

// Mock Data
const createMockAsset = (id: string, overrides?: any) => ({
  id,
  fileName: `test-${id}.jpg`,
  fileType: 'image/jpeg',
  downloadUrl: `https://example.com/${id}.jpg`,
  userId: 'org-1',
  organizationId: 'org-1',
  description: 'Test asset',
  metadata: {
    copyright: { owner: 'Test Owner' },
    author: { name: 'Test Author' },
  },
  ...overrides,
});

const createMockAttachment = (assetId: string, overrides?: any) => ({
  id: `attachment-${assetId}`,
  type: 'asset' as const,
  assetId,
  projectId: 'project-1',
  metadata: {
    fileName: `test-${assetId}.jpg`,
    fileType: 'image/jpeg',
    thumbnailUrl: `https://example.com/${assetId}.jpg`,
    description: 'Test attachment',
    attachedAt: Timestamp.now(),
    attachedInPhase: 'planning',
    lastVerified: Timestamp.now(),
    needsRefresh: false,
  },
  attachedAt: Timestamp.now(),
  attachedBy: 'user-1',
  ...overrides,
});

describe('Media Pipeline Service - Phase 4a.4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST 1-2: CREATE PROJECT ASSET ATTACHMENT
  // ============================================================================

  describe('createProjectAssetAttachment', () => {
    it('sollte Project Asset Attachment erstellen', async () => {
      const mockAsset = createMockAsset('asset-1');
      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(mockAsset);

      const result = await createProjectAssetAttachment(
        'asset-1',
        'project-1',
        'planning',
        { organizationId: 'org-1', userId: 'user-1' }
      );

      expect(result.id).toBe('test-attachment-id');
      expect(result.type).toBe('asset');
      expect(result.assetId).toBe('asset-1');
      expect(result.projectId).toBe('project-1');
      expect(result.metadata.fileName).toBe('test-asset-1.jpg');
      expect(getMediaAssetById).toHaveBeenCalledWith('asset-1');
    });

    it('sollte Error werfen wenn Asset nicht gefunden', async () => {
      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(null);

      await expect(
        createProjectAssetAttachment(
          'non-existent',
          'project-1',
          'planning',
          { organizationId: 'org-1', userId: 'user-1' }
        )
      ).rejects.toThrow('Asset nicht gefunden');
    });
  });

  // ============================================================================
  // TEST 3-5: RESOLVE ATTACHED ASSETS
  // ============================================================================

  describe('resolveAttachedAssets', () => {
    it('sollte Attachments mit verfügbaren Assets auflösen', async () => {
      const mockAsset = createMockAsset('asset-1');
      const mockAttachment = createMockAttachment('asset-1');

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(mockAsset);

      const result = await resolveAttachedAssets([mockAttachment], false);

      expect(result).toHaveLength(1);
      expect(result[0].isAvailable).toBe(true);
      expect(result[0].asset).toEqual(mockAsset);
      expect(result[0].downloadUrl).toBe(mockAsset.downloadUrl);
    });

    it('sollte Access-Validierung durchführen', async () => {
      const mockAsset = createMockAsset('asset-1', { userId: 'other-org' });
      const mockAttachment = createMockAttachment('asset-1');

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(mockAsset);

      const result = await resolveAttachedAssets(
        [mockAttachment],
        true,
        { organizationId: 'org-1' }
      );

      expect(result[0].isAvailable).toBe(false);
      expect(result[0].error).toContain('Keine Berechtigung');
    });

    it('sollte Change Detection durchführen', async () => {
      const mockAsset = createMockAsset('asset-1', { fileName: 'updated.jpg' });
      const mockAttachment = createMockAttachment('asset-1', {
        metadata: {
          ...createMockAttachment('asset-1').metadata,
          fileName: 'old.jpg', // Different from asset
        },
      });

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(mockAsset);

      const result = await resolveAttachedAssets([mockAttachment], false);

      expect(result[0].hasChanged).toBe(true);
    });

    it('sollte Folder-Attachments auflösen', async () => {
      const mockAttachment = {
        type: 'folder' as const,
        folderId: 'folder-1',
        metadata: {},
      };

      const { getMediaAssetsInFolder } = require('../media-assets-service');
      getMediaAssetsInFolder.mockResolvedValue([
        createMockAsset('asset-1'),
        createMockAsset('asset-2'),
      ]);

      const result = await resolveAttachedAssets([mockAttachment], false);

      expect(result[0].isAvailable).toBe(true);
    });

    it('sollte Error bei nicht gefundenem Asset handhaben', async () => {
      const mockAttachment = createMockAttachment('asset-1');

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(null);

      const result = await resolveAttachedAssets([mockAttachment], false);

      expect(result[0].isAvailable).toBe(false);
      expect(result[0].error).toContain('nicht gefunden');
    });
  });

  // ============================================================================
  // TEST 6-7: VALIDATE ASSET ATTACHMENTS
  // ============================================================================

  describe('validateAssetAttachments', () => {
    it('sollte valide Attachments bestätigen', async () => {
      const mockAsset = createMockAsset('asset-1');
      const mockAttachment = createMockAttachment('asset-1');

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(mockAsset);

      const result = await validateAssetAttachments(
        [mockAttachment],
        { organizationId: 'org-1' }
      );

      expect(result.isValid).toBe(true);
      expect(result.missingAssets).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('sollte fehlende Assets erkennen', async () => {
      const mockAttachment = createMockAttachment('asset-1');

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(null);

      const result = await validateAssetAttachments(
        [mockAttachment],
        { organizationId: 'org-1' }
      );

      expect(result.isValid).toBe(false);
      expect(result.missingAssets).toContain('asset-1');
    });
  });

  // ============================================================================
  // TEST 8-9: REFRESH ASSET SNAPSHOTS
  // ============================================================================

  describe('refreshAssetSnapshots', () => {
    it('sollte Asset-Snapshots aktualisieren', async () => {
      const mockAsset = createMockAsset('asset-1', { fileName: 'updated.jpg' });
      const mockAttachment = createMockAttachment('asset-1', {
        metadata: {
          ...createMockAttachment('asset-1').metadata,
          fileName: 'old.jpg',
        },
      });

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(mockAsset);

      const result = await refreshAssetSnapshots(
        [mockAttachment],
        { organizationId: 'org-1', userId: 'user-1' }
      );

      expect(result[0].metadata.fileName).toBe('updated.jpg');
      expect(result[0].metadata.needsRefresh).toBe(false);
    });

    it('sollte Snapshot unverändert lassen bei nicht verfügbarem Asset', async () => {
      const mockAttachment = createMockAttachment('asset-1');

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(null);

      const result = await refreshAssetSnapshots(
        [mockAttachment],
        { organizationId: 'org-1', userId: 'user-1' }
      );

      expect(result[0].metadata.fileName).toBe(mockAttachment.metadata.fileName);
    });
  });

  // ============================================================================
  // TEST 10: GET PROJECT ASSET SUMMARY
  // ============================================================================

  describe('getProjectAssetSummary', () => {
    it('sollte Project-Asset-Zusammenfassung zurückgeben', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          attachedAssets: [createMockAttachment('asset-1')],
          pipelineStage: 'planning',
        },
        {
          id: 'campaign-2',
          attachedAssets: [createMockAttachment('asset-2')],
          pipelineStage: 'execution',
        },
      ];

      const { prService } = require('../pr-service');
      prService.getByProjectId.mockResolvedValue(mockCampaigns);

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockImplementation((id: string) =>
        Promise.resolve(createMockAsset(id))
      );

      const result = await getProjectAssetSummary('project-1', { organizationId: 'org-1' });

      expect(result.totalAssets).toBeGreaterThanOrEqual(0);
      expect(result.assetsByType).toBeDefined();
      expect(result.assetsByPhase).toBeDefined();
      expect(result.recentAssets).toBeDefined();
      expect(result.topAssets).toBeDefined();
    });
  });

  // ============================================================================
  // TEST 11: SHARE ASSET TO PROJECT
  // ============================================================================

  describe('shareAssetToProject', () => {
    it('sollte Asset mit Project teilen', async () => {
      const mockAsset = createMockAsset('asset-1');

      const { getMediaAssetById } = require('../media-assets-service');
      getMediaAssetById.mockResolvedValue(mockAsset);

      await expect(
        shareAssetToProject(
          'asset-1',
          'project-1',
          { canEdit: false, canDelete: false },
          { organizationId: 'org-1', userId: 'user-1' }
        )
      ).resolves.not.toThrow();

      expect(getMediaAssetById).toHaveBeenCalledWith('asset-1');
    });
  });

  // ============================================================================
  // TEST 12: GET ASSET USAGE IN PROJECT
  // ============================================================================

  describe('getAssetUsageInProject', () => {
    it('sollte Asset-Nutzung in Project zurückgeben', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          attachedAssets: [createMockAttachment('asset-1')],
          pipelineStage: 'planning',
          updatedAt: Timestamp.now(),
        },
        {
          id: 'campaign-2',
          attachedAssets: [createMockAttachment('asset-1')],
          pipelineStage: 'execution',
          updatedAt: Timestamp.now(),
        },
      ];

      const { prService } = require('../pr-service');
      prService.getByProjectId.mockResolvedValue(mockCampaigns);

      const result = await getAssetUsageInProject('asset-1', 'project-1', { organizationId: 'org-1' });

      expect(result.assetId).toBe('asset-1');
      expect(result.projectId).toBe('project-1');
      expect(result.campaignIds).toContain('campaign-1');
      expect(result.campaignIds).toContain('campaign-2');
      expect(result.totalUsage).toBe(2);
      expect(result.usagesByPhase).toBeDefined();
    });
  });
});
