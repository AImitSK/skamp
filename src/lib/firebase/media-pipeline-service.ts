// src/lib/firebase/media-pipeline-service.ts
// Media Pipeline Service - Pipeline Asset Integration
// Extrahiert aus media-service.ts (Phase 2.1)

import { Timestamp } from 'firebase/firestore';

// === PIPELINE ASSET INTEGRATION ===

/**
 * Create project asset attachment
 */
export async function createProjectAssetAttachment(
  assetId: string,
  projectId: string,
  phase: string,
  context: { organizationId: string; userId: string }
): Promise<any> {
  try {
    const { nanoid } = await import('nanoid');
    const { getMediaAssetById } = await import('./media-assets-service');

    // Lade Asset-Details für Snapshot
    const asset = await getMediaAssetById(assetId);
    if (!asset) {
      throw new Error('Asset nicht gefunden');
    }

    const attachment: any = {
      id: nanoid(), // Neue Attachment-ID!
      type: 'asset' as const,
      assetId: asset.id,
      projectId,
      metadata: {
        // Snapshot der aktuellen Asset-Daten
        fileName: asset.fileName,
        fileType: asset.fileType,
        thumbnailUrl: asset.downloadUrl, // thumbnailUrl fallback
        description: asset.description,

        // Pipeline-Tracking
        attachedAt: Timestamp.now(),
        attachedInPhase: phase as any,
        lastVerified: Timestamp.now(),
        needsRefresh: false,

        // Erweiterte Metadaten
        copyright: (asset.metadata as any)?.copyright?.owner,
        author: (asset.metadata as any)?.author?.name,
        license: (asset.metadata as any)?.copyright?.license,
      },

      // Legacy-Felder für Kompatibilität
      attachedAt: Timestamp.now(),
      attachedBy: context.userId
    };

    return attachment;
  } catch (error) {
    throw error;
  }
}

/**
 * Resolve attached assets with pipeline context
 */
export async function resolveAttachedAssets(
  attachments: any[], // CampaignAssetAttachment[]
  validateAccess: boolean = true,
  context?: { organizationId: string }
): Promise<any[]> {
  try {
    const { getMediaAssetById, getMediaAssetsInFolder } = await import('./media-assets-service');
    const resolvedAssets: any[] = [];

    for (const attachment of attachments) {
      const resolved: any = {
        attachment,
        isAvailable: false,
        hasChanged: false,
        needsRefresh: false,
      };

      try {
        if (attachment.type === 'asset' && attachment.assetId) {
          const currentAsset = await getMediaAssetById(attachment.assetId);

          if (currentAsset) {
            // Multi-Tenancy Validierung
            if (validateAccess && context?.organizationId && currentAsset.userId !== context.organizationId) {
              resolved.error = 'Keine Berechtigung für dieses Asset';
            } else {
              resolved.asset = currentAsset;
              resolved.isAvailable = true;
              resolved.downloadUrl = currentAsset.downloadUrl;

              // Change Detection
              resolved.hasChanged =
                attachment.metadata.fileName !== currentAsset.fileName ||
                attachment.metadata.fileType !== currentAsset.fileType;

              // Refresh Check
              const daysSinceLastVerified = attachment.metadata.lastVerified
                ? (Date.now() - attachment.metadata.lastVerified.toMillis()) / (1000 * 60 * 60 * 24)
                : 30;

              resolved.needsRefresh = daysSinceLastVerified > 7 || resolved.hasChanged;
            }
          } else {
            resolved.error = 'Asset nicht gefunden';
          }
        } else if (attachment.type === 'folder' && attachment.folderId) {
          const folderAssets = await getMediaAssetsInFolder(attachment.folderId);
          resolved.isAvailable = folderAssets.length > 0;
        }
      } catch (error) {
        resolved.error = (error as Error).message;
      }

      resolvedAssets.push(resolved);
    }

    return resolvedAssets;
  } catch (error) {
    throw error;
  }
}

/**
 * Validate asset attachments
 */
export async function validateAssetAttachments(
  attachments: any[], // CampaignAssetAttachment[]
  context: { organizationId: string }
): Promise<any> {
  try {
    const resolvedAssets = await resolveAttachedAssets(attachments, true, context);

    const missingAssets: string[] = [];
    const outdatedSnapshots: string[] = [];
    const validationErrors: string[] = [];

    resolvedAssets.forEach(resolved => {
      if (!resolved.isAvailable) {
        missingAssets.push(resolved.attachment.assetId || resolved.attachment.id);
      }

      if (resolved.needsRefresh || resolved.hasChanged) {
        outdatedSnapshots.push(resolved.attachment.id);
      }

      if (resolved.error) {
        validationErrors.push(`${resolved.attachment.metadata.fileName}: ${resolved.error}`);
      }
    });

    return {
      isValid: missingAssets.length === 0 && validationErrors.length === 0,
      missingAssets,
      outdatedSnapshots,
      validationErrors,
      lastValidated: Timestamp.now()
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Refresh asset snapshots
 */
export async function refreshAssetSnapshots(
  attachments: any[], // CampaignAssetAttachment[]
  context: { organizationId: string; userId: string }
): Promise<any[]> {
  try {
    const { getMediaAssetById } = await import('./media-assets-service');
    const refreshedAttachments: any[] = [];

    for (const attachment of attachments) {
      const refreshed = { ...attachment };

      if (attachment.type === 'asset' && attachment.assetId) {
        try {
          const currentAsset = await getMediaAssetById(attachment.assetId);

          if (currentAsset) {
            // Aktualisiere Snapshot-Daten
            refreshed.metadata = {
              ...refreshed.metadata,
              fileName: currentAsset.fileName,
              fileType: currentAsset.fileType,
              thumbnailUrl: currentAsset.downloadUrl,
              description: currentAsset.description,
              lastVerified: Timestamp.now(),
              needsRefresh: false
            };
          }
        } catch (error) {
          // Asset nicht verfügbar - Snapshot unverändert lassen
        }
      }

      refreshedAttachments.push(refreshed);
    }

    return refreshedAttachments;
  } catch (error) {
    throw error;
  }
}

/**
 * Get project asset summary
 */
export async function getProjectAssetSummary(
  projectId: string,
  context: { organizationId: string }
): Promise<any> {
  try {
    // Dynamischer Import um circular dependencies zu vermeiden
    const { prService } = await import('./pr-service');

    // Lade alle Kampagnen des Projekts
    const campaigns = await prService.getByProjectId(projectId, { organizationId: context.organizationId });

    // Sammle alle Assets aus den Kampagnen
    const allAttachments: any[] = [];
    campaigns.forEach((campaign: any) => {
      if (campaign.attachedAssets) {
        allAttachments.push(...campaign.attachedAssets);
      }
    });

    // Berechne Statistiken
    const assetsByType: Record<string, number> = {};
    const assetsByPhase: Record<string, number> = {};
    let storageUsed = 0;

    const resolvedAssets = await resolveAttachedAssets(allAttachments, true, context);

    resolvedAssets.forEach(resolved => {
      if (resolved.isAvailable && resolved.asset) {
        // Typ-Statistik
        const fileType = resolved.attachment.metadata.fileType || 'unknown';
        assetsByType[fileType] = (assetsByType[fileType] || 0) + 1;

        // Phase-Statistik
        const phase = resolved.attachment.metadata.attachedInPhase || 'unknown';
        assetsByPhase[phase] = (assetsByPhase[phase] || 0) + 1;

        // Storage-Verbrauch (grobe Schätzung)
        if (resolved.asset.metadata?.fileSize) {
          storageUsed += resolved.asset.metadata.fileSize;
        }
      }
    });

    // Top Assets (nach Häufigkeit)
    const assetUsage = new Map<string, { fileName: string; count: number }>();
    allAttachments.forEach(attachment => {
      if (attachment.assetId) {
        const existing = assetUsage.get(attachment.assetId) || {
          fileName: attachment.metadata.fileName,
          count: 0
        };
        existing.count += 1;
        assetUsage.set(attachment.assetId, existing);
      }
    });

    const topAssets = Array.from(assetUsage.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([assetId, data]) => ({
        assetId,
        fileName: data.fileName,
        usage: data.count
      }));

    return {
      totalAssets: resolvedAssets.filter(r => r.isAvailable).length,
      assetsByType,
      assetsByPhase,
      storageUsed,
      recentAssets: allAttachments
        .sort((a, b) => (b.attachedAt?.seconds || 0) - (a.attachedAt?.seconds || 0))
        .slice(0, 10),
      topAssets
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Share asset to project
 */
export async function shareAssetToProject(
  assetId: string,
  projectId: string,
  permissions: any, // AssetPermissions
  context: { organizationId: string; userId: string }
): Promise<void> {
  try {
    const { getMediaAssetById } = await import('./media-assets-service');

    // Lade Asset für Validierung
    const asset = await getMediaAssetById(assetId);
    if (!asset) {
      throw new Error('Asset nicht gefunden');
    }

    // Erstelle Project Asset Attachment
    const attachment = await createProjectAssetAttachment(
      assetId,
      projectId,
      'project_shared',
      context
    );

    // Markiere als projekt-weit verfügbar
    attachment.isProjectWide = true;
    attachment.metadata.attachedInPhase = 'project_shared';

    // Asset-History Tracking würde hier erfolgen
    // (Implementierung in projectService)
  } catch (error) {
    throw error;
  }
}

/**
 * Get asset usage in project
 */
export async function getAssetUsageInProject(
  assetId: string,
  projectId: string,
  context: { organizationId: string }
): Promise<any> {
  try {
    // Dynamischer Import um circular dependencies zu vermeiden
    const { prService } = await import('./pr-service');

    // Lade alle Kampagnen des Projekts
    const campaigns = await prService.getByProjectId(projectId, { organizationId: context.organizationId });

    const campaignIds: string[] = [];
    const usagesByPhase: Record<string, number> = {};
    let totalUsage = 0;
    let lastUsed: Timestamp = Timestamp.fromMillis(0);

    campaigns.forEach((campaign: any) => {
      if (campaign.attachedAssets) {
        const hasAsset = campaign.attachedAssets.some((attachment: any) =>
          attachment.assetId === assetId
        );

        if (hasAsset) {
          campaignIds.push(campaign.id!);
          totalUsage += 1;

          // Phase-Usage
          const phase = campaign.pipelineStage || 'unknown';
          usagesByPhase[phase] = (usagesByPhase[phase] || 0) + 1;

          // Last Used
          if (campaign.updatedAt && campaign.updatedAt.toMillis() > lastUsed.toMillis()) {
            lastUsed = campaign.updatedAt;
          }
        }
      }
    });

    return {
      assetId,
      projectId,
      campaignIds,
      totalUsage,
      lastUsed,
      usagesByPhase,
      sharedWithProjects: [projectId] // Simplified
    };
  } catch (error) {
    throw error;
  }
}
