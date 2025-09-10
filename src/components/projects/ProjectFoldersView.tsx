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
import { mediaService } from '@/lib/firebase/media-service';
import { useAuth } from '@/context/AuthContext';
import { documentContentService } from '@/lib/firebase/document-content-service';
import type { InternalDocument } from '@/types/document-content';

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

// Alert Component
function Alert({ 
  type = 'info', 
  message 
}: { 
  type?: 'info' | 'error' | 'success';
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700',
    success: 'bg-green-50 text-green-700'
  };

  const iconColor = type === 'error' ? 'text-red-400' : 
                   type === 'success' ? 'text-green-400' : 'text-blue-400';

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <InformationCircleIcon aria-hidden="true" className={`size-5 ${iconColor}`} />
        </div>
        <div className="ml-3">
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

// Confirm Dialog Component
function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogBody>
        <Text>{message}</Text>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700">
          Löschen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Move Asset Modal Component - FTP Style Navigation
function MoveAssetModal({
  isOpen,
  onClose,
  onMoveSuccess,
  asset,
  availableFolders,
  currentFolderId,
  organizationId
}: {
  isOpen: boolean;
  onClose: () => void;
  onMoveSuccess: () => void;
  asset: any;
  availableFolders: any[];
  currentFolderId?: string;
  organizationId: string;
}) {
  const [currentPath, setCurrentPath] = useState<{id: string, name: string}[]>([]);
  const [currentFolders, setCurrentFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error'; message: string } | null>(null);
  
  // Modal zurücksetzen und Hauptordner laden wenn geöffnet wird
  useEffect(() => {
    if (isOpen) {
      setCurrentPath([]);
      setSelectedFolderId(null);
      setAlert(null);
      // Lade die 3 Hauptordner (Medien, Dokumente, Pressemeldungen)
      setCurrentFolders(availableFolders || []);
    }
  }, [isOpen, availableFolders]);

  const showAlert = (message: string) => {
    setAlert({ type: 'error', message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleFolderClick = async (folder: any) => {
    try {
      // Navigiere in den Ordner hinein
      const subfolders = await mediaService.getFolders(organizationId, folder.id);
      setCurrentFolders(subfolders);
      setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
      setSelectedFolderId(folder.id); // Aktueller Ordner ist ausgewählt
    } catch (error) {
      console.error('Fehler beim Laden des Ordners:', error);
      showAlert('Fehler beim Laden des Ordners.');
    }
  };

  const handleBackClick = async () => {
    if (currentPath.length === 0) return;
    
    try {
      if (currentPath.length === 1) {
        // Zurück zu den Hauptordnern
        setCurrentFolders(availableFolders || []);
        setCurrentPath([]);
        setSelectedFolderId(null);
      } else {
        // Zurück zum vorherigen Ordner
        const parentFolder = currentPath[currentPath.length - 2];
        const subfolders = await mediaService.getFolders(organizationId, parentFolder.id);
        setCurrentFolders(subfolders);
        setCurrentPath(currentPath.slice(0, -1));
        setSelectedFolderId(parentFolder.id);
      }
    } catch (error) {
      console.error('Fehler beim Zurücknavigieren:', error);
      showAlert('Fehler beim Navigieren.');
    }
  };

  const handleMove = async () => {
    if (!asset?.id || selectedFolderId === null) return;
    
    setMoving(true);
    try {
      await mediaService.updateAsset(asset.id, {
        folderId: selectedFolderId
      });
      
      onMoveSuccess();
      onClose();
    } catch (error) {
      console.error('Fehler beim Verschieben der Datei:', error);
      showAlert('Fehler beim Verschieben der Datei. Bitte versuchen Sie es erneut.');
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen || !asset) return null;

  const getPathString = () => {
    if (currentPath.length === 0) return 'Projekt-Ordner';
    return 'Projekt-Ordner > ' + currentPath.map(p => p.name).join(' > ');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogTitle>Datei verschieben</DialogTitle>
      <DialogBody className="space-y-4">
        {alert && <Alert type={alert.type} message={alert.message} />}
        
        {/* Zu verschiebende Datei anzeigen */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            <Text className="font-medium text-blue-900">{asset?.fileName}</Text>
          </div>
        </div>
        
        {/* Aktueller Pfad */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <Text className="text-sm font-medium text-gray-700">Aktueller Pfad:</Text>
          <Text className="text-sm text-gray-600">{getPathString()}</Text>
        </div>
        
        {/* Ordner-Navigation */}
        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {/* Zurück-Button */}
          {currentPath.length > 0 && (
            <div 
              className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b"
              onClick={handleBackClick}
            >
              <FolderIcon className="w-5 h-5 text-gray-500" />
              <Text className="text-sm font-medium text-gray-700">..</Text>
            </div>
          )}
          
          {/* Ordner-Liste */}
          {currentFolders.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Text className="text-sm">Keine Unterordner vorhanden</Text>
              {selectedFolderId && (
                <Text className="text-xs mt-1">Sie können hier verschieben</Text>
              )}
            </div>
          ) : (
            currentFolders.map((folder) => (
              <div 
                key={folder.id}
                className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => handleFolderClick(folder)}
              >
                <FolderIcon className="w-5 h-5 text-blue-500" />
                <Text className="text-sm font-medium">{folder.name}</Text>
                <div className="ml-auto text-gray-400">→</div>
              </div>
            ))
          )}
        </div>
        
        {/* Zielordner-Info */}
        {selectedFolderId && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <Text className="text-sm font-medium text-green-800">
              ✓ Verschieben nach: {getPathString()}
            </Text>
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={moving}>
          Abbrechen
        </Button>
        <Button
          onClick={handleMove}
          disabled={moving || selectedFolderId === null}
        >
          {moving ? 'Wird verschoben...' : 'Hier verschieben'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Create Folder Modal Component
function CreateFolderModal({
  isOpen,
  onClose,
  onCreateSuccess,
  parentFolderId,
  organizationId,
  clientId
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: () => void;
  parentFolderId?: string;
  organizationId: string;
  clientId: string;
}) {
  const { user } = useAuth();
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error'; message: string } | null>(null);

  const showAlert = (message: string) => {
    setAlert({ type: 'error', message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleCreate = async () => {
    if (!folderName.trim() || !user?.uid) return;
    
    setCreating(true);
    try {
      await mediaService.createFolder({
        userId: user.uid,
        name: folderName.trim(),
        parentFolderId,
        description: `Unterordner erstellt von ${user.displayName || user.email}`,
        ...(clientId && { clientId })
      }, { organizationId, userId: user.uid });
      
      setFolderName('');
      onCreateSuccess();
      onClose();
    } catch (error) {
      console.error('Fehler beim Erstellen des Ordners:', error);
      showAlert('Fehler beim Erstellen des Ordners. Bitte versuchen Sie es erneut.');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Neuen Ordner erstellen</DialogTitle>
      <DialogBody className="space-y-4">
        {alert && <Alert type={alert.type} message={alert.message} />}
        
        <div>
          <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
            Ordnername
          </label>
          <input
            id="folderName"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Ordnername eingeben..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={creating}
            maxLength={50}
          />
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={creating}>
          Abbrechen
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!folderName.trim() || creating}
        >
          {creating ? 'Wird erstellt...' : 'Ordner erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Upload Modal Component
function ProjectUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderName,
  clientId,
  organizationId
}: {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string;
  folderName?: string;
  clientId: string;
  organizationId: string;
}) {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  const showAlert = (type: 'info' | 'error' | 'success', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-5 h-5 text-blue-500" />;
    }
    return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !user?.uid) return;

    setUploading(true);
    setAlert(null);

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const progressCallback = (progress: number) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        };

        // Upload mit automatischer Kundenzuordnung
        return await mediaService.uploadClientMedia(
          file,
          organizationId,
          clientId,
          currentFolderId,
          progressCallback,
          { userId: user.uid }
        );
      });

      await Promise.all(uploadPromises);
      
      showAlert('success', `${selectedFiles.length} ${selectedFiles.length === 1 ? 'Datei wurde' : 'Dateien wurden'} erfolgreich hochgeladen.`);
      setSelectedFiles([]); // Upload-Liste zurücksetzen
      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Upload-Fehler:', error);
      showAlert('error', 'Fehler beim Hochladen der Dateien. Bitte versuchen Sie es erneut.');
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>
        <div className="flex items-center">
          <CloudArrowUpIcon className="w-5 h-5 mr-2 text-blue-600" />
          Dateien hochladen
          {folderName && (
            <Badge className="ml-2" color="blue">
              {folderName}
            </Badge>
          )}
        </div>
      </DialogTitle>
      
      <DialogBody className="space-y-6">
        {alert && <Alert type={alert.type} message={alert.message} />}
        
        {/* Kundeninformation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2" />
            <Text className="text-sm text-blue-700">
              Dateien werden automatisch dem Projektkunden zugeordnet
            </Text>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <Text className="text-lg font-medium text-gray-900 mb-2">
            Dateien hier ablegen oder
          </Text>
          <label className="cursor-pointer">
            <span className="text-blue-600 hover:text-blue-500 font-medium">
              durchsuchen
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Text className="font-medium">Ausgewählte Dateien ({selectedFiles.length})</Text>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div>
                      <Text className="text-sm font-medium truncate max-w-xs">
                        {file.name}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </Text>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {uploading && uploadProgress[file.name] !== undefined && (
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[file.name]}%` }}
                        />
                      </div>
                    )}
                    
                    {!uploading && (
                      <Button
                        plain
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogBody>
      
      <DialogActions>
        <Button plain onClick={onClose} disabled={uploading}>
          Abbrechen
        </Button>
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
        >
          {uploading ? 'Wird hochgeladen...' : `${selectedFiles.length} ${selectedFiles.length === 1 ? 'Datei' : 'Dateien'} hochladen`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Main Component
interface ProjectFoldersViewProps {
  projectId: string;
  organizationId: string;
  projectFolders: any;
  foldersLoading: boolean;
  onRefresh: () => void;
  clientId: string;
}

export default function ProjectFoldersView({
  projectId,
  organizationId,
  projectFolders,
  foldersLoading,
  onRefresh,
  clientId
}: ProjectFoldersViewProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [currentFolders, setCurrentFolders] = useState<any[]>([]);
  const [currentAssets, setCurrentAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string, name: string}>>([]);
  const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [assetToMove, setAssetToMove] = useState<any>(null);
  const [allFolders, setAllFolders] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Document Editor States
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [editingDocument, setEditingDocument] = useState<InternalDocument | null>(null);

  // Initial load - zeige die Unterordner des Hauptordners
  useEffect(() => {
    if (projectFolders?.subfolders) {
      setCurrentFolders(projectFolders.subfolders);
      setCurrentAssets([]);
      setBreadcrumbs([]);
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
            const subfolders = await mediaService.getFolders(organizationId, folder.id);
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
        mediaService.getFolders(organizationId, folderId),
        mediaService.getMediaAssets(organizationId, folderId)
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
          mediaService.getFolders(organizationId, folderId),
          mediaService.getMediaAssets(organizationId, folderId)
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
    // Immer zur Hauptansicht zurückgehen (3 Hauptordner)
    setSelectedFolderId(undefined);
    setNavigationStack([]);
    loadFolderContent();
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
    console.log('handleEditDocument called with asset:', asset);
    console.log('asset.contentRef:', asset.contentRef);
    
    const document: InternalDocument = {
      ...asset,
      contentRef: asset.contentRef // Keine Fallback-Logik - muss exakt stimmen
    };
    
    console.log('Prepared document for editor:', document);
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
  
  // Download document as HTML or text
  const handleDownloadDocument = async (asset: any) => {
    try {
      if (asset.contentRef) {
        // Load document content
        const content = await documentContentService.loadDocument(asset.contentRef);
        if (content) {
          // Create HTML file
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${asset.fileName.replace('.celero-doc', '')}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        p { line-height: 1.6; }
    </style>
</head>
<body>
    ${content.content}
</body>
</html>`;
          
          // Create download
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${asset.fileName.replace('.celero-doc', '')}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          alert('Dokument-Inhalt konnte nicht geladen werden.');
        }
      } else {
        // Regular download for non-celero documents
        window.open(asset.downloadUrl, '_blank');
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
      const assets = await mediaService.getMediaAssets(organizationId, selectedFolderId);
      const assetToDelete = assets.find(asset => asset.id === assetId);
      
      if (!assetToDelete) {
        showAlert('error', 'Datei konnte nicht gefunden werden.');
        return;
      }

      await mediaService.deleteMediaAsset(assetToDelete);
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
      <div className="bg-white border border-gray-200 rounded-lg p-6 w-full" style={{ height: '420px' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FolderIcon className="h-5 w-5 text-purple-500 mr-2" />
            <Subheading>Projekt-Ordner</Subheading>
            <div className="ml-2 animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 w-full" style={{ height: '420px' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FolderIcon className="h-5 w-5 text-purple-500 mr-2" />
          <Subheading>Projekt-Ordner</Subheading>
          {loading && (
            <div className="ml-2 animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {selectedFolderId && (
            <Button
              plain
              onClick={() => setShowCreateFolderModal(true)}
              disabled={loading}
            >
              <FolderIcon className="w-4 h-4 mr-2" />
              Ordner erstellen
            </Button>
          )}
          {/* Document Editor Buttons - nur im Dokumente-Ordner sichtbar */}
          {isInDocumentsFolder() && (
            <div className="flex items-center space-x-2">
              <Button
                plain
                onClick={handleCreateDocument}
                disabled={loading}
                title="Neues Textdokument erstellen"
              >
                <DocumentPlusIcon className="w-4 h-4 mr-2" />
                Text erstellen
              </Button>
              <Button
                plain
                onClick={() => {/* TODO: Tabellen-Editor */}}
                disabled={loading}
                title="Neue Tabelle erstellen"
              >
                <TableCellsIcon className="w-4 h-4 mr-2" />
                Tabelle erstellen
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
            Projekt-Ordner
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
      <div className="overflow-y-auto space-y-3" style={{ height: 'calc(100% - 80px)' }}>
        {/* Ordner anzeigen */}
        {currentFolders.map((folder: any, index: number) => {
          const colors = [
            { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
            { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' },
            { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: 'text-green-600' }
          ];
          const color = colors[index % colors.length];
          
          return (
            <div key={folder.id} className={`${color.bg} ${color.border} border rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow`}
                 onClick={() => handleFolderClick(folder.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FolderIcon className={`h-5 w-5 ${color.icon} mr-3`} />
                  <Text className={`font-medium ${color.text}`}>
                    {folder.name}
                  </Text>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </div>
          );
        })}

        {/* Assets anzeigen */}
        <div className="space-y-2">
          {currentAssets.map((asset: any) => (
            <div key={asset.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {getFileIcon(asset)}
                  <div className="min-w-0 flex-1 flex items-center">
                    <button
                      onClick={() => handleAssetClick(asset)}
                      className="text-left hover:text-blue-600 transition-colors w-full"
                    >
                      <Text className="text-sm font-medium text-gray-900 truncate hover:text-blue-600">
                        {asset.fileName}
                      </Text>
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Text className="text-xs text-gray-500 whitespace-nowrap">
                    {asset.createdAt?.toDate?.()?.toLocaleDateString('de-DE') || 'Unbekannt'}
                  </Text>
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
      <ProjectUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
        currentFolderId={selectedFolderId}
        folderName={breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : undefined}
        clientId={clientId}
        organizationId={organizationId}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateSuccess={handleCreateFolderSuccess}
        parentFolderId={selectedFolderId}
        organizationId={organizationId}
        clientId={clientId}
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
        <ConfirmDialog
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