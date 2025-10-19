'use client';

import React, { useState, useEffect } from 'react';
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
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import Alert from './folders/components/Alert';
import DeleteConfirmDialog from './folders/components/DeleteConfirmDialog';
import FolderCreateDialog from './folders/components/FolderCreateDialog';
import UploadZone from './folders/components/UploadZone';
import MoveAssetModal from './folders/components/MoveAssetModal';
// Custom Hooks
import { useFolderNavigation } from './folders/hooks/useFolderNavigation';
import { useFileActions } from './folders/hooks/useFileActions';
import { useDocumentEditor } from './folders/hooks/useDocumentEditor';

// Lazy load Document Editor Modal
const DocumentEditorModal = dynamic(
  () => import('./DocumentEditorModal'),
  { ssr: false }
);

// Skeleton Loader Component
function FolderSkeleton() {
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
}

// Main Component
interface ProjectFoldersViewProps {
  projectId: string;
  organizationId: string;
  projectFolders: any;
  foldersLoading: boolean;
  onRefresh: () => void;
}

export default function ProjectFoldersView({
  projectId,
  organizationId,
  projectFolders,
  foldersLoading,
  onRefresh
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
  } = useFolderNavigation({ organizationId, projectFolders });

  const showAlert = (type: 'info' | 'error' | 'success', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const {
    confirmDialog,
    setConfirmDialog,
    handleDeleteAsset,
    handleDownloadDocument,
    handleAssetClick: handleAssetClickBase
  } = useFileActions({
    organizationId,
    onSuccess: (msg) => showAlert('success', msg),
    onError: (msg) => showAlert('error', msg)
  });

  const {
    showDocumentEditor,
    editingDocument,
    handleCreateDocument,
    handleEditDocument,
    handleDocumentSave: handleDocumentSaveBase,
    handleCloseEditor
  } = useDocumentEditor({
    onSaveSuccess: () => {
      if (selectedFolderId) {
        loadFolderContent(selectedFolderId);
      } else {
        onRefresh();
      }
      showAlert('success', 'Dokument wurde erfolgreich gespeichert.');
    }
  });

  // Local Component State (UI only)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [assetToMove, setAssetToMove] = useState<any>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Initial load - zeige die Unterordner des Hauptordners
  useEffect(() => {
    if (projectFolders?.subfolders) {
      setCurrentFolders(projectFolders.subfolders);
      // Wenn assets direkt mitgeliefert werden (für Strategie-Tab), zeige sie
      setCurrentAssets(projectFolders.assets || []);
      setBreadcrumbs([]);

      // Wenn assets vorhanden sind, bedeutet das wir direkt in einem Ordner starten
      // (z.B. Strategie-Tab startet direkt im Dokumente-Ordner)
      if (projectFolders.assets && projectFolders.mainFolder?.id) {
        setSelectedFolderId(projectFolders.mainFolder.id);
      }

      // Lade alle Ordner für Verschieben-Modal
      loadAllFolders();
    }
  }, [projectFolders]);


  const loadAllFolders = async () => {
    if (!projectFolders?.subfolders) return;
    
    try {
      const allFoldersFlat: any[] = [];
      
      // Rekursive Funktion um alle Unterordner zu sammeln (aber nicht die Hauptordner selbst)
      const collectFolders = async (folders: any[], level = 0) => {
        for (const folder of folders) {
          // Nur Unterordner hinzufügen, nicht die Hauptordner (Medien, Dokumente, Pressemeldungen)
          if (level > 0) {
            allFoldersFlat.push({
              ...folder,
              level,
              displayName: '  '.repeat(level - 1) + folder.name
            });
          }
          
          // Lade Unterordner falls vorhanden
          try {
            const subfolders = await getFolders(organizationId, folder.id);
            if (subfolders.length > 0) {
              await collectFolders(subfolders, level + 1);
            }
          } catch (error) {
            console.error(`Fehler beim Laden der Unterordner für ${folder.id}:`, error);
          }
        }
      };
      
      await collectFolders(projectFolders.subfolders, 0);
      setAllFolders(allFoldersFlat);
    } catch (error) {
      console.error('Fehler beim Laden aller Ordner:', error);
    }
  };


  // Vereinfachtes Breadcrumb-System - wir bauen den Pfad während der Navigation auf
  const [navigationStack, setNavigationStack] = useState<{id: string, name: string}[]>([]);

  const loadFolderContentWithStack = async (folderId: string, stack: {id: string, name: string}[]) => {
    setLoading(true);
    try {
      // Lade Inhalte des spezifischen Ordners
      const [folders, assets] = await Promise.all([
        getFolders(organizationId, folderId),
        getMediaAssets(organizationId, folderId)
      ]);
      setCurrentFolders(folders);
      setCurrentAssets(assets);

      // Breadcrumbs aus dem übergebenen Stack setzen
      setBreadcrumbs([...stack]);
    } catch (error) {
      console.error('Fehler beim Laden der Ordnerinhalte:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContent = async (folderId?: string) => {
    setLoading(true);
    try {
      if (folderId) {
        // Lade Inhalte des spezifischen Ordners
        const [folders, assets] = await Promise.all([
          getFolders(organizationId, folderId),
          getMediaAssets(organizationId, folderId)
        ]);
        setCurrentFolders(folders);
        setCurrentAssets(assets);

        // Breadcrumbs immer aus navigationStack setzen
        setBreadcrumbs([...navigationStack]);
      } else {
        // Zurück zur Hauptansicht (Unterordner des Projektordners)
        setCurrentFolders(projectFolders?.subfolders || []);
        setCurrentAssets([]);
        setBreadcrumbs([]);
        setNavigationStack([]); // Stack zurücksetzen
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ordnerinhalte:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderId: string) => {
    // Erweitere den navigationStack BEVOR loadFolderContent aufgerufen wird
    const folder = currentFolders.find(f => f.id === folderId) || 
                   projectFolders?.subfolders?.find((f: any) => f.id === folderId);
    if (folder) {
      const newStack = [...navigationStack, { id: folder.id, name: folder.name }];
      setNavigationStack(newStack);
      
      // Setze selectedFolderId und lade Ordnerinhalt
      setSelectedFolderId(folderId);
      loadFolderContentWithStack(folderId, newStack);
    }
  };
  

  const handleGoToRoot = () => {
    if (projectFolders.assets && projectFolders.mainFolder?.id) {
      // Im Strategie-Tab: Zurück zum Dokumente-Ordner (der hier Root ist)
      setSelectedFolderId(projectFolders.mainFolder.id);
      setNavigationStack([]);
      setCurrentFolders(projectFolders.subfolders || []);
      setCurrentAssets(projectFolders.assets || []);
      setBreadcrumbs([]);
    } else {
      // Im Daten-Tab: Zurück zu den 3 Hauptordnern
      setSelectedFolderId(undefined);
      setNavigationStack([]);
      loadFolderContent();
    }
  };

  const handleBreadcrumbClick = (clickedIndex: number) => {
    // Navigiere zu der geklickten Breadcrumb-Ebene
    const targetStack = navigationStack.slice(0, clickedIndex + 1);
    const targetFolder = targetStack[targetStack.length - 1];
    
    setNavigationStack(targetStack);
    setSelectedFolderId(targetFolder.id);
    loadFolderContentWithStack(targetFolder.id, targetStack);
  };

  const handleBackClick = () => {
    if (navigationStack.length > 0) {
      // Entferne den letzten Ordner vom Stack
      const newStack = navigationStack.slice(0, -1);
      setNavigationStack(newStack);
      
      if (newStack.length > 0) {
        // Gehe zum vorherigen Ordner im Stack
        const previousFolder = newStack[newStack.length - 1];
        setSelectedFolderId(previousFolder.id);
        loadFolderContent(previousFolder.id);
      } else {
        // Zurück zur Hauptansicht
        setSelectedFolderId(undefined);
        loadFolderContent();
      }
    } else {
      setSelectedFolderId(undefined);
      loadFolderContent();
    }
  };

  // Enhanced Drag & Drop Handlers
  const handleMainDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  
  const handleMainDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setShowUploadModal(true);
    }
  };
  
  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderId);
  };
  
  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're really leaving the folder
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverFolder(null);
    }
  };
  
  const handleFolderDrop = async (e: React.DragEvent, folderId: string, folderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Open Upload Modal for this folder
      setSelectedFolderId(folderId);
      setShowUploadModal(true);
    }
  };
  
  const handleUploadSuccess = () => {
    // Refresh current view
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    }
    // Always refresh parent data and folder counts
    onRefresh();
  };

  const handleCreateFolderSuccess = () => {
    // Refresh current view after folder creation
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    } else {
      onRefresh();
    }
    showAlert('success', 'Ordner wurde erfolgreich erstellt.');
  };

  const showAlert = (type: 'info' | 'error' | 'success', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleMoveAsset = (asset: any) => {
    setAssetToMove(asset);
    setShowMoveModal(true);
  };

  const handleMoveSuccess = () => {
    // Refresh current view nach dem Verschieben
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    } else {
      // Zurück zur Hauptansicht und alles neu laden
      setCurrentFolders(projectFolders?.subfolders || []);
      setCurrentAssets([]);
      setBreadcrumbs([]);
    }
    
    // Parent-Daten und Ordner-Counts aktualisieren
    onRefresh();
    setTimeout(() => {
      loadAllFolders(); // Auch alle Ordner neu laden für das Modal
    }, 500);
    
    showAlert('success', 'Datei wurde erfolgreich verschoben.');
  };

  const handleDeleteAsset = (assetId: string, fileName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Datei löschen',
      message: `Möchten Sie die Datei "${fileName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      onConfirm: () => confirmDeleteAsset(assetId, fileName)
    });
  };
  
  // Document Editor Handlers
  const handleCreateDocument = () => {
    setEditingDocument(null);
    setShowDocumentEditor(true);
  };
  
  const handleEditDocument = (asset: any) => {
    const document: InternalDocument = {
      ...asset,
      contentRef: asset.contentRef // Keine Fallback-Logik - muss exakt stimmen
    };

    setEditingDocument(document);
    setShowDocumentEditor(true);
  };
  
  const handleDocumentSave = () => {
    // Refresh current view after document save
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    } else {
      onRefresh();
    }
    setShowDocumentEditor(false);
    setEditingDocument(null);
    
    showAlert('success', 'Dokument wurde erfolgreich gespeichert.');
  };
  
  // Check if we are in "Dokumente" folder
  const isInDocumentsFolder = () => {
    return breadcrumbs.some(b => b.name === 'Dokumente') || 
           currentFolders.some(f => f.name === 'Dokumente');
  };
  
  // Handle asset click - open documents in editor (NOT download)
  const handleAssetClick = (asset: any) => {
    // Check if it's a document type that should open in editor
    const isEditableDocument = asset.fileType === 'celero-doc' || 
                              asset.fileName?.endsWith('.celero-doc');
    
    if (isEditableDocument) {
      // Open in editor for viewing/editing
      handleEditDocument(asset);
    } else {
      // Open normally for other file types (including .docx)
      window.open(asset.downloadUrl, '_blank');
    }
  };
  
  // Convert HTML to RTF
  const convertHtmlToRtf = (html: string, title: string): string => {
    // Remove HTML tags and convert basic formatting to RTF
    let text = html
      // Convert headings
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\\par\\fs28\\b $1\\b0\\fs24\\par\\par')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\\par\\fs26\\b $1\\b0\\fs24\\par\\par')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\\par\\fs24\\b $1\\b0\\fs24\\par\\par')
      // Convert bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '\\b $1\\b0')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '\\b $1\\b0')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '\\i $1\\i0')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '\\i $1\\i0')
      // Convert underline
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '\\ul $1\\ul0')
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\\par\\par')
      // Convert line breaks
      .replace(/<br[^>]*>/gi, '\\par')
      // Convert lists
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\\par')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '\\bullet $1\\par')
      // Remove any remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Clean up extra spaces and line breaks
      .replace(/\s+/g, ' ')
      .trim();

    // RTF header and formatting
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 ${text}
}`;

    return rtfContent;
  };

  // Download document as RTF or other formats
  const handleDownloadDocument = async (asset: any) => {
    try {
      if (asset.contentRef) {
        // Load document content
        const content = await documentContentService.loadDocument(asset.contentRef);
        if (content) {
          // Convert to RTF
          const rtfContent = convertHtmlToRtf(content.content, asset.fileName.replace('.celero-doc', ''));
          
          // Create RTF download
          const blob = new Blob([rtfContent], { type: 'application/rtf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${asset.fileName.replace('.celero-doc', '')}.rtf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          alert('Dokument-Inhalt konnte nicht geladen werden.');
        }
      } else if (asset.downloadUrl) {
        // Regular download for non-celero documents (DOCX, PDF, etc.)
        const a = document.createElement('a');
        a.href = asset.downloadUrl;
        a.download = asset.fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert('Diese Datei kann nicht heruntergeladen werden - keine downloadUrl verfügbar.');
      }
    } catch (error) {
      console.error('Fehler beim Download:', error);
      alert('Fehler beim Download des Dokuments.');
    }
  };

  const confirmDeleteAsset = async (assetId: string, fileName: string) => {
    setConfirmDialog(null);

    try {
      // Erst das Asset-Objekt laden, dann löschen
      const assets = await getMediaAssets(organizationId, selectedFolderId);
      const assetToDelete = assets.find(asset => asset.id === assetId);

      if (!assetToDelete) {
        showAlert('error', 'Datei konnte nicht gefunden werden.');
        return;
      }

      await deleteMediaAsset(assetToDelete);
      showAlert('success', `Datei "${fileName}" wurde erfolgreich gelöscht.`);

      // Refresh current view
      if (selectedFolderId) {
        loadFolderContent(selectedFolderId);
      } else {
        onRefresh();
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Datei:', error);
      showAlert('error', 'Fehler beim Löschen der Datei. Bitte versuchen Sie es erneut.');
    }
  };

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
      <div className="flex items-center justify-end mb-4">
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
          {selectedFolderId && isInDocumentsFolder() && (
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
                onClick={() => {/* TODO: Tabellen-Editor */}}
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
        </div>
      </div>

      {/* Alert anzeigen */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} message={alert.message} />
        </div>
      )}

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center space-x-2 mb-4 text-sm">
          <button
            onClick={handleGoToRoot}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {projectFolders.assets ? 'Dokumente' : 'Projekt-Ordner'}
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
          const colors = [
            { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
            { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' },
            { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: 'text-green-600' }
          ];
          const color = colors[index % colors.length];
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
                          <DropdownItem onClick={() => handleMoveAsset(asset)}>
                            Verschieben
                          </DropdownItem>
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

      {/* Document Editor Modal */}
      {showDocumentEditor && (
        <DocumentEditorModal
          isOpen={showDocumentEditor}
          onClose={() => {
            setShowDocumentEditor(false);
            setEditingDocument(null);
          }}
          onSave={handleDocumentSave}
          document={editingDocument}
          folderId={selectedFolderId || projectFolders?.id}
          organizationId={organizationId}
          projectId={projectId}
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