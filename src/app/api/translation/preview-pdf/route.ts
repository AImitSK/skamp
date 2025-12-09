/**
 * POST /api/translation/preview-pdf
 * Generiert PDF-Vorschau für eine Übersetzung und speichert sie im Projektordner
 *
 * Verwendet Admin SDK für:
 * - Firestore-Zugriff (adminDb)
 * - Storage-Upload (adminStorage)
 * - Asset-Erstellung (adminDb.collection('media_assets'))
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin-init';
import admin from 'firebase-admin';
import { emailSenderService } from '@/lib/email/email-sender-service';
import { PRCampaign } from '@/types/pr';
import { ProjectTranslation } from '@/types/translation';

export async function POST(request: NextRequest) {
  try {
    // 1. Parameter validieren
    const { organizationId, projectId, translationId } = await request.json();

    if (!organizationId || !projectId || !translationId) {
      return NextResponse.json(
        { success: false, error: 'Fehlende Parameter: organizationId, projectId und translationId sind erforderlich' },
        { status: 400 }
      );
    }

    // 2. Translation aus Firestore laden (Admin SDK)
    const translationDoc = await adminDb
      .collection(`organizations/${organizationId}/projects/${projectId}/translations`)
      .doc(translationId)
      .get();

    if (!translationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Übersetzung nicht gefunden' },
        { status: 404 }
      );
    }

    const translation: ProjectTranslation = {
      id: translationDoc.id,
      organizationId,
      projectId,
      ...translationDoc.data()
    } as ProjectTranslation;

    // 3. Campaign laden (Admin SDK)
    if (!translation.campaignId) {
      return NextResponse.json(
        { success: false, error: 'Übersetzung hat keine verknüpfte Campaign' },
        { status: 400 }
      );
    }

    const campaignDoc = await adminDb
      .collection('pr_campaigns')
      .doc(translation.campaignId)
      .get();

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Campaign nicht gefunden' },
        { status: 404 }
      );
    }

    const campaign: PRCampaign = {
      id: campaignDoc.id,
      ...campaignDoc.data()
    } as PRCampaign;

    // 4. PDF generieren via emailSenderService (WIEDERVERWENDUNG!)
    console.log(`📄 Generiere PDF für Übersetzung: ${translation.language}`);

    const pdfResult = await emailSenderService.generatePDFForTranslation(
      campaign,
      translation,
      'translation-preview'  // userId
    );

    console.log(`✅ PDF generiert: ${pdfResult.fileName}`);

    // 5. Projekt-Daten laden für Ordner-Pfad
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Projekt nicht gefunden' },
        { status: 404 }
      );
    }
    const projectData = projectDoc.data();
    const projectName = projectData?.title || 'Unbekannt';

    // 6. Ordner-ID finden (Admin SDK Query)
    // Finde Projekt-Ordner
    const foldersSnapshot = await adminDb
      .collection('media_folders')
      .where('organizationId', '==', organizationId)
      .get();

    const allFolders = foldersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Projekt-Ordner finden (Format: "P-{NR} {Projektname}")
    const projectFolder = allFolders.find((folder: any) =>
      folder.name?.includes('P-') && folder.name?.includes(projectName)
    );

    if (!projectFolder) {
      return NextResponse.json(
        { success: false, error: `Projekt-Ordner nicht gefunden für: ${projectName}` },
        { status: 404 }
      );
    }

    // Pressemeldungen-Unterordner finden
    const pressemeldungenFolder = allFolders.find((folder: any) =>
      folder.parentFolderId === projectFolder.id && folder.name === 'Pressemeldungen'
    );

    if (!pressemeldungenFolder) {
      return NextResponse.json(
        { success: false, error: 'Pressemeldungen-Ordner nicht gefunden' },
        { status: 404 }
      );
    }

    // Vorschau-Unterordner finden/erstellen
    let vorschauFolder = allFolders.find((folder: any) =>
      folder.parentFolderId === pressemeldungenFolder.id && folder.name === 'Vorschau'
    );

    if (!vorschauFolder) {
      console.log(`📁 Erstelle Vorschau-Ordner...`);
      const vorschauFolderRef = await adminDb.collection('media_folders').add({
        name: 'Vorschau',
        description: 'PDF-Vorschauversionen für Übersetzungen',
        parentFolderId: pressemeldungenFolder.id,
        organizationId,
        color: '#93C5FD',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'translation-preview'
      });
      vorschauFolder = { id: vorschauFolderRef.id, name: 'Vorschau' };
    }

    // 7. PDF in Storage hochladen (Admin SDK)
    console.log(`📤 Lade PDF hoch in: Vorschau/`);

    // Base64 zu Buffer konvertieren
    const cleanBase64 = pdfResult.pdfBase64.replace(/[^A-Za-z0-9+/=]/g, '');
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    // Storage-Pfad erstellen
    const timestamp = Date.now();
    const storagePath = `organizations/${organizationId}/media/translations/${pdfResult.fileName.replace('.pdf', '')}_${timestamp}.pdf`;

    // Upload via Admin SDK
    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          uploadedBy: 'translation-preview',
          source: 'translation-pdf-preview',
          translationId: translationId,
          language: translation.language
        }
      }
    });

    // Signierte URL generieren (7 Tage gültig)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    console.log(`✅ PDF hochgeladen: ${storagePath}`);

    // 8. Asset in Firestore anlegen (Admin SDK)
    const assetData = {
      fileName: pdfResult.fileName,
      fileType: 'application/pdf',
      name: pdfResult.fileName,
      type: 'document',
      mimeType: 'application/pdf',
      size: pdfBuffer.length,

      downloadUrl: signedUrl,
      storagePath: storagePath,

      folderId: vorschauFolder.id,
      organizationId: organizationId,
      clientId: campaign.clientId || 'unknown',
      createdBy: 'translation-preview',

      metadata: {
        source: 'translation-pdf-preview',
        translationId: translationId,
        campaignId: campaign.id,
        language: translation.language
      },

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const assetRef = await adminDb.collection('media_assets').add(assetData);
    console.log(`✅ Asset erstellt: ${assetRef.id}`);

    // 9. Erfolg zurückgeben
    return NextResponse.json({
      success: true,
      pdfUrl: signedUrl,
      fileName: pdfResult.fileName,
      fileSize: pdfBuffer.length,
      assetId: assetRef.id
    });

  } catch (error) {
    console.error('❌ Translation PDF Preview Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
