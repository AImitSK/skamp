# Implementierungsplan: PDF-Vorschau für Übersetzungen

**Status:** Geplant
**Datum:** 2025-12-09
**Aktualisiert:** 2025-12-09 (v3 - Admin SDK für Storage-Upload)
**Autor:** Claude
**Priorität:** HOCH - Blockiert aktuell die Übersetzungs-PDF-Vorschau

---

## 1. Problemanalyse

### 1.1 Aktueller Zustand

Die `TranslationList.tsx` ruft `/api/generate-pdf` mit unvollständigen Parametern auf:

```typescript
// TranslationList.tsx Zeile 74-87 (FEHLERHAFT)
const response = await fetch('/api/generate-pdf', {
  method: 'POST',
  body: JSON.stringify({
    title: translation.title,
    mainContent: translation.content,
    boilerplateSections,           // ⚠️ Nur IDs, kein Content!
    clientName: '',                // ❌ LEER - aber Pflichtfeld!
    organizationId,
    projectId,
    language: translation.language
    // ❌ FEHLT: campaignId (Pflichtfeld)
    // ❌ FEHLT: userId (Pflichtfeld)
    // ❌ FEHLT: html (Template-HTML)
    // ❌ FEHLT: templateId
  })
});
```

### 1.2 Was `/api/generate-pdf` erwartet (route.ts Zeile 467-504)

| Parameter | Pflicht | TranslationList sendet |
|-----------|---------|------------------------|
| `campaignId` | ✅ | ❌ Nicht gesendet |
| `organizationId` | ✅ | ✅ |
| `title` | ✅ | ✅ |
| `mainContent` | ✅ | ✅ |
| `clientName` | ✅ | ❌ Leer String |
| `userId` | ✅ | ❌ Nicht gesendet |
| `html` | Für Template | ❌ Nicht gesendet |
| `templateId` | Optional | ❌ Nicht gesendet |

### 1.3 Das BOILERPLATE-Problem

Die `TranslationList.tsx` (Zeile 67-71) bereitet Boilerplates FALSCH auf:

```typescript
// AKTUELL (FEHLERHAFT)
const boilerplateSections = (translation.translatedBoilerplates || []).map(bp => ({
  id: bp.id,
  customTitle: bp.translatedTitle || '',
  content: bp.translatedContent || ''  // ✅ Content ist da, ABER...
}));
```

**Das Problem:** `/api/generate-pdf` generiert KEIN Template-HTML aus diesen Rohdaten!

Die API erwartet **FERTIGES HTML** im `html`-Parameter, das bereits alle Boilerplates enthält.

### 1.4 Existierende Lösung: emailSenderService.generatePDFForTranslation()

Der `email-sender-service.ts` (Zeile 229-351) hat **bereits eine funktionierende Methode**:

```typescript
// email-sender-service.ts - generatePDFForTranslation()
private async generatePDFForTranslation(
  campaign: PRCampaign,
  translation: ProjectTranslation,
  userId?: string
): Promise<TranslationPDF> {

  // 1. Template laden
  let template;
  if (campaign.templateId) {
    template = await pdfTemplateService.getTemplateById(campaign.templateId);
  }
  if (!template) {
    const systemTemplates = await pdfTemplateService.getSystemTemplates();
    template = systemTemplates[0];
  }

  // 2. Titel aufbereiten
  const translatedTitle = translation.title ||
    `${campaign.title} (${LANGUAGE_NAMES[translation.language]})`;

  // 3. Boilerplates aufbereiten MIT TYPE-MAPPING (KRITISCH!)
  let boilerplatesForPdf = [];

  if (translation.translatedBoilerplates?.length > 0) {
    boilerplatesForPdf = translation.translatedBoilerplates.map(tb => {
      const originalSection = (campaign.boilerplateSections || []).find(
        s => s.id === tb.id
      );

      // ✅ KRITISCH: Type-Mapping (boilerplate → undefined)
      const typeMap: Record<string, 'lead' | 'main' | 'quote' | 'contact' | undefined> = {
        'lead': 'lead',
        'main': 'main',
        'quote': 'quote',
        'contact': 'contact',
        'boilerplate': undefined,  // ← Das ist wichtig!
      };

      return {
        id: tb.id,
        customTitle: tb.translatedTitle || originalSection?.customTitle,
        content: tb.translatedContent,
        type: typeMap[originalSection?.type || ''] || undefined,
      };
    });
  }

  // 4. Template-HTML generieren MIT SPRACHE für Labels
  const templateHtml = await pdfTemplateService.renderTemplateWithStyle(template, {
    title: translatedTitle,
    mainContent: translation.content,
    boilerplateSections: boilerplatesForPdf,
    keyVisual: campaign.keyVisual,
    clientName: campaign.clientName || 'Client',
    date: new Date().toISOString(),
    language: translation.language  // ← Für "Press Release" statt "Pressemitteilung"
  });

  // 5. PDF-API aufrufen
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const fileName = `${campaign.title.replace(/[^a-zA-Z0-9]/g, '_')}_${translation.language.toUpperCase()}.pdf`;

  const pdfResponse = await fetch(`${baseUrl}/api/generate-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaignId: campaign.id || 'temp',
      organizationId: campaign.organizationId,
      mainContent: translation.content,
      clientName: campaign.clientName || 'Client',
      userId: userId,
      html: templateHtml,  // ← FERTIGES HTML!
      fileName,
      title: translatedTitle,
      options: {
        format: 'A4',
        orientation: 'portrait',
        printBackground: true,
        waitUntil: 'networkidle0',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      }
    })
  });

  // 6. Ergebnis zurückgeben
  const pdfData = await pdfResponse.json();

  return {
    language: translation.language,
    languageName: LANGUAGE_NAMES[translation.language],
    pdfBase64: pdfData.pdfBase64,  // ← Base64, keine URL!
    fileName
  };
}
```

**WICHTIG:** Diese Methode ist `private`. Wir müssen sie auf `public` ändern.

### 1.5 Wo das PDF gespeichert wird

Der `pdf-versions-service.ts` (Zeile 630-950) zeigt die Speicherlogik:

```
Projektordner-Struktur:
/P-{NR} {Projektname}/
  └── Pressemeldungen/
      └── Vorschau/           ← Hier landen Draft-PDFs
          └── preview_*.pdf
```

### 1.6 Firebase SDK-Kompatibilität (NEU in v3)

**Problem erkannt:**
- `emailSenderService` nutzt **Admin SDK** (`adminDb`)
- `mediaService` nutzt **Client SDK** (`db, storage` aus `./config`)
- API-Routes laufen **serverseitig** → Client SDK funktioniert nicht zuverlässig

**Lösung:**
Für den Storage-Upload im API-Endpoint nutzen wir **Admin SDK direkt**, wie bereits in `/api/ai/generate-image/route.ts` implementiert:

```typescript
// Bewährtes Pattern aus /api/ai/generate-image/route.ts
import { adminStorage, adminDb } from '@/lib/firebase/admin-init';
import admin from 'firebase-admin';

// Upload via Admin SDK
const bucket = adminStorage.bucket();
const file = bucket.file(filePath);
await file.save(buffer, { metadata: { contentType: 'application/pdf' } });

// Download URL generieren
const [signedUrl] = await file.getSignedUrl({
  action: 'read',
  expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 Tage
});

// Asset in Firestore speichern
await adminDb.collection('media_assets').add(assetData);
```

---

## 2. Lösung: Dedizierter API-Endpoint mit Code-Wiederverwendung

### 2.1 Strategie

1. **emailSenderService erweitern**: Die private `generatePDFForTranslation()` Methode public machen
2. **Neuer API-Endpoint**: `/api/translation/preview-pdf` der diese Methode nutzt
3. **Storage-Upload via Admin SDK**: Base64 → Buffer → Admin Storage → Firestore Asset

### 2.2 Endpoint-Spezifikation

```
POST /api/translation/preview-pdf

Request Body:
{
  organizationId: string    // Pflicht
  projectId: string         // Pflicht
  translationId: string     // Pflicht
}

Response (Erfolg):
{
  success: true
  pdfUrl: string           // Firebase Storage URL (signiert, 7 Tage gültig)
  fileName: string
  fileSize: number
}

Response (Fehler):
{
  success: false
  error: string
}
```

---

## 3. Implementierungsschritte

### Schritt 1: emailSenderService erweitern

**Datei:** `src/lib/email/email-sender-service.ts`

**Änderung:** Die Methode `generatePDFForTranslation` von `private` auf `public` ändern.

```typescript
// VORHER (Zeile 229):
private async generatePDFForTranslation(

// NACHHER:
public async generatePDFForTranslation(
```

**Keine weitere Änderung nötig** - die Methode funktioniert bereits korrekt!

---

### Schritt 2: API-Endpoint erstellen (Admin SDK Version)

**Datei:** `src/app/api/translation/preview-pdf/route.ts`

```typescript
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
```

---

### Schritt 3: TranslationList.tsx anpassen

**Datei:** `src/components/campaigns/TranslationList.tsx`

**Änderung:** Die `handleGeneratePdf` Funktion komplett ersetzen:

```typescript
// Zeile 62-109 KOMPLETT ERSETZEN mit:

const handleGeneratePdf = async (translation: ProjectTranslation) => {
  setGeneratingPdfFor(translation.id);

  try {
    // API-Aufruf an neuen Endpoint
    const response = await fetch('/api/translation/preview-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        projectId,
        translationId: translation.id
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'PDF-Generierung fehlgeschlagen');
    }

    if (result.pdfUrl) {
      window.open(result.pdfUrl, '_blank');
      toastService.success(`PDF für ${LANGUAGE_NAMES[translation.language]} geöffnet`);
    } else {
      throw new Error('Keine PDF-URL erhalten');
    }
  } catch (error: any) {
    console.error('PDF-Generierung fehlgeschlagen:', error);
    toastService.error(error.message || 'PDF-Generierung fehlgeschlagen');
  } finally {
    setGeneratingPdfFor(null);
  }
};
```

**Zusätzlich:** Import für `LANGUAGE_NAMES` hinzufügen falls nicht vorhanden:

```typescript
import { LANGUAGE_NAMES } from '@/types/international';
```

---

## 4. Datenfluss-Diagramm (v3 - Admin SDK)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        TranslationList.tsx                                │
│                                                                          │
│  handleGeneratePdf(translation)                                          │
│       │                                                                  │
│       ▼                                                                  │
│  POST /api/translation/preview-pdf                                       │
│       {organizationId, projectId, translationId}                         │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   /api/translation/preview-pdf/route.ts                   │
│                                                                          │
│  1. Translation laden (adminDb)                                          │
│       ↓                                                                  │
│  2. Campaign laden (adminDb)                                             │
│       ↓                                                                  │
│  3. emailSenderService.generatePDFForTranslation() aufrufen              │
│     ┌─────────────────────────────────────────────────────────┐          │
│     │ - Template laden                                        │          │
│     │ - Boilerplates mit Type-Mapping aufbereiten             │          │
│     │ - HTML mit Sprache rendern                              │          │
│     │ - /api/generate-pdf aufrufen                            │          │
│     │ - Return: { pdfBase64, fileName, language }             │          │
│     └─────────────────────────────────────────────────────────┘          │
│       ↓                                                                  │
│  4. Ordner finden via adminDb Query                                      │
│       ↓                                                                  │
│  5. Base64 → Buffer konvertieren                                         │
│       ↓                                                                  │
│  6. adminStorage.bucket().file().save() → Storage Upload                 │
│       ↓                                                                  │
│  7. file.getSignedUrl() → Signierte URL (7 Tage)                         │
│       ↓                                                                  │
│  8. adminDb.collection('media_assets').add() → Asset erstellen           │
│       ↓                                                                  │
│  9. Response: {success: true, pdfUrl: "...", fileName: "...", ...}       │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        TranslationList.tsx                                │
│                                                                          │
│  window.open(result.pdfUrl, '_blank');                                   │
│  toastService.success('PDF geöffnet');                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Testfälle

### 5.1 Erfolgsfall

1. ✅ PDF wird generiert mit korrektem übersetzten Titel
2. ✅ PDF enthält übersetzten Hauptinhalt
3. ✅ PDF enthält übersetzte Boilerplates (mit korrekten Titeln!)
4. ✅ PDF enthält KeyVisual aus Campaign
5. ✅ PDF-Labels sind in der Zielsprache (z.B. "Press Release" für EN)
6. ✅ PDF wird in `Pressemeldungen/Vorschau/` gespeichert
7. ✅ PDF öffnet sich in neuem Tab
8. ✅ Asset wird in `media_assets` Collection erstellt

### 5.2 Fallback-Fälle (bereits in emailSenderService implementiert)

1. ✅ Translation ohne `translatedBoilerplates` → Leeres Array (kein Crash)
2. ✅ Campaign ohne `templateId` → System-Template "Modern Professional"
3. ✅ Campaign ohne `keyVisual` → PDF ohne Bild
4. ✅ Campaign ohne `clientName` → Fallback auf "Client"

### 5.3 Fehlerfälle

1. ❌ Fehlende Parameter → 400 mit Fehlermeldung
2. ❌ Translation nicht gefunden → 404
3. ❌ Campaign nicht gefunden → 404
4. ❌ Projekt-Ordner nicht gefunden → 404
5. ❌ PDF-Generierung fehlgeschlagen → 500 mit Details
6. ❌ Storage-Upload fehlgeschlagen → 500 mit Details

---

## 6. Abhängigkeiten

| Modul | Verwendet für | Import |
|-------|--------------|--------|
| `firebase-admin` | Firestore & Storage Admin SDK | `adminDb, adminStorage` aus `@/lib/firebase/admin-init` |
| `admin` | FieldValue.serverTimestamp() | `import admin from 'firebase-admin'` |
| `emailSenderService` | PDF-Generierung (wiederverwendet!) | `@/lib/email/email-sender-service` |
| `LANGUAGE_NAMES` | Sprachnamen für Toast-Messages | `@/types/international` |

---

## 7. Änderungen gegenüber v2

| Aspekt | v2 (alt) | v3 (neu) |
|--------|----------|----------|
| Storage-Upload | `mediaService.uploadClientMedia()` (Client SDK) | `adminStorage.bucket().file().save()` (Admin SDK) |
| Asset-Erstellung | `mediaService` (Client SDK) | `adminDb.collection('media_assets').add()` (Admin SDK) |
| Ordner-Suche | `mediaService.getAllFoldersForOrganization()` | `adminDb.collection('media_folders').where()` |
| URL-Typ | Download URL | Signierte URL (7 Tage gültig) |
| Risiko | Client SDK funktioniert nicht serverseitig | ✅ Admin SDK funktioniert zuverlässig |

---

## 8. Geschätzter Aufwand

| Schritt | Aufwand |
|---------|---------|
| emailSenderService: `private` → `public` | 5 min |
| API-Endpoint erstellen (Admin SDK) | ~1.5h |
| TranslationList.tsx anpassen | ~15 min |
| Testing | ~30 min |
| **Gesamt** | **~2.5h** |

---

## 9. Risiken & Mitigationen

| Risiko | Mitigation |
|--------|------------|
| `generatePDFForTranslation` ist private | Auf public ändern (Schritt 1) |
| Storage-Ordner existiert nicht | Automatische Erstellung von `Vorschau`-Ordner via adminDb |
| Base64-Konvertierung fehlschlägt | Try-Catch mit aussagekräftiger Fehlermeldung |
| Campaign hat keine clientId | Fallback auf 'unknown' |
| Signierte URL läuft ab | 7 Tage Gültigkeit - für Vorschau ausreichend |

---

## 10. Checkliste für Implementierung

- [ ] 1. `email-sender-service.ts`: `generatePDFForTranslation` von `private` auf `public` ändern
- [ ] 2. Ordner erstellen: `src/app/api/translation/preview-pdf/`
- [ ] 3. `route.ts` erstellen mit vollständigem Code aus Schritt 2 (Admin SDK Version)
- [ ] 4. `TranslationList.tsx`: `handleGeneratePdf` Funktion ersetzen
- [ ] 5. `TranslationList.tsx`: Import für `LANGUAGE_NAMES` prüfen/hinzufügen
- [ ] 6. Testen: PDF-Vorschau für deutsche Übersetzung
- [ ] 7. Testen: PDF-Vorschau für englische Übersetzung
- [ ] 8. Testen: Ordner `Pressemeldungen/Vorschau/` wird erstellt
- [ ] 9. Testen: PDF enthält übersetzte Boilerplates
- [ ] 10. Testen: Asset erscheint in Media Library

---

**Letzte Aktualisierung:** 2025-12-09 (v3 - Admin SDK für Storage-Upload)
