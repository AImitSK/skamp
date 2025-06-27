// src/components/mediathek/AssetDetailsModal.tsx - ZURÜCKGESETZT auf funktionierenden Stand
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { MediaAsset, MediaFolder } from "@/types/media";
import { useCrmData } from "@/context/CrmDataContext";
import { mediaService } from "@/lib/firebase/media-service";
import { PhotoIcon, DocumentIcon, VideoCameraIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface AssetDetailsModalProps {
  asset: MediaAsset;
  currentFolder?: MediaFolder; // NEU: Aktueller Ordner-Context
  allFolders?: MediaFolder[]; // NEU: Alle Ordner für Vererbung
  onClose: () => void;
  onSave: () => Promise<void>;
}

// NEU: Hilfsfunktionen für Vererbung (wie bei FolderModal)
async function getRootFolderClientId(
  folder: MediaFolder,
  allFolders: MediaFolder[]
): Promise<string | undefined> {
  console.log('🔍 Asset: getRootFolderClientId for folder:', folder.name);
  
  // Wenn es ein Root-Ordner ist, verwende dessen Firma
  if (!folder.parentFolderId) {
    console.log('✅ Asset: Root folder clientId:', folder.clientId);
    return folder.clientId;
  }
  
  // Finde Parent-Ordner
  const parentFolder = allFolders.find(f => f.id === folder.parentFolderId);
  if (!parentFolder) {
    console.log('❌ Asset: Parent folder not found');
    return folder.clientId; // Fallback
  }
  
  console.log('🔍 Asset: Checking parent folder:', parentFolder.name);
  
  // Rekursiv nach oben gehen bis zum Root
  return await getRootFolderClientId(parentFolder, allFolders);
}

export default function AssetDetailsModal({ 
  asset, 
  currentFolder, // NEU
  allFolders = [], // NEU
  onClose, 
  onSave 
}: AssetDetailsModalProps) {
  const { companies } = useCrmData();
  
  // Form States
  const [fileName, setFileName] = useState(asset.fileName || '');
  const [description, setDescription] = useState(asset.description || '');
  const [selectedClientId, setSelectedClientId] = useState(asset.clientId || '');
  const [saving, setSaving] = useState(false);

  // NEU: Vererbungs-States (wie bei FolderModal)
  const [isClientFieldDisabled, setIsClientFieldDisabled] = useState(false);
  const [inheritedClientId, setInheritedClientId] = useState<string | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<string>('');

  // NEU: Prüfe Vererbung beim Laden
  useEffect(() => {
    async function checkClientInheritance() {
      console.log('🔍 Asset: Checking inheritance...', { 
        hasFolder: !!currentFolder, 
        assetFolderId: asset.folderId,
        allFoldersLength: allFolders.length 
      });
      
      if (!currentFolder || !asset.folderId) {
        // Asset ist im Root → Client-Feld editierbar
        console.log('✅ Asset: In root, field editable');
        setIsClientFieldDisabled(false);
        setInheritedClientId(undefined);
        setFolderPath('Root');
        return;
      }

      // Asset ist in einem Ordner → prüfe Vererbung
      const rootClientId = await getRootFolderClientId(currentFolder, allFolders);
      
      if (rootClientId) {
        // Ordner hat Firma → vererbe diese
        console.log('✅ Asset: Inheriting clientId:', rootClientId);
        setIsClientFieldDisabled(true);
        setInheritedClientId(rootClientId);
        setSelectedClientId(rootClientId);
        setFolderPath(getFolderPathString(currentFolder, allFolders));
      } else {
        // Ordner hat keine Firma → editierbar
        console.log('✅ Asset: No inheritance, field editable');
        setIsClientFieldDisabled(false);
        setInheritedClientId(undefined);
        setFolderPath(getFolderPathString(currentFolder, allFolders));
      }
    }

    checkClientInheritance();
  }, [currentFolder, allFolders, asset.folderId]);

  // NEU: Ordner-Pfad für Anzeige
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

  // NEU: Get inherited company info
  const getInheritedCompany = () => {
    if (!inheritedClientId) return null;
    return companies.find(c => c.id === inheritedClientId);
  };

  const handleSave = async () => {
    if (!fileName.trim()) {
      alert('Bitte geben Sie einen Dateinamen ein.');
      return;
    }

    setSaving(true);
    try {
      // Baue Update-Objekt
      const updates: Partial<MediaAsset> = {};
      
      if (fileName !== asset.fileName) {
        updates.fileName = fileName.trim();
      }
      
      if (description !== (asset.description || '')) {
        updates.description = description.trim() || undefined;
      }
      
      // NEU: Client-Update - bei Vererbung ebenfalls speichern!
      if (selectedClientId !== (asset.clientId || '')) {
        updates.clientId = selectedClientId || undefined;
        console.log('💾 Asset: Updating clientId from', asset.clientId, 'to', selectedClientId);
      }

      // Nur speichern wenn es Änderungen gibt
      if (Object.keys(updates).length > 0) {
        await mediaService.updateAsset(asset.id!, updates);
        await onSave(); // Reload parent data
      }
      
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern der Asset-Details:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setSaving(false);
    }
  };

  const FileIcon = getFileIcon(asset.fileType);
  const selectedCompany = getSelectedCompany();
  const inheritedCompany = getInheritedCompany();

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle className="px-6 py-4 text-base font-semibold">
        Asset-Details bearbeiten
      </DialogTitle>
      
      <DialogBody className="p-6">
        {/* Asset Preview & Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-4">
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
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {asset.fileName}
              </h3>
              <div className="space-y-1 text-xs text-gray-500">
                <p><strong>Typ:</strong> {asset.fileType}</p>
                <p><strong>Erstellt:</strong> {asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
                <p><strong>URL:</strong> <span className="truncate block">{asset.downloadUrl}</span></p>
                {asset.clientId && selectedCompany && (
                  <p><strong>Kunde:</strong> <Badge color="blue" className="text-xs">{selectedCompany.name}</Badge></p>
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
              className="mt-2"
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
              className="mt-2"
            />
            <Description>
              Hilft bei der Suche und Organisation der Medien.
            </Description>
          </Field>

          {/* NEU: Client-Zuordnung mit Vererbungs-Logik */}
          <Field>
            <Label>
              Kunde zuordnen
              {isClientFieldDisabled && (
                <span className="text-sm text-gray-500 ml-2">
                  (vererbt vom Ordner)
                </span>
              )}
            </Label>

            {/* NEU: Vererbungs-Info */}
            {isClientFieldDisabled && inheritedCompany && (
              <div className="mt-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-blue-800">
                    Vererbt vom Ordner "{folderPath}": 
                  </span>
                  <Badge color="blue" className="text-xs">
                    {inheritedCompany.name}
                  </Badge>
                </div>
              </div>
            )}
            
            <Select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={isClientFieldDisabled}
              className={`mt-2 ${isClientFieldDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
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

          {/* NEU: Angepasste Zukunfts-Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              {isClientFieldDisabled ? '🔒 Firma-Vererbung aktiv' : '🚧 Zukünftige Features'}
            </h4>
            {isClientFieldDisabled ? (
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Die Firma wird automatisch vom Ordner vererbt</li>
                <li>• Zum Ändern: Datei in anderen Ordner verschieben</li>
                <li>• Root-Dateien haben editierbare Firma-Zuordnung</li>
              </ul>
            ) : (
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Tags & Keywords</li>
                <li>• Copyright-Informationen</li>
                <li>• Kampagnen-Zuordnung</li>
                <li>• Nutzungsrechte</li>
              </ul>
            )}
          </div>
        </FieldGroup>
      </DialogBody>

      <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
        <Button plain onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button 
          color="indigo" 
          onClick={handleSave} 
          disabled={!fileName.trim() || saving}
        >
          {saving ? 'Speichern...' : 'Änderungen speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}