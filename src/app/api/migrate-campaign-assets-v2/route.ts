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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/client-init';
import { mediaService } from '@/lib/firebase/media-service';

interface MigrationAsset {
  id: string;
  type: 'keyVisual' | 'attachment' | 'pdf';
  downloadUrl: string;
  fileName: string;
  targetFolder: 'Medien' | 'Pressemeldungen';
}

interface MigrationResult {
  success: boolean;
  migratedAssets: number;
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

    // 2. Assets sammeln
    log('📦 Sammle Campaign-Assets...');
    const assets: MigrationAsset[] = [];

    // Key Visual sammeln
    if (campaignData.keyVisual?.assetId) {
      try {
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
          log(`🖼️ Key Visual gefunden: ${data.fileName}`);
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
        where('campaignId', '==', campaignId),
        where('isDeleted', '==', false)
      );
      const pdfSnapshot = await getDocs(pdfQuery);

      pdfSnapshot.forEach((pdfDoc) => {
        const pdfData = pdfDoc.data();
        if (pdfData.downloadUrl && pdfData.fileName) {
          assets.push({
            id: pdfDoc.id,
            type: 'pdf',
            downloadUrl: pdfData.downloadUrl,
            fileName: pdfData.fileName,
            targetFolder: 'Pressemeldungen'
          });
          log(`📋 PDF gefunden: ${pdfData.fileName}`);
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
        migratedAssets: 0,
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
    const projectFolder = allFolders.find(folder => {
      const name = folder.name;
      return name.startsWith('P-') && name.includes(companyName) && name.includes(projectData.title);
    });

    if (!projectFolder) {
      throw new Error(`Projekt-Ordner nicht gefunden. Erwartet: P-{Datum}-${companyName}-${projectData.title}`);
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

    // 4. Assets migrieren
    log('🔄 Starte Asset-Migration...');
    let migratedCount = 0;

    for (const asset of assets) {
      try {
        log(`🔄 Migriere Asset: ${asset.fileName} (${asset.type})`);

        // Ziel-Ordner bestimmen
        let targetFolderId: string;
        if (asset.type === 'pdf' && pressemeldungenFolder) {
          targetFolderId = pressemeldungenFolder.id;
          log(`📋 PDF geht in Pressemeldungen-Ordner`);
        } else {
          targetFolderId = medienFolder.id;
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

        // Client SDK Upload (EXAKTE LOGIK wie dokumentiert)
        const timestamp = Date.now();
        const cleanFileName = asset.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `organizations/${organizationId}/media/${timestamp}_${cleanFileName}`;

        const storageRef = ref(storage, storagePath);
        const uploadMetadata = {
          contentType,
          customMetadata: {
            migratedFrom: asset.id,
            organizationId: organizationId,
            uploaded: new Date().toISOString()
          }
        };

        log(`📤 Upload nach Firebase Storage: ${storagePath}`);
        const snapshot = await uploadBytes(storageRef, arrayBuffer, uploadMetadata);
        const newDownloadUrl = await getDownloadURL(snapshot.ref);
        log(`✅ Upload erfolgreich: ${newDownloadUrl}`);

        // mediaService.uploadClientMedia simulieren (nur Firestore Entry)
        const newAsset = {
          id: snapshot.ref.name,
          fileName: cleanFileName,
          downloadUrl: newDownloadUrl,
          storageRef: storagePath,
          folderId: targetFolderId,
          clientId: campaignData.clientId,
          organizationId: organizationId,
          fileType: contentType,
          fileSize: arrayBuffer.byteLength,
          uploadedBy: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Firestore Updates (EXAKTE LOGIK aus .md Datei)
        log(`🔄 Aktualisiere Firestore-Referenzen...`);

        if (asset.type === 'keyVisual') {
          await updateDoc(doc(db, 'pr_campaigns', campaignId), {
            'keyVisual.assetId': newAsset.id,
            'keyVisual.url': newAsset.downloadUrl
          });
          log(`✅ Key Visual Referenz aktualisiert`);
        }

        if (asset.type === 'attachment') {
          const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
          const attachedAssets = campaignDoc.data()?.attachedAssets || [];

          const updatedAssets = attachedAssets.map((att: any) =>
            att.assetId === asset.id
              ? { ...att, assetId: newAsset.id }
              : att
          );

          await updateDoc(doc(db, 'pr_campaigns', campaignId), {
            attachedAssets: updatedAssets
          });
          log(`✅ Attached Asset Referenz aktualisiert`);
        }

        if (asset.type === 'pdf') {
          await updateDoc(doc(db, 'pdf_versions', asset.id), {
            downloadUrl: newAsset.downloadUrl,
            storageRef: newAsset.storageRef,
            folderId: newAsset.folderId,
            migratedAt: serverTimestamp()
          });
          log(`✅ PDF Version Referenz aktualisiert`);
        }

        migratedCount++;
        log(`✅ Asset erfolgreich migriert: ${asset.fileName}`);

      } catch (error) {
        const errorMsg = `Fehler bei Asset ${asset.fileName}: ${error}`;
        log(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    log(`🎉 Migration abgeschlossen: ${migratedCount}/${assets.length} Assets migriert`);

    return NextResponse.json({
      success: true,
      migratedAssets: migratedCount,
      errors,
      logs
    });

  } catch (error) {
    const errorMsg = `Migration fehlgeschlagen: ${error}`;
    log(`💥 ${errorMsg}`);

    return NextResponse.json({
      success: false,
      migratedAssets: 0,
      errors: [errorMsg],
      logs
    }, { status: 500 });
  }
}