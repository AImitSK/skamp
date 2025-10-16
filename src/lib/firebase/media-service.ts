// src/lib/firebase/media-service.ts
// Media Service - Re-Export Wrapper für Backward Compatibility
// Extrahiert aus media-service.ts (Phase 2.1) - 5 Service-Dateien

// Import all service functions
import * as assetsService from './media-assets-service';
import * as foldersService from './media-folders-service';
import * as sharesService from './media-shares-service';
import * as clippingsService from './media-clippings-service';
import * as pipelineService from './media-pipeline-service';

/**
 * Media Service - Unified Interface
 *
 * This service re-exports all functions from the specialized service files:
 * - media-assets-service.ts: Asset CRUD operations
 * - media-folders-service.ts: Folder management
 * - media-shares-service.ts: Share link operations
 * - media-clippings-service.ts: Monitoring & clippings
 * - media-pipeline-service.ts: Pipeline asset integration
 */
export const mediaService = {
  // === ASSET OPERATIONS (from media-assets-service.ts) ===
  uploadMedia: assetsService.uploadMedia,
  uploadClientMedia: assetsService.uploadClientMedia,
  uploadBuffer: assetsService.uploadBuffer,
  getMediaAssets: assetsService.getMediaAssets,
  getMediaAssetById: assetsService.getMediaAssetById,
  getMediaAssetsInFolder: assetsService.getMediaAssetsInFolder,
  updateAsset: assetsService.updateAsset,
  moveAssetToFolder: assetsService.moveAssetToFolder,
  deleteMediaAsset: assetsService.deleteMediaAsset,
  removeInvalidAsset: assetsService.removeInvalidAsset,
  quickCleanupAsset: assetsService.quickCleanupAsset,
  getMediaByClientId: assetsService.getMediaByClientId,

  // === FOLDER OPERATIONS (from media-folders-service.ts) ===
  createFolder: foldersService.createFolder,
  getFolders: foldersService.getFolders,
  getFolder: foldersService.getFolder,
  updateFolderClientInheritance: foldersService.updateFolderClientInheritance,
  getAllFoldersForOrganization: foldersService.getAllFoldersForOrganization,
  getAllFoldersForUser: foldersService.getAllFoldersForUser,
  updateFolder: foldersService.updateFolder,
  deleteFolder: foldersService.deleteFolder,
  hasFilesInFolder: foldersService.hasFilesInFolder,
  hasSubfolders: foldersService.hasSubfolders,
  getBreadcrumbs: foldersService.getBreadcrumbs,
  getFolderFileCount: foldersService.getFolderFileCount,
  moveFolderToParent: foldersService.moveFolderToParent,

  // === SHARE LINK OPERATIONS (from media-shares-service.ts) ===
  createShareLink: sharesService.createShareLink,
  getCampaignMediaAssets: sharesService.getCampaignMediaAssets,
  getShareLinks: sharesService.getShareLinks,
  getShareLinkByShareId: sharesService.getShareLinkByShareId,
  incrementShareAccess: sharesService.incrementShareAccess,
  deactivateShareLink: sharesService.deactivateShareLink,
  deleteShareLink: sharesService.deleteShareLink,
  trackMediaDownload: sharesService.trackMediaDownload,

  // === CLIPPING OPERATIONS (from media-clippings-service.ts) ===
  saveClippingAsset: clippingsService.saveClippingAsset,
  getProjectClippings: clippingsService.getProjectClippings,
  updateClippingMetrics: clippingsService.updateClippingMetrics,
  generateClippingScreenshot: clippingsService.generateClippingScreenshot,
  searchClippings: clippingsService.searchClippings,
  createClippingPackage: clippingsService.createClippingPackage,
  exportClippings: clippingsService.exportClippings,

  // === PIPELINE OPERATIONS (from media-pipeline-service.ts) ===
  createProjectAssetAttachment: pipelineService.createProjectAssetAttachment,
  resolveAttachedAssets: pipelineService.resolveAttachedAssets,
  validateAssetAttachments: pipelineService.validateAssetAttachments,
  refreshAssetSnapshots: pipelineService.refreshAssetSnapshots,
  getProjectAssetSummary: pipelineService.getProjectAssetSummary,
  shareAssetToProject: pipelineService.shareAssetToProject,
  getAssetUsageInProject: pipelineService.getAssetUsageInProject,
};

// Export individual services for direct access
export {
  assetsService,
  foldersService,
  sharesService,
  clippingsService,
  pipelineService
};
