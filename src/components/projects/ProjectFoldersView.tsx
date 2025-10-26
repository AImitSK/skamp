'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  FolderIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon,
  DocumentPlusIcon,
  TableCellsIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Field, Label } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { getFolders, createFolder } from '@/lib/firebase/media-folders-service';
import { getMediaAssets, updateAsset, deleteMediaAsset, uploadMedia } from '@/lib/firebase/media-assets-service';
import { useAuth } from '@/context/AuthContext';
import { documentContentService } from '@/lib/firebase/document-content-service';
import type { InternalDocument } from '@/types/document-content';
import type { PipelineStage } from '@/types/project';
import type { Boilerplate } from '@/types/crm-enhanced';
// React Query Hooks
import {
  useMediaFolders,
  useMediaAssets,
  useCreateFolder,
  useUploadMediaAsset,
  useBulkUploadFiles,
  useDeleteMediaAsset,
  useDeleteFolder,
  useUpdateMediaAsset,
} from '@/lib/hooks/useMediaData';
// Extrahierte Komponenten
import DeleteConfirmDialog from './folders/components/DeleteConfirmDialog';
import FolderCreateDialog from './folders/components/FolderCreateDialog';
import UploadZone from './folders/components/UploadZone';
import MoveAssetModal from './folders/components/MoveAssetModal';
import BoilerplateImportDialog from './folders/components/BoilerplateImportDialog';
import { toastService } from '@/lib/utils/toast';
// Custom Hooks
import { useFolderNavigation } from './folders/hooks/useFolderNavigation';
import { useFileActions } from './folders/hooks/useFileActions';
import { useDocumentEditor } from './folders/hooks/useDocumentEditor';
import { useSpreadsheetEditor } from './folders/hooks/useSpreadsheetEditor';
// Types
import type { ProjectFoldersViewProps } from './folders/types';

// Lazy load Document Editor Modal
const DocumentEditorModal = dynamic(
  () => import('./DocumentEditorModal'),
  { ssr: false }
);

// Lazy load Spreadsheet Editor Modal
const SpreadsheetEditorModal = dynamic(
  () => import('./SpreadsheetEditorModal'),
  { ssr: false }
);

// Skeleton Loader Component (optimized with React.memo)
const FolderSkeleton = React.memo(function FolderSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-5 w-5 bg-gray-300 rounded mr-3"></div>
              <div>
                <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="h-3 w-3 bg-gray-300 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
});

// Main Component
export default function ProjectFoldersView({
  projectId,
  organizationId,
  customerId,
  customerName,
  projectFolders,
  foldersLoading,
  onRefresh,
  filterByFolder = 'all',
  initialFolderId,
  onFolderChange
}: ProjectFoldersViewProps) {
  const { user } = useAuth();

  // Custom Hooks für Business Logic
  const {
    selectedFolderId,
    setSelectedFolderId,
    currentFolders,
    currentAssets,
    setCurrentAssets,
    loading,
    breadcrumbs,
    allFolders,
    handleFolderClick,
    handleGoToRoot,
    handleBreadcrumbClick,
    handleBackClick,
    loadFolderContent,
    loadAllFolders
  } = useFolderNavigation({
    organizationId,
    projectFolders,
    filterByFolder,
    initialFolderId,
    onFolderChange
  });

  // Document save success callback (optimized with useCallback)
  const handleDocumentSaveSuccess = useCallback(() => {
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    } else {
      onRefresh();
    }
    toastService.success('Dokument wurde erfolgreich gespeichert');
  }, [selectedFolderId, loadFolderContent, onRefresh]);

  // Boilerplate Import Handler
  const handleBoilerplateImport = useCallback(async (boilerplate: Boilerplate) => {
    if (!user?.uid || !selectedFolderId) return;

    try {
      // Erstelle .celero-doc aus Boilerplate content
      await documentContentService.createDocument(
        boilerplate.content, // HTML content
        {
          fileName: `${boilerplate.name}.celero-doc`,
          folderId: selectedFolderId,
          organizationId,
          projectId,
          userId: user.uid,
          fileType: 'celero-doc',
        }
      );

      // Refresh folder content
      loadFolderContent(selectedFolderId);
      toastService.success(`"${boilerplate.name}" wurde erfolgreich importiert`);
    } catch (error) {
      console.error('Fehler beim Importieren:', error);
      toastService.error('Dokument konnte nicht importiert werden');
      throw error;
    }
  }, [user?.uid, selectedFolderId, organizationId, projectId, loadFolderContent]);

  // Save as Boilerplate State & Handlers (INLINE)
  const [showSaveAsBoilerplateModal, setShowSaveAsBoilerplateModal] = useState(false);
  const [assetToSaveAsBoilerplate, setAssetToSaveAsBoilerplate] = useState<any>(null);
  const [boilerplateName, setBoilerplateName] = useState('');
  const [boilerplateDescription, setBoilerplateDescription] = useState('');
  const [boilerplateCategory, setBoilerplateCategory] = useState<'company' | 'contact' | 'legal' | 'product' | 'custom'>('custom');
  const [boilerplateSaving, setBoilerplateSaving] = useState(false);

  const handleSaveAsBoilerplate = useCallback((asset: any) => {
    setAssetToSaveAsBoilerplate(asset);
    setBoilerplateName(asset.fileName?.replace('.celero-doc', '') || '');
    setBoilerplateDescription('');
    setBoilerplateCategory('custom');
    setShowSaveAsBoilerplateModal(true);
  }, []);

  const handleSaveBoilerplate = useCallback(async () => {
    if (!user?.uid || !assetToSaveAsBoilerplate || !boilerplateName.trim()) {
      toastService.error('Bitte geben Sie einen Namen ein');
      return;
    }

    setBoilerplateSaving(true);
    try {
      const docContent = await documentContentService.loadDocument(assetToSaveAsBoilerplate.contentRef);
      if (!docContent) throw new Error('Dokument-Inhalt konnte nicht geladen werden');

      const { boilerplatesService } = await import('@/lib/firebase/boilerplate-service');

      await boilerplatesService.create(
        {
          name: boilerplateName.trim(),
          content: docContent.content,
          category: boilerplateCategory,
          description: boilerplateDescription.trim(),
          isGlobal: false,
          clientId: customerId,
          clientName: customerName,
        },
        { organizationId, userId: user.uid }
      );

      toastService.success(`"${boilerplateName}" wurde als Boilerplate gespeichert`);
      setShowSaveAsBoilerplateModal(false);
      setAssetToSaveAsBoilerplate(null);
    } catch (error) {
      console.error('Fehler beim Speichern als Boilerplate:', error);
      toastService.error('Boilerplate konnte nicht gespeichert werden');
    } finally {
      setBoilerplateSaving(false);
    }
  }, [user?.uid, assetToSaveAsBoilerplate, boilerplateName, boilerplateDescription, boilerplateCategory, organizationId, projectId]);

  const handleDeleteSuccess = useCallback(() => {
    // Refresh current view after deletion
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    }
    // Always refresh parent data and folder counts
    onRefresh();
  }, [selectedFolderId, loadFolderContent, onRefresh]);

  const {
    confirmDialog,
    setConfirmDialog,
    handleDeleteAsset,
    handleDownloadDocument,
    handleAssetClick: handleAssetClickBase
  } = useFileActions({
    organizationId,
    selectedFolderId,
    onSuccess: (msg) => toastService.success(msg),
    onError: (msg) => toastService.error(msg),
    onRefresh: handleDeleteSuccess
  });

  const {
    showDocumentEditor,
    editingDocument,
    handleCreateDocument,
    handleEditDocument,
    handleDocumentSave: handleDocumentSaveBase,
    handleCloseEditor
  } = useDocumentEditor({
    onSaveSuccess: handleDocumentSaveSuccess
  });

  const {
    showSpreadsheetEditor,
    editingSpreadsheet,
    initialSpreadsheetData,
    handleCreateSpreadsheet,
    handleEditSpreadsheet,
    handleSpreadsheetSave,
    handleCloseEditor: handleCloseSpreadsheetEditor
  } = useSpreadsheetEditor({
    onSaveSuccess: handleDocumentSaveSuccess // Reuse same success callback
  });

  // Local Component State (UI only)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showBoilerplateImportModal, setShowBoilerplateImportModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [assetToMove, setAssetToMove] = useState<any>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Enhanced Drag & Drop Handlers (optimized with useCallback)
  const handleMainDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleMainDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setShowUploadModal(true);
    }
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderId);
  }, []);

  const handleFolderDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're really leaving the folder
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverFolder(null);
    }
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, folderId: string, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Open Upload Modal for this folder
      setSelectedFolderId(folderId);
      setShowUploadModal(true);
    }
  }, [setSelectedFolderId]);

  const handleUploadSuccess = useCallback(() => {
    // Refresh current view
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    }
    // Always refresh parent data and folder counts
    onRefresh();
  }, [selectedFolderId, loadFolderContent, onRefresh]);

  const handleCreateFolderSuccess = useCallback(() => {
    // Refresh current view after folder creation
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    } else {
      onRefresh();
    }
    toastService.success('Ordner wurde erfolgreich erstellt');
  }, [selectedFolderId, loadFolderContent, onRefresh]);

  const handleMoveAsset = useCallback((asset: any) => {
    setAssetToMove(asset);
    setShowMoveModal(true);
  }, []);

  const handleMoveSuccess = useCallback(() => {
    // Zurück zur Root-Ansicht und navigationStack zurücksetzen
    // Fix: Verhindert falsche Breadcrumbs nach Verschieben
    handleGoToRoot();

    // Parent-Daten und Ordner-Counts aktualisieren
    onRefresh();
    setTimeout(() => {
      loadAllFolders(); // Auch alle Ordner neu laden für das Modal
    }, 500);

    toastService.success('Datei wurde erfolgreich verschoben');
  }, [handleGoToRoot, onRefresh, loadAllFolders]);

  // Use handleAssetClick from useFileActions (optimized with useCallback)
  const handleAssetClick = useCallback(
    (asset: any) => handleAssetClickBase(asset, handleEditDocument, handleEditSpreadsheet),
    [handleAssetClickBase, handleEditDocument, handleEditSpreadsheet]
  );

  const confirmDeleteAsset = useCallback(async (assetId: string, fileName: string) => {
    setConfirmDialog(null);

    try {
      // Erst das Asset-Objekt laden, dann löschen
      const assets = await getMediaAssets(organizationId, selectedFolderId);
      const assetToDelete = assets.find(asset => asset.id === assetId);

      if (!assetToDelete) {
        toastService.error('Datei konnte nicht gefunden werden');
        return;
      }

      await deleteMediaAsset(assetToDelete);
      toastService.success(`Datei "${fileName}" wurde erfolgreich gelöscht`);

      // Refresh current view
      if (selectedFolderId) {
        loadFolderContent(selectedFolderId);
      } else {
        onRefresh();
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Datei:', error);
      toastService.error('Datei konnte nicht gelöscht werden');
    }
  }, [organizationId, selectedFolderId, loadFolderContent, onRefresh]);

  // File statistics (optimized with useMemo)
  const fileStats = useMemo(() => {
    return {
      total: currentAssets.length,
      totalSize: currentAssets.reduce((sum, asset) => sum + (asset.fileSize || 0), 0),
      byType: currentAssets.reduce((acc, asset) => {
        const type = asset.fileType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [currentAssets]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (asset: any) => {
    if (asset.fileType?.startsWith('image/')) {
      return <PhotoIcon className="w-5 h-5 text-blue-500" />;
    }
    if (asset.fileType === 'celero-sheet' || asset.fileName?.endsWith('.celero-sheet')) {
      return <TableCellsIcon className="w-5 h-5 text-green-600" />;
    }
    if (asset.fileType === 'celero-doc' || asset.fileName?.endsWith('.celero-doc')) {
      return <DocumentTextIcon className="w-5 h-5 text-blue-600" />;
    }
    return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
  };

  if (foldersLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 w-full">
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
        </div>
        <div>
          <FolderSkeleton />
        </div>
      </div>
    );
  }

  if (!projectFolders) {
    return (
      <div className="text-center py-8">
        <FolderIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <Text className="text-gray-500 mb-2">Keine Projektordner verfügbar</Text>
        <Text className="text-sm text-gray-400">
          Nur neue Projekte haben automatische Ordnerstrukturen
        </Text>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Strategiedokumente</h3>
        <div className="flex items-center space-x-2">
          {selectedFolderId && (
            <Button
              plain
              onClick={() => setShowCreateFolderModal(true)}
              disabled={loading}
              title="Ordner erstellen"
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <FolderIcon className="w-5 h-5" />
            </Button>
          )}
          {/* Document Editor Buttons - nur im Dokumente-Ordner UND nicht im Root sichtbar */}
          {selectedFolderId && filterByFolder === 'Dokumente' && (
            <div className="flex items-center space-x-2">
              <Button
                plain
                onClick={handleCreateDocument}
                disabled={loading}
                title="Text erstellen"
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                <DocumentPlusIcon className="w-5 h-5" />
              </Button>
              <Button
                plain
                onClick={() => handleCreateSpreadsheet()}
                disabled={loading}
                title="Tabelle erstellen"
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                <TableCellsIcon className="w-5 h-5" />
              </Button>
            </div>
          )}

          <Button
            onClick={() => setShowUploadModal(true)}
            disabled={loading || (!selectedFolderId && breadcrumbs.length === 0)}
          >
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            Hochladen
          </Button>

          {/* Bibliothek Import Button - nur im Dokumente-Ordner */}
          {selectedFolderId && filterByFolder === 'Dokumente' && (
            <Button
              onClick={() => setShowBoilerplateImportModal(true)}
              disabled={loading}
            >
              <BookmarkIcon className="w-4 h-4 mr-2" />
              Bibliothek
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center space-x-2 mb-4 text-sm">
          <button
            onClick={handleGoToRoot}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {filterByFolder === 'Dokumente' ? 'Dokumente' : 'Projekt-Ordner'}
          </button>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                <Text className="text-gray-400">/</Text>
                {isLast ? (
                  <Text className="text-gray-600 font-medium">{crumb.name}</Text>
                ) : (
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {crumb.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div
        className="space-y-3"
        onDragOver={handleMainDragOver}
        onDrop={handleMainDrop}
      >
        {/* Ordner anzeigen mit Enhanced Drag & Drop */}
        {currentFolders.map((folder: any, index: number) => {
          // Name-basierte Farb-Zuordnung (statt index-basiert)
          const getFolderColor = (folderName: string) => {
            const name = folderName.toLowerCase();
            if (name.includes('medien') || name.includes('media')) {
              return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' };
            }
            if (name.includes('analyse') || name.includes('analysis')) {
              return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: 'text-orange-600' };
            }
            if (name.includes('dokument') || name.includes('document')) {
              return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: 'text-green-600' };
            }
            if (name.includes('bild') || name.includes('image') || name.includes('foto') || name.includes('photo')) {
              return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' };
            }
            if (name.includes('video')) {
              return { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', icon: 'text-pink-600' };
            }
            if (name.includes('audio') || name.includes('sound')) {
              return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600' };
            }
            // Fallback: Verwende Index für unbekannte Ordner
            const fallbackColors = [
              { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', icon: 'text-gray-600' },
              { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', icon: 'text-slate-600' },
            ];
            return fallbackColors[index % fallbackColors.length];
          };
          const color = getFolderColor(folder.name);
          const isDragOver = dragOverFolder === folder.id;
          
          return (
            <div 
              key={folder.id} 
              className={`${color.bg} ${color.border} border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                isDragOver 
                  ? 'ring-2 ring-blue-400 shadow-lg transform scale-105' 
                  : 'hover:shadow-sm'
              }`}
              onClick={() => handleFolderClick(folder.id)}
              onDragOver={(e) => handleFolderDragOver(e, folder.id)}
              onDragLeave={handleFolderDragLeave}
              onDrop={(e) => handleFolderDrop(e, folder.id, folder.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FolderIcon className={`h-5 w-5 ${color.icon} mr-3 ${
                    isDragOver ? 'animate-pulse' : ''
                  }`} />
                  <div>
                    <Text className={`font-medium ${color.text}`}>
                      {folder.name}
                    </Text>
                    {isDragOver && (
                      <Text className="text-xs text-gray-600 mt-1">
                        Drop files here to upload
                      </Text>
                    )}
                  </div>
                </div>
                <div className={`text-gray-400 ${
                  isDragOver ? 'text-blue-500' : ''
                }`}>
                  {isDragOver ? '⬇' : '→'}
                </div>
              </div>
            </div>
          );
        })}

        {/* Assets anzeigen - Tabellen-Ansicht */}
        {currentAssets.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <div className="w-[50%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </div>
                <div className="w-[20%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typ
                </div>
                <div className="w-[20%] text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </div>
                <div className="w-[10%]"></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {currentAssets.map((asset: any) => (
                <div key={asset.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    {/* Name mit Icon */}
                    <div className="w-[50%] flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {getFileIcon(asset)}
                      </div>
                      <button
                        onClick={() => handleAssetClick(asset)}
                        className="text-left hover:text-blue-600 transition-colors min-w-0 flex-1"
                      >
                        <span className="text-sm font-semibold text-gray-900 truncate block">
                          {asset.fileName}
                        </span>
                      </button>
                    </div>

                    {/* Typ */}
                    <div className="w-[20%]">
                      <Text className="text-sm text-gray-600">
                        {asset.fileType === 'celero-doc' ? 'Dokument' : asset.fileType || 'Datei'}
                      </Text>
                    </div>

                    {/* Erstellt */}
                    <div className="w-[20%]">
                      <Text className="text-sm text-gray-600">
                        {asset.createdAt?.toDate?.()?.toLocaleDateString('de-DE') || 'Unbekannt'}
                      </Text>
                    </div>

                    {/* Actions */}
                    <div className="w-[10%] flex justify-end">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
                          <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          {asset.fileType === 'celero-doc' || asset.fileName?.endsWith('.celero-doc') ? (
                            <>
                              <DropdownItem onClick={() => handleEditDocument(asset)}>
                                Ansehen / Bearbeiten
                              </DropdownItem>
                            </>
                          ) : (
                            <DropdownItem onClick={() => window.open(asset.downloadUrl, '_blank')}>
                              Ansehen
                            </DropdownItem>
                          )}
                          <DropdownItem onClick={() => handleDownloadDocument(asset)}>
                            Download
                          </DropdownItem>
                          {filterByFolder !== 'Dokumente' && (
                            <DropdownItem onClick={() => handleMoveAsset(asset)}>
                              Verschieben
                            </DropdownItem>
                          )}
                          {filterByFolder === 'Dokumente' && (asset.fileType === 'celero-doc' || asset.fileName?.endsWith('.celero-doc')) && (
                            <DropdownItem onClick={() => handleSaveAsBoilerplate(asset)}>
                              Als Boilerplate speichern
                            </DropdownItem>
                          )}
                          <DropdownDivider />
                          <DropdownItem onClick={() => handleDeleteAsset(asset.id, asset.fileName)}>
                            <span className="text-red-600">Löschen</span>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {currentFolders.length === 0 && currentAssets.length === 0 && !loading && (
          <div className="text-center py-8">
            <FolderIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <Text className="text-gray-500 mb-2">
              {selectedFolderId ? 'Dieser Ordner ist leer' : 'Keine Ordner verfügbar'}
            </Text>
            <Button onClick={() => setShowUploadModal(true)} className="mt-2">
              <CloudArrowUpIcon className="w-4 h-4 mr-2" />
              Erste Datei hochladen
            </Button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadZone
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
        currentFolderId={selectedFolderId}
        folderName={breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : undefined}
        organizationId={organizationId}
        projectId={projectId}
      />

      {/* Create Folder Modal */}
      <FolderCreateDialog
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateSuccess={handleCreateFolderSuccess}
        parentFolderId={selectedFolderId}
        organizationId={organizationId}
      />
      
      {/* Move Asset Modal */}
      <MoveAssetModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMoveSuccess={handleMoveSuccess}
        asset={assetToMove}
        availableFolders={projectFolders?.subfolders || []}
        currentFolderId={selectedFolderId}
        organizationId={organizationId}
        rootFolder={projectFolders?.assets ? projectFolders.mainFolder : undefined}
      />

      {/* Boilerplate Import Dialog */}
      <BoilerplateImportDialog
        isOpen={showBoilerplateImportModal}
        onClose={() => setShowBoilerplateImportModal(false)}
        organizationId={organizationId}
        customerId={customerId}
        onImport={handleBoilerplateImport}
      />

      {/* Save as Boilerplate Dialog - INLINE */}
      {assetToSaveAsBoilerplate && (
        <Dialog open={showSaveAsBoilerplateModal} onClose={() => setShowSaveAsBoilerplateModal(false)} size="2xl">
          <DialogTitle>Als Boilerplate speichern</DialogTitle>
          <DialogBody className="space-y-4">
            <Field>
              <Label>Name *</Label>
              <Input type="text" value={boilerplateName} onChange={(e) => setBoilerplateName(e.target.value)} placeholder="z.B. Unternehmensprofil Standard" required />
            </Field>
            <Field>
              <Label>Beschreibung (optional)</Label>
              <Input type="text" value={boilerplateDescription} onChange={(e) => setBoilerplateDescription(e.target.value)} placeholder="Kurze Beschreibung..." />
            </Field>
            <Field>
              <Label>Kategorie *</Label>
              <Select value={boilerplateCategory} onChange={(e) => setBoilerplateCategory(e.target.value as any)}>
                <option value="company">Unternehmensbeschreibung</option>
                <option value="contact">Kontaktinformationen</option>
                <option value="legal">Rechtliche Hinweise</option>
                <option value="product">Produktbeschreibung</option>
                <option value="custom">Sonstige</option>
              </Select>
            </Field>
          </DialogBody>
          <DialogActions>
            <Button color="secondary" onClick={() => setShowSaveAsBoilerplateModal(false)} disabled={boilerplateSaving}>Abbrechen</Button>
            <Button color="primary" onClick={handleSaveBoilerplate} disabled={boilerplateSaving || !boilerplateName.trim()}>{boilerplateSaving ? 'Speichert...' : 'Speichern'}</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Document Editor Modal */}
      {showDocumentEditor && (
        <DocumentEditorModal
          isOpen={showDocumentEditor}
          onClose={handleCloseEditor}
          onSave={handleDocumentSaveBase}
          document={editingDocument}
          folderId={selectedFolderId || projectFolders?.id}
          organizationId={organizationId}
          projectId={projectId}
        />
      )}

      {/* Spreadsheet Editor Modal */}
      {showSpreadsheetEditor && (
        <SpreadsheetEditorModal
          isOpen={showSpreadsheetEditor}
          onClose={handleCloseSpreadsheetEditor}
          onSave={handleSpreadsheetSave}
          document={editingSpreadsheet}
          folderId={selectedFolderId || projectFolders?.id}
          organizationId={organizationId}
          projectId={projectId}
          initialData={initialSpreadsheetData || undefined}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <DeleteConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}