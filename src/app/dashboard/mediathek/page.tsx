"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { mediaService } from "@/lib/firebase/media-service";
import { MediaAsset } from "@/types/media";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { PlusIcon, PhotoIcon } from "@heroicons/react/20/solid";
import Link from 'next/link';
import UploadModal from "./UploadModal"; // <-- NEU: Importieren Sie das Modal

export default function MediathekPage() {
  const { user } = useAuth();
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false); // <-- NEU: State für das Modal

  useEffect(() => {
    if (user) {
      loadMediaAssets();
    }
  }, [user]);

  const loadMediaAssets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const assets = await mediaService.getMediaAssets(user.uid);
      setMediaAssets(assets);
    } catch (error) {
      console.error("Fehler beim Laden der Medien-Assets:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (asset: MediaAsset) => {
      if (window.confirm(`Möchten Sie die Datei "${asset.fileName}" wirklich löschen?`)) {
          try {
            await mediaService.deleteMediaAsset(asset);
            await loadMediaAssets(); // Liste neu laden
          } catch(error) {
              console.error("Fehler beim Löschen der Datei: ", error)
              alert("Die Datei konnte nicht gelöscht werden.")
          }
      }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading>Mediathek</Heading>
          <Text className="mt-1">Verwalten Sie Ihre Bilder, Videos und Dokumente.</Text>
        </div>
        {/* --- NEU: Button öffnet jetzt das Modal --- */}
        <Button onClick={() => setShowUploadModal(true)}>
          <PlusIcon className="size-4 mr-2" />
          Medien hochladen
        </Button>
      </div>

      {loading ? (
        <p>Lade Mediathek...</p>
      ) : mediaAssets.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-white">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Ihre Mediathek ist leer</h3>
          <p className="mt-1 text-sm text-gray-500">Laden Sie Ihre erste Datei hoch, um sie hier zu verwalten.</p>
          <div className="mt-6">
             <Button onClick={() => setShowUploadModal(true)}>
                <PlusIcon className="size-4 mr-2" />
                Erste Datei hochladen
            </Button>
          </div>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Vorschau</TableHeader>
              <TableHeader>Dateiname</TableHeader>
              <TableHeader>Typ</TableHeader>
              <TableHeader>Erstellt am</TableHeader>
              <TableHeader className="text-right">Aktionen</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {mediaAssets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  {asset.fileType.startsWith('image/') ? (
                    <img src={asset.downloadUrl} alt={asset.fileName} className="h-10 w-10 object-cover rounded" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                        <PhotoIcon className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{asset.fileName}</TableCell>
                <TableCell>{asset.fileType}</TableCell>
                <TableCell>{asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '-'}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Link href={asset.downloadUrl} target="_blank" passHref>
                        <Button plain>Ansehen</Button>
                    </Link>
                    <Button plain className="text-red-600 hover:text-red-500" onClick={() => handleDelete(asset)}>Löschen</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      {/* --- NEU: Das Modal wird hier bei Bedarf gerendert --- */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={loadMediaAssets}
        />
      )}
    </div>
  );
}