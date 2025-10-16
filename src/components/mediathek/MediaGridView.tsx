// src/components/mediathek/MediaGridView.tsx
"use client";

import { MediaAsset, MediaFolder } from "@/types/media";
import FolderCard from "./FolderCard";
import MediaCard from "./MediaCard";

interface MediaGridViewProps {
  folders: MediaFolder[];
  assets: MediaAsset[];
  selectedAssets: Set<string>;
  isSelectionMode: boolean;
  draggedAsset: MediaAsset | null;
  draggedFolder: MediaFolder | null;
  dragOverFolder: string | null;
  currentFolderId?: string;
  companies: Array<{ id: string; name: string }>;
  getAssetTooltip: (asset: MediaAsset) => string;
  handleAssetDragStart: (e: React.DragEvent, asset: MediaAsset) => void;
  handleAssetDragEnd: () => void;
  toggleAssetSelection: (assetId: string) => void;
  setIsSelectionMode: (mode: boolean) => void;
  handleEditAsset: (asset: MediaAsset) => void;
  handleShareAsset: (asset: MediaAsset) => void;
  handleDeleteAsset: (asset: MediaAsset) => void;
  handleOpenFolder: (folder: MediaFolder) => void;
  handleEditFolder: (folder: MediaFolder) => void;
  handleDeleteFolder: (folder: MediaFolder) => void;
  handleShareFolder: (folder: MediaFolder) => void;
  handleFolderDragOver: (e: React.DragEvent, folderId: string) => void;
  handleFolderDragLeave: () => void;
  handleFolderDrop: (e: React.DragEvent, folder: MediaFolder) => void;
  handleFolderMove: (folderId: string, targetFolderId: string) => void;
  handleFolderDragStart: (folder: MediaFolder) => void;
  handleFolderDragEnd: () => void;
  handleRootDrop: (e: React.DragEvent) => void;
}

export default function MediaGridView({
  folders,
  assets,
  selectedAssets,
  isSelectionMode,
  draggedAsset,
  draggedFolder,
  dragOverFolder,
  currentFolderId,
  companies,
  getAssetTooltip,
  handleAssetDragStart,
  handleAssetDragEnd,
  toggleAssetSelection,
  setIsSelectionMode,
  handleEditAsset,
  handleShareAsset,
  handleDeleteAsset,
  handleOpenFolder,
  handleEditFolder,
  handleDeleteFolder,
  handleShareFolder,
  handleFolderDragOver,
  handleFolderDragLeave,
  handleFolderDrop,
  handleFolderMove,
  handleFolderDragStart,
  handleFolderDragEnd,
  handleRootDrop,
}: MediaGridViewProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
      onDragOver={(draggedAsset || selectedAssets.size > 0 || draggedFolder) && !currentFolderId ? (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
      onDrop={(draggedAsset || selectedAssets.size > 0 || draggedFolder) && !currentFolderId ? handleRootDrop : undefined}
    >
      {/* Render Folders First */}
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onOpen={handleOpenFolder}
          onEdit={handleEditFolder}
          onDelete={handleDeleteFolder}
          onShare={handleShareFolder}
          fileCount={0}
          isDragOver={dragOverFolder === folder.id}
          onDragOver={(e: React.DragEvent) => handleFolderDragOver(e, folder.id!)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e: React.DragEvent) => handleFolderDrop(e, folder)}
          onFolderMove={handleFolderMove}
          onFolderDragStart={handleFolderDragStart}
          onFolderDragEnd={handleFolderDragEnd}
        />
      ))}

      {/* Render Media Assets */}
      {assets.map((asset) => {
        const isSelected = selectedAssets.has(asset.id!);
        const isDragging = draggedAsset?.id === asset.id || (selectedAssets.has(asset.id!) && selectedAssets.size > 1);
        const companyName = asset.clientId
          ? companies.find(c => c.id === asset.clientId)?.name
          : undefined;

        return (
          <MediaCard
            key={asset.id}
            asset={asset}
            isSelected={isSelected}
            isDragging={isDragging}
            isSelectionMode={isSelectionMode}
            selectedAssetsCount={selectedAssets.size}
            companyName={companyName}
            tooltip={getAssetTooltip(asset)}
            onDragStart={(e: React.DragEvent) => handleAssetDragStart(e, asset)}
            onDragEnd={handleAssetDragEnd}
            onClick={(e: React.MouseEvent) => {
              if (isSelectionMode || e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleAssetSelection(asset.id!);
                if (!isSelectionMode) setIsSelectionMode(true);
              }
            }}
            onToggleSelection={(e) => {
              if ('stopPropagation' in e) {
                e.stopPropagation();
              }
              toggleAssetSelection(asset.id!);
              if (!isSelectionMode) setIsSelectionMode(true);
            }}
            onEdit={() => handleEditAsset(asset)}
            onShare={() => handleShareAsset(asset)}
            onDelete={() => handleDeleteAsset(asset)}
          />
        );
      })}
    </div>
  );
}
