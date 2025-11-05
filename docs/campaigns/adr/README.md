# Architecture Decision Records (ADRs) - Campaign Edit Page

**Modul:** Campaign Edit Page
**Version:** 1.1 (Phase 1.1 - Foundation)
**Letzte Aktualisierung:** 05. November 2025

---

## ADR-Index

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| [ADR-0001](#adr-0001-campaigncontext-statt-react-query) | CampaignContext statt React Query | ✅ Accepted | Nov 2025 |
| [ADR-0002](#adr-0002-tab-modularisierung-strategy) | Tab-Modularisierung Strategy | ✅ Accepted | Nov 2025 |
| [ADR-0003](#adr-0003-toast-service-integration) | Toast Service Integration | ✅ Accepted | Nov 2025 |
| [ADR-0004](#adr-0004-generatepdf-implementierung) | generatePdf Implementierung | ✅ Accepted | Nov 2025 |
| [ADR-0005](#adr-0005-edit-lock-system) | Edit-Lock System | ✅ Accepted | Nov 2025 |

---

## ADR-0001: CampaignContext statt React Query

**Status:** ✅ Accepted
**Datum:** November 2025
**Entscheidungsträger:** CeleroPress Development Team

### Kontext

Die Campaign Edit Page benötigte ein State-Management für:
- Campaign-Daten (Titel, Content, Keywords, etc.)
- UI-States (activeTab, loading, saving)
- PDF-Generierung (generatingPdf, currentPdfVersion)
- Edit-Lock Status (isLocked, reason)
- Approval-Workflow (approvalData, previousFeedback)

**Problem:** ~50+ useState in page.tsx führten zu:
- Prop-Drilling durch alle Komponenten
- Inkonsistente State-Updates
- Schwer testbar
- Unübersichtlich

### Entscheidung

Wir haben uns für **CampaignContext** (React Context API) entschieden.

**Warum nicht React Query?**
- ❌ React Query ist für **Server-State** optimiert (Caching, Background-Refetching)
- ❌ Campaign Edit hat **lokale UI-States** (activeTab, generatingPdf) die NICHT gecached werden sollten
- ❌ Optimistic Updates bei Campaign-Änderungen sind kompliziert in React Query
- ❌ Overhead für einfaches State-Sharing zwischen Tabs

**Vorteile von CampaignContext:**
- ✅ **Einfach:** useState + useCallback + Context = Clean API
- ✅ **Flexibel:** Beliebige State-Struktur möglich
- ✅ **Schnell:** Keine Query-Invalidierung nötig bei lokalen Änderungen
- ✅ **Testbar:** Context-Mocking ist einfacher als React Query-Mocking
- ✅ **Kein Overhead:** Keine zusätzlichen Dependencies

### Alternativen

#### Option A: React Query (Verwor fen)

**Pro:**
- Etabliert, große Community
- Automatisches Caching (5min staleTime)
- Built-in Error Handling

**Contra:**
- ❌ Overhead für lokale UI-States
- ❌ Query-Invalidierung bei jedem Update nötig
- ❌ Komplexe Setup-Konfiguration
- ❌ Optimistic Updates schwieriger zu implementieren

**Code-Beispiel:**
```typescript
// NICHT gewählt: React Query
const { data: campaign, isLoading } = useQuery({
  queryKey: ['campaign', campaignId],
  queryFn: () => prService.getById(campaignId),
  staleTime: 5 * 60 * 1000
});

// Problem: activeTab, generatingPdf, etc. müssten separat gemanaged werden
const [activeTab, setActiveTab] = useState(1);
const [generatingPdf, setGeneratingPdf] = useState(false);
// ... weitere lokale States
```

#### Option B: Zustand + SWR (Verworfen)

**Pro:**
- Leichtgewichtig
- Einfache API

**Contra:**
- ❌ Weniger Features als React Query
- ❌ Manuelle Cache-Verwaltung
- ❌ Zusätzliche Dependency

### Konsequenzen

#### Vorteile

**✅ Simplified State Management:**
```typescript
// Alle States zentral im Context
const {
  campaign,
  loading,
  campaignTitle,
  updateTitle,
  editorContent,
  updateEditorContent,
  generatePdf,
  generatingPdf,
  // ... weitere States
} = useCampaign();
```

**✅ Keine Props-Drilling:**
```typescript
// Vorher: Props durch alle Komponenten
<ContentTab
  campaignTitle={campaignTitle}
  onTitleChange={setCampaignTitle}
  editorContent={editorContent}
  onEditorContentChange={setEditorContent}
  // ... 20 weitere Props
/>

// Nachher: Context im Tab
function ContentTab() {
  const { campaignTitle, updateTitle, editorContent, updateEditorContent } = useCampaign();
  // Keine Props nötig!
}
```

**✅ Optimistic Updates trivial:**
```typescript
const updateTitle = useCallback((title: string) => {
  setCampaignTitle(title); // Sofortiges UI-Update
}, []);
// Speichern erfolgt später über saveCampaign()
```

#### Trade-offs

**⚠️ Kein automatisches Caching:**
- Context cached nicht automatisch
- Lösung: loadCampaign() bei Mount + reloadCampaign() bei Bedarf

**⚠️ Kein Background-Refetching:**
- Campaign wird nicht automatisch im Hintergrund aktualisiert
- Lösung: Nicht nötig bei Edit-Page (User macht aktive Änderungen)

**⚠️ Manuelle Loading-States:**
- loading, saving, generatingPdf müssen manuell gemanaged werden
- Lösung: Klare State-Struktur im Context

### Implementation

**Context-Struktur:**
```typescript
interface CampaignContextValue {
  // Core State
  campaign: PRCampaign | null;
  loading: boolean;
  saving: boolean;

  // Navigation
  activeTab: 1 | 2 | 3 | 4;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;

  // Content States
  campaignTitle: string;
  editorContent: string;
  updateTitle: (title: string) => void;
  updateEditorContent: (content: string) => void;

  // ... weitere States & Actions
}
```

**Performance-Optimierungen:**
```typescript
// useCallback für alle Update-Functions
const updateTitle = useCallback((title: string) => {
  setCampaignTitle(title);
}, []);

// useMemo für berechnete Werte (SEO-Score)
const seoScore = useMemo(() => {
  // ... Berechnung
}, [campaignTitle, editorContent, keywords]);
```

### Lessons Learned

**Was funktioniert gut:**
- Einfache API (`useCampaign()` Hook)
- Klare Separation (Context = State, Tabs = UI)
- Schnelle Entwicklung (keine Query-Config nötig)

**Was zu beachten ist:**
- Context-Provider muss korrekt platziert werden (um CampaignEditPageContent)
- Loading-States müssen konsistent gehandhabt werden
- Context sollte nicht zu groß werden (aktuell ~580 Zeilen - noch OK)

---

## ADR-0002: Tab-Modularisierung Strategy

**Status:** ✅ Accepted
**Datum:** November 2025

### Kontext

Die Campaign Edit Page hatte ursprünglich ~2.437 Zeilen Code in einer einzigen Datei (page.tsx).

**Problem:**
- Schwer wartbar (zu viel Code an einer Stelle)
- Schwer testbar (keine Isolation)
- Lange Ladezeiten (kein Code-Splitting)
- Unübersichtlich (User scrollt durch 2.000+ Zeilen)

### Entscheidung

**4 separate Tab-Komponenten erstellen:**
1. **ContentTab** (~180 Zeilen) - Editor, SEO, Key Visual
2. **AttachmentsTab** (~139 Zeilen) - Medien, Boilerplates
3. **ApprovalTab** (~250 Zeilen) - Freigaben, Pipeline
4. **PreviewTab** (~200 Zeilen) - PDF-Generation, Final Preview

**Zusätzliche Support-Komponenten:**
- CampaignHeader (~100 Zeilen)
- TabNavigation (~80 Zeilen)
- LoadingState (~40 Zeilen)
- ErrorState (~40 Zeilen)

### Alternativen

#### Option A: Sections innerhalb page.tsx (Verworfen)

**Pro:**
- Kein Code-Splitting nötig
- Einfache Navigation zwischen Sections

**Contra:**
- ❌ Keine echte Code-Reduktion
- ❌ Weiterhin ~2.400 Zeilen in einer Datei
- ❌ Schwer testbar

#### Option B: Feature-basierte Modularisierung (Verworfen)

**Pro:**
- Granularere Komponenten
- Sehr kleine Dateien (<100 Zeilen)

**Contra:**
- ❌ Zu viele Dateien (Overhead)
- ❌ Komplexere Ordnerstruktur
- ❌ Mehr Koordination zwischen Komponenten nötig

**Beispiel:**
```
components/
├── editor/
│   ├── TitleInput.tsx
│   ├── ContentEditor.tsx
│   └── KeywordsInput.tsx
├── seo/
│   ├── SEOScore.tsx
│   └── SEOHints.tsx
├── assets/
│   ├── KeyVisualUploader.tsx
│   ├── MediaList.tsx
│   └── BoilerplateLoader.tsx
// ... 20+ weitere Komponenten
```

### Konsequenzen

#### Vorteile

**✅ Code-Reduktion:**
- page.tsx: 2.437 → ~1.456 Zeilen (-40%)
- Tabs sind eigenständig wartbar
- Support-Komponenten wiederverwendbar

**✅ Bessere Testbarkeit:**
```typescript
// Tab isoliert testen
describe('ContentTab', () => {
  it('sollte Titel ändern', () => {
    const mockUpdate = jest.fn();
    render(
      <CampaignProvider value={{ updateTitle: mockUpdate }}>
        <ContentTab />
      </CampaignProvider>
    );
    // ... Test
  });
});
```

**✅ Code-Splitting möglich:**
```typescript
// Lazy-Loading für Tabs (zukünftig)
const ContentTab = lazy(() => import('./tabs/ContentTab'));
const AttachmentsTab = lazy(() => import('./tabs/AttachmentsTab'));
// ... etc.
```

#### Trade-offs

**⚠️ Mehr Dateien:**
- Vorher: 1 Datei (page.tsx)
- Nachher: 9 Dateien (page.tsx + 4 Tabs + 4 Support)
- Lösung: Klare Ordnerstruktur (`tabs/`, `components/`)

**⚠️ Context-Dependency:**
- Alle Tabs benötigen CampaignContext
- Lösung: Dokumentierte Context-API (`useCampaign()` Hook)

### Implementation

**Ordnerstruktur:**
```
src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/
├── page.tsx                      # Orchestrator (~1.456 Zeilen)
├── context/
│   └── CampaignContext.tsx       # State Management (~587 Zeilen)
├── tabs/
│   ├── ContentTab.tsx            # ~180 Zeilen
│   ├── AttachmentsTab.tsx        # ~139 Zeilen
│   ├── ApprovalTab.tsx           # ~250 Zeilen
│   └── PreviewTab.tsx            # ~200 Zeilen
└── components/
    ├── CampaignHeader.tsx        # ~100 Zeilen
    ├── TabNavigation.tsx         # ~80 Zeilen
    ├── LoadingState.tsx          # ~40 Zeilen
    └── ErrorState.tsx            # ~40 Zeilen
```

**React.memo für Performance:**
```typescript
export default React.memo(function ContentTab({
  organizationId,
  userId,
  campaignId,
  onOpenAiModal,
  onSeoScoreChange
}: ContentTabProps) {
  // ... Tab-Code
});
```

### Lessons Learned

**Was funktioniert gut:**
- Tab-basierte Struktur ist intuitiv (1 Tab = 1 Datei)
- Props minimal (Infrastructure-Props + Callbacks)
- Context-Integration ist clean

**Was zu beachten ist:**
- Tabs sollten < 300 Zeilen bleiben
- Wenn Tab zu groß wird → weitere Sub-Komponenten extrahieren
- Lazy-Loading noch nicht nötig (Performance ist gut genug)

---

## ADR-0003: Toast Service Integration

**Status:** ✅ Accepted
**Datum:** November 2025

### Kontext

Die Campaign Edit Page benötigte User-Feedback für:
- Erfolgsmeldungen (Campaign gespeichert)
- Fehlermeldungen (Validierung fehlgeschlagen)
- Warnungen (Edit-Lock aktiv)
- Info-Meldungen (PDF wird generiert)

**Problem:** Verschiedene Feedback-Mechanismen im Projekt:
- Alert-Komponenten (Inline)
- Browser-Alerts (`alert()`)
- Custom Toast-Implementations

### Entscheidung

**Zentraler Toast-Service verwenden** (`src/lib/utils/toast.ts`)

**Basiert auf:** `react-hot-toast`

### Alternativen

#### Option A: Inline-Alert-Komponenten (Verworfen)

**Pro:**
- Inline-Anzeige (nah am Fehler)
- Custom Styling möglich

**Contra:**
- ❌ Lokaler State nötig (`useState<Alert | null>`)
- ❌ Nimmt Platz weg (Layout verschiebt sich)
- ❌ Muss manuell geschlossen werden
- ❌ ~35 Zeilen Code pro Page

**Code-Beispiel:**
```typescript
// NICHT gewählt: Inline-Alert
const [alert, setAlert] = useState<Alert | null>(null);

const showAlert = (type: 'success' | 'error', title: string, message?: string) => {
  setAlert({ type, title, message });
  setTimeout(() => setAlert(null), 5000);
};

return (
  <>
    {alert && (
      <div className={`alert-${alert.type}`}>
        <p>{alert.title}</p>
        {alert.message && <p>{alert.message}</p>}
        <button onClick={() => setAlert(null)}>✕</button>
      </div>
    )}
    {/* Restliche Page */}
  </>
);
```

#### Option B: Browser-Alerts (Verworfen)

**Pro:**
- Kein Code nötig
- Built-in

**Contra:**
- ❌ Blockiert UI (modal)
- ❌ Schlechte UX
- ❌ Kein Styling möglich
- ❌ Kein Auto-Close

### Konsequenzen

#### Vorteile

**✅ Weniger Code:**
```typescript
// Vorher: ~35 Zeilen Alert-State
const [alert, setAlert] = useState<Alert | null>(null);
const showAlert = (type, title, message) => { /* ... */ };
{alert && <Alert ... />}

// Nachher: 1 Import
import { toastService } from '@/lib/utils/toast';
toastService.success('Campaign gespeichert');
```

**✅ Bessere UX:**
- Non-blocking (User kann weiterarbeiten)
- Auto-Close (3-5 Sekunden)
- Top-right Position (konsistent)
- Stapelbar (mehrere Toasts gleichzeitig)

**✅ Konsistentes Design:**
- Einheitliche Benachrichtigungen im gesamten Modul
- Zentrale Wartung (nur toast.ts anpassen)

#### Trade-offs

**⚠️ Dependency:**
- `react-hot-toast` Library nötig
- Lösung: Bereits im Projekt vorhanden

**⚠️ Keine Inline-Errors:**
- Toasts sind Top-right (nicht nah am Fehler)
- Lösung: Für Field-Validierung weiterhin Inline-Errors verwenden

### Implementation

**Basic Usage:**
```typescript
import { toastService } from '@/lib/utils/toast';

// Success (3s, grün)
toastService.success('Campaign erfolgreich gespeichert');

// Error (5s, rot)
toastService.error('Fehler beim Speichern der Campaign');

// Warning (4s, gelb)
toastService.warning('Edit-Lock aktiv - Campaign kann nicht gespeichert werden');

// Info (4s, blau)
toastService.info('PDF wird generiert...');
```

**Promise-based (automatisch Loading → Success/Error):**
```typescript
await toastService.promise(
  generatePdf(),
  {
    loading: 'PDF wird generiert...',
    success: 'PDF erfolgreich erstellt!',
    error: 'PDF-Generierung fehlgeschlagen'
  }
);
```

**Mit Context:**
```typescript
const handleSubmit = async () => {
  try {
    await prService.update(campaignId, campaignData);
    toastService.success('Campaign gespeichert');
    router.push(`/dashboard/projects/${projectId}`);
  } catch (error) {
    toastService.error('Fehler beim Speichern');
  }
};
```

### Lessons Learned

**Was funktioniert gut:**
- Einfache API (ein Zeilen-Call)
- Gute UX (Non-blocking, Auto-Close)
- Konsistente Benachrichtigungen

**Was zu beachten ist:**
- Nicht für Field-Validierung verwenden (zu weit weg)
- Keine zu langen Nachrichten (max. 2 Zeilen)
- Promise-Toast für lange Operationen nutzen

---

## ADR-0004: generatePdf Implementierung

**Status:** ✅ Accepted
**Datum:** November 2025

### Kontext

Die Campaign Edit Page benötigte PDF-Generierung für:
- Vorschau-PDFs (Draft, ohne DB-Eintrag)
- Approval-PDFs (mit DB-Eintrag, für Kunden-Freigabe)
- Pipeline-PDFs (für Projekt-Management)

**Problem:** Bug - "PDF generieren" Button ohne Funktion

### Entscheidung

**generatePdf() in CampaignContext implementieren**

**Grund:**
- PDF-Generierung ist Campaign-spezifisch
- Benötigt Zugriff auf Campaign-States (title, content, boilerplates, keyVisual)
- Sollte von allen Tabs aus aufrufbar sein

### Alternativen

#### Option A: generatePdf() in page.tsx (Verworfen)

**Pro:**
- Näher an Firestore-Services
- Einfacher Service-Aufruf

**Contra:**
- ❌ Müsste als Prop durch alle Tabs weitergereicht werden
- ❌ Zugriff auf Campaign-States kompliziert
- ❌ Inkonsistent mit restlichem Context-Pattern

#### Option B: Separater usePdfGeneration Hook (Verworfen)

**Pro:**
- Isolierte PDF-Logik
- Wiederverwendbar

**Contra:**
- ❌ Benötigt trotzdem Zugriff auf Campaign-States → Duplicate Context
- ❌ Overhead (zusätzlicher Hook)

### Konsequenzen

#### Vorteile

**✅ Context-Integration:**
```typescript
const {
  generatePdf,
  generatingPdf,
  currentPdfVersion
} = useCampaign();

// Einfacher Aufruf
await generatePdf(forApproval: false);
```

**✅ Zugriff auf alle Campaign-States:**
```typescript
const generatePdf = async (forApproval: boolean = false) => {
  // Alle States verfügbar
  const pdfVersionId = await pdfVersionsService.createPDFVersion(
    campaignId,
    organizationId,
    {
      title: campaignTitle,       // ✅ Aus Context
      mainContent: editorContent, // ✅ Aus Context
      boilerplateSections,        // ✅ Aus Context
      keyVisual,                  // ✅ Aus Context
      clientName: selectedCompanyName, // ✅ Aus Context
      templateId: selectedTemplateId   // ✅ Aus Context
    },
    {
      userId: user.uid,
      status: forApproval ? 'pending_customer' : 'draft'
    }
  );
};
```

**✅ Loading-State zentral:**
```typescript
const [generatingPdf, setGeneratingPdf] = useState(false);

const generatePdf = async () => {
  setGeneratingPdf(true);
  try {
    // ... PDF-Generierung
  } finally {
    setGeneratingPdf(false);
  }
};

// Alle Tabs haben Zugriff auf loading-state
const { generatingPdf } = useCampaign();
```

#### Trade-offs

**⚠️ Context wird größer:**
- generatePdf() Funktion + States (~50 Zeilen)
- Lösung: Noch akzeptabel (Context gesamt ~580 Zeilen)

### Implementation

**Context:**
```typescript
interface CampaignContextValue {
  // PDF Generation
  generatingPdf: boolean;
  currentPdfVersion: PDFVersion | null;
  generatePdf: (forApproval?: boolean) => Promise<void>;
}

const generatePdf = async (forApproval: boolean = false) => {
  if (!user || !campaignTitle.trim()) {
    toastService.error('Bitte füllen Sie alle erforderlichen Felder aus');
    return;
  }

  // Validierung
  const errors: string[] = [];
  if (!selectedCompanyId) errors.push('Bitte wählen Sie einen Kunden aus');
  if (!campaignTitle.trim()) errors.push('Titel ist erforderlich');
  if (!editorContent.trim() || editorContent === '<p></p>') errors.push('Inhalt ist erforderlich');

  if (errors.length > 0) {
    toastService.error(errors.join(', '));
    return;
  }

  setGeneratingPdf(true);

  try {
    // PDF-Version erstellen
    const pdfVersionId = await pdfVersionsService.createPDFVersion(
      campaignId,
      organizationId,
      {
        title: campaignTitle,
        mainContent: editorContent,
        boilerplateSections,
        keyVisual,
        clientName: selectedCompanyName,
        templateId: selectedTemplateId
      },
      {
        userId: user.uid,
        status: forApproval ? 'pending_customer' : 'draft'
      }
    );

    // PDF-Version für Vorschau laden
    const newVersion = await pdfVersionsService.getCurrentVersion(campaignId);
    setCurrentPdfVersion(newVersion);

    toastService.success('PDF erfolgreich generiert!');

  } catch (error) {
    toastService.error('Fehler bei der PDF-Erstellung');
  } finally {
    setGeneratingPdf(false);
  }
};
```

**Tab-Usage:**
```typescript
function PreviewTab() {
  const { generatePdf, generatingPdf, currentPdfVersion } = useCampaign();

  return (
    <>
      <Button onClick={() => generatePdf(false)} disabled={generatingPdf}>
        {generatingPdf ? 'Generiert...' : 'PDF generieren'}
      </Button>

      {currentPdfVersion && (
        <PipelinePDFViewer
          pdfUrl={currentPdfVersion.downloadUrl}
          version={currentPdfVersion.version}
        />
      )}
    </>
  );
}
```

### Lessons Learned

**Was funktioniert gut:**
- Einfache API (`generatePdf()` + `generatingPdf` State)
- Validierung vor PDF-Generierung verhindert Fehler
- Loading-State gibt User klares Feedback

**Was zu beachten ist:**
- Validierung ist kritisch (Campaign muss vollständig sein)
- Error-Handling muss User-freundlich sein
- PDF-Generation dauert 2-4 Sekunden → Loading-State essentiell

---

## ADR-0005: Edit-Lock System

**Status:** ✅ Accepted
**Datum:** November 2025

### Kontext

Wenn eine Campaign zur Kunden-Freigabe geschickt wird, sollte sie nicht mehr bearbeitbar sein (sonst stimmt die PDF nicht mehr mit dem Campaign-Content überein).

**Problem:** User könnten Campaign nach Freigabe-Anforderung weiter bearbeiten.

### Entscheidung

**Edit-Lock System implementieren:**
- Campaign wird bei Freigabe-Anforderung automatisch gesperrt
- Edit-Lock Status wird in CampaignContext geladen
- Banner zeigt Lock-Grund & erlaubt Unlock-Request
- Speichern-Button wird deaktiviert bei aktivem Lock

### Alternativen

#### Option A: Soft-Lock (nur Warnung) (Verworfen)

**Pro:**
- Flexibler (User kann trotzdem speichern)
- Keine Unlock-Requests nötig

**Contra:**
- ❌ Keine Garantie dass PDF & Content übereinstimmen
- ❌ Kunde bekommt ggf. falsche PDF

#### Option B: Read-Only-Modus (Verworfen)

**Pro:**
- Campaign ist vollständig gesperrt
- Keine Änderungen möglich

**Contra:**
- ❌ Zu restriktiv (auch Admin kann nicht mehr bearbeiten)
- ❌ Keine Unlock-Möglichkeit

### Konsequenzen

#### Vorteile

**✅ Datenintegrität:**
- PDF & Campaign-Content bleiben synchron
- Kunde bekommt korrekten Content

**✅ Unlock-Workflow:**
```typescript
// User kann Unlock anfordern mit Begründung
await pdfVersionsService.requestUnlock(campaignId, {
  userId: user.uid,
  displayName: user.displayName,
  reason: 'Dringender Fehler muss korrigiert werden'
});

// Admin kann Request bearbeiten
await pdfVersionsService.processUnlockRequest(
  campaignId,
  unlockRequestId,
  'approved', // oder 'rejected'
  'OK, entsperrt für Korrektur'
);
```

**✅ Klare UX:**
```typescript
{editLockStatus.isLocked && (
  <EditLockBanner
    campaign={campaign}
    onRequestUnlock={handleUnlockRequest}
    showDetails={true}
  />
)}
```

#### Trade-offs

**⚠️ Zusätzlicher Unlock-Workflow:**
- Unlock-Requests müssen von Admins bearbeitet werden
- Lösung: Approval-Service übernimmt Request-Management

**⚠️ Context-Overhead:**
- Edit-Lock Status muss geladen werden
- Lösung: Parallel zu Campaign-Loading (keine zusätzliche Verzögerung)

### Implementation

**Context:**
```typescript
interface CampaignContextValue {
  editLockStatus: EditLockData;
  loadingEditLock: boolean;
}

interface EditLockData {
  isLocked: boolean;
  reason?: EditLockReason;
  lockedBy?: {
    userId: string;
    displayName: string;
    action: string;
  };
  lockedAt?: Timestamp;
  unlockRequests?: UnlockRequest[];
}

// Auto-Loading bei Campaign-Load
const loadCampaign = useCallback(async () => {
  // ... Campaign laden

  // Lade Edit-Lock Status
  try {
    setLoadingEditLock(true);
    const lockStatus = await pdfVersionsService.getEditLockStatus(campaignId);
    setEditLockStatus(lockStatus);
  } catch (error) {
    // Nicht kritisch
  } finally {
    setLoadingEditLock(false);
  }
}, [campaignId]);
```

**UI-Integration:**
```typescript
// Banner anzeigen wenn locked
{!loading && !loadingEditLock && editLockStatus.isLocked && (
  <EditLockBanner
    campaign={{
      editLocked: editLockStatus.isLocked,
      editLockedReason: editLockStatus.reason,
      lockedBy: editLockStatus.lockedBy,
      lockedAt: editLockStatus.lockedAt,
      unlockRequests: editLockStatus.unlockRequests
    }}
    onRequestUnlock={handleUnlockRequest}
    onRetry={handleRetryEditLock}
    showDetails={true}
  />
)}

// Speichern-Button deaktivieren
<Button
  onClick={handleSubmit}
  disabled={saving || editLockStatus.isLocked}
>
  {editLockStatus.isLocked ? 'Gesperrt' : 'Speichern'}
</Button>
```

**Unlock-Request:**
```typescript
const handleUnlockRequest = async (reason: string) => {
  try {
    await pdfVersionsService.requestUnlock(campaignId, {
      userId: user.uid,
      displayName: user.displayName || user.email || 'Unbekannt',
      reason
    });

    toastService.success('Unlock-Request gesendet');
    await reloadCampaign(); // Edit-Lock Status neu laden

  } catch (error) {
    toastService.error('Unlock-Request fehlgeschlagen');
  }
};
```

### Lessons Learned

**Was funktioniert gut:**
- Edit-Lock verhindert zuverlässig Änderungen nach Freigabe
- Banner kommuniziert Lock-Status klar
- Unlock-Workflow ist flexibel (Admin-Entscheidung)

**Was zu beachten ist:**
- Edit-Lock muss bei Campaign-Load geprüft werden (nicht nur bei Mount)
- Unlock-Requests brauchen klare Begründung (sonst schwer nachvollziehbar)
- Admin-Tools für Unlock-Request-Management noch ausbaubar

---

## Siehe auch

- [Hauptdokumentation](../README.md)
- [API-Dokumentation](../api/README.md)
- [Komponenten-Dokumentation](../components/README.md)

---

**Letzte Aktualisierung:** 05. November 2025
**Version:** 1.1 (Phase 1.1 - Foundation)
