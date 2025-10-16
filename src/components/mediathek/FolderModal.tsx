// src/components/mediathek/FolderModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup, Description } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { MediaFolder } from "@/types/media";
import { useCrmData } from "@/context/CrmDataContext";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

interface FolderModalProps {
  folder?: MediaFolder;
  parentFolderId?: string;
  allFolders?: MediaFolder[];
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

// Hilfsfunktionen
function isRootFolder(folder: { parentFolderId?: string }): boolean {
  return !folder.parentFolderId;
}

async function getInheritedClientId(
  folder: { parentFolderId?: string; clientId?: string }, 
  allFolders: MediaFolder[]
): Promise<string | undefined> {
  if (folder.clientId) {
    return folder.clientId;
  }
  
  if (!folder.parentFolderId) {
    return undefined;
  }
  
  const parentFolder = allFolders.find(f => f.id === folder.parentFolderId);
  if (!parentFolder) {
    return undefined;
  }
  
  return await getInheritedClientId(parentFolder, allFolders);
}

export default function FolderModal({ 
  folder, 
  parentFolderId, 
  allFolders = [],
  onClose, 
  onSave 
}: FolderModalProps) {
  const { companies } = useCrmData();
  const [name, setName] = useState(folder?.name || '');
  const [description, setDescription] = useState(folder?.description || '');
  const [selectedColor, setSelectedColor] = useState(folder?.color || FOLDER_COLORS[0]);
  const [selectedClientId, setSelectedClientId] = useState(folder?.clientId || '');
  const [saving, setSaving] = useState(false);

  const [inheritedClientId, setInheritedClientId] = useState<string | undefined>(undefined);
  const [isClientFieldDisabled, setIsClientFieldDisabled] = useState(false);

  const isEdit = !!folder;
  const folderToCheck = folder || { parentFolderId } as MediaFolder;
  const isRoot = isRootFolder(folderToCheck);

  useEffect(() => {
    async function checkClientInheritance() {
      if (isRoot) {
        setIsClientFieldDisabled(false);
        setInheritedClientId(undefined);
        if (folder?.clientId) {
          setSelectedClientId(folder.clientId);
        }
      } else {
        setIsClientFieldDisabled(true);
        
        if (allFolders.length > 0) {
          const inherited = await getInheritedClientId(folderToCheck, allFolders);
          setInheritedClientId(inherited);
          if (inherited) {
            setSelectedClientId(inherited);
          }
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
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        clientId: selectedClientId || undefined,
        parentFolderId,
      });
      onClose();
    } catch (error) {
      // Error handling could be improved with proper user feedback
    } finally {
      setSaving(false);
    }
  };

  const inheritedCompany = getInheritedCompany();

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle>
        {isEdit ? 'Ordner bearbeiten' : 'Neuen Ordner erstellen'}
      </DialogTitle>

      <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto">
        <FieldGroup>
            <Field>
              <Label>Ordnername *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Kunde XYZ, Kampagne 2024, Produktfotos..."
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
              />
            </Field>

            {/* Client-Zuordnung mit Vererbungs-Logik */}
            <Field>
              <Label>
                Kunde zuordnen 
                {!isRoot && (
                  <span className="text-sm text-gray-500 ml-2">
                    (vererbt vom übergeordneten Ordner)
                  </span>
                )}
              </Label>
              
              {/* Vererbungs-Info für Unterordner */}
              {!isRoot && inheritedCompany && (
                <div className="mt-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Text className="text-blue-800">
                      Vererbt von übergeordnetem Ordner: 
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
                        ? 'border-gray-400 scale-110' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Farbe: ${color}`}
                  />
                ))}
              </div>
            </Field>

            {/* Vererbungs-Erklärung */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex gap-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <div>
                  <Text className="text-sm font-medium text-gray-900 mb-2">Firma-Vererbung</Text>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Root-Ordner:</strong> Können einem Kunden zugeordnet werden</li>
                    <li>• <strong>Unterordner:</strong> Erben automatisch die Firma des übergeordneten Ordners</li>
                    <li>• <strong>Dateien:</strong> Erhalten automatisch die Firma des Ordners beim Upload/Verschieben</li>
                  </ul>
                </div>
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
          disabled={!name.trim() || saving}
          className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
        >
          {saving ? 'Speichern...' : (isEdit ? 'Speichern' : 'Ordner erstellen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}