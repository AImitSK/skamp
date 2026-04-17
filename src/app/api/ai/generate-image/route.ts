// src/app/api/ai/generate-image/route.ts
// API Route für KI-gestützte Bildgenerierung mit Imagen 3 - Powered by Genkit!
// Generiert Bild, speichert in KI-Bilder Ordner, erstellt Asset
// Phase 6.2: Admin SDK Migration für Server-Side Folder Access

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { generateImageFlow, extractBase64FromDataUrl, generateImageFilename } from '@/lib/ai/flows/generate-image';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { trackAIUsage } from '@/lib/ai/helpers/usage-tracker';
import { adminDb, adminStorage } from '@/lib/firebase/admin-init';
import admin from '@/lib/firebase/admin-init';

// Konstante: 1 generiertes Bild = 500 AI-Wörter
const IMAGE_WORD_EQUIVALENT = 500;

interface GenerateImageRequest {
  prompt: string;
  projectId: string;
  projectName: string;
  campaignId?: string;
  campaignName?: string;
  clientId?: string;
}

/**
 * Findet oder erstellt den "KI-Bilder" Ordner im Projekt
 * Pfad: Projekt > Medien > KI-Bilder
 * Verwendet Admin SDK für Server-Side Zugriff ohne Client-Permissions
 */
async function getOrCreateAIImagesFolder(
  organizationId: string,
  userId: string,
  projectId: string,
  projectName: string
): Promise<string> {
  // 1. Alle Ordner der Organisation laden (Admin SDK)
  const foldersSnapshot = await adminDb.collection('media_folders')
    .where('organizationId', '==', organizationId)
    .get();

  const allFolders = foldersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Array<{ id: string; name: string; parentFolderId?: string }>;

  // 2. Projekt-Hauptordner finden
  // Strategie A: Über assetFolders im Projekt-Dokument (zuverlässigste Methode)
  let projectFolder = null;
  try {
    const projectDoc = await adminDb.collection('projects').doc(projectId).get();
    if (projectDoc.exists) {
      const projectData = projectDoc.data();
      const mainFolder = projectData?.assetFolders?.find(
        (f: any) => f.folderName === projectData?.title || f.folderName === projectName
      );
      if (mainFolder?.folderId) {
        projectFolder = allFolders.find(f => f.id === mainFolder.folderId);
      }
      // Fallback: Erster Eintrag in assetFolders ist der Hauptordner
      if (!projectFolder && projectData?.assetFolders?.length > 0) {
        projectFolder = allFolders.find(f => f.id === projectData.assetFolders[0].folderId);
      }
    }
  } catch {
    // Nicht kritisch, Fallback auf Namenssuche
  }

  // Strategie B: Über Ordnernamen (Format: "P-{Datum}-{Company}-{Projektname}")
  if (!projectFolder) {
    projectFolder = allFolders.find(folder =>
      folder.name.includes('P-') && folder.name.includes(projectName)
    );
  }

  // Strategie C: Teilweise Namensübereinstimmung (erstes Wort des Projektnamens)
  if (!projectFolder) {
    const firstWord = projectName.split(/\s+/)[0];
    if (firstWord.length >= 4) {
      projectFolder = allFolders.find(folder =>
        folder.name.includes('P-') && folder.name.toLowerCase().includes(firstWord.toLowerCase())
      );
    }
  }

  if (!projectFolder) {
    throw new Error(`Projekt-Ordner für "${projectName}" nicht gefunden. Bitte erstellen Sie zuerst die Projektordner-Struktur im Daten-Tab.`);
  }

  // 3. Medien-Unterordner finden
  const medienFolder = allFolders.find(folder =>
    folder.parentFolderId === projectFolder.id && folder.name === 'Medien'
  );

  if (!medienFolder) {
    throw new Error(`Medien-Ordner im Projekt "${projectName}" nicht gefunden`);
  }

  // 4. KI-Bilder Ordner suchen
  let kiImageFolder = allFolders.find(folder =>
    folder.parentFolderId === medienFolder.id && folder.name === 'KI-Bilder'
  );

  // 5. Falls nicht vorhanden, erstellen (Admin SDK)
  if (!kiImageFolder) {
    console.log('📁 Erstelle KI-Bilder Ordner...');

    const newFolderRef = await adminDb.collection('media_folders').add({
      name: 'KI-Bilder',
      description: 'Automatisch generierte Bilder durch KI (Imagen)',
      parentFolderId: medienFolder.id,
      organizationId,
      createdBy: userId,
      color: '#8B5CF6', // Lila für KI
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ KI-Bilder Ordner erstellt:', newFolderRef.id);
    return newFolderRef.id;
  }

  return kiImageFolder.id;
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Request Body parsen
      const data: GenerateImageRequest = await req.json();
      const { prompt, projectId, projectName, campaignId, campaignName, clientId } = data;

      // Validierung
      if (!prompt || prompt.trim() === '') {
        return NextResponse.json(
          { error: 'Prompt ist erforderlich' },
          { status: 400 }
        );
      }

      if (!projectId || !projectName) {
        return NextResponse.json(
          { error: 'Projekt-ID und Projekt-Name sind erforderlich' },
          { status: 400 }
        );
      }

      console.log('🖼️ Bildgenerierung mit Imagen 3', {
        promptLength: prompt.length,
        projectId,
        projectName,
        organizationId: auth.organizationId
      });

      // ══════════════════════════════════════════════════════════════
      // AI USAGE LIMIT CHECK (1 Bild = 500 Wörter)
      // ══════════════════════════════════════════════════════════════

      try {
        const limitCheck = await checkAILimit(auth.organizationId, IMAGE_WORD_EQUIVALENT);

        if (!limitCheck.allowed) {
          console.warn('⚠️ AI limit exceeded:', {
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          });

          return NextResponse.json(
            {
              error: `AI-Limit erreicht! Du hast bereits ${limitCheck.current} von ${limitCheck.limit} AI-Wörtern verwendet. Für ein Bild werden ${IMAGE_WORD_EQUIVALENT} Wörter benötigt. Noch verfügbar: ${limitCheck.remaining} Wörter.`,
              limitInfo: {
                current: limitCheck.current,
                limit: limitCheck.limit,
                remaining: limitCheck.remaining,
                wouldExceed: limitCheck.wouldExceed,
                requestedAmount: IMAGE_WORD_EQUIVALENT
              }
            },
            { status: 429 }
          );
        }

        console.log('✅ AI limit check passed:', {
          current: limitCheck.current,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining,
          imageWordEquivalent: IMAGE_WORD_EQUIVALENT
        });
      } catch (limitError) {
        console.error('❌ Error checking AI limit:', limitError);
        return NextResponse.json(
          { error: 'Fehler beim Prüfen des AI-Limits. Bitte kontaktiere den Support.' },
          { status: 500 }
        );
      }

      // ══════════════════════════════════════════════════════════════
      // KI-BILDER ORDNER FINDEN/ERSTELLEN
      // ══════════════════════════════════════════════════════════════

      let kiFolderId: string;
      try {
        kiFolderId = await getOrCreateAIImagesFolder(
          auth.organizationId,
          auth.userId,
          projectId,
          projectName
        );
        console.log('📁 KI-Bilder Ordner:', kiFolderId);
      } catch (folderError: any) {
        console.error('❌ Fehler beim Ordner-Setup:', folderError);
        return NextResponse.json(
          { error: `Ordner-Fehler: ${folderError.message}` },
          { status: 400 }
        );
      }

      // ══════════════════════════════════════════════════════════════
      // GENKIT FLOW AUFRUF - IMAGEN BILDGENERIERUNG
      // ══════════════════════════════════════════════════════════════

      let imageResult;
      try {
        imageResult = await generateImageFlow({
          prompt,
          aspectRatio: '16:9'
        });
        console.log('✅ Bild generiert:', {
          width: imageResult.width,
          height: imageResult.height,
          format: imageResult.format
        });
      } catch (imagenError: any) {
        console.error('❌ Imagen Fehler:', imagenError);

        // Spezifische Fehlermeldung für Content Policy
        if (imagenError.message?.includes('blocked') || imagenError.message?.includes('policy')) {
          return NextResponse.json(
            { error: 'Das Bild konnte nicht generiert werden, da der Inhalt gegen die Richtlinien verstößt. Bitte wähle einen anderen Bildvorschlag.' },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: `Bildgenerierung fehlgeschlagen: ${imagenError.message}` },
          { status: 500 }
        );
      }

      // ══════════════════════════════════════════════════════════════
      // BILD IN FIREBASE STORAGE SPEICHERN (Admin SDK)
      // ══════════════════════════════════════════════════════════════

      let uploadResult: { filePath: string; downloadUrl: string; fileSize: number };
      try {
        // Base64 aus Data-URL extrahieren
        const { base64, mimeType } = extractBase64FromDataUrl(imageResult.imageUrl);
        const buffer = Buffer.from(base64, 'base64');

        // Dateiname generieren
        const fileName = generateImageFilename('ki-visual');
        const filePath = `organizations/${auth.organizationId}/ai-images/${fileName}`;

        // Upload via Admin SDK
        const bucket = adminStorage.bucket();
        const file = bucket.file(filePath);

        await file.save(buffer, {
          metadata: {
            contentType: mimeType,
            metadata: {
              uploadedBy: auth.userId,
              source: 'ai-generated',
              generator: 'imagen-3'
            }
          }
        });

        // Download URL generieren (signierte URL, 7 Tage gültig)
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 Tage
        });

        uploadResult = {
          filePath,
          downloadUrl: signedUrl,
          fileSize: buffer.length
        };

        console.log('✅ Bild hochgeladen (Admin SDK):', filePath);
      } catch (uploadError: any) {
        console.error('❌ Upload Fehler:', uploadError);
        return NextResponse.json(
          { error: `Bild-Upload fehlgeschlagen: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // ══════════════════════════════════════════════════════════════
      // ASSET IN FIRESTORE ANLEGEN (Admin SDK)
      // ══════════════════════════════════════════════════════════════

      let assetId: string;
      try {
        // Dateiname für Asset
        const fileName = generateImageFilename('KI-Visual');
        const fileType = `image/${imageResult.format}`;

        // Asset-Metadaten erstellen (gleiches Schema wie uploadClientMedia)
        const assetData: Record<string, any> = {
          // Pflichtfelder für Media Library Anzeige
          fileName: fileName,
          fileType: fileType,
          name: fileName,
          type: 'image',
          mimeType: fileType,
          size: uploadResult.fileSize,

          // URLs
          downloadUrl: uploadResult.downloadUrl,
          thumbnailUrl: uploadResult.downloadUrl,
          originalUrl: uploadResult.downloadUrl,
          storagePath: uploadResult.filePath,

          // Organisation & Ordner
          folderId: kiFolderId,
          organizationId: auth.organizationId,
          createdBy: auth.userId,

          // Metadaten
          metadata: {
            width: imageResult.width,
            height: imageResult.height,
            source: 'ai-generated',
            generator: 'imagen-3',
            prompt: prompt
          },

          // Timestamps
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Optionale Felder nur wenn definiert
        if (clientId) assetData.clientId = clientId;
        if (campaignId) assetData.metadata.campaignId = campaignId;
        if (campaignName) assetData.metadata.campaignName = campaignName;

        // Asset in Firestore speichern (Admin SDK)
        const docRef = await adminDb.collection('media_assets').add(assetData);

        assetId = docRef.id;
        console.log('✅ Asset erstellt:', assetId);
      } catch (assetError: any) {
        console.error('❌ Asset-Erstellung Fehler:', assetError);
        return NextResponse.json(
          { error: `Asset-Erstellung fehlgeschlagen: ${assetError.message}` },
          { status: 500 }
        );
      }

      // ══════════════════════════════════════════════════════════════
      // AI USAGE TRACKING
      // ══════════════════════════════════════════════════════════════

      try {
        // Für Bilder: Tracke als feste Wortanzahl
        // Wir simulieren Input/Output für das bestehende Tracking-System
        const fakeInputForTracking = prompt;
        const fakeOutputForTracking = 'a'.repeat(IMAGE_WORD_EQUIVALENT * 5); // ~500 Wörter

        await trackAIUsage(auth.organizationId, fakeInputForTracking, fakeOutputForTracking);
        console.log('✅ AI Usage tracked:', IMAGE_WORD_EQUIVALENT, 'Wörter');
      } catch (trackingError) {
        console.error('⚠️ Failed to track AI usage:', trackingError);
        // Nicht werfen - Generation war erfolgreich
      }

      // ══════════════════════════════════════════════════════════════
      // SUCCESS RESPONSE
      // ══════════════════════════════════════════════════════════════

      return NextResponse.json({
        success: true,
        downloadUrl: uploadResult.downloadUrl,
        assetId,
        folderId: kiFolderId,
        storagePath: uploadResult.filePath,
        imageInfo: {
          width: imageResult.width,
          height: imageResult.height,
          format: imageResult.format
        },
        aiProvider: 'imagen-3',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Error generating image with Imagen:', error);

      const errorMessage = error.message || 'Unbekannter Fehler bei der Bildgenerierung';

      return NextResponse.json(
        { error: `Fehler bei der Bildgenerierung: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
