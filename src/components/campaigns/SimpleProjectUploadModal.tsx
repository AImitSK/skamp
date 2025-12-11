// src/components/campaigns/SimpleProjectUploadModal.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { mediaService } from "@/lib/firebase/media-service";
import { useAuth } from "@/context/AuthContext";
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  FolderIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

// Alert Component
function Alert({
  type = 'info',
  title,
  message
}: {
  type?: 'info' | 'error' | 'success';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200'
  };

  const Icon = type === 'error' ? ExclamationTriangleIcon :
               type === 'success' ? CheckCircleIcon : InformationCircleIcon;

  return (
    <div className={`rounded-md p-4 border ${styles[type]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <div className="ml-3">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={`text-sm ${title ? 'mt-1' : ''}`}>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SimpleProjectUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  currentFolderId?: string;
  folderName?: string;
  clientId: string;
  organizationId: string;
}

export default function SimpleProjectUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderName,
  clientId,
  organizationId
}: SimpleProjectUploadModalProps) {
  const t = useTranslations('campaigns.project');
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
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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

        // ✅ DIREKTER UPLOAD mit mediaService.uploadClientMedia
        // (das gleiche wie ProjectUploadModal)
        return await mediaService.uploadClientMedia(
          file,
          organizationId,
          clientId,
          currentFolderId, // ✅ DIREKT in den Medien-Ordner
          progressCallback,
          { userId: user.uid }
        );
      });

      await Promise.all(uploadPromises);

      showAlert('success', t('uploadSuccess', { count: selectedFiles.length }));
      setSelectedFiles([]);
      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Upload-Fehler:', error);
      showAlert('error', t('uploadError'));
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>
        <div className="flex items-center">
          <CloudArrowUpIcon className="w-5 h-5 mr-2 text-blue-600" />
          {t('title')}
          {folderName && (
            <Badge className="ml-2" color="blue">
              {folderName}
            </Badge>
          )}
        </div>
      </DialogTitle>

      <DialogBody className="space-y-6">
        {alert && <Alert type={alert.type} message={alert.message} />}

        {/* Zielordner Info */}
        {currentFolderId && folderName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm">
              <FolderIcon className="h-4 w-4 text-blue-600" />
              <Text className="text-blue-800">
                {t('uploadTarget')} <strong>{folderName}</strong>
              </Text>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
        >
          <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <Text className="text-lg font-medium text-gray-900 mb-2">
            {t('selectFiles')}
          </Text>
          <Text className="text-sm text-gray-500 mb-4">
            {t('dragAndDrop')}
          </Text>

          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            {t('selectFiles')}
          </label>

          <Text className="text-xs text-gray-500 mt-2">
            {t('fileFormats')}
          </Text>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <Text className="font-medium">{t('selectedFiles', { count: selectedFiles.length })}</Text>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <Text className="text-sm font-medium truncate">{file.name}</Text>
                    <Text className="text-xs text-gray-500">{formatFileSize(file.size)}</Text>
                  </div>
                </div>

                {uploading && uploadProgress[file.name] !== undefined ? (
                  <div className="w-20">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      ></div>
                    </div>
                    <Text className="text-xs text-center mt-1">{Math.round(uploadProgress[file.name])}%</Text>
                  </div>
                ) : (
                  <Button
                    plain
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Info */}
        <div className="text-xs text-gray-500">
          <Text>{t('supportedFormats')}</Text>
        </div>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={uploading}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="bg-[#005fab] hover:bg-[#004a8c] text-white"
        >
          <CloudArrowUpIcon className="w-4 h-4 mr-2" />
          {uploading
            ? t('uploading', { current: Object.keys(uploadProgress).length, total: selectedFiles.length })
            : t('uploadFiles', { count: selectedFiles.length })
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}