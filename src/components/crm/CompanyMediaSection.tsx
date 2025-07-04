// src/components/crm/CompanyMediaSection.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { mediaService } from "@/lib/firebase/media-service";
import { MediaAsset, MediaFolder } from "@/types/media";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { 
  PhotoIcon, 
  FolderIcon, 
  PlusIcon, 
  ShareIcon,
  ArrowTopRightOnSquareIcon,
  DocumentIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";

interface CompanyMediaSectionProps {
  companyId: string;
  companyName: string;
}

export default function CompanyMediaSection({ companyId, companyName }: CompanyMediaSectionProps) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [recentAssets, setRecentAssets] = useState<MediaAsset[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && companyId) {
      loadCompanyMedia();
    }
  }, [user, companyId]);

  const loadCompanyMedia = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { folders, assets, totalCount } = await mediaService.getMediaByClientId(user.uid, companyId);
      setFolders(folders);
      setRecentAssets(assets.slice(0, 6)); // Nur die letzten 6 für Vorschau
      setTotalCount(totalCount);
    } catch (error) {
      console.error("Fehler beim Laden der Kunden-Medien:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return PhotoIcon;
    if (fileType.startsWith('video/')) return VideoCameraIcon;
    if (fileType.includes('pdf') || fileType.includes('document')) return DocumentTextIcon;
    return DocumentIcon;
  };

  // NEU: Direkt zur Mediathek mit Kunden-Context
  const handleUploadForClient = () => {
    // Öffne Mediathek mit Client-Parameter für automatische Zuordnung
    window.open(`/dashboard/pr-tools/media-library?uploadFor=${companyId}&clientName=${encodeURIComponent(companyName)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="mt-8 p-6 border rounded-lg bg-gray-50">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Medien</h2>
          <p className="text-sm text-gray-600">
            {totalCount === 0 
              ? 'Noch keine Medien zugeordnet' 
              : `${folders.length} Ordner, ${recentAssets.length} Dateien${totalCount > 6 ? ` (${totalCount} gesamt)` : ''}`
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/dashboard/pr-tools/media-library?client=${companyId}`}>
            <Button plain className="text-sm">
              <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
              Zur Mediathek
            </Button>
          </Link>
          <Button color="indigo" className="text-sm" onClick={handleUploadForClient}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Für {companyName}
          </Button>
        </div>
      </div>

      {totalCount === 0 ? (
        // Empty State
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Noch keine Medien</h3>
          <p className="mt-1 text-sm text-gray-500">
            Laden Sie Dateien hoch oder erstellen Sie Ordner für {companyName}.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button color="indigo" onClick={handleUploadForClient}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Ersten Upload starten
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ordner Section */}
          {folders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Ordner ({folders.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <Link 
                    key={folder.id} 
                    href={`/dashboard/pr-tools/media-library?folder=${folder.id}`}
                    className="group p-4 border rounded-lg hover:shadow-md transition-all duration-200 hover:border-indigo-300"
                  >
                    <div className="flex items-center space-x-3">
                      <FolderIcon 
                        className="h-8 w-8 flex-shrink-0 group-hover:scale-105 transition-transform"
                        style={{ color: folder.color || '#6366f1' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" title={folder.name}>
                          {folder.name}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            Ordner
                          </p>
                          <ShareIcon className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Letzte Dateien */}
          {recentAssets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Letzte Dateien ({recentAssets.length}{totalCount > 6 ? ` von ${totalCount}` : ''})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {recentAssets.map((asset) => {
                  const FileIcon = getFileIcon(asset.fileType);
                  
                  return (
                    <div key={asset.id} className="group relative">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border hover:shadow-md transition-all duration-200">
                        {asset.fileType.startsWith('image/') ? (
                          <img
                            src={asset.downloadUrl}
                            alt={asset.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={asset.downloadUrl} target="_blank">
                              <Button className="text-xs p-2 bg-white text-gray-900 hover:bg-gray-100">
                                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                      
                      <p className="mt-2 text-xs text-gray-600 truncate" title={asset.fileName}>
                        {asset.fileName}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              {totalCount > 6 && (
                <div className="text-center mt-4">
                  <Link href={`/dashboard/pr-tools/media-library?client=${companyId}`}>
                    <Button plain className="text-sm">
                      Alle {totalCount} Medien anzeigen
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}