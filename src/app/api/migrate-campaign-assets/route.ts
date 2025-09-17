// src/app/api/migrate-campaign-assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface MigrationAsset {
  assetId: string;
  type: 'attachment' | 'pdf';
  fileName: string;
  downloadUrl: string;
  targetFolder: string;
}

interface MigrationData {
  assetId: string;
  type: 'attachment' | 'pdf';
  downloadUrl: string;
  fileName: string;
  storagePath: string;
  targetFolderId: string;
  fileData: string; // Base64 encoded file data
  contentType: string;
  fileSize: number;
  metadata: {
    organizationId: string;
    folderId: string;
    migratedFrom: string;
    uploaded: string;
  };
}

interface MigrationResult {
  success: boolean;
  projectFolderId: string;
  migrationAssets: MigrationData[];
  logs: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<MigrationResult>> {
  const logs: string[] = [];
  const log = (message: string) => {
    console.log(message);
    logs.push(message);
  };

  try {
    log('🚀 Asset-Migration API gestartet');

    const body = await request.json();
    const { campaignId, projectId, organizationId, userId } = body;

    log(`📥 Request erhalten: ${JSON.stringify(body)}`);

    // Validierung
    if (!campaignId || !projectId || !organizationId || !userId) {
      throw new Error('Fehlende Parameter: campaignId, projectId, organizationId, userId sind erforderlich');
    }

    log(`✅ Validierung erfolgreich: Campaign=${campaignId}, Project=${projectId}`);

    // 1. Campaign-Daten laden
    log('📋 Lade Campaign-Daten...');
    const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
    if (!campaignDoc.exists()) {
      throw new Error(`Campaign ${campaignId} nicht gefunden`);
    }
    const campaignData = campaignDoc.data();
    log(`✅ Campaign geladen: ${campaignData.title}`);

    // 2. Assets sammeln
    log('🔍 Sammle Campaign-Assets...');
    const assets: MigrationAsset[] = [];

    // Key Visual sammeln
    if (campaignData.keyVisual?.assetId) {
      log(`🖼️ Prüfe Key Visual: ${campaignData.keyVisual.assetId}`);
      try {
        const keyVisualDoc = await getDoc(doc(db, 'media_assets', campaignData.keyVisual.assetId));
        if (keyVisualDoc.exists()) {
          const data = keyVisualDoc.data();
          assets.push({
            assetId: campaignData.keyVisual.assetId,
            type: 'attachment',
            fileName: data.fileName || 'keyvisual.jpg',
            downloadUrl: data.downloadUrl,
            targetFolder: 'Medien'
          });
          log(`✅ Key Visual gefunden: ${data.fileName}`);
        }
      } catch (error) {
        log(`❌ Fehler beim Laden des Key Visuals: ${error}`);
      }
    }

    // Attached Assets sammeln
    if (campaignData.attachedAssets && campaignData.attachedAssets.length > 0) {
      log(`📎 Prüfe ${campaignData.attachedAssets.length} Attached Assets...`);

      for (const attachment of campaignData.attachedAssets) {
        if (attachment.assetId) {
          try {
            const attachmentDoc = await getDoc(doc(db, 'media_assets', attachment.assetId));
            if (attachmentDoc.exists()) {
              const data = attachmentDoc.data();
              assets.push({
                assetId: attachment.assetId,
                type: 'attachment',
                fileName: data.fileName || 'attachment.jpg',
                downloadUrl: data.downloadUrl,
                targetFolder: 'Medien'
              });
              log(`✅ Attached Asset gefunden: ${data.fileName}`);
            }
          } catch (error) {
            log(`❌ Fehler beim Laden des Attachments ${attachment.assetId}: ${error}`);
          }
        }
      }
    }

    // PDF Versionen sammeln
    try {
      log('📄 Suche PDF-Versionen...');
      const pdfQuery = query(
        collection(db, 'pdf_versions'),
        where('campaignId', '==', campaignId),
        where('isDeleted', '==', false)
      );
      const pdfSnapshot = await getDocs(pdfQuery);

      pdfSnapshot.forEach((pdfDoc) => {
        const pdfData = pdfDoc.data();
        if (pdfData.downloadUrl && pdfData.fileName) {
          assets.push({
            assetId: pdfDoc.id,
            type: 'pdf',
            fileName: pdfData.fileName,
            downloadUrl: pdfData.downloadUrl,
            targetFolder: 'Pressemeldungen'
          });
          log(`✅ PDF gefunden: ${pdfData.fileName}`);
        }
      });
    } catch (error) {
      log(`❌ Fehler beim Laden der PDF-Versionen: ${error}`);
    }

    log(`📊 Gesammelte Assets: ${assets.length}`);
    if (assets.length === 0) {
      log('ℹ️ Keine Assets zum Migrieren gefunden');
      return NextResponse.json({
        success: true,
        projectFolderId: '',
        migrationAssets: [],
        logs
      });
    }

    // 3. Projekt-Ordner finden oder erstellen
    log('📁 Suche/Erstelle Projekt-Ordner...');
    let projectFolder: any;

    try {
      // Suche nach dem Projekt-Ordner anhand des Project Docs
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        throw new Error(`Project ${projectId} nicht gefunden`);
      }
      const projectData = projectDoc.data();

      const foldersQuery = query(
        collection(db, 'media_folders'),
        where('organizationId', '==', organizationId),
        where('name', '==', projectData.title),
        where('isDeleted', '==', false)
      );
      const foldersSnapshot = await getDocs(foldersQuery);

      if (!foldersSnapshot.empty) {
        projectFolder = { id: foldersSnapshot.docs[0].id, ...foldersSnapshot.docs[0].data() };
        log(`✅ Projekt-Ordner gefunden: ${projectFolder.id}`);
      } else {
        // Erstelle Projekt-Ordner
        log('📁 Erstelle neuen Projekt-Ordner...');
        const projectFolderRef = doc(collection(db, 'media_folders'));
        const projectFolderData = {
          organizationId,
          name: projectData.title,
          parentFolderId: null,
          isDeleted: false,
          createdBy: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(projectFolderRef, projectFolderData);
        projectFolder = { id: projectFolderRef.id, ...projectFolderData };
        log(`✅ Projekt-Ordner erstellt: ${projectFolderRef.id} (${projectData.title})`);
      }
    } catch (error) {
      throw new Error(`Fehler beim Erstellen des Projekt-Ordners: ${error}`);
    }

    // 4. Ziel-Ordner für Assets erstellen/finden und Migration-Daten vorbereiten
    log('🔄 Bereite Asset-Migration vor...');
    const migrationAssets: MigrationData[] = [];

    for (const asset of assets) {
      try {
        log(`🔄 Bereite Asset ${asset.assetId} (${asset.type}) vor...`);

        // Ziel-Ordner finden/erstellen
        log(`📁 Suche/Erstelle Ziel-Ordner: ${asset.targetFolder}`);
        let targetFolder: any;

        const targetFoldersQuery = query(
          collection(db, 'media_folders'),
          where('organizationId', '==', organizationId),
          where('name', '==', asset.targetFolder),
          where('parentFolderId', '==', projectFolder.id),
          where('isDeleted', '==', false)
        );
        const targetFoldersSnapshot = await getDocs(targetFoldersQuery);

        if (!targetFoldersSnapshot.empty) {
          targetFolder = { id: targetFoldersSnapshot.docs[0].id, ...targetFoldersSnapshot.docs[0].data() };
          log(`✅ Ziel-Ordner gefunden: ${targetFolder.id}`);
        } else {
          const targetFolderRef = doc(collection(db, 'media_folders'));
          const targetFolderData = {
            organizationId,
            name: asset.targetFolder,
            parentFolderId: projectFolder.id,
            isDeleted: false,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(targetFolderRef, targetFolderData);
          targetFolder = { id: targetFolderRef.id, ...targetFolderData };
          log(`✅ Ziel-Ordner erstellt: ${targetFolderRef.id} (${asset.targetFolder})`);
        }

        // Server-seitiger Download für CORS-Umgehung
        log(`📥 Lade Datei server-seitig: ${asset.downloadUrl}`);

        if (!asset.downloadUrl.includes('firebasestorage.googleapis.com')) {
          throw new Error(`Ungültige URL (nur Firebase Storage erlaubt): ${asset.downloadUrl}`);
        }

        const response = await fetch(asset.downloadUrl);
        if (!response.ok) {
          throw new Error(`Download fehlgeschlagen: ${response.statusText} (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const fileSize = arrayBuffer.byteLength;

        log(`✅ Datei geladen: ${fileSize} bytes, Content-Type: ${contentType}`);

        // Migration-Daten vorbereiten
        const cleanFileName = asset.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();

        let storagePath: string;
        if (asset.type === 'pdf') {
          storagePath = `organizations/${organizationId}/media/Kategorien/${timestamp}_${cleanFileName}`;
        } else {
          storagePath = `organizations/${organizationId}/media/${timestamp}_${cleanFileName}`;
        }

        const migrationData: MigrationData = {
          assetId: asset.assetId,
          type: asset.type,
          downloadUrl: asset.downloadUrl,
          fileName: cleanFileName,
          storagePath: storagePath,
          targetFolderId: targetFolder.id,
          fileData: base64Data,
          contentType: contentType,
          fileSize: fileSize,
          metadata: {
            organizationId: organizationId,
            folderId: targetFolder.id,
            migratedFrom: asset.assetId,
            uploaded: new Date().toISOString()
          }
        };

        migrationAssets.push(migrationData);
        log(`✅ Asset-Migration-Daten vorbereitet: ${asset.assetId}`);

      } catch (error) {
        log(`❌ Fehler bei Asset ${asset.assetId}: ${error}`);
        throw error;
      }
    }

    // 5. Project-Campaign Linking (falls noch nicht vorhanden)
    log('🔗 Aktualisiere Projekt-Collection mit Campaign-Referenz...');
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (projectDoc.exists()) {
      const projectData = projectDoc.data();
      const linkedCampaigns = projectData.linkedCampaigns || [];

      if (!linkedCampaigns.includes(campaignId)) {
        await updateDoc(projectRef, {
          linkedCampaigns: arrayUnion(campaignId),
          updatedAt: serverTimestamp()
        });
        log(`✅ Campaign ${campaignId} zu Project linkedCampaigns hinzugefügt`);
      } else {
        log(`ℹ️ Campaign ${campaignId} bereits in linkedCampaigns vorhanden`);
      }
    }

    log(`🎉 Asset-Migration-Vorbereitung abgeschlossen: ${migrationAssets.length} Assets bereit`);

    return NextResponse.json({
      success: true,
      projectFolderId: projectFolder.id,
      migrationAssets,
      logs
    });

  } catch (error) {
    log(`💥 Kritischer Fehler: ${error}`);
    console.error('Migration API Fehler:', error);

    return NextResponse.json({
      success: false,
      projectFolderId: '',
      migrationAssets: [],
      logs: [...logs, `Fehler: ${error}`]
    }, { status: 500 });
  }
}