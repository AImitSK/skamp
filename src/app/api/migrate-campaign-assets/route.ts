// src/app/api/migrate-campaign-assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface MigrateAssetsRequest {
  campaignId: string;
  projectId: string;
  organizationId: string;
  userId: string;
}

interface AssetToMigrate {
  type: 'keyVisual' | 'attachment' | 'pdf';
  assetId: string;
  targetFolder: 'Medien' | 'Pressemeldungen';
  downloadUrl?: string;
  fileName?: string;
}

interface MigrationResult {
  success: boolean;
  successCount: number;
  errors: Array<{
    assetId: string;
    error: string;
  }>;
  migratedAssets: Array<{
    originalId: string;
    newId: string;
    type: string;
  }>;
  logs: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse<MigrationResult>> {
  const logs: string[] = [];
  const log = (message: string) => {
    console.log(`🔄 [MIGRATION] ${message}`);
    logs.push(message);
  };

  try {
    log('🚀 Asset-Migration API gestartet');

    // Request-Body parsen
    let requestData: MigrateAssetsRequest;
    try {
      requestData = await request.json();
      log(`📥 Request erhalten: ${JSON.stringify(requestData)}`);
    } catch (parseError) {
      log(`❌ JSON-Parsing fehlgeschlagen: ${parseError}`);
      return NextResponse.json({
        success: false,
        successCount: 0,
        errors: [{ assetId: 'request', error: 'Ungültiges JSON-Format' }],
        migratedAssets: [],
        logs
      }, { status: 400 });
    }

    const { campaignId, projectId, organizationId, userId } = requestData;

    // Validierung
    if (!campaignId || !projectId || !organizationId || !userId) {
      log('❌ Pflichtfelder fehlen');
      return NextResponse.json({
        success: false,
        successCount: 0,
        errors: [{ assetId: 'validation', error: 'Pflichtfelder fehlen' }],
        migratedAssets: [],
        logs
      }, { status: 400 });
    }

    log(`✅ Validierung erfolgreich: Campaign=${campaignId}, Project=${projectId}`);

    // 1. Campaign-Daten laden
    log('📋 Lade Campaign-Daten...');
    const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
    if (!campaignDoc.exists()) {
      log(`❌ Campaign ${campaignId} nicht gefunden`);
      return NextResponse.json({
        success: false,
        successCount: 0,
        errors: [{ assetId: campaignId, error: 'Campaign nicht gefunden' }],
        migratedAssets: [],
        logs
      }, { status: 404 });
    }

    const campaign = { id: campaignDoc.id, ...campaignDoc.data() };
    log(`✅ Campaign geladen: ${campaign.title || campaign.id}`);

    // 2. Assets sammeln
    log('🔍 Sammle Campaign-Assets...');
    const assets: AssetToMigrate[] = [];

    // Key Visual sammeln
    if (campaign.keyVisual?.assetId) {
      log(`🖼️ Prüfe Key Visual: ${campaign.keyVisual.assetId}`);
      try {
        const keyVisualDoc = await getDoc(doc(db, 'media_assets', campaign.keyVisual.assetId));
        if (keyVisualDoc.exists()) {
          const data = keyVisualDoc.data();
          assets.push({
            type: 'keyVisual',
            assetId: campaign.keyVisual.assetId,
            targetFolder: 'Medien',
            downloadUrl: data.downloadUrl,
            fileName: data.fileName
          });
          log(`✅ Key Visual Asset gefunden: ${data.fileName}`);
        } else {
          log(`⚠️ Key Visual Asset ${campaign.keyVisual.assetId} nicht in Firestore gefunden`);
        }
      } catch (error) {
        log(`❌ Fehler beim Laden des Key Visuals: ${error}`);
      }
    }

    // Media Attachments sammeln
    if (campaign.attachedAssets && campaign.attachedAssets.length > 0) {
      log(`📎 Prüfe ${campaign.attachedAssets.length} Attachments...`);
      for (const attachment of campaign.attachedAssets) {
        if (attachment.assetId) {
          try {
            const attachmentDoc = await getDoc(doc(db, 'media_assets', attachment.assetId));
            if (attachmentDoc.exists()) {
              const data = attachmentDoc.data();
              assets.push({
                type: 'attachment',
                assetId: attachment.assetId,
                targetFolder: 'Medien',
                downloadUrl: data.downloadUrl,
                fileName: data.fileName
              });
              log(`✅ Attachment gefunden: ${data.fileName}`);
            } else {
              log(`⚠️ Attachment ${attachment.assetId} nicht in Firestore gefunden`);
            }
          } catch (error) {
            log(`❌ Fehler beim Laden des Attachments ${attachment.assetId}: ${error}`);
          }
        }
      }
    }

    // PDF Versionen sammeln
    log('📄 Suche PDF-Versionen...');
    try {
      const pdfQuery = query(
        collection(db, 'pdf_versions'),
        where('campaignId', '==', campaignId)
      );
      const pdfSnapshot = await getDocs(pdfQuery);

      pdfSnapshot.forEach((pdfDoc) => {
        const pdfData = pdfDoc.data();
        assets.push({
          type: 'pdf',
          assetId: pdfDoc.id,
          targetFolder: 'Pressemeldungen',
          downloadUrl: pdfData.downloadUrl,
          fileName: pdfData.fileName || `${campaign.title}.pdf`
        });
        log(`✅ PDF gefunden: ${pdfData.fileName || pdfDoc.id}`);
      });
    } catch (error) {
      log(`❌ Fehler beim Laden der PDF-Versionen: ${error}`);
    }

    log(`📊 Gesammelte Assets: ${assets.length}`);
    if (assets.length === 0) {
      log('ℹ️ Keine Assets zum Migrieren gefunden');
      return NextResponse.json({
        success: true,
        successCount: 0,
        errors: [],
        migratedAssets: [],
        logs
      });
    }

    // 3. Projekt-Ordner finden oder erstellen
    log('📁 Suche/Erstelle Projekt-Ordner...');
    let projectFolder: any;

    try {
      // Suche nach dem Projekt-Ordner
      const foldersQuery = query(
        collection(db, 'folders'),
        where('organizationId', '==', organizationId),
        where('name', '==', projectId),
        where('isDeleted', '==', false)
      );
      const foldersSnapshot = await getDocs(foldersQuery);

      if (!foldersSnapshot.empty) {
        projectFolder = {
          id: foldersSnapshot.docs[0].id,
          ...foldersSnapshot.docs[0].data()
        };
        log(`✅ Projekt-Ordner gefunden: ${projectFolder.id}`);
      } else {
        // Projekt-Ordner erstellen
        log('📁 Erstelle neuen Projekt-Ordner...');
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
          const projectName = projectDoc.data().title || projectId;
          const folderRef = doc(collection(db, 'folders'));
          const folderData = {
            organizationId,
            name: projectName,
            parentId: null,
            isDeleted: false,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(folderRef, folderData);
          projectFolder = { id: folderRef.id, ...folderData };
          log(`✅ Projekt-Ordner erstellt: ${folderRef.id} (${projectName})`);
        } else {
          throw new Error(`Projekt ${projectId} nicht gefunden`);
        }
      }
    } catch (error) {
      log(`❌ Fehler beim Projekt-Ordner: ${error}`);
      return NextResponse.json({
        success: false,
        successCount: 0,
        errors: [{ assetId: projectId, error: `Projekt-Ordner Fehler: ${error}` }],
        migratedAssets: [],
        logs
      }, { status: 500 });
    }

    // 4. Assets migrieren
    log('🔄 Starte Asset-Migration...');
    let successCount = 0;
    const errors: Array<{ assetId: string; error: string }> = [];
    const migratedAssets: Array<{ originalId: string; newId: string; type: string }> = [];

    for (const asset of assets) {
      try {
        log(`🔄 Migriere Asset ${asset.assetId} (${asset.type})...`);

        // Ziel-Ordner finden oder erstellen
        log(`📁 Suche/Erstelle Ziel-Ordner: ${asset.targetFolder}`);
        let targetFolder: any;
        const targetFoldersQuery = query(
          collection(db, 'folders'),
          where('organizationId', '==', organizationId),
          where('parentId', '==', projectFolder.id),
          where('name', '==', asset.targetFolder),
          where('isDeleted', '==', false)
        );
        const targetFoldersSnapshot = await getDocs(targetFoldersQuery);

        if (!targetFoldersSnapshot.empty) {
          targetFolder = {
            id: targetFoldersSnapshot.docs[0].id,
            ...targetFoldersSnapshot.docs[0].data()
          };
          log(`✅ Ziel-Ordner gefunden: ${targetFolder.id}`);
        } else {
          // Erstelle Ziel-Ordner
          const targetFolderRef = doc(collection(db, 'folders'));
          const targetFolderData = {
            organizationId,
            name: asset.targetFolder,
            parentId: projectFolder.id,
            isDeleted: false,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(targetFolderRef, targetFolderData);
          targetFolder = { id: targetFolderRef.id, ...targetFolderData };
          log(`✅ Ziel-Ordner erstellt: ${targetFolderRef.id} (${asset.targetFolder})`);
        }

        // Server-seitiger Download der Datei
        if (!asset.downloadUrl) {
          throw new Error(`Keine Download-URL für Asset ${asset.assetId}`);
        }

        log(`📥 Lade Datei server-seitig: ${asset.downloadUrl}`);

        // Validierung: Nur Firebase Storage URLs erlauben
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

        // Asset-spezifische Migration
        let newAssetId: string;

        if (asset.type === 'pdf') {
          // PDFs: Update existing document
          newAssetId = asset.assetId;

          log(`📄 Aktualisiere PDF-Version: ${asset.assetId}`);
          await updateDoc(doc(db, 'pdf_versions', asset.assetId), {
            folderId: targetFolder.id,
            migratedAt: serverTimestamp(),
            isMigrated: true,
            fileSize: fileSize,
            contentType: contentType
          });

          log(`✅ PDF-Version aktualisiert: ${asset.assetId}`);

        } else {
          // Media Assets: Create new document
          const newAssetRef = doc(collection(db, 'media_assets'));
          newAssetId = newAssetRef.id;

          log(`🖼️ Erstelle neues Media Asset: ${newAssetId}`);

          // Lade Original-Asset Daten
          const originalAssetDoc = await getDoc(doc(db, 'media_assets', asset.assetId));
          if (!originalAssetDoc.exists()) {
            throw new Error(`Original Asset ${asset.assetId} nicht gefunden`);
          }
          const originalAssetData = originalAssetDoc.data();

          const newAssetData = {
            id: newAssetRef.id,
            fileName: asset.fileName || originalAssetData.fileName || `asset_${asset.assetId}`,
            fileType: originalAssetData.fileType || contentType,
            folderId: targetFolder.id,
            organizationId,
            clientId: campaign.clientId || '',
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            migratedFrom: asset.assetId,
            isMigrated: true,
            downloadUrl: asset.downloadUrl, // Temporär - wird durch Upload ersetzt
            fileSize: fileSize,
            contentType: contentType,
            base64Data: base64Data, // Für Client-Upload
            needsClientUpload: true
          };

          // Füge optionale Felder hinzu
          if (originalAssetData.description) newAssetData.description = originalAssetData.description;
          if (originalAssetData.tags) newAssetData.tags = originalAssetData.tags;
          if (originalAssetData.metadata) newAssetData.metadata = originalAssetData.metadata;

          await setDoc(newAssetRef, newAssetData);
          log(`✅ Neues Media Asset erstellt: ${newAssetId}`);

          // Campaign-Referenzen aktualisieren
          log(`🔗 Aktualisiere Campaign-Referenzen für ${asset.type}...`);
          const batch = writeBatch(db);

          if (asset.type === 'keyVisual') {
            const campaignRef = doc(db, 'pr_campaigns', campaignId);
            batch.update(campaignRef, {
              keyVisual: {
                assetId: newAssetId,
                url: asset.downloadUrl
              },
              updatedAt: serverTimestamp()
            });
            log(`✅ Key Visual Referenz aktualisiert`);

          } else if (asset.type === 'attachment') {
            const updatedAttachments = campaign.attachedAssets?.map((att: any) =>
              att.assetId === asset.assetId
                ? { ...att, assetId: newAssetId }
                : att
            ) || [];

            batch.update(doc(db, 'pr_campaigns', campaignId), {
              attachedAssets: updatedAttachments,
              updatedAt: serverTimestamp()
            });
            log(`✅ Attachment Referenz aktualisiert`);
          }

          // Original Asset als migriert markieren
          const oldAssetRef = doc(db, 'media_assets', asset.assetId);
          batch.update(oldAssetRef, {
            migratedToId: newAssetId,
            migratedAt: serverTimestamp()
          });

          await batch.commit();
          log(`✅ Firestore-Referenzen committed`);
        }

        successCount++;
        migratedAssets.push({
          originalId: asset.assetId,
          newId: newAssetId,
          type: asset.type
        });

        log(`✅ Asset ${asset.assetId} erfolgreich migriert zu ${newAssetId}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`❌ Fehler bei Asset ${asset.assetId}: ${errorMessage}`);
        errors.push({
          assetId: asset.assetId,
          error: errorMessage
        });
      }
    }

    log(`🎉 Migration abgeschlossen: ${successCount}/${assets.length} erfolgreich`);

    return NextResponse.json({
      success: errors.length === 0,
      successCount,
      errors,
      migratedAssets,
      logs
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`💥 Unerwarteter Fehler: ${errorMessage}`);

    return NextResponse.json({
      success: false,
      successCount: 0,
      errors: [{ assetId: 'api', error: errorMessage }],
      migratedAssets: [],
      logs
    }, { status: 500 });
  }
}

// OPTIONS handler für CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}