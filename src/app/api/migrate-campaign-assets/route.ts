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

    // 3. Projekt-Ordner finden (verwende ECHTE project-service.ts Logik)
    log('📁 Suche Projekt-Ordner mit project-service.ts Pattern...');
    let projectFolder: any;
    let medienFolder: any;

    try {
      // Projekt-Daten laden
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        throw new Error(`Project ${projectId} nicht gefunden`);
      }
      const projectData = projectDoc.data();
      log(`📝 Projekt-Daten: ${projectData.title}, Customer: ${projectData.customer?.name}`);

      // Company/Client-Name laden wenn verfügbar
      let companyName = 'Unbekannt';
      if (projectData.customer?.id) {
        try {
          const companyDoc = await getDoc(doc(db, 'companies', projectData.customer.id));
          if (companyDoc.exists()) {
            companyName = companyDoc.data().name;
            log(`📝 Company geladen: ${companyName}`);
          }
        } catch (error) {
          log(`⚠️ Company konnte nicht geladen werden: ${error}`);
        }
      }

      // ✅ ECHTE LOGIK: Projekt-Ordner-Pattern aus project-service.ts
      // Pattern: P-{Datum}-{Company}-{Projekt}
      // Alle Ordner der Organisation laden
      const allFoldersQuery = query(
        collection(db, 'media_folders'),
        where('organizationId', '==', organizationId),
        where('isDeleted', '==', false)
      );
      const allFoldersSnapshot = await getDocs(allFoldersQuery);
      const allFolders = allFoldersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      log(`📁 Alle Ordner geladen: ${allFolders.length}`);

      // 2. Projekt-Hauptordner finden - ECHTE project-service Logik
      // Suche nach Pattern P-{Datum}-{Company}-{Title}
      projectFolder = allFolders.find(folder => {
        const name = folder.name;
        const hasPattern = name.startsWith('P-') && name.includes(companyName) && name.includes(projectData.title);
        const hasClientId = projectData.customer?.id ? folder.clientId === projectData.customer.id : true;
        return hasPattern && hasClientId;
      });

      if (!projectFolder) {
        // Fallback: Suche nur nach Company und Title (ohne Datum-Validierung)
        projectFolder = allFolders.find(folder => {
          const name = folder.name;
          return name.startsWith('P-') && name.includes(companyName) && name.includes(projectData.title);
        });
      }

      if (projectFolder) {
        log(`✅ Projekt-Ordner gefunden: ${projectFolder.name} (${projectFolder.id})`);

        // 3. Medien-Unterordner finden - ECHTE project-service Logik
        medienFolder = allFolders.find(folder =>
          folder.parentFolderId === projectFolder.id &&
          folder.name === 'Medien' &&
          (projectData.customer?.id ? folder.clientId === projectData.customer.id : true)
        );

        if (medienFolder) {
          log(`✅ Medien-Ordner gefunden: ${medienFolder.name} (${medienFolder.id})`);
        } else {
          log(`⚠️ Medien-Ordner nicht gefunden, suche andere Unterordner...`);

          // Debug: Zeige alle Unterordner des Projekt-Ordners
          const subfolders = allFolders.filter(folder => folder.parentFolderId === projectFolder.id);
          log(`📂 Verfügbare Unterordner: ${subfolders.map(f => f.name).join(', ')}`);

          throw new Error(`Medien-Ordner nicht gefunden in Projekt ${projectFolder.name}`);
        }
      } else {
        log(`❌ Kein Projekt-Ordner gefunden mit Pattern P-{Datum}-${companyName}-${projectData.title}`);

        // Debug: Zeige alle P- Ordner
        const projectFolders = allFolders.filter(f => f.name.startsWith('P-'));
        log(`🔍 Verfügbare P- Ordner: ${projectFolders.map(f => f.name).join(', ')}`);

        throw new Error(`Projekt-Ordner nicht gefunden. Erwartet: P-{Datum}-${companyName}-${projectData.title}`);
      }
    } catch (error) {
      throw new Error(`Fehler beim Finden der Projekt-Ordner: ${error}`);
    }

    // 4. Asset-Migration direkt in Medien-Ordner
    log('🔄 Bereite Asset-Migration vor - alle Assets gehen in Medien-Ordner...');
    const migrationAssets: MigrationData[] = [];

    for (const asset of assets) {
      try {
        log(`🔄 Bereite Asset ${asset.assetId} (${asset.type}) vor...`);

        // ✅ VEREINFACHT: Alle Assets in Medien-Ordner (wie Dokumentation spezifiziert)
        const targetFolder = medienFolder;
        log(`📁 Verwende Medien-Ordner: ${targetFolder.name} (${targetFolder.id})`);

        // Spezielle Behandlung für PDFs - könnten in Pressemeldungen-Ordner
        if (asset.type === 'pdf') {
          // Suche Pressemeldungen-Ordner
          const allFoldersQuery = query(
            collection(db, 'media_folders'),
            where('organizationId', '==', organizationId),
            where('parentFolderId', '==', projectFolder.id),
            where('name', '==', 'Pressemeldungen'),
            where('isDeleted', '==', false)
          );
          const presseFoldersSnapshot = await getDocs(allFoldersQuery);

          if (!presseFoldersSnapshot.empty) {
            const presseFolder = { id: presseFoldersSnapshot.docs[0].id, ...presseFoldersSnapshot.docs[0].data() };
            log(`📄 PDF geht in Pressemeldungen-Ordner: ${presseFolder.name} (${presseFolder.id})`);
            // Aber laut Dokumentation sollen alle Assets dupliziert werden - also auch PDFs in Medien
            // targetFolder = presseFolder;
          }
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