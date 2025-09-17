# Migration Debug: Projekt-Ordner-Struktur Analyse

## Problem
Migration kopiert Dateien, aber sie werden nicht in der richtigen Ordnerstruktur angezeigt.

## Zu analysieren: Projekt-Wizard Ordner-Erstellung

### 1. Beim Anlegen eines Projektes mit dem Wizard - Wo werden welche Ordner erstellt?

**ProjectCreationWizard.tsx (Zeile 237-241):**
```typescript
const result = await projectService.createProjectFromWizard(
  wizardData,
  user.uid,
  organizationId
);
```

Der Wizard ruft `projectService.createProjectFromWizard()` auf. Diese Funktion muss analysiert werden.

### 2. In welche Collections wird das geschrieben?

### 3. Wo liegen die Ordner physisch im Firebase Storage?

### 4. Welcher Service macht das wie?

### 5. Wie funktioniert die Upload-Funktion korrekt?

---

## Analyse-Ergebnisse

**Gefunden:** ProjectCreationWizard ruft `projectService.createProjectFromWizard()` auf.

**Nächster Schritt:** project-service.ts analysieren

### 2. In welche Collections wird das geschrieben?

**Gefunden in project-service.ts:**
- **Projekt:** Collection `projects` (Zeile 52)
- **Ordner:** Collection `media_folders` via `mediaService.createFolder()` (Zeile 2022-2082)

### 3. Wo liegen die Ordner physisch im Firebase Storage?

**Storage-Struktur aus createProjectFolderStructure (Zeilen 2039-2069):**
```
P-{Datum}-{Company Name}-{Projekt Name}/
├── Medien/
├── Dokumente/
└── Pressemeldungen/
```

**Beispiel:** `P-20241217-AcmeCorp-Produktlaunch Q2 2024/Medien/`

### 4. Welcher Service macht das wie?

**createProjectFolderStructure (Zeilen 1978-2116):**
1. Lädt Projekt und Company-Daten
2. Findet/erstellt "Projekte" Hauptordner
3. Erstellt Projekt-Hauptordner: `P-{Datum}-{Company}-{Title}`
4. Erstellt 3 Unterordner: "Medien", "Dokumente", "Pressemeldungen"
5. **WICHTIG:** Setzt `clientId` auf alle Ordner wenn vorhanden (Zeilen 2048, 2081)
6. Speichert Ordner-Info in `project.assetFolders` Array

### 5. Wie funktioniert die Upload-Funktion korrekt?

**PROBLEM IDENTIFIZIERT:** Migration verwendet eigene Ordner-Logik statt der Projekt-Ordner-Struktur!

**Korrekte Logik aus project-service.ts:**
- Ordner-Name-Pattern: `P-{Datum}-{Company}-{Title}` (Zeile 2040)
- Unterordner haben `parentFolderId` des Hauptordners (Zeile 2078)
- Alle Ordner haben `clientId` wenn Projekt einen Kunden hat (Zeilen 2048, 2081)

**Migration verwendet falsche Logik:**
- Sucht nach Projekt-Name direkt, nicht nach Pattern
- Erstellt neue Ordner statt existierende zu finden
- Berücksichtigt `clientId` nicht bei Ordner-Suche

---

## PDF-Versionierung: Wo werden PDFs gespeichert?

**Gefunden in pdf-versions-service.ts (Zeilen 757-825):**

### PDF-Upload-Logik:
1. **Mit Projekt:** PDFs gehen in **Pressemeldungen-Ordner** des Projekts
2. **Ohne Projekt:** Smart Router Upload als Fallback

### Korrekte Logik für Projekt-PDFs (Zeilen 760-825):
```typescript
// 1. Alle Ordner der Organisation laden
const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);

// 2. Projekt-Ordner finden (gleiche Logik wie AssetSelectorModal)
const projectFolder = allFolders.find(folder =>
  folder.name.includes('P-') && folder.name.includes(projectName)
);

// 3. Pressemeldungen-Unterordner finden
const pressemeldungenFolder = allFolders.find(folder =>
  folder.parentFolderId === projectFolder.id && folder.name === 'Pressemeldungen'
);

// 4. Upload in Pressemeldungen-Ordner
const uploadedAsset = await mediaService.uploadClientMedia(
  pdfFile,
  organizationId,
  campaignData.clientId,
  pressemeldungenFolder.id, // ← HIER!
  undefined,
  { userId, description: `PDF für Campaign ${campaignData.title}` }
);
```

### Collection: `pdf_versions`
- **Firestore Collection:** `pdf_versions` (Zeile 95)
- **Storage:** In Projekt-Pressemeldungen-Ordner via `mediaService.uploadClientMedia()`

---

## Key Visual und Attached Assets: Wo werden sie gespeichert?

### Key Visual (KeyVisualSection.tsx, Zeilen 157-169):
```typescript
// Upload direkt in Medien-Ordner des Projekts
const uploadedAsset = await mediaService.uploadClientMedia(
  croppedFile,
  organizationId,
  clientId,
  medienFolder.id, // ← MEDIEN-ORDNER!
  undefined,
  { userId, description: `KeyVisual für Campaign ${campaignName || campaignId}` }
);
```

### Attached Assets (AssetSelectorModal.tsx über Campaign Edit):
- **Verwendung:** `setAttachedAssets(attachedAssets)` (Campaign Edit, Zeile 683, 998, 2067)
- **Upload-Logik:** AssetSelectorModal verwendet **gleiche Medien-Ordner-Logik** wie KeyVisual
- **Ziel:** Medien-Ordner des Projekts via `currentFolderId` (AssetSelectorModal Zeile 456)

### Zusammenfassung der Upload-Ziele:
1. **Key Visual:** `P-{Datum}-{Company}-{Title}/Medien/`
2. **Attached Assets:** `P-{Datum}-{Company}-{Title}/Medien/`
3. **PDF-Versionen:** `P-{Datum}-{Company}-{Title}/Pressemeldungen/`

**ALLE Campaign-Assets landen im Medien-Ordner, nur PDFs gehen in Pressemeldungen.**

---

## Projekt-Details Planung Tab Medien-Ordner Upload-System

**Gefunden in ProjectFoldersView.tsx:**

### Upload-Modal und Service (Zeilen 522-531):
```typescript
// Upload mit automatischer Kundenzuordnung
return await mediaService.uploadClientMedia(
  file,
  organizationId,
  clientId,
  currentFolderId,     // ← HIER: Ziel-Ordner-ID
  progressCallback,
  { userId: user.uid }
);
```

### Collection: `media_assets`
- **Service:** `mediaService.uploadClientMedia()`
- **Parameter:** `currentFolderId` bestimmt Upload-Ziel
- **Automatic:** Automatische `clientId` Zuordnung

### Storage-Pfad:
- **Physisch:** Im gewählten Projekt-Ordner via `currentFolderId`
- **Firestore:** Collection `media_assets` mit `folderId` und `clientId`

### Upload-Funktion Details (Zeilen 522-531):
1. **File:** Original-Datei
2. **OrganizationId:** Mandant
3. **ClientId:** Automatische Kundenzuordnung
4. **CurrentFolderId:** Bestimmt Ziel-Ordner (Medien/Dokumente/Pressemeldungen)
5. **ProgressCallback:** Für Upload-Progress
6. **Metadata:** `{ userId }`

**WICHTIG:** Der Upload verwendet `currentFolderId` - das ist der Schlüssel für die korrekte Ordner-Zuordnung in der Migration!

---

## Migration Step-by-Step: Wie implementiere ich die Asset-Migration?

### 1. Wie finde ich den Projekt-Ordner "Medien"?

```typescript
// 1. Alle Ordner der Organisation laden
const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);

// 2. Projekt-Daten für korrekten Namen laden
const projectDoc = await getDoc(doc(db, 'projects', projectId));
const projectData = projectDoc.data();
let companyName = 'Unbekannt';
if (projectData.customer?.id) {
  const companyDoc = await getDoc(doc(db, 'companies', projectData.customer.id));
  if (companyDoc.exists()) {
    companyName = companyDoc.data().name;
  }
}

// 3. Projekt-Hauptordner finden: P-{Datum}-{Company}-{Title}
const projectFolder = allFolders.find(folder => {
  const name = folder.name;
  return name.startsWith('P-') && name.includes(companyName) && name.includes(projectData.title);
});

// 4. Medien-Unterordner finden
const medienFolder = allFolders.find(folder =>
  folder.parentFolderId === projectFolder.id &&
  folder.name === 'Medien' &&
  folder.clientId === projectData.customer.id
);
```

### 2. Wie finde ich den Projekt-Ordner "Pressemeldungen"?

```typescript
// Nach dem gleichen Pattern wie Medien-Ordner
const pressemeldungenFolder = allFolders.find(folder =>
  folder.parentFolderId === projectFolder.id &&
  folder.name === 'Pressemeldungen' &&
  folder.clientId === projectData.customer.id
);
```

### 3. Wie kann ich in "Medien" speichern?

```typescript
// Verwende mediaService.uploadClientMedia()
const uploadedAsset = await mediaService.uploadClientMedia(
  fileBlob,                    // File oder Blob
  organizationId,              // Organisation
  campaignData.clientId,       // Client aus Campaign
  medienFolder.id,             // ← HIER: Medien-Ordner-ID
  undefined,                   // Progress-Callback (optional)
  {
    userId,
    description: `Migriert von Campaign ${campaignId}`,
    originalAssetId: originalAssetId  // Für Tracking
  }
);
```

### 4. Wie kann ich in "Pressemeldungen" speichern?

```typescript
// Gleiche Funktion, anderer Ordner
const uploadedAsset = await mediaService.uploadClientMedia(
  pdfBlob,                     // PDF-Datei
  organizationId,              // Organisation
  campaignData.clientId,       // Client aus Campaign
  pressemeldungenFolder.id,    // ← HIER: Pressemeldungen-Ordner-ID
  undefined,                   // Progress-Callback (optional)
  {
    userId,
    description: `PDF für Campaign ${campaignData.title}`,
    originalAssetId: pdfVersionId
  }
);
```

### 5. Welche Collections muss ich zwingend aktualisieren?

```typescript
// Nach erfolgreichem Upload ALLE Referenzen aktualisieren:

// A) Campaign Collection - Key Visual
if (assetType === 'keyVisual') {
  await updateDoc(doc(db, 'pr_campaigns', campaignId), {
    'keyVisual.assetId': newAsset.id,
    'keyVisual.url': newAsset.downloadUrl
  });
}

// B) Campaign Collection - Attached Assets
if (assetType === 'attachment') {
  const campaign = await getDoc(doc(db, 'pr_campaigns', campaignId));
  const attachedAssets = campaign.data().attachedAssets || [];

  const updatedAssets = attachedAssets.map(asset =>
    asset.assetId === originalAssetId
      ? { ...asset, assetId: newAsset.id }
      : asset
  );

  await updateDoc(doc(db, 'pr_campaigns', campaignId), {
    attachedAssets: updatedAssets
  });
}

// C) PDF Versions Collection
if (assetType === 'pdf') {
  await updateDoc(doc(db, 'pdf_versions', originalAssetId), {
    downloadUrl: newAsset.downloadUrl,
    storageRef: newAsset.storageRef,
    folderId: newAsset.folderId,
    migratedAt: serverTimestamp()
  });
}

// D) Media Assets Collection (automatisch durch uploadClientMedia)
// Wird automatisch erstellt mit:
// - folderId: targetFolder.id
// - clientId: campaignData.clientId
// - organizationId: organizationId
```

### 6. Wie finde ich raus welches Key Visual verwendet wird?

```typescript
// In Campaign Document
const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
const campaignData = campaignDoc.data();

// Key Visual Asset-ID
const keyVisualAssetId = campaignData.keyVisual?.assetId;

if (keyVisualAssetId) {
  // Asset-Details laden
  const keyVisualDoc = await getDoc(doc(db, 'media_assets', keyVisualAssetId));
  if (keyVisualDoc.exists()) {
    const keyVisualData = keyVisualDoc.data();
    // keyVisualData.downloadUrl, keyVisualData.fileName, etc.
  }
}
```

### 7. Wie finde ich raus welche Medien angehängt sind?

```typescript
// In Campaign Document - attachedAssets Array
const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
const campaignData = campaignDoc.data();

const attachedAssets = campaignData.attachedAssets || [];

for (const attachment of attachedAssets) {
  if (attachment.assetId) {
    // Asset-Details laden
    const assetDoc = await getDoc(doc(db, 'media_assets', attachment.assetId));
    if (assetDoc.exists()) {
      const assetData = assetDoc.data();
      // assetData.downloadUrl, assetData.fileName, etc.
    }
  }
}
```

### 8. Wie finde ich raus wo "ALLE" PDFs für die Versionierung liegen?

```typescript
// Query pdf_versions Collection nach campaignId
const pdfQuery = query(
  collection(db, 'pdf_versions'),
  where('campaignId', '==', campaignId),
  where('isDeleted', '==', false)  // Nur aktive PDFs
);

const pdfSnapshot = await getDocs(pdfQuery);

pdfSnapshot.forEach((pdfDoc) => {
  const pdfData = pdfDoc.data();
  if (pdfData.downloadUrl && pdfData.fileName) {
    // pdfDoc.id = PDF Version ID
    // pdfData.downloadUrl = Aktuelle PDF URL
    // pdfData.fileName = PDF Dateiname
    // pdfData.version = Versionsnummer
  }
});
```

---

## Benötigte Dateien, Services, Collections und Funktionen

### **Services:**
- `mediaService.getAllFoldersForOrganization(organizationId)` - Alle Ordner laden
- `mediaService.uploadClientMedia(file, orgId, clientId, folderId, progress, metadata)` - Datei hochladen
- `getDoc(doc(db, collection, id))` - Firestore Document laden
- `getDocs(query())` - Firestore Query ausführen
- `updateDoc(doc(db, collection, id), data)` - Firestore Document aktualisieren

### **Collections:**
- `pr_campaigns` - Campaign-Daten mit keyVisual und attachedAssets
- `media_assets` - Alle Medien-Dateien mit folderId und clientId
- `pdf_versions` - PDF-Versionen mit campaignId-Referenz
- `projects` - Projekt-Daten mit customer-Referenz
- `companies` - Kunden-Daten für Ordner-Namen
- `media_folders` - Ordner-Struktur mit parentFolderId

### **Firestore Funktionen:**
- `doc(db, collection, id)` - Document-Referenz
- `collection(db, collection)` - Collection-Referenz
- `query(collection, where(), where())` - Query mit Filtern
- `where('field', '==', value)` - Query-Filter
- `serverTimestamp()` - Server-Zeitstempel

### **Dateistrukturen:**
- **Campaign.keyVisual.assetId** - Key Visual Asset-ID
- **Campaign.attachedAssets[].assetId** - Attached Asset-IDs
- **PDFVersion.campaignId** - Campaign-Referenz in PDF
- **MediaAsset.folderId** - Ordner-Zuordnung
- **MediaFolder.parentFolderId** - Ordner-Hierarchie
- **Project.customer.id** - Kunden-Referenz

### **Key Functions:**
```typescript
// EXAKTE Funktionssignaturen:
mediaService.getAllFoldersForOrganization(organizationId: string): Promise<MediaFolder[]>
mediaService.uploadClientMedia(file: File, orgId: string, clientId: string, folderId: string, progress?: Function, metadata?: object): Promise<MediaAsset>
getDoc(docRef: DocumentReference): Promise<DocumentSnapshot>
getDocs(query: Query): Promise<QuerySnapshot>
updateDoc(docRef: DocumentReference, data: object): Promise<void>
```

---

## Kopiervorgang + CORS + Firebase Admin SDK Problematik

### **Das Grundproblem: Asset-Duplizierung zwischen Storage-Locations**

**Ziel:** Bestehende Campaign-Assets in neue Projekt-Ordner **duplizieren** (nicht verschieben!).

### **CORS-Problem bei Client-seitigem Download:**
```typescript
// ❌ FUNKTIONIERT NICHT - CORS-Fehler
const response = await fetch(originalAsset.downloadUrl);
// Error: Access to fetch at 'https://firebasestorage.googleapis.com/...'
// from origin 'https://yourapp.com' has been blocked by CORS policy
```

**Warum:** Firebase Storage URLs sind CORS-geschützt für direkte Zugriffe von anderen Domains.

### **Firebase Admin SDK Verbot:**
```typescript
// ❌ VERBOTEN - Organisationsrichtlinie
import { getStorage } from 'firebase-admin/storage';
// Error: Firebase Admin SDK darf nicht verwendet werden
```

**Grund:** Sicherheitsrichtlinie verhindert Admin SDK Nutzung in der Organisation.

### **Hybridlösung: Server-seitige API Route + Client SDK**

**Strategie:** Server-seitige API Route umgeht CORS, verwendet aber nur Client SDK.

#### **1. Server-seitiger Download (CORS-Umgehung):**
```typescript
// ✅ FUNKTIONIERT - Server-seitig in API Route
export async function POST(request: NextRequest) {
  // Server kann direkte Requests an Firebase Storage machen
  const response = await fetch(originalAsset.downloadUrl);
  const arrayBuffer = await response.arrayBuffer();

  // Validierung: Nur Firebase Storage URLs erlauben
  if (!downloadUrl.includes('firebasestorage.googleapis.com')) {
    throw new Error('Nur Firebase Storage URLs erlaubt');
  }
}
```

#### **2. Client SDK Upload (Security Rules konform):**
```typescript
// ✅ FUNKTIONIERT - Verwendet Client SDK + Security Rules
import { uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/client-init';

// Upload mit Client SDK
const storageRef = ref(storage, storagePath);
const uploadMetadata = {
  customMetadata: {
    migratedFrom: originalAssetId,
    organizationId: organizationId,
    uploaded: new Date().toISOString()
  }
};

const snapshot = await uploadBytes(storageRef, arrayBuffer, uploadMetadata);
const newDownloadUrl = await getDownloadURL(snapshot.ref);
```

#### **3. Spezielle Firebase Storage Security Rules:**
```typescript
// storage.rules - Migration-spezifische Regeln
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // MIGRATION-SPECIFIC RULES: Server-seitige Asset-Migration erlauben
    match /organizations/{orgId}/media/{fileName} {
      allow create: if
        // Asset existiert noch nicht
        resource == null &&

        // Migration-Metadaten vorhanden
        request.resource.metadata.migratedFrom != null &&
        request.resource.metadata.organizationId == orgId &&

        // Größenbegrenzung
        request.resource.size < 100 * 1024 * 1024 &&

        // Nur erlaubte Dateitypen
        (request.resource.contentType.matches('image/.*') ||
         request.resource.contentType == 'application/pdf') &&

        // Timestamp-Pattern im Dateinamen (verhindert Missbrauch)
        fileName.matches('.*[0-9]{13}_.*');
    }
  }
}
```

### **Warum keine einfacheren Lösungen funktionieren:**

#### **❌ Option A: Client-seitiger Download**
```typescript
// Scheitert an CORS
const response = await fetch(originalAsset.downloadUrl); // CORS Error
```

#### **❌ Option B: Firebase Admin SDK**
```typescript
// Verboten durch Organisationsrichtlinie
import admin from 'firebase-admin'; // Policy Error
```

#### **❌ Option C: Cloud Functions**
```typescript
// Würde funktionieren, aber:
// - Zusätzliche Infrastruktur nötig
// - Deployment-Komplexität
// - Admin SDK wäre trotzdem verboten
```

#### **✅ Option D: Hybridlösung (Gewählt)**
- **Server-API:** Umgeht CORS für Download
- **Client SDK:** Bleibt Security Rules konform
- **Spezielle Rules:** Erlauben Migration-Uploads
- **Kein Admin SDK:** Entspricht Organisationsrichtlinien

### **Migration-Workflow im Detail:**

```typescript
// 1. CLIENT: Migration-Request senden
const response = await fetch('/api/migrate-campaign-assets', {
  method: 'POST',
  body: JSON.stringify({ campaignId, projectId, organizationId, userId })
});

// 2. SERVER: Assets sammeln und downloaden
for (const asset of assets) {
  // Server-seitiger Download (umgeht CORS)
  const response = await fetch(asset.downloadUrl);
  const arrayBuffer = await response.arrayBuffer();

  // Client SDK Upload (Security Rules konform)
  const storageRef = ref(storage, `organizations/${orgId}/media/${timestamp}_${fileName}`);
  const snapshot = await uploadBytes(storageRef, arrayBuffer, metadata);

  // Firestore Updates via Client SDK
  await mediaService.uploadClientMedia(...);
}

// 3. CLIENT: Erfolg verarbeiten
const result = await response.json();
```

### **Sicherheitsaspekte:**

#### **Storage Rules Validation:**
- **Timestamp-Pattern:** Verhindert willkürliche Dateinamen
- **Metadata-Requirement:** Nur Migration-Uploads mit korrekten Metadaten
- **Size Limits:** Verhindert Missbrauch
- **Content-Type Validation:** Nur Bilder und PDFs

#### **API Route Validation:**
- **URL Validation:** Nur Firebase Storage URLs
- **Organization Check:** Nur Assets der eigenen Organisation
- **User Authentication:** Über Next.js Session
- **Rate Limiting:** Verhindert Spam

### **Warum diese Lösung optimal ist:**

1. **CORS-Problem gelöst** - Server-seitiger Download
2. **Admin SDK vermieden** - Client SDK + Security Rules
3. **Sicherheit gewährleistet** - Strenge Validierung
4. **Performance gut** - Direkte Storage-zu-Storage Kopie
5. **Organisationskonform** - Keine verbotenen APIs
6. **Skalierbar** - Funktioniert für große Asset-Mengen
7. **Fehlerbehandlung** - Einzelne Assets können fehlschlagen
8. **Auditierbar** - Migration-Metadaten für Tracking