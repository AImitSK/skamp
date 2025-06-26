// src/app/dashboard/mediathek/page.tsx - Mit Drag & Drop
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCrmData } from "@/context/CrmDataContext";
import { mediaService } from "@/lib/firebase/media-service";
import { MediaAsset, MediaFolder, FolderBreadcrumb } from "@/types/media";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { 
  PlusIcon, 
  PhotoIcon, 
  Squares2X2Icon,
  ListBulletIcon,
  EyeIcon,
  TrashIcon,
  DocumentIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  FolderPlusIcon,
  ShareIcon
} from "@heroicons/react/20/solid";
import { FolderIcon } from "@heroicons/react/24/solid";
import Link from 'next/link';
import UploadModal from "./UploadModal";
import FolderCard from "@/components/mediathek/FolderCard";
import BreadcrumbNavigation from "@/components/mediathek/BreadcrumbNavigation";
import FolderModal from "@/components/mediathek/FolderModal";
import ShareModal from "@/components/mediathek/ShareModal";

type ViewMode = 'grid' | 'list';

export default function MediathekPage() {
  const { user } = useAuth();
  const { companies } = useCrmData();
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MediaFolder | undefined>(undefined);
  const [sharingTarget, setSharingTarget] = useState<{target: MediaFolder | MediaAsset, type: 'folder' | 'file'} | null>(null);

  // 🆕 Drag & Drop States
  const [draggedAsset, setDraggedAsset] = useState<MediaAsset | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentFolderId]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [foldersData, assetsData] = await Promise.all([
        mediaService.getFolders(user.uid, currentFolderId),
        mediaService.getMediaAssets(user.uid, currentFolderId)
      ]);
      
      setFolders(foldersData);
      setMediaAssets(assetsData);
      
      if (currentFolderId) {
        const breadcrumbsData = await mediaService.getBreadcrumbs(currentFolderId);
        setBreadcrumbs(breadcrumbsData);
      } else {
        setBreadcrumbs([]);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 DRAG & DROP HANDLERS
  
  const handleAssetDragStart = (e: React.DragEvent, asset: MediaAsset) => {
    console.log('Drag started for asset:', asset.fileName);
    setDraggedAsset(asset);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', asset.id || '');
  };

  const handleAssetDragEnd = () => {
    console.log('Drag ended');
    setDraggedAsset(null);
    setDragOverFolder(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId);
  };

  const handleFolderDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolder: MediaFolder) => {
    e.preventDefault();
    setDragOverFolder(null);

    if (!draggedAsset || !draggedAsset.id) {
      console.log('No asset being dragged');
      return;
    }

    // Verhindere Drop auf aktuellen Ordner
    if (draggedAsset.folderId === targetFolder.id) {
      console.log('Asset is already in this folder');
      return;
    }

    console.log(`Moving asset ${draggedAsset.fileName} to folder ${targetFolder.name}`);
    
    try {
      setMoving(true);
      await mediaService.moveAssetToFolder(draggedAsset.id, targetFolder.id);
      
      // Erfolgs-Feedback
      console.log('✅ Asset successfully moved!');
      
      // Daten neu laden
      await loadData();
      
    } catch (error) {
      console.error('❌ Error moving asset:', error);
      alert('Fehler beim Verschieben der Datei. Bitte versuchen Sie es erneut.');
    } finally {
      setMoving(false);
      setDraggedAsset(null);
    }
  };

  // 🆕 ROOT DROP HANDLER (für Dateien aus Ordnern ins Root)
  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);

    if (!draggedAsset || !draggedAsset.id || !draggedAsset.folderId) {
      return; // Nur Dateien die in Ordnern sind können ins Root verschoben werden
    }

    console.log(`Moving asset ${draggedAsset.fileName} to root folder`);
    
    try {
      setMoving(true);
      await mediaService.moveAssetToFolder(draggedAsset.id, undefined); // undefined = Root
      
      console.log('✅ Asset moved to root!');
      await loadData();
      
    } catch (error) {
      console.error('❌ Error moving asset to root:', error);
      alert('Fehler beim Verschieben der Datei. Bitte versuchen Sie es erneut.');
    } finally {
      setMoving(false);
      setDraggedAsset(null);
    }
  };

  // Existing handlers (unchanged)
  const handleCreateFolder = () => {
    setEditingFolder(undefined);
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: MediaFolder) => {
    setEditingFolder(folder);
    setShowFolderModal(true);
  };

  const handleSaveFolder = async (folderData: Omit<MediaFolder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    
    try {
      if (editingFolder) {
        await mediaService.updateFolder(editingFolder.id!, folderData);
      } else {
        await mediaService.createFolder({
          ...folderData,
          userId: user.uid,
          parentFolderId: currentFolderId,
        });
      }
      await loadData();
    } catch (error) {
      console.error("Fehler beim Speichern des Ordners:", error);
      throw error;
    }
  };

  const handleDeleteFolder = async (folder: MediaFolder) => {
    if (window.confirm(`Möchten Sie den Ordner "${folder.name}" wirklich löschen?`)) {
      try {
        await mediaService.deleteFolder(folder.id!);
        await loadData();
      } catch (error) {
        console.error("Fehler beim Löschen des Ordners:", error);
        alert("Der Ordner konnte nicht gelöscht werden. Stellen Sie sicher, dass er leer ist.");
      }
    }
  };

  const handleOpenFolder = (folder: MediaFolder) => {
    setCurrentFolderId(folder.id);
  };

  const handleNavigateToFolder = (folderId?: string) => {
    setCurrentFolderId(folderId);
  };

  const handleShareFolder = (folder: MediaFolder) => {
    setSharingTarget({ target: folder, type: 'folder' });
    setShowShareModal(true);
  };

  const handleShareAsset = (asset: MediaAsset) => {
    setSharingTarget({ target: asset, type: 'file' });
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSharingTarget(null);
  };

  const handleDeleteAsset = async (asset: MediaAsset) => {
    if (window.confirm(`Möchten Sie die Datei "${asset.fileName}" wirklich löschen?`)) {
      try {
        await mediaService.deleteMediaAsset(asset);
        await loadData();
      } catch(error) {
        console.error("Fehler beim Löschen der Datei: ", error)
        alert("Die Datei konnte nicht gelöscht werden.")
      }
    }
  };

  // Helper Functions
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCurrentFolderName = () => {
    if (!currentFolderId) return undefined;
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1]?.name;
    }
    const currentFolder = folders.find(f => f.id === currentFolderId);
    return currentFolder?.name;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return PhotoIcon;
    } else if (fileType.startsWith('video/')) {
      return VideoCameraIcon;
    } else if (fileType.includes('pdf') || fileType.includes('document')) {
      return DocumentTextIcon;
    } else {
      return DocumentIcon;
    }
  };

  const renderGridView = () => (
    <div 
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 ${
        draggedAsset && !currentFolderId ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4' : ''
      }`}
      onDragOver={draggedAsset && !currentFolderId ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
      onDrop={draggedAsset && !currentFolderId ? handleRootDrop : undefined}
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
          // 🆕 Drag & Drop Props
          isDragOver={dragOverFolder === folder.id}
          onDragOver={(e) => handleFolderDragOver(e, folder.id!)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleFolderDrop(e, folder)}
        />
      ))}
      
      {/* Render Media Assets */}
      {mediaAssets.map((asset) => {
        const FileIcon = getFileIcon(asset.fileType);
        
        return (
          <div 
            key={asset.id} 
            className={`group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
              draggedAsset?.id === asset.id ? 'opacity-50 scale-95' : ''
            }`}
            draggable={true} // 🆕 Make draggable
            onDragStart={(e) => handleAssetDragStart(e, asset)} // 🆕
            onDragEnd={handleAssetDragEnd} // 🆕
          >
            {/* Preview */}
            <div className="aspect-square w-full bg-gray-50 flex items-center justify-center relative overflow-hidden">
              {asset.fileType.startsWith('image/') ? (
                <img 
                  src={asset.downloadUrl} 
                  alt={asset.fileName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <FileIcon className="h-16 w-16 text-gray-400" />
              )}
              
              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <Link href={asset.downloadUrl} target="_blank">
                    <Button color="zinc" className="shadow-lg bg-white p-2">
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button 
                    color="zinc" 
                    onClick={() => handleShareAsset(asset)}
                    className="shadow-lg bg-blue-600 text-white hover:bg-blue-700 p-2"
                  >
                    <ShareIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    color="zinc" 
                    onClick={() => handleDeleteAsset(asset)}
                    className="shadow-lg bg-red-600 text-white hover:bg-red-700 p-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* File Info */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-1" title={asset.fileName}>
                {asset.fileName}
              </h3>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {asset.fileType.split('/')[1] || 'Datei'}
                </p>
                <p className="text-xs text-gray-500">
                  {asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '-'}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* 🆕 Drop Hint when dragging to root */}
      {draggedAsset && !currentFolderId && (
        <div className="col-span-full text-center py-8 text-blue-600 font-medium">
          📁 Hier ablegen um in Root-Ordner zu verschieben
        </div>
      )}
    </div>
  );

  const renderListView = () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>Name</TableHeader>
          <TableHeader>Typ</TableHeader>
          <TableHeader>Erstellt am</TableHeader>
          <TableHeader className="text-right">Aktionen</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {/* Render Folders First */}
        {folders.map((folder) => {
          const associatedCompany = folder.clientId 
            ? companies.find(c => c.id === folder.clientId)
            : null;
            
          return (
            <TableRow key={`folder-${folder.id}`} className="cursor-pointer hover:bg-gray-50">
              <TableCell onClick={() => handleOpenFolder(folder)}>
                <div className="flex items-center space-x-3">
                  <FolderIcon className="h-8 w-8" style={{ color: folder.color }} />
                  <div>
                    <div className="font-medium">{folder.name}</div>
                    {associatedCompany && (
                      <div className="mt-1">
                        <Badge color="blue" className="text-xs">
                          {associatedCompany.name}
                        </Badge>
                      </div>
                    )}
                    {folder.description && (
                      <div className="text-sm text-gray-500">{folder.description}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>Ordner</TableCell>
              <TableCell>
                {folder.createdAt ? new Date(folder.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '-'}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button plain onClick={() => handleEditFolder(folder)}>
                  Bearbeiten
                </Button>
                <Button plain className="text-red-600 hover:text-red-500" onClick={() => handleDeleteFolder(folder)}>
                  Löschen
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        
        {/* Render Media Assets */}
        {mediaAssets.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell>
              <div className="flex items-center space-x-3">
                {asset.fileType.startsWith('image/') ? (
                  <img src={asset.downloadUrl} alt={asset.fileName} className="h-10 w-10 object-cover rounded" />
                ) : (
                  <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                    <PhotoIcon className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div className="font-medium">{asset.fileName}</div>
              </div>
            </TableCell>
            <TableCell>{asset.fileType}</TableCell>
            <TableCell>{asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '-'}</TableCell>
            <TableCell className="text-right space-x-2">
              <Link href={asset.downloadUrl} target="_blank" passHref>
                <Button plain>Ansehen</Button>
              </Link>
              <Button plain className="text-red-600 hover:text-red-500" onClick={() => handleDeleteAsset(asset)}>
                Löschen
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const totalItems = folders.length + mediaAssets.length;

  return (
    <div>
      {/* Moving Indicator */}
      {moving && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          🔄 Datei wird verschoben...
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Mediathek</Heading>
          <Text className="mt-1">
            Verwalten Sie Ihre Bilder, Videos und Dokumente. 
            {draggedAsset && <span className="text-blue-600 font-medium"> 📁 Datei per Drag & Drop verschieben!</span>}
          </Text>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              plain
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' 
                ? 'bg-white shadow-sm text-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </Button>
            <Button
              plain
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' 
                ? 'bg-white shadow-sm text-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <Button color="zinc" onClick={handleCreateFolder}>
            <FolderPlusIcon className="size-4 mr-2" />
            Ordner
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <PlusIcon className="size-4 mr-2" />
            Dateien
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (
        <div className="mb-6">
          <BreadcrumbNavigation 
            breadcrumbs={breadcrumbs}
            onNavigate={handleNavigateToFolder}
          />
        </div>
      )}

      {/* Stats Bar */}
      {totalItems > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {folders.length} {folders.length === 1 ? 'Ordner' : 'Ordner'}, {' '}
              {mediaAssets.length} {mediaAssets.length === 1 ? 'Datei' : 'Dateien'}
            </span>
            <span className="text-xs">
              Ansicht: {viewMode === 'grid' ? 'Kacheln' : 'Liste'}
              {draggedAsset && ' • Datei wird bewegt'}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Lade Mediathek...</p>
          </div>
        </div>
      ) : totalItems === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            {currentFolderId ? 'Dieser Ordner ist leer' : 'Ihre Mediathek ist leer'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {currentFolderId 
              ? 'Laden Sie Dateien hoch oder erstellen Sie Unterordner.'
              : 'Erstellen Sie Ihren ersten Ordner oder laden Sie Dateien hoch.'
            }
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button color="zinc" onClick={handleCreateFolder}>
              <FolderPlusIcon className="size-4 mr-2" />
              Ordner erstellen
            </Button>
            <Button onClick={() => setShowUploadModal(true)}>
              <PlusIcon className="size-4 mr-2" />
              Dateien hochladen
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            {viewMode === 'grid' ? renderGridView() : renderListView()}
          </div>
        </div>
      )}
      
      {/* Modals */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={loadData}
          currentFolderId={currentFolderId}
          folderName={getCurrentFolderName()}
        />
      )}
      
      {showFolderModal && (
        <FolderModal 
          folder={editingFolder}
          parentFolderId={currentFolderId}
          onClose={() => {
            setShowFolderModal(false);
            setEditingFolder(undefined);
          }}
          onSave={handleSaveFolder}
        />
      )}

      {showShareModal && sharingTarget && (
        <ShareModal
          target={sharingTarget.target}
          type={sharingTarget.type}
          onClose={handleCloseShareModal}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}