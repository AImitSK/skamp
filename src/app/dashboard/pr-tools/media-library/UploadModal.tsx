// src/app/dashboard/pr-tools/media-library/UploadModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { useAuth } from "@/context/AuthContext";
import { useCrmData } from "@/context/CrmDataContext";
import { mediaService } from "@/lib/firebase/media-service";
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  XMarkIcon, 
  FolderIcon, 
  BuildingOfficeIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message 
}: { 
  type?: 'info' | 'error';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700'
  };

  const Icon = type === 'error' ? XMarkIcon : InformationCircleIcon;

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: () => Promise<void>;
  currentFolderId?: string;
  folderName?: string;
  preselectedClientId?: string;
}

export default function UploadModal({ 
  onClose, 
  onUploadSuccess, 
  currentFolderId,
  folderName,
  preselectedClientId
}: UploadModalProps) {
  const { user } = useAuth();
  const { companies } = useCrmData();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');
  const [alert, setAlert] = useState<{ type: 'info' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
    }
  }, [preselectedClientId]);

  const showAlert = (type: 'info' | 'error', message: string) => {
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

  const handleUpload = async () => {
    if (!user || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileKey = `${index}-${file.name}`;
        
        const uploadedAsset = await mediaService.uploadMedia(
          file,
          user.uid,
          currentFolderId,
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [fileKey]: progress
            }));
          }
        );

        if (selectedClientId && uploadedAsset.id) {
          await mediaService.updateAsset(uploadedAsset.id, {
            clientId: selectedClientId
          });
        }
      });

      await Promise.all(uploadPromises);
      
      await onUploadSuccess();
      onClose();
    } catch (error) {
      console.error("Upload-Fehler:", error);
      showAlert('error', 'Fehler beim Hochladen der Dateien. Bitte versuchen Sie es erneut.');
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
          {alert && (
            <div className="mb-4">
              <Alert type={alert.type} message={alert.message} />
            </div>
          )}

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
                          <DocumentIcon className="h-8 w-8 text-gray-400" />
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
                </ul>
              </div>
            )}
          </FieldGroup>
        </DialogBody>

        <DialogActions className="mt-6">
          <Button plain onClick={onClose} disabled={uploading}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={selectedFiles.length === 0 || uploading}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {uploading ? 'Uploading...' : `${selectedFiles.length} Datei(en) hochladen`}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}