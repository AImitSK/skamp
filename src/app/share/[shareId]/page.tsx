// src/app/share/[shareId]/page.tsx - CeleroPress Share Page mit Design System
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { mediaService } from "@/lib/firebase/media-service";
import { ShareLink, MediaAsset, MediaFolder } from "@/types/media";
import { useShareLink } from "@/lib/hooks/useMediaData";
import {
  PhotoIcon,
  DocumentIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  NewspaperIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import Link from "next/link";

export default function SharePage() {
  const params = useParams();
  const shareId = params.shareId as string;

  // React Query Hook - auto-fetches and caches share link
  const { data: shareLink, isLoading: shareLinkLoading, error: shareLinkError } = useShareLink(shareId);

  // Local state for password handling and UI
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
  const [folderInfo, setFolderInfo] = useState<MediaFolder | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordValidated, setPasswordValidated] = useState(false);
  const [validatingPassword, setValidatingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loading state
  const loading = shareLinkLoading;

  // React Query Hook bereits lädt Share Link - nur zusätzliche Daten laden
  useEffect(() => {
    if (!shareLink) return;

    const loadAdditionalContent = async () => {
      try {
        setError(null);

        // Prüfe Passwort-Schutz (requirePassword ist Boolean von API)
        if (shareLink.settings.requirePassword && !passwordValidated) {
          setPasswordRequired(true);
          return;
        }

        // Lade Inhalte je nach Typ
        if (shareLink.type === 'folder') {
          await loadFolderContent(shareLink.targetId);
        } else if (shareLink.type === 'campaign') {
          // NEU: Behandle Campaign-Typ
          await loadCampaignContent(shareLink);
        } else {
          // Default: Single file
          await loadFileContent(shareLink.targetId);
        }

      } catch (error) {
        setError('Fehler beim Laden des Inhalts.');
      }
    };

    loadAdditionalContent();
  }, [shareLink, passwordValidated]);

  // NEU: Lade Campaign-Medien
  const loadCampaignContent = async (shareLink: ShareLink) => {
    try {
      // Verwende die neue getCampaignMediaAssets Methode
      const assets = await mediaService.getCampaignMediaAssets(shareLink);
      
      setMediaItems(assets);
      
      if (assets.length === 0) {
        setError('Keine Medien in dieser Kampagne gefunden.');
      }
    } catch (error) {
      setError('Kampagnen-Medien konnten nicht geladen werden.');
    }
  };

  const loadFolderContent = async (folderId: string) => {
    try {
      // Lade Ordner-Info
      const folder = await mediaService.getFolder(folderId);
      setFolderInfo(folder);

      // Lade alle Dateien im Ordner
      const assets = await mediaService.getMediaAssetsInFolder(folderId);
      setMediaItems(assets);
    } catch (error) {
      setError('Ordner konnte nicht geladen werden.');
    }
  };

  const loadFileContent = async (assetId: string) => {
    try {
      // Lade einzelne Datei
      const asset = await mediaService.getMediaAssetById(assetId);
      if (asset) {
        setMediaItems([asset]);
      } else {
        setError('Datei nicht gefunden.');
      }
    } catch (error) {
      setError('Datei konnte nicht geladen werden.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(false);
    setValidatingPassword(true);

    try {
      // ✅ API-Route für Passwort-Validierung verwenden
      const response = await fetch('/api/media/share/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shareId,
          password: passwordInput,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        // Passwort korrekt - Content laden
        setPasswordValidated(true);
        setPasswordRequired(false);
      } else {
        // Passwort falsch
        setPasswordError(true);
        setPasswordInput('');
      }
    } catch (error) {
      console.error('Fehler bei Passwort-Validierung:', error);
      setPasswordError(true);
    } finally {
      setValidatingPassword(false);
    }
  };

  const getFileIcon = (fileType: string | undefined) => {
    if (!fileType) return DocumentIcon;
    if (fileType.startsWith('image/')) return PhotoIcon;
    if (fileType.startsWith('video/')) return VideoCameraIcon;
    if (fileType.includes('pdf') || fileType.includes('document')) return DocumentTextIcon;
    return DocumentIcon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-zinc-600">Lade geteilten Inhalt...</p>
        </div>
      </div>
    );
  }

  // Error State (from React Query or local)
  if (shareLinkError || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="max-w-md w-full bg-white rounded-lg border border-zinc-200 p-8 text-center shadow-sm">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <Heading level={2} className="text-zinc-900 font-semibold mb-2">Fehler</Heading>
          <Text className="text-zinc-600 text-sm mb-6">{error || 'Share-Link nicht gefunden oder nicht mehr aktiv.'}</Text>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary-hover text-white font-medium h-10 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  // Password Required
  if (passwordRequired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="max-w-md w-full bg-white rounded-lg border border-zinc-200 p-8 shadow-sm">
          <div className="text-center mb-6">
            <LockClosedIcon className="h-16 w-16 text-primary mx-auto mb-4" />
            <Heading level={2} className="text-zinc-900 font-semibold">Passwort erforderlich</Heading>
            <Text className="text-zinc-600 text-sm mt-2">
              Dieser Inhalt ist passwortgeschützt.
            </Text>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Passwort eingeben"
                className={`h-10 rounded-lg ${passwordError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 focus:ring-primary'}`}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-2 font-medium">Falsches Passwort. Bitte versuchen Sie es erneut.</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium h-10 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={validatingPassword || !passwordInput.trim()}
            >
              {validatingPassword ? 'Überprüfe...' : 'Zugriff freischalten'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Bestimme den Content-Typ für die Anzeige
  const getContentTypeDisplay = () => {
    if (shareLink?.type === 'folder') return 'Ordner';
    if (shareLink?.type === 'campaign') return 'Kampagnen-Medien';
    return 'Datei';
  };

  // Main Content
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {shareLink?.type === 'campaign' && (
                  <NewspaperIcon className="h-6 w-6 text-primary" />
                )}
                <Heading level={1} className="text-2xl font-semibold text-zinc-900">
                  {shareLink?.title}
                </Heading>
              </div>
              {shareLink?.description && (
                <Text className="mt-2 text-sm text-zinc-600">{shareLink.description}</Text>
              )}
              <div className="mt-3 flex items-center text-sm text-zinc-500">
                <span>
                  {getContentTypeDisplay()} • {mediaItems.length} {mediaItems.length === 1 ? 'Element' : 'Elemente'}
                </span>
              </div>
            </div>

            {/* CeleroPress Logo */}
            <div className="flex-shrink-0 ml-6">
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">CeleroPress</div>
                <div className="text-xs text-zinc-500 mt-1">Medien-Freigabe</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {mediaItems.length === 0 ? (
            <div className="text-center py-12">
              <PhotoIcon className="mx-auto h-16 w-16 text-zinc-400" />
              <Heading level={3} className="mt-4 text-lg font-semibold text-zinc-900">Keine Inhalte</Heading>
              <Text className="text-zinc-600 text-sm mt-2">
                {shareLink?.type === 'folder' ? 'Dieser Ordner ist leer.' :
                 shareLink?.type === 'campaign' ? 'Diese Kampagne enthält keine Medien.' :
                 'Inhalt nicht verfügbar.'}
              </Text>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {mediaItems.map((asset) => {
                const FileIcon = getFileIcon(asset.fileType);

                return (
                  <div
                    key={asset.id}
                    className="bg-white rounded-lg border border-zinc-200 overflow-hidden hover:border-zinc-300 transition-colors"
                  >
                    {/* Preview */}
                    <div className="aspect-square bg-zinc-50 flex items-center justify-center relative">
                      {asset.fileType?.startsWith('image/') ? (
                        <img
                          src={asset.downloadUrl}
                          alt={asset.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileIcon className="h-16 w-16 text-zinc-400" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-zinc-900 truncate mb-2" title={asset.fileName}>
                        {asset.fileName}
                      </h3>
                      <p className="text-xs text-zinc-500 mb-3">
                        {asset.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </p>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Link href={asset.downloadUrl} target="_blank" className="block">
                          <button className="w-full flex items-center justify-center gap-2 h-9 px-4 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                            <EyeIcon className="h-4 w-4" />
                            Ansehen
                          </button>
                        </Link>
                        {shareLink?.settings.downloadAllowed && (
                          <Link href={asset.downloadUrl} download className="block">
                            <button className="w-full flex items-center justify-center gap-2 h-9 px-4 text-xs font-medium text-white bg-primary border border-primary rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              Download
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-zinc-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-zinc-600">
              © {new Date().getFullYear()} CeleroPress. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}