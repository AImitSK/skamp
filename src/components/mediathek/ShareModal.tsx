// src/components/mediathek/ShareModal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";
import { Checkbox, CheckboxField, CheckboxGroup } from "@/components/checkbox";
import { ShareLink, MediaFolder, MediaAsset } from "@/types/media";
import { useAuth } from "@/context/AuthContext";
import { mediaService } from "@/lib/firebase/media-service";
import { LinkIcon, ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

interface ShareModalProps {
  target: MediaFolder | MediaAsset; // Was geteilt wird
  type: 'folder' | 'file';
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ShareModal({ 
  target, 
  type, 
  onClose, 
  onSuccess 
}: ShareModalProps) {
  const { user } = useAuth();
  
  // NEU: Korrekte Behandlung von name vs fileName
  const defaultTitle = type === 'folder' 
    ? (target as MediaFolder).name 
    : (target as MediaAsset).fileName;
    
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState('');
  const [creating, setCreating] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async () => {
    if (!user || !title.trim()) return;

    setCreating(true);
    try {
      const shareData: any = {
        userId: user.uid,
        type,
        targetId: target.id!,
        title: title.trim(),
        isActive: true,
        settings: {
          downloadAllowed,
          showFileList: type === 'folder',
        },
      };

      // Nur hinzufügen wenn definiert (Firestore mag kein undefined)
      if (description.trim()) {
        shareData.description = description.trim();
      }
      
      if (passwordRequired.trim()) {
        shareData.settings.passwordRequired = passwordRequired.trim();
      }

      const newShareLink = await mediaService.createShareLink(shareData);
      setShareLink(newShareLink);
      onSuccess?.();
    } catch (error) {
      console.error('Fehler beim Erstellen des Share-Links:', error);
      alert('Fehler beim Erstellen des Share-Links. Bitte versuchen Sie es erneut.');
    } finally {
      setCreating(false);
    }
  };

  const getShareUrl = () => {
    if (!shareLink) return '';
    return `${window.location.origin}/share/${shareLink.shareId}`;
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

  if (shareLink) {
    // Link wurde erstellt - Erfolgsansicht
    return (
      <Dialog open={true} onClose={onClose} size="lg">
        <DialogTitle className="px-6 py-4 text-base font-semibold flex items-center">
          <LinkIcon className="h-5 w-5 mr-2 text-green-600" />
          Share-Link erstellt
        </DialogTitle>
        
        <DialogBody className="p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Link erfolgreich erstellt!
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Teilen Sie diesen Link mit Ihren Kunden:
            </p>
            
            {/* Share URL */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-sm text-gray-700 flex-1 truncate mr-4">
                  {getShareUrl()}
                </code>
                <Button
                  plain
                  onClick={handleCopyLink}
                  className={`flex items-center ${copied ? 'text-green-600' : 'text-gray-600'}`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Kopiert!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                      Kopieren
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Link Details */}
            <div className="text-left bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Link-Details:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Titel:</strong> {shareLink.title}</li>
                <li><strong>Typ:</strong> {type === 'folder' ? 'Ordner' : 'Datei'}</li>
                <li><strong>Download:</strong> {shareLink.settings.downloadAllowed ? 'Erlaubt' : 'Nicht erlaubt'}</li>
                {shareLink.settings.passwordRequired && (
                  <li><strong>Passwort:</strong> Erforderlich</li>
                )}
                <li><strong>Zugriffe:</strong> {shareLink.accessCount}</li>
              </ul>
            </div>
          </div>
        </DialogBody>

        <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
          <Button color="indigo" onClick={onClose}>
            Fertig
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Link-Erstellung
  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <DialogTitle className="px-6 py-4 text-base font-semibold flex items-center">
        <LinkIcon className="h-5 w-5 mr-2" />
        Share-Link erstellen
      </DialogTitle>
      
      <DialogBody className="p-6">
        <FieldGroup>
          <Field>
            <Label>Titel für geteilten Inhalt *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Produktfotos Q4 2024, Logo-Varianten..."
              className="mt-2"
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
              className="mt-2"
            />
          </Field>

          <Field>
            <Label>Einstellungen</Label>
            <CheckboxGroup className="mt-3">
              <CheckboxField>
                <Checkbox
                  checked={downloadAllowed}
                  onChange={setDownloadAllowed}
                />
                <Label>Download erlauben</Label>
              </CheckboxField>
            </CheckboxGroup>
          </Field>

          <Field>
            <Label>Passwort-Schutz (optional)</Label>
            <Input
              type="password"
              value={passwordRequired}
              onChange={(e) => setPasswordRequired(e.target.value)}
              placeholder="Leer lassen für öffentlichen Zugang"
              className="mt-2"
            />
          </Field>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Share-Link Info</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Links sind standardmäßig unbegrenzt gültig</li>
              <li>• Sie können Links jederzeit deaktivieren</li>
              <li>• Zugriffe werden automatisch getrackt</li>
              {type === 'folder' && <li>• Ordner-Inhalte werden als Galerie angezeigt</li>}
            </ul>
          </div>
        </FieldGroup>
      </DialogBody>

      <DialogActions className="px-6 py-4 flex justify-end gap-x-4">
        <Button plain onClick={onClose} disabled={creating}>
          Abbrechen
        </Button>
        <Button 
          color="indigo" 
          onClick={handleCreateLink} 
          disabled={!title.trim() || creating}
        >
          {creating ? 'Erstelle Link...' : 'Share-Link erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}