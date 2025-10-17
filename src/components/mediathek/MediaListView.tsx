// src/components/mediathek/MediaListView.tsx
"use client";

import { MediaAsset, MediaFolder } from "@/types/media";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider
} from "@/components/ui/dropdown";
import {
  EyeIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  FolderIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon
} from "@heroicons/react/24/outline";

interface MediaListViewProps {
  folders: MediaFolder[];
  assets: MediaAsset[];
  selectedAssets: Set<string>;
  isSelectionMode: boolean;
  toggleAssetSelection: (assetId: string) => void;
  setIsSelectionMode: (mode: boolean) => void;
  selectAllAssets: () => void;
  clearSelection: () => void;
  handleOpenFolder: (folder: MediaFolder) => void;
  handleEditFolder: (folder: MediaFolder) => void;
  handleShareFolder: (folder: MediaFolder) => void;
  handleDeleteFolder: (folder: MediaFolder) => void;
  handleEditAsset: (asset: MediaAsset) => void;
  handleShareAsset: (asset: MediaAsset) => void;
  handleDeleteAsset: (asset: MediaAsset) => void;
}

const getFileIcon = (fileType: string | undefined) => {
  if (!fileType) return DocumentTextIcon;

  if (fileType.startsWith('image/')) {
    return PhotoIcon;
  } else if (fileType.startsWith('video/')) {
    return VideoCameraIcon;
  } else if (fileType.includes('pdf') || fileType.includes('document')) {
    return DocumentTextIcon;
  } else {
    return DocumentTextIcon;
  }
};

const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes || bytes === 0) return '—';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

export default function MediaListView({
  folders,
  assets,
  selectedAssets,
  isSelectionMode,
  toggleAssetSelection,
  setIsSelectionMode,
  selectAllAssets,
  clearSelection,
  handleOpenFolder,
  handleEditFolder,
  handleShareFolder,
  handleDeleteFolder,
  handleEditAsset,
  handleShareAsset,
  handleDeleteAsset,
}: MediaListViewProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>
            <Checkbox
              checked={assets.length > 0 && assets.every(a => selectedAssets.has(a.id!))}
              indeterminate={assets.some(a => selectedAssets.has(a.id!)) && !assets.every(a => selectedAssets.has(a.id!))}
              onChange={(checked) => {
                if (checked) {
                  selectAllAssets();
                } else {
                  clearSelection();
                }
              }}
            />
          </TableHeader>
          <TableHeader>Name</TableHeader>
          <TableHeader>Typ</TableHeader>
          <TableHeader>Größe</TableHeader>
          <TableHeader>Erstellt am</TableHeader>
          <TableHeader>
            <span className="sr-only">Aktionen</span>
          </TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {/* Render Folders First */}
        {folders.map((folder) => {
          return (
            <TableRow key={`folder-${folder.id}`} className="hover:bg-gray-50">
              <TableCell>
                <div className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleOpenFolder(folder)}>
                  <FolderIcon className="h-8 w-8" style={{ color: folder.color }} />
                  <div>
                    <div className="font-medium">{folder.name}</div>
                    {folder.description && (
                      <div className="text-sm text-gray-500">{folder.description}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>Ordner</TableCell>
              <TableCell>—</TableCell>
              <TableCell>
                {folder.createdAt ? new Date(folder.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '—'}
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab]">
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                    <DropdownItem onClick={() => handleEditFolder(folder)} className="hover:bg-gray-50">
                      <PencilIcon className="h-4 w-4 text-gray-500" />
                      Bearbeiten
                    </DropdownItem>
                    <DropdownItem onClick={() => handleShareFolder(folder)} className="hover:bg-gray-50">
                      <ShareIcon className="h-4 w-4 text-gray-500" />
                      Teilen
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem onClick={() => handleDeleteFolder(folder)} className="hover:bg-red-50">
                      <TrashIcon className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Löschen</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
            </TableRow>
          );
        })}

        {/* Render Media Assets */}
        {assets.map((asset) => {
          const FileIcon = getFileIcon(asset.fileType);

          return (
            <TableRow key={asset.id} className="hover:bg-gray-50">
              <TableCell>
                <Checkbox
                  checked={selectedAssets.has(asset.id!)}
                  onChange={(checked) => {
                    toggleAssetSelection(asset.id!);
                    if (!isSelectionMode && checked) setIsSelectionMode(true);
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {asset.fileType?.startsWith('image/') ? (
                    <img src={asset.downloadUrl} alt={asset.fileName} className="h-10 w-10 object-cover rounded" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                      <FileIcon className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{asset.fileName}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Text>{asset.fileType?.split('/')[1]?.toUpperCase() || 'Datei'}</Text>
              </TableCell>
              <TableCell>
                <Text>{formatFileSize(asset.metadata?.fileSize)}</Text>
              </TableCell>
              <TableCell>
                {asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '—'}
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab]">
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                    <DropdownItem href={asset.downloadUrl} target="_blank" className="hover:bg-gray-50">
                      <EyeIcon className="h-4 w-4 text-gray-500" />
                      Ansehen
                    </DropdownItem>
                    <DropdownItem onClick={() => handleEditAsset(asset)} className="hover:bg-gray-50">
                      <PencilIcon className="h-4 w-4 text-gray-500" />
                      Details bearbeiten
                    </DropdownItem>
                    <DropdownItem onClick={() => handleShareAsset(asset)} className="hover:bg-gray-50">
                      <ShareIcon className="h-4 w-4 text-gray-500" />
                      Teilen
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem onClick={() => handleDeleteAsset(asset)} className="hover:bg-red-50">
                      <TrashIcon className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Löschen</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
