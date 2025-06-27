// src/app/dashboard/mediathek/page.tsx - Cleanere UI ohne redundante Elemente
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  ShareIcon,
  EllipsisVerticalIcon,
  PencilIcon
} from "@heroicons/react/20/solid";
import { FolderIcon } from "@heroicons/react/24/solid";
import { 
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
} from "@/components/dropdown";
import Link from 'next/link';
import UploadModal from "./UploadModal";
import FolderCard from "@/components/mediathek/FolderCard";
import BreadcrumbNavigation from "@/components/mediathek/BreadcrumbNavigation";
import FolderModal from "@/components/mediathek/FolderModal";
import ShareModal from "@/components/mediathek/ShareModal";
import AssetDetailsModal from "@/components/mediathek/AssetDetailsModal";

type ViewMode = 'grid' | 'list';

export default function MediathekPage() {
  const { user } = useAuth();
  const { companies } = useCrmData();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [allFolders, setAllFolders] = useState<MediaFolder[]>([]); // Für Vererbungs-Berechnung
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAssetDetailsModal, setShowAssetDetailsModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MediaFolder | undefined>(undefined);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | undefined>(undefined);
  const [sharingTarget, setSharingTarget] = useState<{target: MediaFolder | MediaAsset, type: 'folder' | 'file'} | null>(null);

  // Upload-spezifische States
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined);

  // Get asset's folder
  const getAssetFolder = (asset: MediaAsset): MediaFolder | undefined => {
    if (!asset.folderId) return undefined;
    return allFolders.find(f => f.id === asset.folderId); // Verwende allFolders für korrekte Vererbung
  };

  // Drag & Drop States
  const [draggedAsset, setDraggedAsset] = useState<MediaAsset | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // Bulk Selection States
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Folder Drag States
  const [draggedFolder, setDraggedFolder] = useState<MediaFolder | null>(null);

  // URL-Parameter Handler
  useEffect(() => {
    const uploadFor = searchParams.get('uploadFor');
    
    if (uploadFor && companies.length > 0) {
      const company = companies.find(c => c.id === uploadFor);
      if (company) {
        setPreselectedClientId(uploadFor);
        setShowUploadModal(true);
        
        // Entferne Parameter aus URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('uploadFor');
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      }
    }
  }, [searchParams, companies, router]);

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
      
      // Für UI-Anzeige: Nur Unterordner
      setFolders(foldersData);
      setMediaAssets(assetsData);
      
      // Für Vererbungs-Berechnung: Alle Ordner inklusive aktueller
      let allFoldersWithParent = foldersData;
      if (currentFolderId) {
        const currentFolder = await mediaService.getFolder(currentFolderId);
        if (currentFolder) {
          allFoldersWithParent = [...foldersData, currentFolder];
        }
      }
      setAllFolders(allFoldersWithParent);
      
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

  // FOLDER DRAG & DROP HANDLERS
  
  const handleFolderMove = useCallback(async (folderId: string, targetFolderId: string) => {
    if (!user) return;
    
    try {
      setMoving(true);
      
      // 🔧 FIXED: Drag-State sofort zurücksetzen
      setDragOverFolder(null);
      setDraggedFolder(null);
      
      // 1. Ordner verschieben
      await mediaService.updateFolder(folderId, {
        parentFolderId: targetFolderId
      });
      
      // 2. Automatische Firma-Vererbung für Ordner und alle Inhalte
      console.log('🏢 Updating client inheritance for moved folder and contents...');
      await mediaService.updateFolderClientInheritance(folderId, user.uid);
      
      // 3. Daten neu laden
      await loadData();
      
      console.log('✅ Folder moved successfully with automatic client inheritance!');
      
    } catch (error) {
      console.error('Error moving folder:', error);
      alert('Fehler beim Verschieben des Ordners. Bitte versuchen Sie es erneut.');
    } finally {
      setMoving(false);
      // 🔧 FIXED: Zusätzliche State-Bereinigung
      setDraggedFolder(null);
      setDragOverFolder(null);
    }
  }, [user]);

  const handleFolderDragStart = (folder: MediaFolder) => {
    setDraggedFolder(folder);
  };

  const handleFolderDragEnd = () => {
    // 🔧 FIXED: Alle Drag-States zurücksetzen
    setDraggedFolder(null);
    setDragOverFolder(null);
    console.log('🔄 Folder drag ended - all states reset');
  };

  // BULK SELECTION HANDLERS
  
  const toggleAssetSelection = (assetId: string) => {
    const newSelection = new Set(selectedAssets);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssets(newSelection);
    
    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const selectAllAssets = () => {
    const allAssetIds = new Set(mediaAssets.map(asset => asset.id!));
    setSelectedAssets(allAssetIds);
    setIsSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedAssets(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedAssets.size === 0) return;
    
    const count = selectedAssets.size;
    if (!window.confirm(`Möchten Sie ${count} ${count === 1 ? 'Datei' : 'Dateien'} wirklich löschen?`)) {
      return;
    }

    try {
      setMoving(true);
      const assetsToDelete = mediaAssets.filter(asset => selectedAssets.has(asset.id!));
      
      await Promise.all(
        assetsToDelete.map(asset => mediaService.deleteMediaAsset(asset))
      );
      
      clearSelection();
      await loadData();
    } catch (error) {
      console.error('Fehler beim Bulk-Löschen:', error);
      alert('Fehler beim Löschen der Dateien. Bitte versuchen Sie es erneut.');
    } finally {
      setMoving(false);
    }
  };

  const handleBulkMove = async (targetFolderId?: string) => {
    if (selectedAssets.size === 0) return;

    try {
      setMoving(true);
      
      // userId hinzugefügt für automatische Firma-Vererbung
      await Promise.all(
        Array.from(selectedAssets).map(assetId => 
          mediaService.moveAssetToFolder(assetId, targetFolderId, user?.uid)
        )
      );
      
      clearSelection();
      await loadData();
    } catch (error) {
      console.error('Fehler beim Bulk-Verschieben:', error);
      alert('Fehler beim Verschieben der Dateien. Bitte versuchen Sie es erneut.');
    } finally {
      setMoving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'a' && mediaAssets.length > 0) {
        e.preventDefault();
        selectAllAssets();
      }
      
      if (e.key === 'Escape' && selectedAssets.size > 0) {
        clearSelection();
      }
      
      if (e.key === 'Delete' && selectedAssets.size > 0) {
        e.preventDefault();
        handleBulkDelete();
      }
    };

    // 🆕 ADDED: Globaler Mouse-Up Handler für Drag-State-Reset
    const handleGlobalMouseUp = () => {
      // Reset aller Drag-States beim Loslassen der Maus (Sicherheits-Reset)
      if (draggedFolder || dragOverFolder) {
        console.log('🔄 Global mouse up - resetting folder drag states');
        setDraggedFolder(null);
        setDragOverFolder(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectedAssets, mediaAssets, draggedFolder, dragOverFolder]);

  // DRAG & DROP HANDLERS
  
  const handleAssetDragStart = (e: React.DragEvent, asset: MediaAsset) => {
    if (selectedAssets.has(asset.id!) && selectedAssets.size > 1) {
      // Multi-drag: Verwende bestehende Selection
      setDraggedAsset(null);
    } else {
      // Single-drag: Nur draggedAsset setzen, KEINE Selection ändern
      setDraggedAsset(asset);
    }
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', asset.id || '');
  };

  const handleAssetDragEnd = () => {
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

    const dragData = e.dataTransfer.getData('text/plain');

    // Handle folder drops
    if (dragData.startsWith('folder:')) {
      return; // FolderCard handles this
    }

    // Handle asset drops - Bessere Logik für Single vs Bulk
    let assetsToMove: string[] = [];
    
    if (selectedAssets.size > 0) {
      // Bulk-Move: Verwende Selection
      assetsToMove = Array.from(selectedAssets);
    } else if (draggedAsset?.id) {
      // Single-Move: Verwende draggedAsset
      assetsToMove = [draggedAsset.id];
    }

    if (assetsToMove.length === 0) return;

    const currentAssets = mediaAssets.filter(asset => assetsToMove.includes(asset.id!));
    const alreadyInFolder = currentAssets.some(asset => asset.folderId === targetFolder.id);
    
    if (alreadyInFolder && assetsToMove.length === 1) return;

    const count = assetsToMove.length;
    
    try {
      setMoving(true);
      
      if (count > 1) {
        await handleBulkMove(targetFolder.id);
      } else {
        // Single move mit automatischer Firma-Vererbung
        await mediaService.moveAssetToFolder(assetsToMove[0], targetFolder.id, user?.uid);
        await loadData();
      }
      
    } catch (error) {
      console.error('Error moving assets:', error);
      alert('Fehler beim Verschieben der Dateien. Bitte versuchen Sie es erneut.');
    } finally {
      setMoving(false);
      setDraggedAsset(null);
    }
  };

  // ROOT DROP HANDLER
  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);

    const dragData = e.dataTransfer.getData('text/plain');
    
    // Handle folder drop to root
    if (dragData.startsWith('folder:')) {
      const folderId = dragData.replace('folder:', '');
      
      try {
        setMoving(true);
        
        // 1. Ordner ins Root verschieben
        await mediaService.updateFolder(folderId, {
          parentFolderId: undefined
        });
        
        // 2. 🆕 Automatische Firma-Vererbung zurücksetzen (Root = editierbar)
        console.log('🏢 Resetting client inheritance for folder moved to root...');
        await mediaService.updateFolderClientInheritance(folderId, user!.uid);
        
        await loadData();
        console.log('✅ Folder moved to root with client inheritance reset!');
        
      } catch (error) {
        console.error('Error moving folder to root:', error);
        alert('Fehler beim Verschieben des Ordners. Bitte versuchen Sie es erneut.');
      } finally {
        setMoving(false);
        setDraggedFolder(null);
      }
      return;
    }

    // Handle asset drop to root - Bessere Logik für Single vs Bulk  
    let assetsToMove: string[] = [];
    
    if (selectedAssets.size > 0) {
      // Bulk-Move: Verwende Selection
      assetsToMove = Array.from(selectedAssets);
    } else if (draggedAsset?.id) {
      // Single-Move: Verwende draggedAsset
      assetsToMove = [draggedAsset.id];
    }

    if (assetsToMove.length === 0) return;

    // Only move assets that are currently in folders
    const currentAssets = mediaAssets.filter(asset => 
      assetsToMove.includes(asset.id!) && asset.folderId
    );

    if (currentAssets.length === 0) return;

    const count = currentAssets.length;
    
    try {
      setMoving(true);
      
      if (count > 1) {
        await Promise.all(
          currentAssets.map(asset => 
            // userId hinzugefügt für automatische Firma-Vererbung
            mediaService.moveAssetToFolder(asset.id!, undefined, user?.uid)
          )
        );
        clearSelection();
      } else {
        // userId hinzugefügt für automatische Firma-Vererbung
        await mediaService.moveAssetToFolder(currentAssets[0].id!, undefined, user?.uid);
      }
      
      await loadData();
      
    } catch (error) {
      console.error('Error moving assets to root:', error);
      alert('Fehler beim Verschieben der Dateien. Bitte versuchen Sie es erneut.');
    } finally {
      setMoving(false);
      setDraggedAsset(null);
    }
  };

  // Existing handlers
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

  // Asset-Details Handlers
  const handleEditAsset = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setShowAssetDetailsModal(true);
  };

  const handleCloseAssetDetailsModal = () => {
    setShowAssetDetailsModal(false);
    setEditingAsset(undefined);
  };

  // Upload Modal Handlers
  const handleUploadModalOpen = () => {
    setPreselectedClientId(undefined);
    setShowUploadModal(true);
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setPreselectedClientId(undefined);
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

  const getPreselectedCompany = () => {
    if (!preselectedClientId) return null;
    return companies.find(c => c.id === preselectedClientId);
  };

  // 🆕 Helper für Asset-Tooltip
  const getAssetTooltip = (asset: MediaAsset) => {
    let tooltip = asset.fileName;
    
    // Dateityp hinzufügen
    const fileExt = asset.fileType.split('/')[1]?.toUpperCase() || 'Datei';
    tooltip += `\n\nTyp: ${fileExt}`;
    
    // Erstellungsdatum
    if (asset.createdAt) {
      const date = new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE');
      tooltip += `\nErstellt: ${date}`;
    }
    
    // Beschreibung (falls vorhanden)
    if (asset.description) {
      tooltip += `\n\nBeschreibung: ${asset.description}`;
    }
    
    // Kunde (falls vorhanden)
    const company = asset.clientId ? companies.find(c => c.id === asset.clientId) : null;
    if (company) {
      tooltip += `\nKunde: ${company.name}`;
    }
    
    return tooltip;
  };

  const renderGridView = () => (
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
      
      {/* Render Media Assets - 🆕 CLEANER VERSION */}
      {mediaAssets.map((asset) => {
        const FileIcon = getFileIcon(asset.fileType);
        const isSelected = selectedAssets.has(asset.id!);
        const isDragging = draggedAsset?.id === asset.id || (selectedAssets.has(asset.id!) && selectedAssets.size > 1);
        
        return (
          <div 
            key={asset.id} 
            className={`group relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
              isDragging ? 'opacity-50 scale-95' : ''
            } ${
              isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
            }`}
            draggable={true}
            onDragStart={(e: React.DragEvent) => handleAssetDragStart(e, asset)}
            onDragEnd={handleAssetDragEnd}
            onClick={(e: React.MouseEvent) => {
              if (isSelectionMode || e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleAssetSelection(asset.id!);
                if (!isSelectionMode) setIsSelectionMode(true);
              }
            }}
            // 🆕 Tooltip für Asset
            title={getAssetTooltip(asset)}
          >
            {/* Selection Checkbox */}
            <div className={`absolute top-2 left-2 z-10 transition-opacity ${
              isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <label className="cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    toggleAssetSelection(asset.id!);
                    if (!isSelectionMode) setIsSelectionMode(true);
                  }}
                  className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                />
              </label>
            </div>

            {/* Multi-Selection Badge */}
            {selectedAssets.has(asset.id!) && selectedAssets.size > 1 && (
              <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                {selectedAssets.size}
              </div>
            )}

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
              {!isSelectionMode && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Link href={asset.downloadUrl} target="_blank">
                      <Button color="zinc" className="shadow-lg bg-white p-2">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* 3-Punkte-Menü */}
              {!isSelectionMode && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Dropdown>
                    <DropdownButton 
                      as={Button} 
                      plain 
                      className="bg-white/90 shadow-sm hover:bg-white p-2"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      <DropdownItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditAsset(asset); }}>
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Details bearbeiten
                      </DropdownItem>
                      <DropdownItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleShareAsset(asset); }}>
                        <ShareIcon className="h-4 w-4 mr-2" />
                        Teilen
                      </DropdownItem>
                      <DropdownItem 
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteAsset(asset); }}
                        className="text-red-600"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              )}
            </div>

            {/* 🆕 CLEANER File Info - Nur Name und Client-Badge */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-2" title={asset.fileName}>
                {asset.fileName}
              </h3>
              
              {/* Nur Client-Badge, falls vorhanden */}
              {asset.clientId && (
                <div>
                  <Badge color="blue" className="text-xs">
                    {companies.find(c => c.id === asset.clientId)?.name || 'Unbekannter Kunde'}
                  </Badge>
                </div>
              )}
              
              {/* 🚫 ENTFERNT: Dateityp und Erstellungsdatum */}
              {/* Diese Infos sind jetzt im Tooltip verfügbar */}
            </div>
          </div>
        );
      })}
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
        {mediaAssets.map((asset) => {
          const associatedCompany = asset.clientId 
            ? companies.find(c => c.id === asset.clientId)
            : null;
            
          return (
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
                  <div>
                    <div className="font-medium">{asset.fileName}</div>
                    {associatedCompany && (
                      <div className="mt-1">
                        <Badge color="blue" className="text-xs">
                          {associatedCompany.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{asset.fileType}</TableCell>
              <TableCell>{asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '-'}</TableCell>
              <TableCell className="text-right space-x-2">
                <Link href={asset.downloadUrl} target="_blank" passHref>
                  <Button plain>Ansehen</Button>
                </Link>
                <Button plain onClick={() => handleEditAsset(asset)}>
                  Details
                </Button>
                <Button plain className="text-red-600 hover:text-red-500" onClick={() => handleDeleteAsset(asset)}>
                  Löschen
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const totalItems = folders.length + mediaAssets.length;

  return (
    <div>
      {/* Moving Indicator */}
      {moving && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          🔄 {draggedFolder ? 'Ordner wird' : selectedAssets.size > 1 ? `${selectedAssets.size} Dateien werden` : 'Datei wird'} verschoben...
        </div>
      )}

      {/* Auto-Upload Notification */}
      {preselectedClientId && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-green-800">
              📁 Upload-Modal für <strong>{getPreselectedCompany()?.name}</strong> wird geöffnet...
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Mediathek</Heading>
          <Text className="mt-1">
            Verwalten Sie Ihre Bilder, Videos und Dokumente.
            {draggedAsset && <span className="text-blue-600 font-medium"> 📁 Datei per Drag & Drop verschieben!</span>}
            {draggedFolder && <span className="text-purple-600 font-medium"> 📂 Ordner wird verschoben!</span>}
          </Text>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Action Buttons - Immer sichtbar */}
          <Button 
            color="zinc" 
            onClick={handleCreateFolder}
            disabled={draggedFolder !== null}
          >
            <FolderPlusIcon className="size-4 mr-2" />
            Ordner
          </Button>
          <Button 
            onClick={handleUploadModalOpen}
            disabled={draggedFolder !== null}
          >
            <PlusIcon className="size-4 mr-2" />
            Dateien
          </Button>
        </div>
      </div>

      {/* Unified Stats & Controls Bar */}
      {totalItems > 0 && (
        <div className={`mb-4 p-2 rounded-lg ${selectedAssets.size > 0 ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between text-sm">
            <span className={selectedAssets.size > 0 ? 'text-indigo-900' : 'text-gray-600'}>
              {folders.length} {folders.length === 1 ? 'Ordner' : 'Ordner'}, {' '}
              {mediaAssets.length} {mediaAssets.length === 1 ? 'Datei' : 'Dateien'}
              {selectedAssets.size > 0 && (
                <span className="ml-2 font-medium">
                  • {selectedAssets.size} ausgewählt
                </span>
              )}
            </span>
            
            <div className="flex items-center gap-4">
              {/* Bulk Actions (nur bei Selection) */}
              {selectedAssets.size > 0 && (
                <div className="flex items-center space-x-2">
                  <Button plain onClick={selectAllAssets} className="text-indigo-600 text-xs">
                    Alle
                  </Button>
                  <Button plain onClick={clearSelection} className="text-gray-600 text-xs">
                    Aufheben
                  </Button>
                  <Button 
                    plain 
                    onClick={handleBulkDelete}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <TrashIcon className="h-3 w-3 mr-1" />
                    Löschen
                  </Button>
                  <Button 
                    plain 
                    onClick={() => handleBulkMove(undefined)}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                  >
                    📁 Root
                  </Button>
                </div>
              )}
              
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  plain
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' 
                    ? 'bg-white shadow-sm text-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Squares2X2Icon className="h-3 w-3" />
                </Button>
                <Button
                  plain
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' 
                    ? 'bg-white shadow-sm text-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ListBulletIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (
        <div className="mb-6">
          <BreadcrumbNavigation 
            breadcrumbs={breadcrumbs}
            onNavigate={handleNavigateToFolder}
          />
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
            <Button onClick={handleUploadModalOpen}>
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
          onClose={handleUploadModalClose}
          onUploadSuccess={loadData}
          currentFolderId={currentFolderId}
          folderName={getCurrentFolderName()}
          preselectedClientId={preselectedClientId}
        />
      )}
      
      {showFolderModal && (
        <FolderModal 
          folder={editingFolder}
          parentFolderId={currentFolderId}
          allFolders={allFolders} // Verwende allFolders für Vererbungs-Berechnung
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

      {showAssetDetailsModal && editingAsset && (
        <AssetDetailsModal
          asset={editingAsset}
          currentFolder={getAssetFolder(editingAsset)}
          allFolders={allFolders} // Verwende allFolders für Vererbungs-Berechnung
          onClose={handleCloseAssetDetailsModal}
          onSave={loadData}
        />
      )}
    </div>
  );
}