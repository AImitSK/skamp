// src/components/mediathek/FolderModal.tsx - Mit Firma-Vererbung
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";
import { Select } from "@/components/select";
import { Badge } from "@/components/badge";
import { MediaFolder } from "@/types/media";
import { useCrmData } from "@/context/CrmDataContext";

interface FolderModalProps {
  folder?: MediaFolder; // Wenn gesetzt, Edit-Modus
  parentFolderId?: string;
  allFolders?: MediaFolder[]; // NEU: Für Vererbungs-Logik
  onClose: () => void;
  onSave: (folderData: Omit<MediaFolder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet  
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#84cc16', // Lime
];

// NEU: Hilfsfunktionen (inline für jetzt)
function isRootFolder(folder: { parentFolderId?: string }): boolean {
  return !folder.parentFolderId;
}

async function getInheritedClientId(
  folder: { parentFolderId?: string; clientId?: string }, 
  allFolders: MediaFolder[]
): Promise<string | undefined> {
  console.log('🔍 getInheritedClientId called with:', { 
    folder, 
    allFoldersCount: allFolders.length,
    allFolderIds: allFolders.map(f => ({ id: f.id, name: f.name, clientId: f.clientId }))
  });
  
  // Wenn Ordner selbst eine Firma hat, verwende diese
  if (folder.clientId) {
    console.log('✅ Folder has own clientId:', folder.clientId);
    return folder.clientId;
  }
  
  // Wenn es ein Root-Ordner ist, keine Vererbung möglich
  if (!folder.parentFolderId) {
    console.log('❌ Root folder, no inheritance possible');
    return undefined;
  }
  
  console.log('🔍 Looking for parent folder with ID:', folder.parentFolderId);
  
  // Finde Parent-Ordner
  const parentFolder = allFolders.find(f => f.id === folder.parentFolderId);
  if (!parentFolder) {
    console.log('❌ Parent folder not found in allFolders');
    return undefined;
  }
  
  console.log('✅ Found parent folder:', { id: parentFolder.id, name: parentFolder.name, clientId: parentFolder.clientId });
  
  // Rekursiv nach oben gehen
  return await getInheritedClientId(parentFolder, allFolders);
}

export default function FolderModal({ 
  folder, 
  parentFolderId, 
  allFolders = [], // NEU
  onClose, 
  onSave 
}: FolderModalProps) {
  const { companies } = useCrmData();
  const [name, setName] = useState(folder?.name || '');
  const [description, setDescription] = useState(folder?.description || '');
  const [selectedColor, setSelectedColor] = useState(folder?.color || FOLDER_COLORS[0]);
  const [selectedClientId, setSelectedClientId] = useState(folder?.clientId || '');
  const [saving, setSaving] = useState(false);

  // NEU: Client-Vererbung States
  const [inheritedClientId, setInheritedClientId] = useState<string | undefined>(undefined);
  const [isClientFieldDisabled, setIsClientFieldDisabled] = useState(false);

  const isEdit = !!folder;
  const folderToCheck = folder || { parentFolderId } as MediaFolder;
  const isRoot = isRootFolder(folderToCheck);

  // NEU: Effect für Client-Vererbung
  useEffect(() => {
    async function checkClientInheritance() {
      console.log('🔍 FolderModal: Checking inheritance...', { isRoot, allFoldersLength: allFolders.length });
      
      if (isRoot) {
        // Root-Ordner: Client-Feld editierbar
        console.log('✅ Root folder - keeping current clientId:', folder?.clientId);
        setIsClientFieldDisabled(false);
        setInheritedClientId(undefined);
        // Behalte die originale Client-ID bei Edit
        if (folder?.clientId) {
          setSelectedClientId(folder.clientId);
        }
      } else {
        // Unterordner: Client-Feld ausgegraut, zeige vererbte Firma
        setIsClientFieldDisabled(true);
        
        if (allFolders.length > 0) {
          console.log('🔍 Checking inheritance for folder:', folderToCheck);
          const inherited = await getInheritedClientId(folderToCheck, allFolders);
          console.log('📋 Inherited clientId:', inherited);
          
          setInheritedClientId(inherited);
          if (inherited) {
            setSelectedClientId(inherited);
            console.log('✅ Set selectedClientId to inherited:', inherited);
          }
        } else {
          console.log('⚠️ No folders available for inheritance check');
        }
      }
    }

    checkClientInheritance();
  }, [isRoot, allFolders, folderToCheck, folder?.clientId]);

  const getInheritedCompany = () => {
    if (!inheritedClientId) return null;
    return companies.find(c => c.id === inheritedClientId);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Bitte geben Sie einen Ordnernamen ein.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        clientId: selectedClientId || undefined, // NEU: Speichere vererbte Firma auch für Unterordner
        parentFolderId,
      });
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern des Ordners:', error);
      alert('Fehler beim Speichern des Ordners. Bitte versuchen Sie es erneut.');
    } finally {
      setSaving(false);
    }
  };

  const inheritedCompany = getInheritedCompany();

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle className="px-6 py-4 text-base font-semibold">
        {isEdit ? 'Ordner bearbeiten' : 'Neuen Ordner erstellen'}
      </DialogTitle>
      
      <DialogBody className="p-6">
        <FieldGroup>
          <Field>
            <Label>Ordnername *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Kunde XYZ, Kampagne 2024, Produktfotos..."
              className="mt-2"
              autoFocus
            />
          </Field>

          <Field>
            <Label>Beschreibung (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Ordnerinhalts..."
              rows={3}
              className="mt-2"
            />
          </Field>

          {/* NEU: Client-Zuordnung mit Vererbungs-Logik */}
          <Field>
            <Label>
              Kunde zuordnen 
              {!isRoot && (
                <span className="text-sm text-gray-500 ml-2">
                  (vererbt vom übergeordneten Ordner)
                </span>
              )}
            </Label>
            
            {/* NEU: Vererbungs-Info für Unterordner */}
            {!isRoot && inheritedCompany && (
              <div className="mt-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-blue-800">
                    Vererbt von übergeordnetem Ordner: 
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
              {isRoot 
                ? "Ordnen Sie den Ordner einem Kunden zu. Unterordner erben diese Zuordnung automatisch."
                : "Diese Zuordnung wird vom übergeordneten Ordner vererbt und kann hier nicht geändert werden."
              }
            </Description>
          </Field>

          <Field>
            <Label>Ordnerfarbe</Label>
            <div className="mt-3 flex flex-wrap gap-3">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    selectedColor === color 
                      ? 'border-gray-400 scale-110 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Farbe: ${color}`}
                />
              ))}
            </div>
          </Field>

          {/* NEU: Vererbungs-Erklärung */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              💡 Firma-Vererbung
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Root-Ordner:</strong> Können einem Kunden zugeordnet werden</li>
              <li>• <strong>Unterordner:</strong> Erben automatisch die Firma des übergeordneten Ordners</li>
              <li>• <strong>Dateien:</strong> Erhalten automatisch die Firma des Ordners beim Upload/Verschieben</li>
            </ul>
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
          disabled={!name.trim() || saving}
        >
          {saving ? 'Speichern...' : (isEdit ? 'Speichern' : 'Ordner erstellen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}