// src/app/api/media/share/[shareId]/assets/route.ts
// API Route: Campaign/Folder Assets laden (Public Access, Server-Side)
// Lösung für nicht-eingeloggte User bei Campaign-Share-Links

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';

/**
 * GET /api/media/share/[shareId]/assets
 *
 * Lädt alle Assets eines Share-Links (Campaign oder Folder) mit Admin SDK.
 * Öffentlich zugänglich - keine Authentifizierung erforderlich.
 *
 * Security:
 * - Validiert ShareLink (aktiv, nicht abgelaufen)
 * - Lädt Assets server-side mit Admin SDK (umgeht Firestore Security Rules)
 * - Gibt nur öffentlich sichere Daten zurück
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID required' },
        { status: 400 }
      );
    }

    // 1. Load Share-Link
    const snapshot = await adminDb
      .collection('media_shares')
      .where('shareId', '==', shareId)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Share not found or inactive' },
        { status: 404 }
      );
    }

    const shareDoc = snapshot.docs[0];
    const shareData = shareDoc.data();

    // 2. Check expiration
    if (shareData.settings?.expiresAt) {
      const expiresAt = shareData.settings.expiresAt.toDate();
      if (new Date() > expiresAt) {
        return NextResponse.json(
          { error: 'Share link has expired' },
          { status: 410 } // Gone
        );
      }
    }

    // 3. Load Assets based on share type
    const allAssets: any[] = [];

    // 3a. Load direct Assets (assetIds)
    if (shareData.assetIds && Array.isArray(shareData.assetIds) && shareData.assetIds.length > 0) {
      const assetPromises = shareData.assetIds.map(async (assetId: string) => {
        try {
          const assetDoc = await adminDb.collection('media_assets').doc(assetId).get();
          if (assetDoc.exists) {
            const assetData = assetDoc.data();
            return {
              id: assetDoc.id,
              fileName: assetData?.fileName,
              fileType: assetData?.fileType,
              fileSize: assetData?.fileSize,
              downloadUrl: assetData?.downloadUrl,
              createdAt: assetData?.createdAt,
              // Nur öffentlich sichere Felder
            };
          }
          return null;
        } catch (error) {
          console.error(`Error loading asset ${assetId}:`, error);
          return null;
        }
      });

      const directAssets = await Promise.all(assetPromises);
      const validAssets = directAssets.filter(a => a !== null);
      allAssets.push(...validAssets);
    }

    // 3b. Load Assets from Folders (folderIds)
    if (shareData.folderIds && Array.isArray(shareData.folderIds) && shareData.folderIds.length > 0) {
      for (const folderId of shareData.folderIds) {
        try {
          const folderAssetsSnapshot = await adminDb
            .collection('media_assets')
            .where('folderId', '==', folderId)
            .get();

          const folderAssets = folderAssetsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              fileName: data.fileName,
              fileType: data.fileType,
              fileSize: data.fileSize,
              downloadUrl: data.downloadUrl,
              createdAt: data.createdAt,
            };
          });

          allAssets.push(...folderAssets);
        } catch (error) {
          console.error(`Error loading folder ${folderId}:`, error);
          // Continue with other folders
        }
      }
    }

    // 4. Deduplicate Assets (falls ein Asset direkt und in einem Ordner ist)
    const uniqueAssetsMap = new Map();
    allAssets.forEach(asset => {
      if (asset && asset.id) {
        uniqueAssetsMap.set(asset.id, asset);
      }
    });

    const finalAssets = Array.from(uniqueAssetsMap.values());

    // 5. Sort by createdAt (newest first)
    finalAssets.sort((a, b) => {
      const aTime = a.createdAt?.seconds || a.createdAt?._seconds || 0;
      const bTime = b.createdAt?.seconds || b.createdAt?._seconds || 0;
      return bTime - aTime;
    });

    return NextResponse.json(
      {
        assets: finalAssets,
        count: finalAssets.length,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error loading share assets:', error);
    return NextResponse.json(
      { error: 'Failed to load assets' },
      { status: 500 }
    );
  }
}
