// src/components/mediathek/ShareModal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Field, Label, FieldGroup } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { MediaFolder, MediaAsset } from "@/types/media";
import { mediaService } from "@/lib/firebase/media-service";
import { 
  LinkIcon, 
  ClipboardDocumentIcon, 
  CheckIcon,
  InformationCircleIcon
} from "@heroicons/react/20/solid";

interface ShareModalProps {
  target: MediaFolder | MediaAsset;
  type: 'folder' | 'file';
  onClose: () => void;
  onSuccess?: () => void;
  organizationId: string; // NEW: Required for multi-tenancy
  userId: string; // NEW: Required for tracking who creates the share
}

interface CreatedShareLink {
  id: string;
  shareId: string;
  title: string;
  type: 'folder' | 'file';
  downloadAllowed: boolean;
  passwordRequired?: string;
  accessCount: number;
}

export default function ShareModal({ 
  target, 
  type, 
  onClose, 
  onSuccess,
  organizationId, // NEW
  userId // NEW
}: ShareModalProps) {
  
  const defaultTitle = type === 'folder' 
    ? (target as MediaFolder).name 
    : (target as MediaAsset).fileName;
    
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<CreatedShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async () => {
    if (!title.trim()) return;

    setCreating(true);
    try {
      const shareData = {
        organizationId, // NEW: Use organizationId
        createdBy: userId, // NEW: Track who created it
        type,
        targetId: target.id!,
        title: title.trim(),
        isActive: true,
        settings: {
          downloadAllowed,
          showFileList: type === 'folder',
          expiresAt: null,
          passwordRequired: passwordRequired.trim() || null,
          watermarkEnabled: false,
        },
        description: description.trim() || undefined,
      };

      // createShareLink gibt ein ShareLink Objekt zurück
      const result = await mediaService.createShareLink(shareData);
      
      // Extrahiere die shareId - result ist vom Typ ShareLink
      const generatedShareId = (result as any).shareId || (result as any).id;
      
      if (!generatedShareId || typeof generatedShareId !== 'string') {
        throw new Error('Keine gültige shareId erhalten');
      }
      
      // Erstelle ein lokales Objekt für die Anzeige
      const linkData: CreatedShareLink = {
        id: generatedShareId,
        shareId: generatedShareId,
        title: title.trim(),
        type,
        downloadAllowed,
        passwordRequired: passwordRequired.trim() || undefined,
        accessCount: 0,
      };
      
      setCreatedLink(linkData);
      
      // Rufe onSuccess nur auf, wenn explizit gewünscht
      // aber NICHT beim normalen Share-Vorgang
      // onSuccess?.();
      
    } catch (error) {
      console.error('Fehler beim Erstellen des Share-Links:', error);
      alert('Fehler beim Erstellen des Share-Links. Bitte versuchen Sie es erneut.');
    } finally {
      setCreating(false);
    }
  };

  const getShareUrl = () => {
    if (!createdLink) return '';
    return `${window.location.origin}/share/${createdLink.shareId}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
    }
  };

  const handleClose = () => {
    // Beim Schließen erst onSuccess aufrufen, falls ein Link erstellt wurde
    if (createdLink && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  if (createdLink) {
    // Link wurde erstellt - Erfolgsansicht
    return (
      <Dialog open={true} onClose={handleClose} size="lg">
        <div className="p-6">
          <DialogTitle>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-green-600" />
              Share-Link erstellt
            </div>
          </DialogTitle>
          
          <DialogBody className="mt-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <Text className="text-lg font-medium text-gray-900 mb-2">
                Link erfolgreich erstellt!
              </Text>
              <Text className="text-sm text-gray-500 mb-6">
                Teilen Sie diesen Link mit Ihren Kunden:
              </Text>
              
              {/* Share URL */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm text-gray-700 flex-1 truncate">
                    {getShareUrl()}
                  </code>
                  <Button
                    plain
                    onClick={handleCopyLink}
                    className={`whitespace-nowrap ${copied ? 'text-green-600' : 'text-gray-600'}`}
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        Kopieren
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Link Details */}
              <div className="text-left bg-white border rounded-lg p-4">
                <Text className="font-medium text-gray-900 mb-2">Link-Details:</Text>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>Titel:</strong> {createdLink.title}</li>
                  <li><strong>Typ:</strong> {type === 'folder' ? 'Ordner' : 'Datei'}</li>
                  <li><strong>Download:</strong> {createdLink.downloadAllowed ? 'Erlaubt' : 'Nicht erlaubt'}</li>
                  {createdLink.passwordRequired && (
                    <li><strong>Passwort:</strong> Erforderlich</li>
                  )}
                  <li><strong>Zugriffe:</strong> {createdLink.accessCount}</li>
                </ul>
              </div>
            </div>
          </DialogBody>

          <DialogActions className="mt-5 sm:mt-4">
            <Button 
              onClick={handleClose}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
            >
              Fertig
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    );
  }

  // Link-Erstellung
  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <div className="p-6">
        <DialogTitle>
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Share-Link erstellen
          </div>
        </DialogTitle>
        
        <DialogBody className="mt-4">
          <FieldGroup>
            <Field>
              <Label>Titel für geteilten Inhalt *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Produktfotos Q4 2024, Logo-Varianten..."
                autoFocus
              />
            </Field>

            <Field>
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Zusätzliche Informationen für den Empfänger..."
                rows={3}
              />
            </Field>

            <Field>
              <Label>Einstellungen</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={downloadAllowed}
                  onChange={setDownloadAllowed}
                />
                <span className="text-sm">Download erlauben</span>
              </label>
            </Field>

            <Field>
              <Label>Passwort-Schutz (optional)</Label>
              <Input
                type="password"
                value={passwordRequired}
                onChange={(e) => setPasswordRequired(e.target.value)}
                placeholder="Leer lassen für öffentlichen Zugang"
              />
            </Field>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <Text className="text-sm font-medium text-blue-900 mb-2">Share-Link Info</Text>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Links sind standardmäßig unbegrenzt gültig</li>
                    <li>• Sie können Links jederzeit deaktivieren</li>
                    <li>• Zugriffe werden automatisch getrackt</li>
                    {type === 'folder' && <li>• Ordner-Inhalte werden als Galerie angezeigt</li>}
                  </ul>
                </div>
              </div>
            </div>
          </FieldGroup>
        </DialogBody>

        <DialogActions className="mt-5 sm:mt-4">
          <Button plain onClick={onClose} disabled={creating}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateLink} 
            disabled={!title.trim() || creating}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            {creating ? 'Erstelle Link...' : 'Share-Link erstellen'}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}