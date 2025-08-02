// src/components/mediathek/AssetDetailsModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { Text } from "@/components/text";
import { MediaAsset, MediaFolder } from "@/types/media";
import { useCrmData } from "@/context/CrmDataContext";
import { mediaService } from "@/lib/firebase/media-service";
import { 
  PhotoIcon, 
  DocumentIcon, 
  VideoCameraIcon, 
  DocumentTextIcon,
  InformationCircleIcon,
  LockClosedIcon
} from "@heroicons/react/20/solid";

interface AssetDetailsModalProps {
  asset: MediaAsset;
  currentFolder?: MediaFolder;
  allFolders?: MediaFolder[];
  onClose: () => void;
  onSave: () => Promise<void>;
}

// Hilfsfunktionen für Vererbung
async function getRootFolderClientId(
  folder: MediaFolder,
  allFolders: MediaFolder[]
): Promise<string | undefined> {
  if (!folder.parentFolderId) {
    return folder.clientId;
  }
  
  const parentFolder = allFolders.find(f => f.id === folder.parentFolderId);
  if (!parentFolder) {
    return folder.clientId;
  }
  
  return await getRootFolderClientId(parentFolder, allFolders);
}

export default function AssetDetailsModal({ 
  asset, 
  currentFolder,
  allFolders = [],
  onClose, 
  onSave 
}: AssetDetailsModalProps) {
  const { companies } = useCrmData();
  
  const [fileName, setFileName] = useState(asset.fileName || '');
  const [description, setDescription] = useState(asset.description || '');
  const [selectedClientId, setSelectedClientId] = useState(asset.clientId || '');
  const [saving, setSaving] = useState(false);

  const [isClientFieldDisabled, setIsClientFieldDisabled] = useState(false);
  const [inheritedClientId, setInheritedClientId] = useState<string | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<string>('');

  useEffect(() => {
    async function checkClientInheritance() {
      if (!currentFolder || !asset.folderId) {
        setIsClientFieldDisabled(false);
        setInheritedClientId(undefined);
        setFolderPath('Root');
        return;
      }

      const rootClientId = await getRootFolderClientId(currentFolder, allFolders);
      
      if (rootClientId) {
        setIsClientFieldDisabled(true);
        setInheritedClientId(rootClientId);
        setSelectedClientId(rootClientId);
        setFolderPath(getFolderPathString(currentFolder, allFolders));
      } else {
        setIsClientFieldDisabled(false);
        setInheritedClientId(undefined);
        setFolderPath(getFolderPathString(currentFolder, allFolders));
      }
    }

    checkClientInheritance();
  }, [currentFolder, allFolders, asset.folderId]);

  function getFolderPathString(folder: MediaFolder, allFolders: MediaFolder[]): string {
    if (!folder.parentFolderId) {
      return folder.name;
    }
    
    const parentFolder = allFolders.find(f => f.id === folder.parentFolderId);
    if (!parentFolder) {
      return folder.name;
    }
    
    return `${getFolderPathString(parentFolder, allFolders)} > ${folder.name}`;
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return PhotoIcon;
    } else if (fileType.startsWith('video/')) {
      return VideoCameraIcon;
    } else if (fileType.includes('pdf') || fileType.includes('document')) {
      return DocumentTextIcon;
    } else {
      return DocumentIcon;
    }
  };

  const getSelectedCompany = () => {
    if (!selectedClientId) return null;
    return companies.find(c => c.id === selectedClientId);
  };

  const getInheritedCompany = () => {
    if (!inheritedClientId) return null;
    return companies.find(c => c.id === inheritedClientId);
  };

  const handleSave = async () => {
    if (!fileName.trim()) {
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<MediaAsset> = {};
      
      if (fileName !== asset.fileName) {
        updates.fileName = fileName.trim();
      }
      
      if (description !== (asset.description || '')) {
        updates.description = description.trim() || undefined;
      }
      
      if (selectedClientId !== (asset.clientId || '')) {
        updates.clientId = selectedClientId || undefined;
      }

      if (Object.keys(updates).length > 0) {
        await mediaService.updateAsset(asset.id!, updates);
        await onSave();
      }
      
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Asset-Details:', error);
    } finally {
      setSaving(false);
    }
  };

  const FileIcon = getFileIcon(asset.fileType);
  const selectedCompany = getSelectedCompany();
  const inheritedCompany = getInheritedCompany();

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <div className="p-6">
        <DialogTitle>Asset-Details bearbeiten</DialogTitle>
        
        <DialogBody className="mt-4">
          {/* Asset Preview & Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="flex-shrink-0">
                {asset.fileType.startsWith('image/') ? (
                  <img 
                    src={asset.downloadUrl} 
                    alt={asset.fileName}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <FileIcon className="h-10 w-10 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* File Info */}
              <div className="flex-1 min-w-0">
                <Text className="text-sm font-medium text-gray-900 mb-1">
                  {asset.fileName}
                </Text>
                <div className="space-y-1 text-xs text-gray-500">
                  <p><strong>Typ:</strong> {asset.fileType}</p>
                  <p><strong>Erstellt:</strong> {asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
                  <p className="truncate"><strong>URL:</strong> {asset.downloadUrl}</p>
                  {asset.clientId && selectedCompany && (
                    <p><strong>Kunde:</strong> <Badge color="blue">{selectedCompany.name}</Badge></p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <Label>Dateiname *</Label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="z.B. Produktfoto_2024.jpg"
              />
              <Description>
                Der angezeigte Name der Datei (ändert nicht den Dateinamen im Storage).
              </Description>
            </Field>

            <Field>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibung des Bildinhalts, Verwendungszweck, etc..."
                rows={3}
              />
              <Description>
                Hilft bei der Suche und Organisation der Medien.
              </Description>
            </Field>

            {/* Client-Zuordnung mit Vererbungs-Logik */}
            <Field>
              <Label>
                Kunde zuordnen
                {isClientFieldDisabled && (
                  <span className="text-sm text-gray-500 ml-2">
                    (vererbt vom Ordner)
                  </span>
                )}
              </Label>

              {/* Vererbungs-Info */}
              {isClientFieldDisabled && inheritedCompany && (
                <div className="mt-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Text className="text-blue-800">
                      Vererbt vom Ordner &ldquo;{folderPath}&rdquo;: 
                    </Text>
                    <Badge color="blue">
                      {inheritedCompany.name}
                    </Badge>
                  </div>
                </div>
              )}
              
              <Select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={isClientFieldDisabled}
                className={isClientFieldDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
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
                {isClientFieldDisabled 
                  ? "Diese Zuordnung wird vom Ordner vererbt und kann hier nicht geändert werden. Verschieben Sie die Datei in einen anderen Ordner, um die Zuordnung zu ändern."
                  : "Ordnen Sie die Datei einem Kunden zu für bessere Organisation."
                }
              </Description>
            </Field>

            {/* Info Box */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-2">
                {isClientFieldDisabled ? (
                  <>
                    <LockClosedIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <Text className="text-sm font-medium text-blue-900 mb-2">Firma-Vererbung aktiv</Text>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Die Firma wird automatisch vom Ordner vererbt</li>
                        <li>• Zum Ändern: Datei in anderen Ordner verschieben</li>
                        <li>• Root-Dateien haben editierbare Firma-Zuordnung</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <Text className="text-sm font-medium text-blue-900 mb-2">Zukünftige Features</Text>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Tags & Keywords</li>
                        <li>• Copyright-Informationen</li>
                        <li>• Kampagnen-Zuordnung</li>
                        <li>• Nutzungsrechte</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>
          </FieldGroup>
        </DialogBody>

        <DialogActions>
          <Button plain onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!fileName.trim() || saving}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {saving ? 'Speichern...' : 'Änderungen speichern'}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}