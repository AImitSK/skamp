// src/components/mediathek/ShareModal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/dialog";
import { Field, Label, FieldGroup } from "@/components/fieldset";
import { Input } from "@/components/input";
import { Textarea } from "@/components/textarea";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Text } from "@/components/text";
import { ShareLink, MediaFolder, MediaAsset } from "@/types/media";
import { useAuth } from "@/context/AuthContext";
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
}

export default function ShareModal({ 
  target, 
  type, 
  onClose, 
  onSuccess 
}: ShareModalProps) {
  const { user } = useAuth();
  
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
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-700 flex-1 truncate mr-4">
                    {getShareUrl()}
                  </code>
                  <Button
                    plain
                    onClick={handleCopyLink}
                    className={copied ? 'text-green-600' : 'text-gray-600'}
                  >
                    {copied ? (
                      <>
                        <CheckIcon />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon />
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

          <DialogActions>
            <Button 
              onClick={onClose}
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

            <div className="space-y-3">
              <Label>Einstellungen</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={downloadAllowed}
                  onChange={setDownloadAllowed}
                />
                <span className="text-sm">Download erlauben</span>
              </label>
            </div>

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

        <DialogActions>
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