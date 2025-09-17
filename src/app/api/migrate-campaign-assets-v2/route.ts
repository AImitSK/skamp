// src/app/api/migrate-campaign-assets-v2/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { mediaService } from '@/lib/firebase/media-service';

interface MigrationAsset {
  id: string;
  type: 'keyVisual' | 'attachment' | 'pdf';
  downloadUrl: string;
  fileName: string;
  targetFolder: 'Medien' | 'Pressemeldungen';
}

interface PreparedAsset {
  id: string;
  type: 'keyVisual' | 'attachment' | 'pdf';
  fileName: string;
  targetFolderId: string;
  contentType: string;
  base64Data: string;
  fileSize: number;
}

interface MigrationResult {
  success: boolean;
  preparedAssets: PreparedAsset[];
  errors: string[];
  logs: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<MigrationResult>> {
  const logs: string[] = [];
  const errors: string[] = [];

  const log = (message: string) => {
    console.log(`[Migration] ${message}`);
    logs.push(message);
  };

  try {
    const { campaignId, projectId, organizationId, userId } = await request.json();

    log(`🚀 Migration gestartet: Campaign=${campaignId}, Project=${projectId}`);

    // 1. Campaign-Daten laden
    log('📋 Lade Campaign-Daten...');
    const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
    if (!campaignDoc.exists()) {
      throw new Error(`Campaign ${campaignId} nicht gefunden`);
    }
    const campaignData = campaignDoc.data();
    log(`✅ Campaign geladen: ${campaignData.title}`);

    // Debug: Campaign-Struktur anzeigen
    log(`🔍 Campaign-Struktur: keyVisual=${JSON.stringify(campaignData.keyVisual)}, attachedAssets=${campaignData.attachedAssets?.length || 0}`);

    // 2. Assets sammeln
    log('📦 Sammle Campaign-Assets...');
    const assets: MigrationAsset[] = [];

    // Key Visual sammeln (kann URL oder assetId haben)
    if (campaignData.keyVisual) {
      try {
        if (campaignData.keyVisual.url) {
          // Key Visual hat direkte URL (neue Struktur)
          const fileName = campaignData.keyVisual.url.split('/').pop()?.split('?')[0] || 'key-visual.jpg';
          assets.push({
            id: 'keyVisual-direct-url',
            type: 'keyVisual',
            downloadUrl: campaignData.keyVisual.url,
            fileName: fileName,
            targetFolder: 'Medien'
          });
          log(`🖼️ Key Visual gefunden (URL): ${fileName}`);
        } else if (campaignData.keyVisual.assetId) {
          // Key Visual mit Asset ID (alte Struktur)
          const keyVisualDoc = await getDoc(doc(db, 'media_assets', campaignData.keyVisual.assetId));
          if (keyVisualDoc.exists()) {
            const data = keyVisualDoc.data();
            assets.push({
              id: campaignData.keyVisual.assetId,
              type: 'keyVisual',
              downloadUrl: data.downloadUrl,
              fileName: data.fileName || 'keyvisual.jpg',
              targetFolder: 'Medien'
            });
            log(`🖼️ Key Visual gefunden (Asset): ${data.fileName}`);
          }
        }
      } catch (error) {
        log(`⚠️ Key Visual konnte nicht geladen werden: ${error}`);
      }
    }

    // Attached Assets sammeln
    if (campaignData.attachedAssets?.length > 0) {
      log(`📎 Prüfe ${campaignData.attachedAssets.length} Attached Assets...`);

      for (const attachment of campaignData.attachedAssets) {
        if (attachment.assetId) {
          try {
            const assetDoc = await getDoc(doc(db, 'media_assets', attachment.assetId));
            if (assetDoc.exists()) {
              const data = assetDoc.data();
              assets.push({
                id: attachment.assetId,
                type: 'attachment',
                downloadUrl: data.downloadUrl,
                fileName: data.fileName || 'attachment.jpg',
                targetFolder: 'Medien'
              });
              log(`📄 Attached Asset gefunden: ${data.fileName}`);
            }
          } catch (error) {
            log(`⚠️ Attached Asset ${attachment.assetId} konnte nicht geladen werden: ${error}`);
          }
        }
      }
    }

    // PDF-Versionen sammeln
    try {
      log('📚 Suche PDF-Versionen...');
      const pdfQuery = query(
        collection(db, 'pdf_versions'),
        where('campaignId', '==', campaignId)
      );
      const pdfSnapshot = await getDocs(pdfQuery);
      log(`📊 PDF Query ergab ${pdfSnapshot.size} Dokumente`);

      pdfSnapshot.forEach((pdfDoc) => {
        const pdfData = pdfDoc.data();
        log(`📄 PDF-Dokument: ${pdfDoc.id}, Daten: ${JSON.stringify(pdfData)}`);

        if (pdfData.downloadUrl && pdfData.fileName) {
          assets.push({
            id: pdfDoc.id,
            type: 'pdf',
            downloadUrl: pdfData.downloadUrl,
            fileName: pdfData.fileName,
            targetFolder: 'Pressemeldungen'
          });
          log(`📋 PDF gefunden: ${pdfData.fileName}`);
        } else {
          log(`⚠️ PDF übersprungen - fehlende Daten: downloadUrl=${pdfData.downloadUrl}, fileName=${pdfData.fileName}`);
        }
      });
    } catch (error) {
      log(`⚠️ Fehler beim Laden der PDF-Versionen: ${error}`);
    }

    log(`📊 Gesammelte Assets: ${assets.length}`);

    if (assets.length === 0) {
      log('ℹ️ Keine Assets zum Migrieren gefunden');
      return NextResponse.json({
        success: true,
        preparedAssets: [],
        errors: [],
        logs
      });
    }

    // 3. Projekt-Ordner finden (EXAKTE LOGIK aus .md Datei)
    log('📁 Suche Projekt-Ordner mit dokumentierter Logik...');

    // Projekt-Daten laden
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      throw new Error(`Project ${projectId} nicht gefunden`);
    }
    const projectData = projectDoc.data();
    log(`📝 Projekt: ${projectData.title}`);

    // Company-Name laden
    let companyName = 'Unbekannt';
    if (projectData.customer?.id) {
      try {
        const companyDoc = await getDoc(doc(db, 'companies', projectData.customer.id));
        if (companyDoc.exists()) {
          companyName = companyDoc.data().name;
          log(`🏢 Company: ${companyName}`);
        }
      } catch (error) {
        log(`⚠️ Company konnte nicht geladen werden: ${error}`);
      }
    }

    // Alle Ordner laden
    const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);
    log(`📂 Alle Ordner geladen: ${allFolders.length}`);

    // Projekt-Hauptordner finden: P-{Datum}-{Company}-{Title}
    let projectFolder = allFolders.find(folder => {
      const name = folder.name;
      return name.startsWith('P-') && name.includes(companyName) && name.includes(projectData.title);
    });

    // Fallback 1: Nur nach Projekt-Titel suchen (wenn keine Company)
    if (!projectFolder && companyName === 'Unbekannt') {
      log(`⚠️ Kein Company-Name gefunden, suche nur nach Projekt-Titel...`);
      projectFolder = allFolders.find(folder => {
        const name = folder.name;
        return name.startsWith('P-') && name.includes(projectData.title);
      });
    }

    // Fallback 2: Suche nach Projekt-ID in assetFolders
    if (!projectFolder && projectData.assetFolders?.length > 0) {
      log(`⚠️ Verwende assetFolders aus Projekt-Document...`);
      const mainFolderId = projectData.assetFolders.find((f: any) => f.type === 'main')?.id;
      if (mainFolderId) {
        projectFolder = allFolders.find(folder => folder.id === mainFolderId);
      }
    }

    if (!projectFolder) {
      // Debug: Zeige alle P- Ordner
      const projectFolders = allFolders.filter(f => f.name.startsWith('P-'));
      log(`🔍 Verfügbare P- Ordner: ${projectFolders.map(f => f.name).join(', ')}`);

      throw new Error(`Projekt-Ordner nicht gefunden. Gesucht: P-*-*-${projectData.title}`);
    }
    log(`✅ Projekt-Ordner gefunden: ${projectFolder.name}`);

    // Medien-Ordner finden
    const medienFolder = allFolders.find(folder =>
      folder.parentFolderId === projectFolder.id &&
      folder.name === 'Medien' &&
      (projectData.customer?.id ? folder.clientId === projectData.customer.id : true)
    );

    if (!medienFolder) {
      throw new Error(`Medien-Ordner nicht gefunden in Projekt ${projectFolder.name}`);
    }
    log(`✅ Medien-Ordner gefunden: ${medienFolder.id}`);

    // Pressemeldungen-Ordner finden (für PDFs)
    const pressemeldungenFolder = allFolders.find(folder =>
      folder.parentFolderId === projectFolder.id &&
      folder.name === 'Pressemeldungen' &&
      (projectData.customer?.id ? folder.clientId === projectData.customer.id : true)
    );

    if (!pressemeldungenFolder) {
      log(`⚠️ Pressemeldungen-Ordner nicht gefunden - PDFs gehen in Medien-Ordner`);
    } else {
      log(`✅ Pressemeldungen-Ordner gefunden: ${pressemeldungenFolder.id}`);
    }

    // 4. Assets vorbereiten für Client-Upload
    log('🔄 Bereite Assets für Client-Upload vor...');
    const preparedAssets: PreparedAsset[] = [];

    for (const asset of assets) {
      try {
        log(`🔄 Migriere Asset: ${asset.fileName} (${asset.type})`);

        // Ziel-Ordner bestimmen
        let targetFolderId: string;
        if (asset.type === 'pdf' && pressemeldungenFolder) {
          targetFolderId = pressemeldungenFolder.id!;
          log(`📋 PDF geht in Pressemeldungen-Ordner`);
        } else {
          targetFolderId = medienFolder.id!;
          log(`📄 Asset geht in Medien-Ordner`);
        }

        // Server-seitiger Download (CORS-Umgehung)
        log(`📥 Server-seitiger Download: ${asset.downloadUrl}`);

        if (!asset.downloadUrl.includes('firebasestorage.googleapis.com')) {
          throw new Error(`Ungültige URL: ${asset.downloadUrl}`);
        }

        const response = await fetch(asset.downloadUrl);
        if (!response.ok) {
          throw new Error(`Download fehlgeschlagen: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        log(`✅ Datei geladen: ${arrayBuffer.byteLength} bytes, ${contentType}`);

        // Server kann nicht zu Storage uploaden (keine Auth)
        // Gebe Daten zur Client-seitigen Verarbeitung zurück
        log(`📦 Asset vorbereitet für Client-Upload`);

        // Base64 encode für Transfer zum Client
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        const preparedAsset = {
          id: asset.id,
          type: asset.type,
          fileName: asset.fileName,
          targetFolderId,
          contentType,
          base64Data,
          fileSize: arrayBuffer.byteLength
        };

        // Speichere für Client-Upload
        preparedAssets.push(preparedAsset);
        log(`✅ Asset vorbereitet: ${asset.fileName}`);

      } catch (error) {
        const errorMsg = `Fehler bei Asset ${asset.fileName}: ${error}`;
        log(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    log(`🎉 Vorbereitung abgeschlossen: ${preparedAssets.length}/${assets.length} Assets bereit für Upload`);

    return NextResponse.json({
      success: true,
      preparedAssets,
      errors,
      logs
    });

  } catch (error) {
    const errorMsg = `Migration fehlgeschlagen: ${error}`;
    log(`💥 ${errorMsg}`);

    return NextResponse.json({
      success: false,
      preparedAssets: [],
      errors: [errorMsg],
      logs
    }, { status: 500 });
  }
}