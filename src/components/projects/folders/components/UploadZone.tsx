'use client';

import React, { useState } from 'react';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { uploadMedia } from '@/lib/firebase/media-assets-service';
import { useAuth } from '@/context/AuthContext';
import Alert from './Alert';

interface UploadZoneProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string;
  folderName?: string;
  organizationId: string;
  projectId: string;
}

/**
 * UploadZone Component
 *
 * Modal für Drag & Drop Upload mit Progress-Tracking
 * Optimiert mit React.memo
 */
const UploadZone = React.memo(function UploadZone({
  isOpen,
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderName,
  organizationId,
  projectId
}: UploadZoneProps) {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  const showAlert = (type: 'info' | 'error' | 'success', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
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

        return await uploadMedia(
          file,
          organizationId,
          currentFolderId,
          progressCallback,
          3,
          { userId: user.uid }
        );
      });

      await Promise.all(uploadPromises);

      showAlert('success', `${selectedFiles.length} ${selectedFiles.length === 1 ? 'Datei wurde' : 'Dateien wurden'} erfolgreich hochgeladen.`);
      setSelectedFiles([]);
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

        {/* Drag & Drop Area */}
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <Text className="text-lg font-medium text-gray-900 mb-2">
            Dateien hier ablegen oder
          </Text>
          <label className="cursor-pointer">
            <span className="font-medium text-blue-600 hover:text-blue-500">
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
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {getFileIcon(file)}
                      <div className="min-w-0 flex-1">
                        <Text className="text-sm font-medium truncate">
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
});

export default UploadZone;
