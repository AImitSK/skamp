// src/app/dashboard/library/media/UploadModal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/ui/fieldset";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useUploadMediaAsset } from "@/lib/hooks/useMediaData";
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  FolderIcon
} from "@heroicons/react/24/outline";
import { toastService } from '@/lib/utils/toast';
import { useTranslations } from 'next-intl';

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: () => Promise<void>;
  currentFolderId?: string;
  folderName?: string;
  organizationId: string;
  userId: string;
}

export default function UploadModal({
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderName,
  organizationId,
  userId,
}: UploadModalProps) {
  const t = useTranslations('media.uploadModal');
  const tToast = useTranslations('toasts');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // ✅ React Query Upload Mutation
  const uploadMutation = useUploadMediaAsset();

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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    try {
      const BATCH_SIZE = 5; // 5 Dateien parallel (wie in Doku)
      let successCount = 0;
      let errorCount = 0;

      // Batch-Upload wie in Dokumentation beschrieben
      for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
        const batch = selectedFiles.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map(async (file, batchIndex) => {
            const fileKey = `${i + batchIndex}-${file.name}`;

            try {
              // ✅ React Query Mutation verwenden
              await uploadMutation.mutateAsync({
                file,
                organizationId,
                folderId: currentFolderId,
                onProgress: (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    [fileKey]: progress
                  }));
                },
                context: { userId }
              });

              successCount++;
            } catch (error: any) {
              errorCount++;
              console.error(`Upload fehlgeschlagen: ${file.name}`, error);
              throw error;
            }
          })
        );
      }

      // Success-Handling
      if (errorCount === 0) {
        toastService.success(tToast('media.filesUploaded', { count: successCount }));
        await onUploadSuccess();
        onClose();
      } else if (successCount > 0) {
        toastService.warning(tToast('media.uploadPartialSuccess', { success: successCount, failed: errorCount }));
        await onUploadSuccess();
      } else {
        toastService.error(tToast('media.uploadAllFailed', { count: errorCount }));
      }
    } catch (error) {
      toastService.error(tToast('media.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle>{t('title')}</DialogTitle>

      <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
        <FieldGroup>
            {/* Zielordner anzeigen */}
            {currentFolderId && folderName && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <FolderIcon className="h-4 w-4 text-blue-600" />
                  <Text className="text-blue-800">
                    {t('targetFolder', { folderName })}
                  </Text>
                </div>
              </div>
            )}

            <Field>
              <Label>{t('selectFiles')}</Label>
              <Description>
                {t('supportedFormats')}
              </Description>

              {/* Drag & Drop Bereich */}
              <div
                className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 hover:border-gray-900/40 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="text-center">
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                  <div className="mt-4 flex text-sm leading-6 text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-white font-semibold text-[#005fab] hover:text-[#004a8c] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#005fab] focus-within:ring-offset-2"
                    >
                      <span>{t('chooseFiles')}</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">{t('orDragDrop')}</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-600 mt-2">{t('fileHint')}</p>
                </div>
              </div>
            </Field>

            {/* Ausgewählte Dateien anzeigen */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  {t('selectedFiles', { count: selectedFiles.length })}
                </Text>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedFiles.map((file, index) => {
                    const fileKey = `${index}-${file.name}`;
                    const progress = uploadProgress[fileKey] || 0;

                    return (
                      <div key={fileKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <Text className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </Text>
                            <Text className="text-sm text-gray-500">
                              {formatFileSize(file.size)}
                            </Text>
                            {uploading && (
                              <div className="mt-1">
                                <div className="bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-[#005fab] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <Text className="text-xs text-gray-500 mt-1">
                                  {t('uploadProgress', { progress: Math.round(progress) })}
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>
                        {!uploading && (
                          <Button
                            plain
                            onClick={() => removeFile(index)}
                          >
                            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload-Summary */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <Text className="text-sm font-medium text-gray-900 mb-2">{t('summary.title')}</Text>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>{t('summary.files')}</strong> {selectedFiles.length}</li>
                  <li><strong>{t('summary.targetFolder')}</strong> {folderName || t('summary.root')}</li>
                  <li><strong>{t('summary.totalSize')}</strong> {formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))}</li>
                </ul>
              </div>
            )}
        </FieldGroup>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={uploading}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
        >
          {uploading ? t('uploading') : t('uploadFiles', { count: selectedFiles.length })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
