# Implementierungsplan: Analysen-Ordner Integration

## 📋 Übersicht

**Ziel:** Integration von Monitoring-Report-PDFs in die Projektordner-Struktur durch Hinzufügen eines neuen "Analysen"-Ordners.

**Aktueller Stand:**
- PDFs werden derzeit im "Pressemeldungen"-Ordner gespeichert (monitoring-report-service.ts:809-820)
- Projektstruktur hat 3 Standard-Ordner: Medien, Dokumente, Pressemeldungen (project-service.ts:2051-2067)
- PDF-Liste fehlt im Monitoring Analytics Tab

## 🔍 Analyse-Ergebnisse

### 1. Aktuelle Projektordner-Struktur

**Ordner-Erstellung:** `project-service.ts:1978-2116`
```typescript
// Aktuell: 3 Standard-Ordner werden erstellt
const subfolders = [
  { name: 'Medien', description: 'Bilder, Videos...' },
  { name: 'Dokumente', description: 'Projektdokumente...' },
  { name: 'Pressemeldungen', description: 'Pressemitteilungen...' }
];
```

**Projektordner-Name-Format:**
```typescript
const projectFolderName = `P-${dateStr}-${companyName}-${project.title}`;
// Beispiel: P-20250924-AcmeCorp-Launch Campaign
```

### 2. PDF-Versionierungs-Speicherort

**Aktuelles Verhalten:** `pdf-versions-service.ts:809-820`
```typescript
// PDFs landen im Pressemeldungen-Ordner
const pressemeldungenFolder = allFolders.find(folder =>
  folder.parentFolderId === projectFolder.id && folder.name === 'Pressemeldungen'
);

await mediaService.uploadClientMedia(
  pdfFile,
  organizationId,
  campaignData.clientId,
  pressemeldungenFolder.id, // ← Upload in Pressemeldungen
  undefined,
  { userId, description: `PDF für Campaign ${campaignData.title}` }
);
```

### 3. Betroffene Komponenten

#### A. **ProjectFoldersView.tsx**
- **Funktion:** Dateimanager für Projekt-Ordner (Daten-Tab)
- **Betroffene Bereiche:**
  - Ordner-Navigation (handleFolderClick, loadFolderContent)
  - Upload-Modal (MoveAssetModal - FTP-Style Navigation)
  - Breadcrumb-System
  - Keine Änderungen nötig - arbeitet dynamisch mit allen Ordnern

#### B. **MoveAssetModal (in ProjectFoldersView.tsx)**
- **Funktion:** Verschieben-Dialog mit Ordner-Navigation
- **Betroffene Bereiche:**
  - `availableFolders` prop - zeigt automatisch alle Unterordner
  - Keine Änderungen nötig - erkennt neue Ordner automatisch

#### C. **project-service.ts**
- **createProjectFolderStructure (Zeile 1978-2116):**
  - Muss erweitert werden um 4. Ordner "Analysen"
  - Ordner-Metadaten in `assetFolders` Array speichern

#### D. **Monitoring Analytics Tab (page.tsx:25-252)**
- **Aktuell:** Keine PDF-Verwaltung vorhanden
- **Neu benötigt:**
  - PDF-Download-Liste
  - Löschen-Funktion (3-Punkte-Menü)
  - Versenden-Funktion (Dummy für später)

### 4. PDF-Generierung Flow

**Aufruf-Kette:**
```
monitoring-report-service.ts:generatePDFReport()
  ↓
/api/generate-pdf (Puppeteer)
  ↓
Base64 → Blob → File
  ↓
mediaService.uploadClientMedia()
  ↓
Pressemeldungen-Ordner (MUSS GEÄNDERT WERDEN → Analysen)
```

## 📝 Implementierungsschritte

### **Schritt 1: Projektordner-Struktur erweitern**

**Datei:** `src/lib/firebase/project-service.ts`

**Änderung 1:** Füge "Analysen" zu Unterordner-Array hinzu (Zeile 2051-2067)
```typescript
const subfolders = [
  {
    name: 'Medien',
    description: 'Bilder, Videos und andere Medien-Assets für das Projekt',
    color: '#3B82F6' // Blau
  },
  {
    name: 'Dokumente',
    description: 'Projektdokumente, Briefings und Konzepte',
    color: '#10B981' // Grün
  },
  {
    name: 'Pressemeldungen',
    description: 'Pressemitteilungen und PR-Texte',
    color: '#8B5CF6' // Lila
  },
  // NEU: Analysen-Ordner
  {
    name: 'Analysen',
    description: 'Monitoring-Reports und Analytics-PDFs',
    color: '#F59E0B' // Orange
  }
];
```

**Erwartetes Ergebnis:**
- Neue Projekte haben automatisch 4 Ordner
- Bestehende Projekte: Ordner kann manuell nachträglich erstellt werden (optional: Migration-Script)

---

### **Schritt 2: PDF-Upload in Analysen-Ordner umleiten**

**Datei:** `src/lib/firebase/monitoring-report-service.ts`

**Änderung:** Zeile 809-820 - Ordnersuche ändern
```typescript
// ALT:
const pressemeldungenFolder = allFolders.find(folder =>
  folder.parentFolderId === projectFolder.id && folder.name === 'Pressemeldungen'
);

// NEU:
const analysenFolder = allFolders.find(folder =>
  folder.parentFolderId === projectFolder.id && folder.name === 'Analysen'
);

if (analysenFolder && campaignData.clientId) {
  const uploadedAsset = await mediaService.uploadClientMedia(
    pdfFile,
    organizationId,
    campaignData.clientId,
    analysenFolder.id, // ← Upload in Analysen statt Pressemeldungen
    undefined,
    { userId, description: `Monitoring Report für ${campaignData.title}` }
  );

  uploadResult = { asset: uploadedAsset };
} else {
  throw new Error('Analysen-Ordner nicht gefunden');
}
```

**Fallback für alte Projekte ohne Analysen-Ordner:**
```typescript
// Suche Analysen-Ordner, fallback auf Pressemeldungen
let targetFolder = allFolders.find(folder =>
  folder.parentFolderId === projectFolder.id && folder.name === 'Analysen'
);

if (!targetFolder) {
  // Fallback: Pressemeldungen-Ordner für alte Projekte
  targetFolder = allFolders.find(folder =>
    folder.parentFolderId === projectFolder.id && folder.name === 'Pressemeldungen'
  );
}
```

**Zusätzlich:** Logging für Debugging
```typescript
console.log('📂 PDF Upload: Projekt-Ordner gefunden:', projectFolder);
console.log('📂 PDF Upload: Analysen-Ordner gefunden:', analysenFolder);
console.log('📂 PDF Upload: Target Folder ID:', analysenFolder?.id);
```

---

### **Schritt 3: Navigations-Link generieren**

**Datei:** `src/lib/firebase/monitoring-report-service.ts`

**Neue Methode hinzufügen:**
```typescript
/**
 * Generiert einen Link zum Analysen-Ordner im Projekt
 */
async getAnalysenFolderLink(
  campaignId: string,
  organizationId: string
): Promise<string | null> {
  try {
    // Lade Campaign und Projekt-Daten
    const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
    const campaignData = campaignDoc?.exists() ? campaignDoc.data() : null;

    if (!campaignData?.projectId) return null;

    // Baue Link zum Daten-Tab mit Analysen-Ordner vorausgewählt
    const projectId = campaignData.projectId;
    const analysenFolderId = await this.findAnalysenFolder(projectId, organizationId);

    if (analysenFolderId) {
      return `/dashboard/projects/${projectId}?tab=daten&folder=${analysenFolderId}`;
    }

    return `/dashboard/projects/${projectId}?tab=daten`;
  } catch (error) {
    console.error('Fehler beim Generieren des Ordner-Links:', error);
    return null;
  }
}

private async findAnalysenFolder(
  projectId: string,
  organizationId: string
): Promise<string | null> {
  try {
    const { mediaService } = await import('./media-service');
    const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);

    // Finde Projektordner
    const projectFolder = allFolders.find(f =>
      f.name.includes('P-') && f.name.includes(projectId.substring(0, 8))
    );

    if (!projectFolder) return null;

    // Finde Analysen-Unterordner
    const analysenFolder = allFolders.find(f =>
      f.parentFolderId === projectFolder.id && f.name === 'Analysen'
    );

    return analysenFolder?.id || null;
  } catch (error) {
    return null;
  }
}
```

**Verwendung im Frontend:**
```typescript
// Nach PDF-Generierung
const folderLink = await monitoringReportService.getAnalysenFolderLink(
  campaignId,
  organizationId
);

if (folderLink) {
  // Zeige Link im UI
  <a href={folderLink}>Zum Analysen-Ordner →</a>
}
```

---

### **Schritt 4: PDF-Download-Liste im Monitoring-Tab**

**Datei:** `src/app/dashboard/pr-tools/monitoring/[campaignId]/page.tsx`

**Neue State-Variablen hinzufügen (nach Zeile 39):**
```typescript
const [analysisPDFs, setAnalysisPDFs] = useState<any[]>([]);
const [loadingPDFs, setLoadingPDFs] = useState(false);
const [analysenFolderLink, setAnalysenFolderLink] = useState<string | null>(null);
```

**Neue Lade-Funktion:**
```typescript
const loadAnalysisPDFs = async () => {
  if (!currentOrganization?.id || !campaign) return;

  try {
    setLoadingPDFs(true);

    // Finde Analysen-Ordner
    const { mediaService } = await import('@/lib/firebase/media-service');
    const allFolders = await mediaService.getAllFoldersForOrganization(currentOrganization.id);

    // Suche Projekt-Ordner über Campaign
    const projectId = campaign.projectId;
    if (!projectId) {
      setAnalysisPDFs([]);
      return;
    }

    const projectFolder = allFolders.find(f =>
      f.name.includes('P-') && f.name.includes(projectId.substring(0, 8))
    );

    if (!projectFolder) {
      setAnalysisPDFs([]);
      return;
    }

    const analysenFolder = allFolders.find(f =>
      f.parentFolderId === projectFolder.id && f.name === 'Analysen'
    );

    if (analysenFolder) {
      // Lade PDFs aus Analysen-Ordner
      const assets = await mediaService.getMediaAssets(
        currentOrganization.id,
        analysenFolder.id
      );

      // Filtere nur PDFs für diese Campaign
      const campaignPDFs = assets.filter(asset =>
        asset.fileType === 'application/pdf' &&
        asset.fileName.includes(campaign.title)
      );

      setAnalysisPDFs(campaignPDFs);

      // Generiere Ordner-Link
      setAnalysenFolderLink(
        `/dashboard/projects/${projectId}?tab=daten&folder=${analysenFolder.id}`
      );
    }
  } catch (error) {
    console.error('Fehler beim Laden der Analyse-PDFs:', error);
  } finally {
    setLoadingPDFs(false);
  }
};
```

**useEffect Hook hinzufügen:**
```typescript
useEffect(() => {
  if (activeTab === 'dashboard' && campaign) {
    loadAnalysisPDFs();
  }
}, [activeTab, campaign, currentOrganization?.id]);
```

**UI-Komponente für PDF-Liste (nach Analytics Dashboard):**
```typescript
{/* PDF-Reports Liste */}
{analysisPDFs.length > 0 && (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <DocumentArrowDownIcon className="h-5 w-5 text-gray-600 mr-2" />
        <Subheading>Generierte Reports ({analysisPDFs.length})</Subheading>
      </div>
      {analysenFolderLink && (
        <a
          href={analysenFolderLink}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Zum Analysen-Ordner →
        </a>
      )}
    </div>

    <div className="space-y-2">
      {analysisPDFs.map((pdf) => (
        <div
          key={pdf.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-5 w-5 text-red-500" />
            <div>
              <Text className="font-medium">{pdf.fileName}</Text>
              <Text className="text-xs text-gray-500">
                {pdf.createdAt?.toDate?.()?.toLocaleDateString('de-DE')}
              </Text>
            </div>
          </div>

          <Dropdown>
            <DropdownButton plain>
              <EllipsisVerticalIcon className="h-5 w-5" />
            </DropdownButton>
            <DropdownMenu anchor="bottom end">
              <DropdownItem onClick={() => window.open(pdf.downloadUrl, '_blank')}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download
              </DropdownItem>
              <DropdownItem onClick={() => handleDeletePDF(pdf.id)}>
                <TrashIcon className="h-4 w-4 mr-2 text-red-600" />
                <span className="text-red-600">Löschen</span>
              </DropdownItem>
              {/* Dummy für später */}
              <DropdownItem disabled>
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                Versenden (Coming Soon)
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      ))}
    </div>
  </div>
)}
```

**Löschen-Handler:**
```typescript
const handleDeletePDF = async (assetId: string) => {
  if (!currentOrganization?.id) return;

  if (!confirm('PDF wirklich löschen?')) return;

  try {
    const { mediaService } = await import('@/lib/firebase/media-service');
    const asset = analysisPDFs.find(p => p.id === assetId);

    if (asset) {
      await mediaService.deleteMediaAsset(asset);
      await loadAnalysisPDFs(); // Neu laden
      alert('PDF erfolgreich gelöscht');
    }
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    alert('Fehler beim Löschen des PDFs');
  }
};
```

---

### **Schritt 5: Bestehende Projekte aktualisieren (Optional)**

**Migrations-Script** (kann manuell in der Console ausgeführt werden):
```typescript
// Für bestehende Projekte den Analysen-Ordner nachträglich erstellen
async function migrateExistingProjects() {
  const { projectService } = await import('@/lib/firebase/project-service');
  const { mediaService } = await import('@/lib/firebase/media-service');

  const organizationId = 'YOUR_ORG_ID';
  const userId = 'YOUR_USER_ID';

  const projects = await projectService.getAll({ organizationId });

  for (const project of projects) {
    // Prüfe ob Analysen-Ordner bereits existiert
    const folderStructure = await projectService.getProjectFolderStructure(
      project.id!,
      { organizationId }
    );

    if (!folderStructure) continue;

    const hasAnalysenFolder = folderStructure.subfolders?.some(
      (f: any) => f.name === 'Analysen'
    );

    if (!hasAnalysenFolder && folderStructure.mainFolder?.id) {
      // Erstelle Analysen-Ordner
      await mediaService.createFolder({
        userId,
        name: 'Analysen',
        parentFolderId: folderStructure.mainFolder.id,
        description: 'Monitoring-Reports und Analytics-PDFs',
        color: '#F59E0B',
        ...(project.customer?.id && { clientId: project.customer.id })
      }, { organizationId, userId });

      console.log(`✅ Analysen-Ordner erstellt für Projekt: ${project.title}`);
    }
  }
}
```

---

## 🔧 Technische Details

### PDF-Upload-Flow mit Fehlerbehandlung
```typescript
// monitoring-report-service.ts - Erweiterte Upload-Logik
try {
  // 1. Finde Projekt-Ordner
  const projectFolder = allFolders.find(folder =>
    folder.name.includes('P-') && folder.name.includes(projectName)
  );

  if (!projectFolder) {
    console.error('❌ Projekt-Ordner nicht gefunden für:', projectName);
    throw new Error('Projekt-Ordner nicht gefunden');
  }

  // 2. Finde Analysen-Ordner mit Fallback
  let targetFolder = allFolders.find(folder =>
    folder.parentFolderId === projectFolder.id && folder.name === 'Analysen'
  );

  if (!targetFolder) {
    console.warn('⚠️ Analysen-Ordner nicht gefunden, verwende Pressemeldungen als Fallback');
    targetFolder = allFolders.find(folder =>
      folder.parentFolderId === projectFolder.id && folder.name === 'Pressemeldungen'
    );
  }

  if (!targetFolder) {
    throw new Error('Kein Zielordner verfügbar');
  }

  // 3. Upload durchführen
  const uploadedAsset = await mediaService.uploadClientMedia(
    pdfFile,
    organizationId,
    campaignData.clientId,
    targetFolder.id,
    undefined,
    { userId, description: `Monitoring Report: ${campaignData.title}` }
  );

  console.log('✅ PDF erfolgreich hochgeladen in:', targetFolder.name);

} catch (error) {
  console.error('❌ PDF-Upload fehlgeschlagen:', error);
  throw error;
}
```

### Ordner-Link mit URL-Parametern
```typescript
// URL-Format für direkten Ordner-Zugriff:
// /dashboard/projects/{projectId}?tab=daten&folder={folderId}

// Projekt-Detail-Page muss URL-Parameter auslesen:
const router = useRouter();
const searchParams = useSearchParams();

useEffect(() => {
  const tabParam = searchParams.get('tab');
  const folderParam = searchParams.get('folder');

  if (tabParam) {
    setActiveTab(tabParam as any);
  }

  if (folderParam && activeTab === 'daten') {
    // Navigiere direkt zu diesem Ordner in ProjectFoldersView
    setSelectedFolderId(folderParam);
  }
}, [searchParams]);
```

---

## ✅ Testing-Checkliste

### Manuelle Tests:
1. ✅ Neues Projekt erstellen → Prüfe ob 4 Ordner angelegt werden
2. ✅ Monitoring-Report generieren → Prüfe Upload in Analysen-Ordner
3. ✅ PDF-Liste im Analytics-Tab → Prüfe Anzeige und Download
4. ✅ Löschen-Funktion → Prüfe ob PDF entfernt wird
5. ✅ Ordner-Link → Prüfe Navigation zum Analysen-Ordner
6. ✅ Fallback für alte Projekte → Prüfe Upload in Pressemeldungen wenn Analysen fehlt
7. ✅ "Als Veröffentlicht markieren" Modal → Prüfe Speichern ohne Firestore-Fehler

### Edge Cases:
- ✅ Projekt ohne Analysen-Ordner (alte Projekte) → Funktioniert mit projectService API
- ✅ Optionale Felder leer lassen → Keine undefined-Werte mehr in Firestore
- ✅ Campaign ohne Projekt-Verknüpfung → Korrekt behandelt
- ✅ Mehrere PDFs für eine Campaign → Werden alle angezeigt
- ✅ PDF-Upload schlägt fehl (Netzwerk, Permissions) → Error-Dialog statt Alert

---

## 📊 Erwartete Ergebnisse

### Neue Projektordner-Struktur:
```
P-20250924-AcmeCorp-Launch Campaign/
├── Medien/
├── Dokumente/
├── Pressemeldungen/
└── Analysen/          ← NEU
    └── Monitoring_Launch Campaign_2025-01-19.pdf
```

### Monitoring Analytics Tab:
```
┌─────────────────────────────────────────┐
│ 📊 Analytics Dashboard                  │
│ (Charts, KPIs, Timeline...)            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📄 Generierte Reports (2)              │
│                  [Zum Analysen-Ordner →]│
├─────────────────────────────────────────┤
│ 🔴 Monitoring_Launch_2025-01-19.pdf    │
│    19.01.2025                     [...] │
│                                         │
│ 🔴 Monitoring_Launch_2025-01-18.pdf    │
│    18.01.2025                     [...] │
└─────────────────────────────────────────┘
```

---

## 🚀 Deployment-Reihenfolge

1. **Backend-Änderungen deployen:**
   - `project-service.ts` (Ordner-Erstellung)
   - `monitoring-report-service.ts` (Upload-Umleitung)

2. **Frontend-Änderungen deployen:**
   - Monitoring Analytics Tab (PDF-Liste)
   - ProjectFoldersView (keine Änderung nötig)

3. **Optional: Migration ausführen:**
   - Analysen-Ordner für bestehende Projekte nachträglich erstellen

---

## 📝 Offene Fragen

1. **Migration:** Sollen bestehende Projekte automatisch den Analysen-Ordner bekommen?
2. **Versenden-Funktion:** Wann soll die Versenden-Funktion implementiert werden?
3. **PDF-Benennung:** Soll Naming-Convention geändert werden? (aktuell: `Monitoring_{Titel}_{Datum}.pdf`)
4. **Alte PDFs:** Sollen bestehende PDFs aus Pressemeldungen in Analysen verschoben werden?

---

## 🎯 Zusammenfassung

**Änderungen:**
1. ✅ Projekt-Service: +1 Ordner "Analysen" zur Standard-Struktur
2. ✅ Monitoring-Report-Service: Upload-Ziel von Pressemeldungen → Analysen
3. ✅ Monitoring Analytics Tab: PDF-Download-Liste mit Löschen-Funktion
4. ✅ Ordner-Link-Generierung für direkten Zugriff
5. ✅ Browser-Dialoge durch UI-Komponenten ersetzt (confirm/alert → Dialog)
6. ✅ Firestore undefined-Fehler behoben (MarkPublishedModal + clippingService)
7. ✅ Folder Discovery via projectService.getProjectFolderStructure() statt manueller Suche

**Keine Änderungen nötig:**
- ProjectFoldersView (arbeitet dynamisch mit allen Ordnern)
- MoveAssetModal (erkennt neue Ordner automatisch)

**Status:** ✅ Vollständig implementiert und getestet
**Entwicklungszeit:** ~3 Stunden
**Risiko:** Niedrig (isolierte Änderungen, gute Fallbacks)

---

## 🐛 Behobene Bugs während der Implementierung

### Bug 1: PDF-Liste nicht sichtbar
**Problem:** Analytics Tab zeigte keine PDF-Liste, obwohl PDFs im Analysen-Ordner lagen
**Ursache:** Manuelle Ordnersuche mit `projectId.substring(0, 8)` funktionierte nicht
**Lösung:** `projectService.getProjectFolderStructure()` API verwenden (wie Dateimanager)
**Commits:**
- `56cf22b7` - debug: Füge Logging zur PDF-Liste hinzu
- `c4f89a40` - debug: Erweitere Projektordner-Suche mit Fallbacks
- `75a91018` - fix: Nutze projectService.getProjectFolderStructure() wie Projekt-Seite

### Bug 2: Browser-Dialoge statt UI-Komponenten
**Problem:** Löschen- und Erfolgs-Meldungen nutzten `confirm()` und `alert()`
**Lösung:** Dialog-Komponenten aus `@/components/ui/dialog` verwenden
**Commit:** `31c4f72f` - feat: Ersetze Browser-Dialoge durch UI-Komponenten

### Bug 3: Firestore undefined-Fehler
**Problem:**
```
FirebaseError: Function updateDoc() called with invalid data.
Unsupported field value: undefined (found in field publicationNotes)
```
**Ursache:** Optionale Felder mit `|| undefined` führten zu undefined-Werten in Firestore
**Lösung:** Dynamische Objekt-Erstellung - Felder nur hinzufügen wenn Wert vorhanden
**Commits:**
- `a72afe1e` - fix: Behebe Firestore undefined-Fehler und ersetze Alert durch Dialog
- `d3da6123` - fix: Entferne undefined-Werte auch aus clippingService.create()

**Betroffene Dateien:**
- `src/components/monitoring/MarkPublishedModal.tsx`
- `src/app/dashboard/pr-tools/monitoring/[campaignId]/page.tsx`