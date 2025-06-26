// src/app/share/[shareId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { mediaService } from "@/lib/firebase/media-service";
import { ShareLink, MediaAsset, MediaFolder } from "@/types/media";
import { 
  PhotoIcon, 
  DocumentIcon, 
  VideoCameraIcon, 
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  LockClosedIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import Link from "next/link";

export default function SharePage() {
  const params = useParams();
  const shareId = params.shareId as string;
  
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
  const [folderInfo, setFolderInfo] = useState<MediaFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (shareId) {
      loadShareContent();
    }
  }, [shareId]);

  const loadShareContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lade Share-Link
      const link = await mediaService.getShareLinkByShareId(shareId);
      
      if (!link) {
        setError('Share-Link nicht gefunden oder nicht mehr aktiv.');
        return;
      }

      setShareLink(link);

      // Prüfe Passwort-Schutz
      if (link.settings.passwordRequired && !passwordInput) {
        setPasswordRequired(true);
        return;
      }

      if (link.settings.passwordRequired && passwordInput !== link.settings.passwordRequired) {
        setPasswordError(true);
        return;
      }

      // Lade Inhalte je nach Typ
      if (link.type === 'folder') {
        await loadFolderContent(link.targetId);
      } else {
        await loadFileContent(link.targetId);
      }

    } catch (error) {
      console.error('Fehler beim Laden des Share-Inhalts:', error);
      setError('Fehler beim Laden des Inhalts.');
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContent = async (folderId: string) => {
    try {
      // Lade Ordner-Info
      const folder = await mediaService.getFolder(folderId);
      setFolderInfo(folder);

      // Lade alle Dateien im Ordner (spezielle Methode ohne userId-Filter)
      const assets = await mediaService.getMediaAssetsInFolder(folderId);
      setMediaItems(assets);
    } catch (error) {
      console.error('Fehler beim Laden des Ordner-Inhalts:', error);
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
      console.error('Fehler beim Laden der Datei:', error);
      setError('Datei konnte nicht geladen werden.');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(false);
    loadShareContent();
  };

  const getFileIcon = (fileType: string) => {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade geteilten Inhalt...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <Heading level={2} className="text-red-900 mb-2">Fehler</Heading>
          <Text className="text-gray-600 mb-6">{error}</Text>
          <Button onClick={() => window.location.reload()}>
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  // Password Required
  if (passwordRequired) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <LockClosedIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <Heading level={2} className="text-gray-900">Passwort erforderlich</Heading>
            <Text className="text-gray-600 mt-2">
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
                className={passwordError ? 'border-red-500' : ''}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">Falsches Passwort</p>
              )}
            </div>
            <Button type="submit" className="w-full" color="indigo">
              Zugriff freischalten
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Main Content
  return (
    <>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Heading level={1} className="text-2xl font-bold text-gray-900">
                {shareLink?.title}
              </Heading>
              {shareLink?.description && (
                <Text className="mt-1 text-gray-600">{shareLink.description}</Text>
              )}
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span>
                  {shareLink?.type === 'folder' ? 'Ordner' : 'Datei'} • {mediaItems.length} {mediaItems.length === 1 ? 'Element' : 'Elemente'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-400">
                Powered by SKAMP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mediaItems.length === 0 ? (
          <div className="text-center py-12">
            <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
            <Heading level={3} className="mt-4 text-lg text-gray-900">Keine Inhalte</Heading>
            <Text className="text-gray-600 mt-2">
              {shareLink?.type === 'folder' ? 'Dieser Ordner ist leer.' : 'Inhalt nicht verfügbar.'}
            </Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {mediaItems.map((asset) => {
              const FileIcon = getFileIcon(asset.fileType);
              
              return (
                <div
                  key={asset.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Preview */}
                  <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                    {asset.fileType.startsWith('image/') ? (
                      <img
                        src={asset.downloadUrl}
                        alt={asset.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileIcon className="h-16 w-16 text-gray-400" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 truncate mb-2" title={asset.fileName}>
                      {asset.fileName}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      {asset.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                    </p>
                    
                    {/* Actions - Besseres Layout */}
                    <div className="space-y-2">
                      <Link href={asset.downloadUrl} target="_blank" className="block">
                        <Button plain className="w-full text-xs py-2">
                          <EyeIcon className="h-3 w-3 mr-2" />
                          Ansehen
                        </Button>
                      </Link>
                      {shareLink?.settings.downloadAllowed && (
                        <Link href={asset.downloadUrl} download className="block">
                          <Button color="indigo" className="w-full text-xs py-2">
                            <ArrowDownTrayIcon className="h-3 w-3 mr-2" />
                            Download
                          </Button>
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

      {/* Footer */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Geteilt über SKAMP Marketing Suite</p>
          </div>
        </div>
      </div>
    </>
  );
}