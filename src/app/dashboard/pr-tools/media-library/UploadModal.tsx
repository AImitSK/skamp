// src\app\dashboard\pr-tools\media-library\UploadModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { Select } from "@/components/select"; // NEU: Für Client-Auswahl
import { Badge } from "@/components/badge"; // NEU: Für Client-Badge
import { useAuth } from "@/context/AuthContext";
import { useCrmData } from "@/context/CrmDataContext"; // NEU: Für Client-Daten
import { mediaService } from "@/lib/firebase/media-service";
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon, FolderIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: () => Promise<void>;
  currentFolderId?: string;
  folderName?: string;
  preselectedClientId?: string; // NEU: Vorausgewählter Kunde
}

export default function UploadModal({ 
  onClose, 
  onUploadSuccess, 
  currentFolderId,
  folderName,
  preselectedClientId // NEU
}: UploadModalProps) {
  const { user } = useAuth();
  const { companies } = useCrmData(); // NEU: Lade Firmen-Daten
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // NEU: Client-Auswahl State
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');

  // NEU: Effect um preselectedClientId zu verarbeiten
  useEffect(() => {
    if (preselectedClientId) {
      setSelectedClientId(preselectedClientId);
    }
  }, [preselectedClientId]);

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
        
        // Upload mit optionalem clientId
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

        // NEU: Wenn Client ausgewählt, Asset mit Client verknüpfen
        if (selectedClientId && uploadedAsset.id) {
          await mediaService.updateAsset(uploadedAsset.id, {
            clientId: selectedClientId
          });
        }
      });

      await Promise.all(uploadPromises);
      
      // Erfolgreich hochgeladen
      await onUploadSuccess();
      onClose();
    } catch (error) {
      console.error("Upload-Fehler:", error);
      alert("Fehler beim Hochladen der Dateien. Bitte versuchen Sie es erneut.");
    } finally {
      setUploading(false);
    }
  };

  // NEU: Get selected company info
  const getSelectedCompany = () => {
    if (!selectedClientId) return null;
    return companies.find(c => c.id === selectedClientId);
  };

  const selectedCompany = getSelectedCompany();

  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <DialogTitle className="px-6 py-4 text-base font-semibold">
        Medien hochladen
      </DialogTitle>
      
      <DialogBody className="p-6">
        <FieldGroup>
          {/* NEU: Zielordner anzeigen */}
          {currentFolderId && folderName && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <FolderIcon className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800">
                  Dateien werden hochgeladen nach: <strong>{folderName}</strong>
                </span>
              </div>
            </div>
          )}

          {/* NEU: Vorausgewählter Kunde anzeigen */}
          {preselectedClientId && selectedCompany && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <BuildingOfficeIcon className="h-4 w-4 text-green-600" />
                <span className="text-green-800">
                  Upload für Kunde: <strong>{selectedCompany.name}</strong>
                </span>
                <Badge color="green" className="text-xs">Vorausgewählt</Badge>
              </div>
            </div>
          )}

          {/* NEU: Client-Auswahl (falls nicht vorausgewählt) */}
          {!preselectedClientId && (
            <Field>
              <Label>Kunde zuordnen (optional)</Label>
              <Select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="mt-2"
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
            
            {/* KORRIGIERT: Sauberer Drag & Drop Bereich ohne Input-Probleme */}
            <div
              className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 hover:border-gray-900/40 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                <div className="mt-4">
                  {/* KORRIGIERT: Einfacher Button-Ansatz statt komplexes Label/Input */}
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="rounded-md bg-white font-semibold text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                  >
                    Dateien auswählen
                  </button>
                  <span className="text-sm leading-6 text-gray-600 ml-1">oder per Drag & Drop</span>
                </div>
                <p className="text-xs leading-5 text-gray-600 mt-2">PNG, JPG, GIF, MP4, PDF bis 10MB</p>
                
                {/* KORRIGIERT: Input komplett versteckt */}
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  className="hidden"
                />
              </div>
            </div>
          </Field>

          {/* Ausgewählte Dateien anzeigen */}
          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Ausgewählte Dateien ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const fileKey = `${index}-${file.name}`;
                  const progress = uploadProgress[fileKey] || 0;
                  
                  return (
                    <div key={fileKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        <DocumentIcon className="h-8 w-8 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                          {uploading && (
                            <div className="mt-1">
                              <div className="bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {Math.round(progress)}% hochgeladen
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {!uploading && (
                        <Button 
                          type="button" 
                          plain 
                          onClick={() => removeFile(index)}
                          className="ml-2"
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

          {/* NEU: Upload-Summary */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Upload-Zusammenfassung:</h4>
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

      <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
        <Button plain onClick={onClose} disabled={uploading}>
          Abbrechen
        </Button>
        <Button 
          color="indigo" 
          onClick={handleUpload} 
          disabled={selectedFiles.length === 0 || uploading}
        >
          {uploading ? 'Uploading...' : `${selectedFiles.length} Datei(en) hochladen`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}