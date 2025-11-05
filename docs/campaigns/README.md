# Campaign Edit Page - Dokumentation

**Modul:** Campaign Edit Page (PR-Tools / Campaigns)
**Version:** 1.1 (Phase 1.1 - Foundation)
**Status:** ✅ Refactored
**Letzte Aktualisierung:** 05. November 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Architektur](#architektur)
- [Technologie-Stack](#technologie-stack)
- [Installation & Setup](#installation--setup)
- [Verwendung](#verwendung)
- [API-Dokumentation](#api-dokumentation)
- [Komponenten](#komponenten)
- [State Management](#state-management)
- [Troubleshooting](#troubleshooting)
- [Performance](#performance)
- [Nächste Schritte](#nächste-schritte)

---

## Übersicht

Die **Campaign Edit Page** ist die zentrale Seite zur Erstellung und Bearbeitung von PR-Kampagnen im CeleroPress-System. Nach dem Phase-1.1-Refactoring bietet sie eine modulare, wartbare Architektur mit Context-basiertem State Management.

### Hauptfunktionen

- **Content-Erstellung:** Rich-Text-Editor mit KI-Unterstützung
- **Asset-Management:** Verwaltung von Medien, Key Visuals und Textbausteinen
- **SEO-Optimierung:** Echtzeit-PR-Score-Berechnung mit detailliertem Feedback
- **PDF-Generierung:** Automatische Erstellung von Vorschau-PDFs
- **Approval-Workflow:** Kunden-Freigaben mit Pipeline-Integration
- **Multi-Tenancy:** Vollständige organizationId-Unterstützung

### Refactoring-Ziele (Phase 1.1)

**Erreicht:**
- ✅ CampaignContext für zentrales State Management
- ✅ Tab-Modularisierung (4 Tabs: Content, Attachments, Approval, Preview)
- ✅ Hook-Integration aus Context statt direkter States
- ✅ Props-Reduktion durch Context
- ✅ Code-Cleanup & Obsolete Code Removal
- ✅ Bug-Fixes (SEO-Score, PDF-Generierung, Admin-Anzeige)

**Ausstehend:**
- ⏳ Testing (Phase 4 - via refactoring-test Agent)
- ⏳ Quality Check (Phase 6 & 6.5)

---

## Features

### ✅ Content-Management

#### Rich-Text-Editor
- **TipTap-basierter Editor** mit strukturierter Formatierung
- **KI-Assistent** für automatische Rohentwürfe (Titel, Lead, Haupttext, Zitat)
- **Live-Preview** mit SEO-Score-Berechnung
- **Textbausteine** (Boilerplates) mit Drag & Drop

#### SEO-Optimierung
- **Echtzeit-PR-Score** (0-100 Punkte)
- **7 Bewertungskategorien:**
  - Headline-Qualität (30-60 Zeichen optimal)
  - Keywords-Verwendung (mindestens 3 Keywords)
  - Struktur (Absätze, Listen)
  - Relevanz (300-800 Wörter optimal)
  - Konkretheit (Zahlen, Zitate)
  - Engagement (Call-to-Action)
  - Social-Media-Tauglichkeit
- **Keyword-Tracking** mit Häufigkeitsanalyse
- **Optimierungshinweise** in Echtzeit

### ✅ Asset-Management

#### Key Visual
- **Upload** über Asset-Selector
- **Smart Router** für projekt-basierte Ordnerstruktur
- **Thumbnail-Vorschau** mit Position-Einstellung

#### Medien-Anhänge
- **Multi-Select** aus Client-Asset-Library
- **Ordner-Support** für Gallerien
- **Thumbnail-Ansicht** mit Metadaten
- **Smart Upload** mit automatischer Projekt-Zuordnung

#### Textbausteine
- **Boilerplate-Loader** mit Kategorien
- **Drag & Drop** Reihenfolge
- **Custom Titles** für jede Section
- **Content-Preview** und Bearbeitung

### ✅ PDF-Generierung

#### Vorschau-PDFs
- **Echtzeit-Generierung** über Puppeteer-API
- **Template-Support** mit verschiedenen Layouts
- **Content-Snapshot** für Versionierung
- **Download** und Browser-Vorschau

#### Pipeline-PDFs (Projekt-Integration)
- **Automatische Generierung** bei Campaign-Save
- **Projekt-Ordner-Integration** (Pressemeldungen/Vorschau/)
- **Versionierung** mit Timestamp
- **Edit-Lock** bei Freigabe-Anforderung

### ✅ Approval-Workflow

#### Kunden-Freigaben
- **Simplified Approval** mit Share-Link
- **Feedback-History** mit allen Änderungsanforderungen
- **Status-Tracking:** Draft → Pending → Approved/Rejected
- **Automatische Benachrichtigungen** an Kunden

#### Projekt-Pipeline (NEU)
- **Stage-basierter Workflow** (Draft → Customer Approval → Distribution)
- **Pipeline-Banner** mit Status-Anzeige
- **Auto-Transition** bei Approval
- **Approval-Service-Integration** für zentrale Verwaltung

### ✅ Edit-Lock-System

#### Smart Locking
- **Automatische Sperrung** bei Freigabe-Anforderung
- **Unlock-Requests** mit Begründung
- **Banner-Benachrichtigungen** für gesperrte Kampagnen
- **Admin-Unlock** über Approval-Service

---

## Architektur

### Übersicht

```
Campaign Edit Page (Phase 1.1 - Foundation)
├── CampaignContext (Zentrales State Management)
├── Tab-Komponenten (Modular & Isoliert)
│   ├── ContentTab (Editor, SEO, Key Visual)
│   ├── AttachmentsTab (Medien, Boilerplates)
│   ├── ApprovalTab (Kunden-Freigaben, Pipeline)
│   └── PreviewTab (PDF-Generation, Final Preview)
├── Services (Firebase-Integration)
│   ├── pr-service (CRUD, Approval-Workflow)
│   ├── pdf-versions-service (PDF-Generation, Edit-Lock)
│   └── boilerplate-service (Textbausteine)
└── Support Components (Header, Navigation, Loading)
```

### Ordnerstruktur

```
src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/
├── page.tsx                          # ~1.456 Zeilen (Orchestrator)
├── context/
│   └── CampaignContext.tsx           # ~587 Zeilen (State Management)
├── tabs/
│   ├── ContentTab.tsx                # ~180 Zeilen (Content-Erstellung)
│   ├── AttachmentsTab.tsx            # ~139 Zeilen (Assets & Boilerplates)
│   ├── ApprovalTab.tsx               # ~250 Zeilen (Freigaben)
│   └── PreviewTab.tsx                # ~200 Zeilen (PDF-Vorschau)
├── components/
│   ├── CampaignHeader.tsx            # ~100 Zeilen (Header mit Breadcrumbs)
│   ├── TabNavigation.tsx             # ~80 Zeilen (Tab-Switcher)
│   ├── LoadingState.tsx              # ~40 Zeilen (Loading-Spinner)
│   └── ErrorState.tsx                # ~40 Zeilen (Fehler-Anzeige)
└── __tests__/                        # ⏳ Ausstehend (Phase 4)
```

### Data Flow

```
User Interaction
    ↓
Tab Component (UI)
    ↓
Context Actions (updateTitle, updateEditorContent, etc.)
    ↓
CampaignContext (Shared State)
    ↓
Firebase Services (pr-service, pdf-versions-service)
    ↓
Firestore Database
```

---

## Technologie-Stack

### Core
- **React 18** - UI Framework
- **Next.js 15** - App Router (Server Components)
- **TypeScript** - Type Safety

### State Management
- **React Context API** - CampaignContext für Campaign-States
- **useState & useEffect** - Lokale UI-States

### Backend
- **Firebase Firestore** - Campaign-Daten
- **Firebase Storage** - PDF- und Asset-Speicherung
- **Puppeteer (API Route)** - Server-Side PDF-Generierung

### Styling
- **Tailwind CSS** - Utility-First CSS
- **CeleroPress Design System** - Konsistente UI-Komponenten

### Editor
- **TipTap** - Rich-Text-Editor (via CampaignContentComposer)
- **ProseMirror** - Editor-Framework (Backend von TipTap)

### AI
- **OpenAI GPT-4** - KI-Assistent für Content-Generierung
- **Structured Generation** - JSON-basierte Rohentwürfe

---

## Installation & Setup

### Voraussetzungen

```bash
Node.js >= 18.0.0
npm >= 9.0.0
Firebase-Projekt mit Firestore & Storage
```

### Installation

```bash
# 1. Dependencies installieren
npm install

# 2. Umgebungsvariablen konfigurieren (.env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 3. Development-Server starten
npm run dev
```

### Firestore-Indices

**Erforderliche Compound-Indices:**

```javascript
// pr_campaigns
{
  collectionGroup: 'pr_campaigns',
  queryScope: 'COLLECTION',
  fields: [
    { fieldPath: 'organizationId', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' }
  ]
}

// pdf_versions
{
  collectionGroup: 'pdf_versions',
  queryScope: 'COLLECTION',
  fields: [
    { fieldPath: 'campaignId', order: 'ASCENDING' },
    { fieldPath: 'version', order: 'DESCENDING' }
  ]
}
```

---

## Verwendung

### Campaign erstellen (Neuer Entwurf)

```typescript
// 1. Navigation zur Edit-Page (von /dashboard/projects/[projectId])
router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/new?projectId=${projectId}`);

// 2. CampaignContext lädt initialen State
// - Legt neue Campaign an
// - Setzt Projekt-Zuordnung
// - Lädt Projekt-Kunde automatisch

// 3. User füllt Content aus (ContentTab)
// - Titel eingeben
// - Editor-Content schreiben (oder KI-Assistent nutzen)
// - Keywords definieren
// - Key Visual hochladen

// 4. Assets hinzufügen (AttachmentsTab)
// - Medien aus Asset-Library auswählen
// - Textbausteine hinzufügen
// - Reihenfolge anpassen

// 5. Approval konfigurieren (ApprovalTab)
// - Kunden-Freigabe aktivieren (optional)
// - Kunden-Kontakt auswählen
// - Nachricht an Kunde eingeben

// 6. Vorschau & Speichern (PreviewTab)
// - PDF generieren
// - Final-Preview prüfen
// - "Als Entwurf speichern" oder "Freigabe anfordern"
```

### Campaign bearbeiten (Bestehend)

```typescript
// 1. Navigation zur Edit-Page
router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${campaignId}`);

// 2. CampaignContext lädt Campaign
const campaign = await prService.getById(campaignId);

// 3. Edit-Lock Status prüfen
const editLockStatus = await pdfVersionsService.getEditLockStatus(campaignId);
if (editLockStatus.isLocked) {
  // Banner anzeigen: "Diese Kampagne ist gesperrt"
  // Unlock-Request ermöglichen
}

// 4. Änderungen vornehmen (über Context)
updateTitle('Neuer Titel');
updateEditorContent('<p>Neuer Inhalt</p>');
updateKeywords(['keyword1', 'keyword2']);

// 5. Speichern
await handleSubmit(); // Validierung + prService.updateCampaignWithNewApproval()
```

### KI-Assistent nutzen

```typescript
// 1. KI-Modal öffnen (ContentTab)
<button onClick={() => setShowAiModal(true)}>
  <SparklesIcon /> Schnellstart mit dem KI-Assistenten
</button>

// 2. StructuredGenerationModal
<StructuredGenerationModal
  onClose={() => setShowAiModal(false)}
  onGenerate={handleAiGenerate}
  existingContent={{ title: campaignTitle, content: '' }}
  organizationId={organizationId}
  dokumenteFolderId={dokumenteFolderId} // KI-Kontext aus Projekt-Dokumenten
/>

// 3. Generierter Content wird ins Campaign übernommen
const handleAiGenerate = (result: any) => {
  updateTitle(result.structured.headline);
  updateEditorContent(fullHtmlContent); // Lead + Body + Quote + CTA + Hashtags
  setShowAiModal(false);
};
```

### PDF generieren

```typescript
// 1. generatePdf() aus Context aufrufen
const { generatePdf, generatingPdf, currentPdfVersion } = useCampaign();

await generatePdf(forApproval: false); // Draft-PDF

// 2. PDF-Generation-Flow
// a) Validierung (Kunde, Titel, Content erforderlich)
// b) createPDFVersion() über pdfVersionsService
// c) generateRealPDF() via Puppeteer-API (/api/generate-pdf)
// d) Upload zu Firebase Storage (mediaService)
// e) Firestore-Eintrag in pdf_versions Collection

// 3. PDF anzeigen (PreviewTab)
{currentPdfVersion && (
  <PipelinePDFViewer
    pdfUrl={currentPdfVersion.downloadUrl}
    version={currentPdfVersion.version}
    createdAt={currentPdfVersion.createdAt}
  />
)}
```

---

## API-Dokumentation

Siehe: [API-Dokumentation](./api/README.md)

**Wichtige Services:**
- [pr-service.md](./api/pr-service.md) - Campaign CRUD, Approval-Workflow
- [pdf-versions-service.md](./api/pdf-versions-service.md) - PDF-Generierung, Edit-Lock
- [boilerplate-service.md](./api/boilerplate-service.md) - Textbausteine

---

## Komponenten

Siehe: [Komponenten-Dokumentation](./components/README.md)

**Tab-Komponenten:**
- **ContentTab** - Editor, SEO, Key Visual
- **AttachmentsTab** - Medien, Boilerplates
- **ApprovalTab** - Kunden-Freigaben, Pipeline
- **PreviewTab** - PDF-Generation, Final Preview

**Support-Komponenten:**
- **CampaignHeader** - Breadcrumbs, Projekt-Link
- **TabNavigation** - Tab-Switcher mit Step-Indikator
- **LoadingState** - Loading-Spinner
- **ErrorState** - Fehler-Anzeige

---

## State Management

### CampaignContext (Zentral)

```typescript
const {
  // Core Campaign State
  campaign,
  loading,
  saving,

  // Navigation
  activeTab,
  setActiveTab,

  // Content States
  campaignTitle,
  editorContent,
  pressReleaseContent,
  updateTitle,
  updateEditorContent,
  updatePressReleaseContent,

  // SEO States
  keywords,
  updateKeywords,
  seoScore,
  updateSeoScore,

  // Visual States
  keyVisual,
  updateKeyVisual,

  // Boilerplates States
  boilerplateSections,
  updateBoilerplateSections,

  // Assets States
  attachedAssets,
  updateAttachedAssets,
  removeAsset,

  // Company & Project States
  selectedCompanyId,
  selectedCompanyName,
  selectedProjectId,
  selectedProjectName,
  selectedProject,
  dokumenteFolderId,
  updateCompany,
  updateProject,
  updateDokumenteFolderId,

  // Approval States
  approvalData,
  updateApprovalData,
  previousFeedback,

  // Template States
  selectedTemplateId,
  updateSelectedTemplate,

  // PDF Generation
  generatingPdf,
  currentPdfVersion,
  generatePdf,

  // Edit Lock
  editLockStatus,
  loadingEditLock,

  // Approval Workflow
  approvalLoading,
  submitForApproval,
  approveCampaign,

  // Campaign Actions
  setCampaign,
  updateField,
  saveCampaign,
  reloadCampaign
} = useCampaign();
```

### Context-Vorteile

**Vorher (Monolith):**
- ~50+ useState in page.tsx
- Props-Drilling durch alle Komponenten
- Inkonsistente State-Updates
- Schwer testbar

**Nachher (Context):**
- Zentrales State Management
- Keine Props-Drilling
- Konsistente Update-Functions
- Leicht testbar (Context-Mocking)

---

## Troubleshooting

### Häufige Probleme

#### Problem 1: SEO-Score zeigt 0 für alle Kategorien

**Symptom:**
```
SEO-Score: 28/100
Breakdown: { headline: 0, keywords: 0, structure: 0, ... }
```

**Lösung:**
Bug wurde in Phase 1.1 behoben. SEO-Score-Berechnung erfolgt jetzt korrekt mit allen Breakdown-Werten.

**Fix (bereits implementiert):**
```typescript
// page.tsx - useEffect für PR-Score-Berechnung
useEffect(() => {
  const calculatePrScore = () => {
    // ... Berechnung
    breakdown.headline = campaignTitle.length >= 30 && campaignTitle.length <= 60 ? 100 : ...;
    breakdown.keywords = keywords.length >= 3 ? ... : 0;
    // ... weitere Kategorien

    updateSeoScore({
      totalScore: Math.round((breakdown.headline + ... + breakdown.social) / 7),
      breakdown,
      hints,
      keywordMetrics
    });
  };

  const timeoutId = setTimeout(calculatePrScore, 500); // Debounce
  return () => clearTimeout(timeoutId);
}, [campaignTitle, editorContent, keywords, updateSeoScore]);
```

#### Problem 2: "PDF generieren" Button ohne Funktion

**Symptom:**
Button klickbar, aber keine PDF wird erstellt.

**Lösung:**
`generatePdf()` Funktion wurde im CampaignContext implementiert.

**Verwendung:**
```typescript
// PreviewTab.tsx
const { generatePdf, generatingPdf, currentPdfVersion } = useCampaign();

<Button onClick={() => generatePdf(false)} disabled={generatingPdf}>
  {generatingPdf ? 'Generiert...' : 'PDF generieren'}
</Button>
```

#### Problem 3: Campaign Admin zeigt "Unbekannt"

**Symptom:**
```
Erstellt von: Unbekannt
```

**Lösung:**
Campaign Admin-Anzeige wurde komplett entfernt, da sie nicht essentiell ist und zu Verwirrung führte.

**Alternative:**
Nutze `createdAt` Timestamp zur Nachverfolgung:
```typescript
<Text>{campaign.createdAt?.toDate().toLocaleString('de-DE')}</Text>
```

#### Problem 4: Edit-Lock verhindert Speicherung

**Symptom:**
```
Toast: "Diese Kampagne kann nicht gespeichert werden. Grund: pending_customer_approval"
```

**Lösung:**
Campaign ist durch Freigabe-Anforderung gesperrt.

**Optionen:**
1. **Unlock-Request stellen:**
```typescript
<EditLockBanner
  campaign={campaign}
  onRequestUnlock={handleUnlockRequest}
/>
```

2. **Warten auf Kunden-Freigabe** (oder Ablehnung)

3. **Admin-Unlock** über Approval-Service (nur für Admins)

#### Problem 5: Assets werden nicht in Projekt-Ordner hochgeladen

**Symptom:**
Assets landen in Client-Root statt in `/Projects/[ProjectName]/Pressemeldungen/[CampaignName]/`

**Lösung:**
Smart Router aktivieren:
```typescript
<AssetSelectorModal
  // ... andere Props
  campaignId={campaignId}
  campaignName={campaignTitle}
  selectedProjectId={selectedProjectId}
  selectedProjectName={selectedProject?.title}
  uploadType="attachment"
  enableSmartRouter={true} // ✅ Wichtig!
/>
```

---

## Performance

### Optimierungen (Phase 1.1)

#### Context-basierte State-Updates
- **useCallback** für alle Update-Functions
- **useMemo** für berechnete Werte (SEO-Score)
- **Debouncing** für Live-Preview (500ms)

#### Code-Reduktion
- **Vorher:** 2.437 Zeilen Monolith
- **Nachher:** ~1.456 Zeilen (page.tsx) + modulare Tabs
- **Reduktion:** ~40% durch Modularisierung

#### Bundle-Größe
- **Dynamic Imports:** StructuredGenerationModal (KI-Modal)
- **Lazy Loading:** PDF-Preview nur wenn benötigt
- **Code-Splitting:** Tab-Komponenten separat geladen

### Messungen (Phase 1.1 - Foundation)

**Initial Load:**
- Campaign laden: ~500ms (Firestore + Edit-Lock)
- Context initialisieren: ~50ms
- Render: ~100ms

**SEO-Score-Berechnung:**
- Debounced: 500ms nach letzter Eingabe
- Berechnung selbst: <10ms

**PDF-Generierung:**
- Puppeteer-API: ~2-4 Sekunden (je nach Content-Komplexität)
- Upload zu Storage: ~500ms
- Firestore-Update: ~200ms

---

## Nächste Schritte

### Phase 4: Testing (⏳ Ausstehend)

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**Tasks:**
- [ ] Context-Tests (CampaignContext.test.tsx)
- [ ] Integration-Tests (campaign-edit-flow.test.tsx)
- [ ] Component-Tests (Tabs, Header, Navigation)
- [ ] Service-Tests (pr-service, pdf-versions-service)

**Agent:** `refactoring-test` Agent verwenden für vollständige Test-Suite

### Phase 5: Dokumentation (✅ Aktuell)

**Status:** Wird gerade erstellt (Sie lesen sie!)

**Deliverables:**
- [x] README.md (Hauptdokumentation)
- [x] api/README.md (API-Übersicht)
- [ ] api/pr-service.md (Detaillierte API-Referenz)
- [ ] api/pdf-versions-service.md
- [ ] api/boilerplate-service.md
- [ ] components/README.md (Komponenten-Doku)
- [ ] adr/README.md (Architecture Decision Records)

### Phase 6: Code Quality (⏳ Ausstehend)

**Ziel:** Production-Ready Code

**Tasks:**
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup (nur production-relevante Logs)
- [ ] Design System Compliance
- [ ] Build erfolgreich
- [ ] Performance-Optimierungen

### Phase 6.5: Quality Gate Check (⏳ Ausstehend)

**Agent:** `refactoring-quality-check` Agent verwenden

**Checks:**
- [ ] Alle Phasen vollständig
- [ ] Tests bestehen (>80% Coverage)
- [ ] Dokumentation vollständig (keine Platzhalter)
- [ ] Integration funktioniert
- [ ] GO für Merge

### Phase 7: Merge zu Main (⏳ Ausstehend)

**Voraussetzung:** Phase 6.5 Quality Gate bestanden

**Workflow:**
```bash
# 1. Phase 6.5 Quality Gate Check erfolgreich (GO)
# 2. Finaler Commit
git add .
git commit -m "chore: Finaler Cleanup vor Merge"

# 3. Push Feature-Branch
git push origin feature/phase-1.1-campaign-edit-foundation

# 4. Merge zu Main
git checkout main
git merge feature/phase-1.1-campaign-edit-foundation --no-ff

# 5. Push Main
git push origin main

# 6. Tests auf Main
npm test -- campaigns
```

---

## Referenzen

### Interne Dokumentation
- [API-Dokumentation](./api/README.md)
- [Komponenten-Dokumentation](./components/README.md)
- [ADRs](./adr/README.md)
- [Design System](../../design-system/DESIGN_SYSTEM.md)
- [Refactoring-Plan](./phase-1.1-campaign-edit-foundation.md)

### Externe Ressourcen
- [React Context API](https://react.dev/reference/react/useContext)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [TipTap Editor](https://tiptap.dev/)

---

**Maintainer:** CeleroPress Development Team
**Feature Branch:** `feature/phase-1.1-campaign-edit-foundation`
**PR:** Ausstehend (Phase 4-7)
