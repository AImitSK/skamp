'use client';

import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  CloudArrowUpIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { mediaService } from '@/lib/firebase/media-service';
import { useAuth } from '@/context/AuthContext';

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
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string, name: string}>>([]);

  // Initial load - zeige die Unterordner des Hauptordners
  useEffect(() => {
    if (projectFolders?.subfolders) {
      setCurrentFolders(projectFolders.subfolders);
      setCurrentAssets([]);
      setBreadcrumbs([]);
    }
  }, [projectFolders]);

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
        
        // Update breadcrumbs
        if (folderId && projectFolders) {
          const folder = projectFolders.subfolders.find((f: any) => f.id === folderId);
          if (folder) {
            setBreadcrumbs([{ id: folder.id, name: folder.name }]);
          }
        }
      } else {
        // Zurück zur Hauptansicht (Unterordner des Projektordners)
        setCurrentFolders(projectFolders?.subfolders || []);
        setCurrentAssets([]);
        setBreadcrumbs([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ordnerinhalte:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderId: string) => {
    setSelectedFolderId(folderId);
    loadFolderContent(folderId);
  };

  const handleBackClick = () => {
    setSelectedFolderId(undefined);
    loadFolderContent();
  };

  const handleUploadSuccess = () => {
    // Refresh current view
    if (selectedFolderId) {
      loadFolderContent(selectedFolderId);
    } else {
      onRefresh();
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
        <Text className="ml-3">Ordner werden geladen...</Text>
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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FolderIcon className="h-5 w-5 text-purple-500 mr-2" />
          <Subheading>Projekt-Ordner</Subheading>
          {loading && (
            <div className="ml-2 animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          )}
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          disabled={loading}
        >
          <CloudArrowUpIcon className="w-4 h-4 mr-2" />
          Hochladen
        </Button>
      </div>

      <Text className="text-gray-600 mb-4">
        Dateien und Ordner in diesem Projekt. Uploads werden automatisch dem Projektkunden zugeordnet.
      </Text>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center space-x-2 mb-4 text-sm">
          <button
            onClick={handleBackClick}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Projekt-Ordner
          </button>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              <Text className="text-gray-400">/</Text>
              <Text className="text-gray-600 font-medium">{crumb.name}</Text>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {/* Ordner anzeigen */}
        {currentFolders.map((folder: any, index: number) => {
          const fileCount = projectFolders.statistics?.folderSizes?.[folder.id] || 0;
          const colors = [
            { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
            { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' },
            { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: 'text-green-600' }
          ];
          const color = colors[index % colors.length];
          
          return (
            <div key={folder.id} className={`${color.bg} ${color.border} border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow`}
                 onClick={() => handleFolderClick(folder.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FolderIcon className={`h-5 w-5 ${color.icon} mr-3`} />
                  <div>
                    <Text className={`font-medium ${color.text}`}>
                      {folder.name}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {fileCount} {fileCount === 1 ? 'Datei' : 'Dateien'}
                    </Text>
                  </div>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </div>
          );
        })}

        {/* Assets anzeigen */}
        {currentAssets.map((asset: any) => (
          <div key={asset.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(asset)}
                <div>
                  <Text className="font-medium text-gray-900">
                    {asset.fileName}
                  </Text>
                  <div className="flex items-center space-x-2 mt-1">
                    <Text className="text-xs text-gray-500">
                      {formatFileSize((asset.metadata as any)?.fileSize)}
                    </Text>
                    <span className="text-gray-300">•</span>
                    <Text className="text-xs text-gray-500">
                      {asset.createdAt?.toDate?.()?.toLocaleDateString('de-DE') || 'Unbekannt'}
                    </Text>
                  </div>
                </div>
              </div>
              <Button
                plain
                onClick={() => window.open(asset.downloadUrl, '_blank')}
              >
                Ansehen
              </Button>
            </div>
          </div>
        ))}

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
    </div>
  );
}