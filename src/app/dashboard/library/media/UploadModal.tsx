// src/app/dashboard/pr-tools/media-library/UploadModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/ui/fieldset";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useCrmData } from "@/context/CrmDataContext";
import { mediaService } from "@/lib/firebase/media-service";
import { smartUploadRouter, uploadToMediaLibrary } from "@/lib/firebase/smart-upload-router";
import { mediaLibraryContextBuilder, UploadContextInfo } from "./utils/context-builder";
import { getMediaLibraryFeatureFlags, shouldUseSmartRouter, getUIFeatureConfig } from "./config/feature-flags";
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  FolderIcon,
  BuildingOfficeIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TagIcon
} from "@heroicons/react/24/outline";
import { toastService } from '@/lib/utils/toast';

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: () => Promise<void>;
  currentFolderId?: string;
  folderName?: string;
  preselectedClientId?: string;
  organizationId: string; // NEW: Required for multi-tenancy
  userId: string; // NEW: Required for tracking who uploads

  // Campaign Smart Router Integration Props
  campaignId?: string;
  campaignName?: string;
  selectedProjectId?: string;
  selectedProjectName?: string;
  uploadType?: 'hero-image' | 'attachment' | 'document';
  enableSmartRouter?: boolean;
}

export default function UploadModal({
  onClose,
  onUploadSuccess,
  currentFolderId,
  folderName,
  preselectedClientId,
  organizationId,
  userId,

  // Campaign Smart Router Props
  campaignId,
  campaignName,
  selectedProjectId,
  selectedProjectName,
  uploadType,
  enableSmartRouter = false
}: UploadModalProps) {
  const { companies } = useCrmData();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');

  // Smart Upload Router Integration mit Feature Flags
  const [featureFlags] = useState(() => getMediaLibraryFeatureFlags());
  const [uiConfig] = useState(() => getUIFeatureConfig());
  const useSmartRouterEnabled = shouldUseSmartRouter();
  const [contextInfo, setContextInfo] = useState<UploadContextInfo | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'smart' | 'legacy'>(
    useSmartRouterEnabled ? 'smart' : 'legacy'
  );
  const [uploadResults, setUploadResults] = useState<Array<{ fileName: string; method: string; path?: string; error?: string }>>([]);

  useEffect(() => {
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
    }
  }, [preselectedClientId]);

  // Smart Router Context Info laden
  useEffect(() => {
    async function loadContextInfo() {
      try {
        const info = await mediaLibraryContextBuilder.buildContextInfo({
          organizationId,
          userId,
          currentFolderId,
          preselectedClientId: selectedClientId,
          folderName,
          uploadSource: 'dialog'
        }, companies);
        
        setContextInfo(info);
      } catch (error) {
        // Failed to load context info - fallback to legacy mode
        setUseSmartRouter(false);
      }
    }

    if (useSmartRouterEnabled && uiConfig.showContextInfo && organizationId && userId) {
      loadContextInfo();
    }
  }, [organizationId, userId, currentFolderId, selectedClientId, folderName, useSmartRouterEnabled, uiConfig.showContextInfo, companies]);

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
    setUploadResults([]);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileKey = `${index}-${file.name}`;
        const result = { fileName: file.name, method: 'legacy', error: undefined as string | undefined };
        
        try {
          if (useSmartRouterEnabled && uploadMethod === 'smart') {
            // ✅ IMMER Smart Upload Router verwenden
            let uploadResult;

            if (campaignId) {
              // Campaign-specific Upload mit strukturierten Pfaden
              const { uploadWithContext } = await import('@/lib/firebase/smart-upload-router');

              uploadResult = await uploadWithContext(
                file,
                organizationId,
                userId,
                'campaign',
                {
                  campaignId,
                  campaignName,
                  projectId: selectedProjectId,
                  projectName: selectedProjectName,
                  category: uploadType === 'hero-image' ? 'key-visuals' : 'attachments',
                  clientId: selectedClientId
                },
                (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    [fileKey]: progress
                  }));
                }
              );
            } else {
              // Standard Media Library Upload
              uploadResult = await uploadToMediaLibrary(
                file,
                organizationId,
                userId,
                currentFolderId,
                (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    [fileKey]: progress
                  }));
                }
              );
            }
            
            result.method = uploadResult.uploadMethod;
            result.path = uploadResult.path;
            
            // Client-ID nach Upload setzen falls erforderlich
            if (selectedClientId && uploadResult.asset?.id) {
              await mediaService.updateAsset(uploadResult.asset.id, {
                clientId: selectedClientId
              });
            }
          } else {
            // Legacy Upload verwenden
            const uploadedAsset = await mediaService.uploadMedia(
              file,
              organizationId,
              currentFolderId,
              (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  [fileKey]: progress
                }));
              },
              3, // retryCount
              { userId } // Pass userId in context
            );
            
            result.method = 'legacy';
            result.path = `organizations/${organizationId}/media`;
            
            if (selectedClientId && uploadedAsset.id) {
              await mediaService.updateAsset(uploadedAsset.id, {
                clientId: selectedClientId
              });
            }
          }
        } catch (uploadError: any) {
          // Bei Smart Router Fehler: Fallback auf Legacy (wenn Fallback aktiviert)
          if (useSmartRouterEnabled && uploadMethod === 'smart' && featureFlags.SMART_ROUTER_FALLBACK) {
            try {
              const uploadedAsset = await mediaService.uploadMedia(
                file,
                organizationId,
                currentFolderId,
                (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    [fileKey]: progress
                  }));
                },
                1, // Reduced retry for fallback
                { userId }
              );
              
              result.method = 'legacy-fallback';
              result.path = `organizations/${organizationId}/media`;
              
              if (selectedClientId && uploadedAsset.id) {
                await mediaService.updateAsset(uploadedAsset.id, {
                  clientId: selectedClientId
                });
              }
            } catch (fallbackError: any) {
              result.error = fallbackError.message || 'Upload fehlgeschlagen';
            }
          } else {
            result.error = uploadError.message || 'Upload fehlgeschlagen';
          }
        }
        
        setUploadResults(prev => [...prev, result]);
        return result;
      });

      const results = await Promise.all(uploadPromises);
      const failedUploads = results.filter(r => r.error);
      
      if (failedUploads.length === 0) {
        toastService.success(`${results.length} ${results.length === 1 ? 'Datei' : 'Dateien'} erfolgreich hochgeladen`);
        await onUploadSuccess();
        onClose();
      } else {
        toastService.error(`${failedUploads.length} von ${results.length} Uploads fehlgeschlagen`);
      }
    } catch (error) {
      toastService.error('Fehler beim Hochladen der Dateien. Bitte versuchen Sie es erneut');
    } finally {
      setUploading(false);
    }
  };

  const getSelectedCompany = () => {
    if (!selectedClientId) return null;
    return companies.find(c => c.id === selectedClientId);
  };

  const selectedCompany = getSelectedCompany();

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <div className="p-6">
        <DialogTitle>Medien hochladen</DialogTitle>

        <DialogBody className="mt-4">
          <FieldGroup>
            {/* Zielordner anzeigen */}
            {currentFolderId && folderName && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <FolderIcon className="h-4 w-4 text-blue-600" />
                  <Text className="text-blue-800">
                    Dateien werden hochgeladen nach: <strong>{folderName}</strong>
                  </Text>
                </div>
              </div>
            )}

            {/* Vorausgewählter Kunde anzeigen */}
            {preselectedClientId && selectedCompany && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <BuildingOfficeIcon className="h-4 w-4 text-green-600" />
                  <Text className="text-green-800">
                    Upload für Kunde: <strong>{selectedCompany.name}</strong>
                  </Text>
                  <Badge color="green">Vorausgewählt</Badge>
                </div>
              </div>
            )}

            {/* Smart Router Context Info */}
            {contextInfo && useSmartRouterEnabled && uiConfig.showContextInfo && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CogIcon className="h-4 w-4 text-gray-600" />
                  <Text className="text-sm font-medium text-gray-900">
                    Smart Upload Routing
                  </Text>
                  <Badge color={contextInfo.uploadMethod === 'smart' ? 'green' : 'gray'}>
                    {contextInfo.uploadMethod === 'smart' ? 'Aktiviert' : 'Legacy'}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Routing:</span>
                    <span>{contextInfo.routing.type === 'organized' ? '📁 Organisiert' : '📋 Standard'}</span>
                    <span>({contextInfo.routing.reason})</span>
                  </div>
                  
                  {contextInfo.clientInheritance?.source !== 'none' && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Kunde:</span>
                      <span>
                        {contextInfo.clientInheritance.clientName || 'Vererbung aktiv'}
                        {contextInfo.clientInheritance.source === 'folder' && ' (aus Ordner)'}
                        {contextInfo.clientInheritance.source === 'preselected' && ' (vorausgewählt)'}
                      </span>
                    </div>
                  )}
                  
                  {contextInfo.expectedTags.length > 0 && (
                    <div className="flex items-start gap-2">
                      <TagIcon className="h-3 w-3 mt-0.5 text-gray-500" />
                      <span className="font-medium">Auto-Tags:</span>
                      <span className="flex flex-wrap gap-1">
                        {contextInfo.expectedTags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} color="gray" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {contextInfo.expectedTags.length > 3 && (
                          <Badge color="gray" className="text-xs px-1 py-0">
                            +{contextInfo.expectedTags.length - 3}
                          </Badge>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Upload Method Toggle (nur wenn Feature aktiviert) */}
                {uiConfig.allowMethodToggle && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <Text className="text-xs font-medium text-gray-700">Upload-Methode:</Text>
                      <button
                        type="button"
                        onClick={() => setUploadMethod(uploadMethod === 'smart' ? 'legacy' : 'smart')}
                        className="text-xs text-[#005fab] hover:text-[#004a8c] font-medium"
                        disabled={!useSmartRouterEnabled}
                      >
                        {uploadMethod === 'smart' ? 'Legacy verwenden' : 'Smart Router verwenden'}
                      </button>
                      {!useSmartRouterEnabled && (
                        <Badge color="gray" className="text-xs">
                          Deaktiviert
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Client-Auswahl (falls nicht vorausgewählt) */}
            {!preselectedClientId && (
              <Field>
                <Label>Kunde zuordnen (optional)</Label>
                <Select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">-- Kein Kunde --</option>
                  {companies
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                </Select>
                <Description>
                  Dateien können später einem Kunden zugeordnet werden.
                </Description>
              </Field>
            )}
            
            <Field>
              <Label>Dateien auswählen</Label>
              <Description>
                Unterstützte Formate: Bilder (JPG, PNG, GIF), Videos (MP4, MOV), Dokumente (PDF, DOCX)
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
                      <span>Dateien auswählen</span>
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
                    <p className="pl-1">oder per Drag & Drop</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-600 mt-2">PNG, JPG, GIF, MP4, PDF bis 10MB</p>
                </div>
              </div>
            </Field>

            {/* Ausgewählte Dateien anzeigen */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  Ausgewählte Dateien ({selectedFiles.length})
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
                                  {Math.round(progress)}% hochgeladen
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
                <Text className="text-sm font-medium text-gray-900 mb-2">Upload-Zusammenfassung:</Text>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>Dateien:</strong> {selectedFiles.length}</li>
                  <li><strong>Zielordner:</strong> {folderName || 'Root'}</li>
                  <li><strong>Kunde:</strong> {selectedCompany?.name || 'Nicht zugeordnet'}</li>
                  <li><strong>Gesamtgröße:</strong> {formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))}</li>
                  {contextInfo && (
                    <li><strong>Upload-Methode:</strong> {uploadMethod === 'smart' ? 'Smart Router' : 'Legacy'}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Upload Results (nur wenn Feature aktiviert) */}
            {uiConfig.showUploadResults && uploadResults.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Text className="text-sm font-medium text-blue-900 mb-2">Upload-Ergebnisse:</Text>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadResults.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      {result.error ? (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      )}
                      <span className="flex-1 truncate">{result.fileName}</span>
                      <Badge 
                        color={result.method === 'organized' ? 'green' : result.method === 'legacy-fallback' ? 'yellow' : 'gray'}
                        className="text-xs px-1 py-0"
                      >
                        {result.method === 'organized' ? 'Smart' : 
                         result.method === 'legacy-fallback' ? 'Fallback' : 
                         result.method === 'unorganized' ? 'Standard' : 'Legacy'}
                      </Badge>
                      {result.error && (
                        <span className="text-red-600 text-xs truncate max-w-32" title={result.error}>
                          {result.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </FieldGroup>
        </DialogBody>

        <DialogActions className="mt-6">
          <div className="flex items-center gap-2 flex-1">
            {useSmartRouterEnabled && uiConfig.showContextInfo && contextInfo && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>Smart Router:</span>
                <Badge color={uploadMethod === 'smart' ? 'green' : 'gray'} className="text-xs">
                  {uploadMethod === 'smart' ? 'Aktiv' : 'Deaktiviert'}
                </Badge>
              </div>
            )}
          </div>
          <Button plain onClick={onClose} disabled={uploading}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={selectedFiles.length === 0 || uploading}
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
          >
            {uploading ? (
              uploadMethod === 'smart' ? 'Smart Upload...' : 'Uploading...'
            ) : (
              `${selectedFiles.length} Datei(en) hochladen`
            )}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}