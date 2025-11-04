# Content Composer Refactoring - Implementierungsplan

**Version:** 1.0
**Erstellt:** 2025-11-04
**Status:** 🚀 IN PROGRESS - Phase 0 (Vorbereitung)
**Basiert auf:** Module-Refactoring Template v2.0
**Projekt:** CeleroPress - Campaign Module Refactoring

---

## 📋 Übersicht

### Modul-Informationen

**Entry Point:** `src/components/pr/campaign/CampaignContentComposer.tsx`
**Aktuelle LOC:** 529 Zeilen
**Ziel LOC:** ~200 Zeilen Main Orchestrator
**Aufwand:** L (Large) - 3-4 Tage

### Probleme identifiziert

- **Editor + Boilerplates + SEO Tool + PDF + Alerts in einer Komponente** → Zu viele Verantwortlichkeiten
- **FolderSelectorDialog inline** (~ 100 Zeilen) → Sollte eigene Komponente sein
- **PDF-Generierung inline** → Sollte Custom Hook sein
- **AlertMessage inline** → ✅ BEREITS auf toastService migriert (d7114392)
- **Boilerplate-Processing inline** → Sollte Custom Hook sein

### Refactoring-Ziele

- [x] ~~AlertMessage auf toastService migrieren~~ ✅ ERLEDIGT (d7114392)
- [ ] FolderSelectorDialog als wiederverwendbare Komponente extrahieren
- [ ] PDF-Generierung in Custom Hook auslagern (`usePDFGeneration`)
- [ ] Boilerplate-Processing in Custom Hook auslagern (`useBoilerplateProcessing`)
- [ ] Performance-Optimierungen (React.memo, useCallback, useMemo)
- [ ] Tests schreiben (>80% Coverage)
- [ ] Vollständige Dokumentation erstellen

### Verwendung im Projekt

**Verwendet in:**
- `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` (Campaign Edit Page - Inhalt Tab)

**Dependencies:**
- ✅ Phase 0.1 (PR SEO Tool) - bereits refactored
- ✅ Phase 0.2 (KI Assistent) - bereits refactored

---

## 🎯 Ist-Zustand Analyse

### Aktuelle Struktur (529 Zeilen)

```
CampaignContentComposer.tsx (529 Zeilen)
├── Imports (26 Zeilen)
├── AlertMessage Component (42 Zeilen) ← ✅ MIGRIERT zu toastService
├── FolderSelectorDialog Component (103 Zeilen) ← ZU EXTRAHIEREN
├── CampaignContentComposer Main (358 Zeilen)
│   ├── Props & State (50 Zeilen)
│   ├── Boilerplate-Processing useEffect (48 Zeilen) ← ZU EXTRAHIEREN
│   ├── PDF Generation Handler (12 Zeilen) ← ZU EXTRAHIEREN
│   ├── Export Handler (10 Zeilen)
│   └── JSX Return (238 Zeilen)
│       ├── Title Input (30 Zeilen)
│       ├── GmailStyleEditor (35 Zeilen)
│       ├── PRSEOHeaderBar Integration (15 Zeilen)
│       ├── IntelligentBoilerplateSection (10 Zeilen)
│       ├── Preview Section (90 Zeilen)
│       └── FolderSelectorDialog Usage (5 Zeilen)
```

### Zu extrahierende Komponenten/Hooks

1. **FolderSelectorDialog.tsx** (103 Zeilen → eigene Komponente)
   - Media-Folder Navigation
   - Breadcrumb-Display
   - Folder-Selection-Logic

2. **usePDFGeneration.ts** (Custom Hook)
   - PDF-Generation State (generatingPdf, pdfDownloadUrl)
   - generatePdf Handler
   - handlePdfExport Handler

3. **useBoilerplateProcessing.ts** (Custom Hook)
   - Content-Processing Logic
   - Full-Content Composition
   - Auto-Update bei Section-Changes

---

## 🚀 Die 8 Phasen

### Phase 0: Vorbereitung & Setup ✅

**Status:** ✅ ABGESCHLOSSEN

#### Durchgeführt

- [x] Feature-Branch erstellt: `main` (arbeiten direkt auf main für Phase 0.3)
- [x] Ist-Zustand dokumentiert: 529 Zeilen, 1 Datei
- [x] ✅ **Toast-Migration BEREITS ERLEDIGT** (Commit: d7114392)
  - AlertMessage Komponente entfernt (42 Zeilen)
  - toastService importiert und integriert
  - Code-Reduktion: -57 Zeilen (-10%)
  - Commit: `refactor: CampaignContentComposer migriert auf toastService`
- [x] Dependencies vorhanden (React, Firebase, Heroicons)

#### Struktur (Ist - nach Toast-Migration)

- **CampaignContentComposer.tsx:** 472 Zeilen (war 529 Zeilen)
- **Inline FolderSelectorDialog:** ~103 Zeilen (zu extrahieren)
- **Inline Logic:** PDF-Generation, Boilerplate-Processing (zu extrahieren)

**Bereit für Phase 0.5 (Cleanup)**

---

### Phase 0.5: Pre-Refactoring Cleanup

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 1-2 Stunden

#### 0.5.1 TODO-Kommentare finden & entfernen

```bash
# TODOs finden
rg "TODO:" src/components/pr/campaign/CampaignContentComposer.tsx
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen

#### 0.5.2 Console-Logs finden & entfernen

```bash
# Debug-Logs finden
rg "console\." src/components/pr/campaign/CampaignContentComposer.tsx
```

**Erlaubt ✅:**
```typescript
// Production-relevante Errors in catch-blocks
catch (error) {
  console.error('Failed to load folders:', error);
}
```

**Zu entfernen ❌:**
```typescript
// Debug-Logs
console.log('folders:', folders);
```

**Aktion:**
- [ ] Alle console.log() statements entfernen
- [ ] Nur console.error() in catch-blocks behalten

#### 0.5.3 Deprecated Functions finden & entfernen

**Bekanntes Deprecated:**
- `generatePdf()` - aktuell disabled, nur `setGeneratingPdf(false); return;`

**Aktion:**
- [ ] Prüfen ob generatePdf() komplett entfernt werden kann
- [ ] Oder für Phase 2 vorbereiten (Custom Hook)

#### 0.5.4 Unused State entfernen

```bash
# State-Deklarationen finden
rg "useState" src/components/pr/campaign/CampaignContentComposer.tsx
```

**Prüfen:**
- `generatingPdf` - wird gesetzt aber nie wirklich verwendet
- `pdfDownloadUrl` - wird gesetzt aber aktuell disabled

**Aktion:**
- [ ] Alle useState-Deklarationen durchgehen
- [ ] Unused/Deprecated States identifizieren
- [ ] States + Setter entfernen (oder für Phase 2 behalten falls nötig)

#### 0.5.5 Kommentierte Code-Blöcke entfernen

```typescript
// ❌ Auskommentierter Code
// PDF-Generation jetzt über Puppeteer API Route (html2pdf entfernt)
// const loadHtml2Pdf = () => import('html2pdf.js');
```

**Aktion:**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Entscheidung: Entfernen (Git-History reicht)

#### 0.5.6 ESLint Auto-Fix

```bash
# Unused imports/variables automatisch entfernen
npx eslint src/components/pr/campaign/CampaignContentComposer.tsx --fix
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)

#### 0.5.7 Manueller Test

```bash
npm run dev
```

**Testen:**
- [ ] Campaign Edit Page öffnen
- [ ] Content Composer laden
- [ ] Titel eingeben funktioniert
- [ ] Editor funktioniert
- [ ] Boilerplates funktionieren
- [ ] PR-SEO Tool funktioniert
- [ ] Preview funktioniert
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt oder umgesetzt
- [ ] Debug-Console-Logs entfernt
- [ ] Deprecated Functions geprüft/entfernt
- [ ] Unused State-Variablen entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- [X] TODO-Kommentare
- ~[Y] Debug-Console-Logs
- [Z] Deprecated Functions
- [A] Unused State-Variablen
- Kommentierte Code-Blöcke
- Unused imports (via ESLint)

### Ergebnis
- CampaignContentComposer.tsx: 472 → [Y] Zeilen (-[Z] Zeilen toter Code)
- Saubere Basis für Modularisierung (Phase 2)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup für Content Composer

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Deprecated Functions entfernt
- [A] Unused State entfernt
- Kommentierte Code-Blöcke gelöscht
- Unused imports entfernt via ESLint

CampaignContentComposer.tsx: 472 → [Y] Zeilen (-[Z] Zeilen)

Saubere Basis für Phase 2 (Modularisierung).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Status:** ⏭️ NICHT ANWENDBAR - Keine Server-Daten-Verwaltung

**Begründung:**
- Content Composer ist **reine Präsentationskomponente**
- Erhält alle Daten via Props (`title`, `mainContent`, `boilerplateSections`, etc.)
- Keine eigenen Firestore-Queries
- Keine CRUD-Operationen auf eigenen Daten

**Daten-Management:**
- ✅ Titel, Content, Boilerplates → von Parent via Props
- ✅ Media-Folders → mediaService.getFolders() (bereits in FolderSelectorDialog)
  - Wird in Phase 2 extrahiert, bleibt aber lokaler State im Dialog
  - Kein globales Caching nötig (Dialog nur on-demand geöffnet)

**→ SKIP Phase 1, direkt zu Phase 2 (Modularisierung)**

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** Komponenten extrahieren, Duplikate eliminieren, Hooks auslagern

**Dauer:** 2-3 Tage

#### Phase 2.1: Shared Components extrahieren

**WICHTIG:** ✅ **AlertMessage bereits zu toastService migriert!**

**Neue Shared Component:**

1. **FolderSelectorDialog.tsx**
   - **Location:** `src/components/pr/campaign/shared/FolderSelectorDialog.tsx`
   - **LOC:** ~103 Zeilen
   - **Verwendung:** PDF-Export Folder-Auswahl
   - **Props:**
     ```typescript
     interface FolderSelectorDialogProps {
       isOpen: boolean;
       onClose: () => void;
       onFolderSelect: (folderId?: string) => void;
       organizationId: string;
       clientId?: string;
     }
     ```
   - **Features:**
     - Media-Folder Navigation
     - Breadcrumb-Stack
     - Client-Filter Support
     - Folder-Auswahl mit "Hier speichern" Button

**Aktion:**
- [ ] `src/components/pr/campaign/shared/` Ordner erstellen
- [ ] FolderSelectorDialog.tsx erstellen
- [ ] Dialog aus CampaignContentComposer.tsx extrahieren
- [ ] Import in CampaignContentComposer.tsx aktualisieren
- [ ] Prüfen ob Dialog auch woanders verwendet wird (DRY)

#### Phase 2.2: Custom Hooks extrahieren

**1. usePDFGeneration.ts**

**Location:** `src/components/pr/campaign/hooks/usePDFGeneration.ts`

**Funktionalität:**
```typescript
export function usePDFGeneration() {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  // PDF-Generierung (aktuell disabled, aber Struktur vorbereiten)
  const generatePdf = useCallback(async (targetFolderId?: string) => {
    setGeneratingPdf(false);
    return;
    // TODO Phase 2: Implementierung wenn PDF-Generation aktiviert wird
  }, []);

  // Export-Handler mit Validierung
  const handlePdfExport = useCallback((title: string) => {
    if (!title) {
      toastService.error('Bitte geben Sie einen Titel für die Pressemitteilung ein.');
      return;
    }
    setShowFolderSelector(true);
  }, []);

  return {
    generatingPdf,
    pdfDownloadUrl,
    showFolderSelector,
    setShowFolderSelector,
    generatePdf,
    handlePdfExport,
  };
}
```

**Aktion:**
- [ ] `src/components/pr/campaign/hooks/` Ordner erstellen
- [ ] usePDFGeneration.ts erstellen
- [ ] State & Handler aus CampaignContentComposer.tsx extrahieren
- [ ] Hook in CampaignContentComposer.tsx importieren & verwenden

---

**2. useBoilerplateProcessing.ts**

**Location:** `src/components/pr/campaign/hooks/useBoilerplateProcessing.ts`

**Funktionalität:**
```typescript
export function useBoilerplateProcessing(
  boilerplateSections: BoilerplateSection[],
  title: string,
  clientName?: string
) {
  const [processedContent, setProcessedContent] = useState('');

  // Content-Processing useEffect (aus CampaignContentComposer)
  useEffect(() => {
    const composeFullContent = async () => {
      let fullHtml = '';

      // Titel hinzufügen
      if (title) {
        fullHtml += `<h1 class="text-2xl font-bold mb-4">${title}</h1>\n\n`;
      }

      // Sections sortieren & hinzufügen
      const sortedSections = [...boilerplateSections].sort((a, b) =>
        (a.order ?? 0) - (b.order ?? 0)
      );

      for (const section of sortedSections) {
        // Boilerplate-Content
        if (section.type === 'boilerplate' && section.boilerplate) {
          fullHtml += section.boilerplate.content + '\n\n';
        }
        // Strukturierte Inhalte (lead, main, quote)
        else if (section.content) {
          if (section.type === 'quote' && section.metadata) {
            fullHtml += `<blockquote class="border-l-4 border-blue-400 pl-4 italic">\n`;
            fullHtml += `${section.content}\n`;
            fullHtml += `<footer class="text-sm text-gray-600 mt-2">— ${section.metadata.person}`;
            if (section.metadata.role) fullHtml += `, ${section.metadata.role}`;
            if (section.metadata.company) fullHtml += ` bei ${section.metadata.company}`;
            fullHtml += `</footer>\n`;
            fullHtml += `</blockquote>\n\n`;
          } else {
            fullHtml += section.content + '\n\n';
          }
        }
      }

      // Datum am Ende
      const currentDate = new Date().toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      fullHtml += `<p class="text-sm text-gray-600 mt-8">${currentDate}</p>`;

      setProcessedContent(fullHtml);
    };

    composeFullContent();
  }, [boilerplateSections, title, clientName]);

  return processedContent;
}
```

**Aktion:**
- [ ] useBoilerplateProcessing.ts erstellen
- [ ] Content-Processing-Logic aus CampaignContentComposer.tsx extrahieren
- [ ] Hook in CampaignContentComposer.tsx importieren & verwenden
- [ ] Prüfen ob onFullContentChange noch benötigt wird

#### Phase 2.3: Main Orchestrator vereinfachen

**Ziel:** CampaignContentComposer.tsx von 472 Zeilen auf ~200 Zeilen reduzieren

**Struktur (nach Refactoring):**
```typescript
// src/components/pr/campaign/CampaignContentComposer.tsx

import FolderSelectorDialog from './shared/FolderSelectorDialog';
import { usePDFGeneration } from './hooks/usePDFGeneration';
import { useBoilerplateProcessing } from './hooks/useBoilerplateProcessing';
import { toastService } from '@/lib/utils/toast';

export default function CampaignContentComposer({
  organizationId,
  clientId,
  clientName,
  title,
  onTitleChange,
  mainContent,
  onMainContentChange,
  onFullContentChange,
  onBoilerplateSectionsChange,
  initialBoilerplateSections = [],
  hideMainContentField = false,
  hidePreview = false,
  hideBoilerplates = false,
  readOnlyTitle = false,
  keywords = [],
  onKeywordsChange,
  onSeoScoreChange
}: CampaignContentComposerProps) {
  // State
  const [boilerplateSections, setBoilerplateSections] = useState<BoilerplateSection[]>(initialBoilerplateSections);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const {
    generatingPdf,
    pdfDownloadUrl,
    showFolderSelector,
    setShowFolderSelector,
    generatePdf,
    handlePdfExport,
  } = usePDFGeneration();

  const processedContent = useBoilerplateProcessing(
    boilerplateSections,
    title,
    clientName
  );

  // Handlers
  const handleBoilerplateSectionsChange = (sections: BoilerplateSection[]) => {
    setBoilerplateSections(sections);
    if (onBoilerplateSectionsChange) {
      onBoilerplateSectionsChange(sections);
    }
  };

  // Effect: Update parent with processed content
  useEffect(() => {
    onFullContentChange(processedContent);
  }, [processedContent, onFullContentChange]);

  return (
    <>
      <div className="space-y-6">
        {/* Title Input */}
        {/* Gmail-Style Editor */}
        {/* PR-SEO Analyse */}
        {/* Boilerplate Sections */}
        {/* Preview Section */}
      </div>

      {/* Folder Selector Dialog */}
      <FolderSelectorDialog
        isOpen={showFolderSelector}
        onClose={() => setShowFolderSelector(false)}
        onFolderSelect={generatePdf}
        organizationId={organizationId}
        clientId={clientId}
      />
    </>
  );
}
```

**Code-Reduktion:**
- Vorher: 472 Zeilen (nach Toast-Migration)
- FolderSelectorDialog: -103 Zeilen
- usePDFGeneration: -30 Zeilen
- useBoilerplateProcessing: -60 Zeilen
- **Nachher: ~279 Zeilen (-40% Reduktion) ✅**

#### Checkliste Phase 2

- [ ] FolderSelectorDialog extrahiert (~103 Zeilen)
- [ ] usePDFGeneration Hook erstellt (~80 Zeilen)
- [ ] useBoilerplateProcessing Hook erstellt (~90 Zeilen)
- [ ] CampaignContentComposer auf ~200-280 Zeilen reduziert
- [ ] Alle Imports aktualisiert
- [ ] Backward Compatibility sichergestellt (Keine Breaking Changes)
- [ ] Manueller Test durchgeführt

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Extrahiert

**Shared Components:**
- FolderSelectorDialog.tsx (103 Zeilen) - Wiederverwendbare Media-Folder-Auswahl

**Custom Hooks:**
- usePDFGeneration.ts (80 Zeilen) - PDF-Export State & Handler
- useBoilerplateProcessing.ts (90 Zeilen) - Content-Processing Logic

### Hauptkomponente
- CampaignContentComposer.tsx: 472 → ~200-280 Zeilen (-40% Reduktion)

### Vorteile
- Bessere Code-Lesbarkeit
- Wiederverwendbare FolderSelectorDialog
- Testbare Hooks
- Einfachere Wartung
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - Content Composer Modularisierung

Extrahiert:
- FolderSelectorDialog als shared component (103 Zeilen)
- usePDFGeneration Hook (80 Zeilen)
- useBoilerplateProcessing Hook (90 Zeilen)

CampaignContentComposer.tsx: 472 → ~280 Zeilen (-40%)

Bessere Wartbarkeit, wiederverwendbare Komponenten.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden, Performance verbessern

**Dauer:** 1 Tag

#### 3.1 useCallback für Handler

**In CampaignContentComposer.tsx:**
```typescript
import { useCallback, useMemo } from 'react';

// Handler mit useCallback wrappen
const handleBoilerplateSectionsChange = useCallback((sections: BoilerplateSection[]) => {
  setBoilerplateSections(sections);
  if (onBoilerplateSectionsChange) {
    onBoilerplateSectionsChange(sections);
  }
}, [onBoilerplateSectionsChange]);

const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  onTitleChange(e.target.value);
}, [onTitleChange]);
```

**In usePDFGeneration.ts:**
```typescript
// Bereits mit useCallback (siehe Phase 2 Code)
const generatePdf = useCallback(async (targetFolderId?: string) => {
  // ...
}, []);

const handlePdfExport = useCallback((title: string) => {
  // ...
}, []);
```

#### 3.2 useMemo für Computed Values

**Preview-Content memoization:**
```typescript
// Optional: Wenn processedContent teuer zu berechnen ist
const memoizedProcessedContent = useMemo(() => {
  return processedContent;
}, [processedContent]);
```

**Initial Boilerplate Sections Conversion:**
```typescript
// Legacy-Sections-Conversion mit useMemo
const convertedSections = useMemo(() => {
  return initialBoilerplateSections.map((section, index) => {
    if ('position' in section) {
      const { position, ...sectionWithoutPosition } = section as any;
      return {
        ...sectionWithoutPosition,
        order: section.order ?? index
      };
    }
    return {
      ...section,
      order: section.order ?? index
    };
  });
}, [initialBoilerplateSections]);
```

#### 3.3 React.memo für Komponenten

**FolderSelectorDialog:**
```typescript
// src/components/pr/campaign/shared/FolderSelectorDialog.tsx

import React from 'react';

export default React.memo(function FolderSelectorDialog({
  isOpen,
  onClose,
  onFolderSelect,
  organizationId,
  clientId
}: FolderSelectorDialogProps) {
  // ...
});
```

**Prüfen: Sections aus IntelligentBoilerplateSection**
- Falls eigenständige Section-Komponenten existieren, auch mit React.memo wrappen

#### Checkliste Phase 3

- [ ] useCallback für handleBoilerplateSectionsChange
- [ ] useCallback für handleTitleChange
- [ ] useCallback in usePDFGeneration (bereits implementiert)
- [ ] useCallback in useBoilerplateProcessing (falls Handler)
- [ ] useMemo für convertedSections
- [ ] useMemo für processedContent (falls nötig)
- [ ] React.memo für FolderSelectorDialog
- [ ] Performance-Test durchgeführt (keine Lag)

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 4 Handler
- useMemo für 2 Computed Values
- React.memo für FolderSelectorDialog

### Messbare Verbesserungen
- Re-Renders reduziert um ~30-40%
- Keine unnötigen Neuberechnungen bei Preview
- Boilerplate-Section-Änderungen optimiert
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung für Content Composer

- useCallback für 4 Handler
- useMemo für Computed Values
- React.memo für FolderSelectorDialog

Re-Renders reduziert um ~30-40%.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-test Agent** durchgeführt!

#### Agent aufrufen

**Schritt 1: Agent starten**
```bash
# Via Claude Code
Prompt: "Starte refactoring-test Agent für Content Composer Refactoring"
```

**Schritt 2: Agent-Prompt**
```markdown
Erstelle comprehensive Test Suite für Content Composer Refactoring nach Phase 3.

Context:
- Modul: CampaignContentComposer
- Main Component: src/components/pr/campaign/CampaignContentComposer.tsx
- Shared Component: src/components/pr/campaign/shared/FolderSelectorDialog.tsx
- Hooks: src/components/pr/campaign/hooks/usePDFGeneration.ts, useBoilerplateProcessing.ts
- Integration: Campaign Edit Page

Requirements:
- Hook Tests (>80% Coverage)
  - usePDFGeneration.test.ts
  - useBoilerplateProcessing.test.ts
- Component Tests
  - CampaignContentComposer.test.tsx (Integration)
  - FolderSelectorDialog.test.tsx
- Edge Cases abdecken
- Alle Tests müssen bestehen
- KEINE TODOs, KEINE "analog" Kommentare

Deliverable:
- Test-Suite vollständig implementiert
- Coverage Report (npm run test:coverage)
- Test-Dokumentation
```

**Der Agent wird:**
1. Hook-Tests schreiben (usePDFGeneration, useBoilerplateProcessing)
2. Component-Tests schreiben (FolderSelectorDialog, CampaignContentComposer)
3. Integration-Tests schreiben (Campaign Edit Page)
4. Edge Cases testen (empty sections, missing props, etc.)
5. Coverage Report erstellen
6. Test-Dokumentation generieren

**Output:**
- `src/components/pr/campaign/hooks/__tests__/usePDFGeneration.test.ts`
- `src/components/pr/campaign/hooks/__tests__/useBoilerplateProcessing.test.ts`
- `src/components/pr/campaign/shared/__tests__/FolderSelectorDialog.test.tsx`
- `src/components/pr/campaign/__tests__/CampaignContentComposer.test.tsx`
- Coverage Report (>80%)

#### Checkliste Phase 4

- [ ] refactoring-test Agent aufgerufen
- [ ] Agent hat Test-Suite vollständig erstellt (KEINE TODOs!)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80% (npm run test:coverage)
- [ ] Test-Dokumentation vorhanden
- [ ] Agent-Output reviewed

#### Deliverable

```markdown
## Phase 4: Testing ✅

**🤖 Agent-Workflow verwendet:** Ja

### Test Suite
- Hook-Tests: 12/12 bestanden ✅
- Component-Tests: 8/8 bestanden ✅
- Integration-Tests: 2/2 bestanden ✅
- **Gesamt: 22/22 Tests bestanden**

### Coverage
- Statements: [X]% ✅
- Branches: [X]% ✅
- Functions: [X]% ✅
- Lines: [X]% ✅

### Agent-Output
- ✅ Alle Tests vollständig implementiert (KEINE TODOs)
- ✅ Test-Dokumentation generiert
- ✅ Coverage Report erstellt
```

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite (via refactoring-test Agent)

Test Suite erstellt von refactoring-test Agent:
- 12 Hook-Tests (usePDFGeneration, useBoilerplateProcessing)
- 8 Component-Tests (FolderSelectorDialog, CampaignContentComposer)
- 2 Integration-Tests (Campaign Edit Page)

Gesamt: 22/22 Tests bestanden, Coverage >80%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Ziel:** Vollständige, wartbare Dokumentation

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-dokumentation Agent** durchgeführt!

#### Agent aufrufen

**Schritt 1: Agent starten**
```bash
# Via Claude Code
Prompt: "Starte refactoring-dokumentation Agent für Content Composer Refactoring"
```

**Schritt 2: Agent-Prompt**
```markdown
Erstelle umfassende Dokumentation für Content Composer Refactoring nach Phase 4.

Context:
- Modul: CampaignContentComposer
- Main Component: src/components/pr/campaign/CampaignContentComposer.tsx (~200-280 Zeilen)
- Shared Component: src/components/pr/campaign/shared/FolderSelectorDialog.tsx (103 Zeilen)
- Hooks: usePDFGeneration.ts (80 Zeilen), useBoilerplateProcessing.ts (90 Zeilen)
- Integration: Campaign Edit Page (Inhalt Tab)
- Tests: Comprehensive Test Suite mit >80% Coverage

Requirements:
- README.md (Hauptdokumentation 400+ Zeilen)
- API-Dokumentation (Hooks & Props 500+ Zeilen)
- Komponenten-Dokumentation (Props, Usage 400+ Zeilen)
- ADR-Dokumentation (Entscheidungen 250+ Zeilen)
- Code-Beispiele (funktionierend)
- Troubleshooting-Guides

Deliverable:
- Vollständige Dokumentation (1.550+ Zeilen)
- Funktionierende Code-Beispiele
- Alle Links funktionieren
```

**Der Agent wird:**
1. docs/campaigns/content-composer/ Ordner-Struktur anlegen
2. README.md erstellen (Hauptdokumentation)
3. api/README.md + hooks-documentation.md erstellen
4. components/README.md erstellen
5. adr/README.md erstellen
6. Code-Beispiele einbauen
7. Troubleshooting-Guides schreiben

**Output:**
- `docs/campaigns/content-composer/README.md` (400+ Zeilen)
- `docs/campaigns/content-composer/api/hooks-documentation.md` (500+ Zeilen)
- `docs/campaigns/content-composer/components/README.md` (400+ Zeilen)
- `docs/campaigns/content-composer/adr/README.md` (250+ Zeilen)
- **Gesamt: 1.550+ Zeilen Dokumentation**

#### Checkliste Phase 5

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] Agent hat vollständige Dokumentation erstellt (1.550+ Zeilen)
- [ ] Alle Dateien vorhanden (README, API, Components, ADR)
- [ ] Code-Beispiele funktionieren
- [ ] Alle Links funktionieren
- [ ] Agent-Output reviewed

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅

**🤖 Agent-Workflow verwendet:** Ja

### Erstellt
- README.md (400+ Zeilen) - Hauptdokumentation ✅
- api/hooks-documentation.md (500+ Zeilen) - Hooks-Referenz ✅
- components/README.md (400+ Zeilen) - Komponenten-Dokumentation ✅
- adr/README.md (250+ Zeilen) - Architecture Decision Records ✅

### Gesamt
- **1.550+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Performance-Messungen

### Agent-Output
- ✅ Alle Dokumente vollständig (keine Platzhalter)
- ✅ Code-Beispiele funktionieren
- ✅ Konsistente Struktur
```

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation (via refactoring-dokumentation Agent)

Dokumentation erstellt von refactoring-dokumentation Agent:
- README.md (400+ Zeilen)
- Hooks-Dokumentation (500+ Zeilen)
- Komponenten-Dokumentation (400+ Zeilen)
- ADR-Dokumentation (250+ Zeilen)

Gesamt: 1.550+ Zeilen vollständige Dokumentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

**Dauer:** 1 Tag

#### 6.1 TypeScript Check

```bash
# Alle Fehler anzeigen
npx tsc --noEmit

# Nur Content Composer Dateien prüfen
npx tsc --noEmit | grep -i "content.*composer\|folder.*selector\|pdf.*generation\|boilerplate.*processing"
```

**Aktion:**
- [ ] Imports ergänzen
- [ ] Types definieren
- [ ] Optional Chaining verwenden

#### 6.2 ESLint Check

```bash
# Alle Warnings/Errors
npx eslint src/components/pr/campaign

# Auto-Fix
npx eslint src/components/pr/campaign --fix
```

**Aktion:**
- [ ] Unused imports entfernen
- [ ] Unused variables entfernen
- [ ] Missing dependencies in useEffect/useCallback/useMemo hinzufügen

#### 6.3 Console Cleanup

```bash
# Console-Statements finden
rg "console\." src/components/pr/campaign
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors
console.error('Failed to load folders:', error);
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('folders:', folders);
```

**Aktion:**
- [ ] Alle console.log() statements entfernen
- [ ] Nur console.error() in catch-blocks behalten

#### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

```bash
# Checklist
✓ Keine Schatten (außer Dropdowns)
✓ Nur Heroicons /24/outline (oder /20/solid für kleine UI-Elemente)
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary Actions
✓ Konsistente Höhen (h-10 für Inputs)
✓ Konsistente Borders (zinc-300)
✓ Focus-Rings (focus:ring-2 focus:ring-primary)
```

**Aktion:**
- [ ] Icons prüfen (/24/outline vs /20/solid)
- [ ] Grautöne auf Zinc vereinheitlichen
- [ ] Focus-States prüfen

#### 6.5 Final Build Test

```bash
# Build erstellen
npm run build

# Build testen
npm run start
```

**Prüfen:**
- [ ] Build erfolgreich?
- [ ] Keine TypeScript-Errors?
- [ ] Keine ESLint-Errors?
- [ ] App startet korrekt?
- [ ] Content Composer funktioniert im Production-Build?
- [ ] Campaign Edit Page funktioniert?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in Content Composer
- [ ] ESLint: 0 Warnings in Content Composer
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich (npm run build)
- [ ] Production-Test: App funktioniert
- [ ] Performance: Kein Lag, flüssiges UI
- [ ] Manual Test: Alle Features funktionieren

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: [X] Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Fixes
- [Liste von behobenen Problemen]
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality

- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Console-Cleanup durchgeführt
- Design System compliant
- Build erfolgreich

Content Composer bereit für Production.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Ziel:** FINALE Überprüfung ALLER Phasen vor Merge zu Main

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-quality-check Agent** durchgeführt!

**PROAKTIV:** Agent wird AUTOMATISCH vor Phase 7 (Merge) aufgerufen!

#### Agent aufrufen

**Schritt 1: Agent wird automatisch aufgerufen**
```markdown
PROAKTIV vor Merge zu Main (Phase 7)
```

**Der Agent überprüft:**

**Phase 0/0.5 Checks:**
- [ ] Backup-Dateien vorhanden? (falls erstellt)
- [ ] Toter Code entfernt (TODOs, Console-Logs, etc.)
- [ ] Toast-Migration abgeschlossen ✅

**Phase 1 Checks:**
- [x] NICHT ANWENDBAR - Keine React Query nötig ✅

**Phase 2 Checks:**
- [ ] FolderSelectorDialog extrahiert
- [ ] usePDFGeneration Hook erstellt
- [ ] useBoilerplateProcessing Hook erstellt
- [ ] CampaignContentComposer auf ~200-280 Zeilen reduziert
- [ ] Alte Inline-Komponenten entfernt
- [ ] Backward Compatibility funktioniert

**Phase 3 Checks:**
- [ ] useCallback für Handler
- [ ] useMemo für Computed Values
- [ ] React.memo für FolderSelectorDialog

**Phase 4 Checks:**
- [ ] Tests existieren (__tests__ Ordner)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80% (npm run test:coverage)
- [ ] KEINE TODOs in Tests

**Phase 5 Checks:**
- [ ] docs/campaigns/content-composer/ Ordner existiert
- [ ] README.md vollständig (>400 Zeilen)
- [ ] Hooks-Docs vollständig (>500 Zeilen)
- [ ] Component-Docs vollständig (>400 Zeilen)
- [ ] ADR-Docs vollständig (>250 Zeilen)
- [ ] KEINE Platzhalter ([TODO], [BESCHREIBUNG], etc.)

**Phase 6 Checks:**
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup durchgeführt
- [ ] Design System Compliance
- [ ] Build erfolgreich

**Integration Checks:**
- [ ] Alte Dateien gelöscht (nicht nur auskommentiert)
- [ ] Imports aktualisiert (Campaign Edit Page)
- [ ] Keine unused Imports
- [ ] Backward Compatibility funktioniert

**Output:**
- Comprehensive Quality Report
- Liste von Problemen (falls vorhanden)
- GO/NO-GO Empfehlung für Merge

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] Quality Report erhalten
- [ ] ALLE Checks bestanden (GO)
- [ ] Falls NO-GO: Probleme behoben und Agent erneut aufgerufen

#### Deliverable

```markdown
## Phase 6.5: Quality Gate Check ✅

**🤖 Agent verwendet:** Ja

### Quality Report
- Phase 0/0.5: ✅ Bestanden
- Phase 1: ✅ Nicht anwendbar (korrekt)
- Phase 2 (Modularisierung): ✅ Bestanden
- Phase 3 (Performance): ✅ Bestanden
- Phase 4 (Testing): ✅ Bestanden (>80% Coverage)
- Phase 5 (Dokumentation): ✅ Bestanden (1.550+ Zeilen)
- Phase 6 (Code Quality): ✅ Bestanden
- Integration Checks: ✅ Bestanden

### Result
**GO für Merge zu Main** ✅

### Keine Probleme gefunden
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden

Alle Phasen vollständig abgeschlossen:
- Phase 0/0.5: Cleanup & Toast-Migration ✅
- Phase 2: Modularisierung ✅
- Phase 3: Performance ✅
- Phase 4: Testing (>80%) ✅
- Phase 5: Dokumentation (1.550+ Zeilen) ✅
- Phase 6: Code Quality ✅

GO für Merge zu Main.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 7: Merge zu Main

**Ziel:** Code zu Main mergen

**⚠️ WICHTIG:** Nur nach erfolgreichem Phase 6.5 Quality Gate Check!

#### Workflow

```bash
# 0. VORHER: Phase 6.5 Quality Gate Check erfolgreich?
# → Agent muss "GO" gegeben haben!

# 1. Finaler Commit (falls noch Änderungen)
git add .
git commit -m "chore: Finaler Cleanup vor Merge"

# 2. Push Branch (falls Feature-Branch verwendet)
# git push origin feature/content-composer-refactoring-production

# 3. Direkt auf main (kein Feature-Branch für Phase 0.3)
# Code ist bereits auf main

# 4. Push Main
git push origin main

# 5. Tests auf Main
npm test -- content-composer
```

#### Checkliste Merge

- [ ] ⭐ Phase 6.5 Quality Gate Check bestanden (GO)
- [ ] Alle 8 Phasen abgeschlossen (0, 0.5, 2, 3, 4, 5, 6, 6.5)
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Master-Checklist aktualisiert

#### Final Report

```markdown
## ✅ Content Composer Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 8 Phasen:** Abgeschlossen (0, 0.5, 2, 3, 4, 5, 6, 6.5)
- **Phase 1 (React Query):** Nicht anwendbar (korrekt)
- **Agent-Workflow:** Phase 4 (Testing), Phase 5 (Doku), Phase 6.5 (Quality Check)
- **Tests:** 22/22 bestanden ✅
- **Coverage:** >80% ✅
- **Dokumentation:** 1.550+ Zeilen ✅
- **Quality Gate:** GO für Production ✅

### Änderungen
- Code-Reduktion: 529 → ~200-280 Zeilen (-40%)
- Toast-Migration: ✅ BEREITS ERLEDIGT (d7114392)
- 3 neue Dateien: FolderSelectorDialog, usePDFGeneration, useBoilerplateProcessing
- 22 neue Tests
- 1.550+ Zeilen Dokumentation

### Highlights
- FolderSelectorDialog extrahiert (103 Zeilen) - Wiederverwendbar
- usePDFGeneration Hook (80 Zeilen) - Testbar
- useBoilerplateProcessing Hook (90 Zeilen) - Separierte Concerns
- Toast-Service Integration (statt AlertMessage)
- Performance-Optimierungen (useCallback, useMemo, React.memo)
- Comprehensive Test Suite (22 Tests, via refactoring-test Agent)
- 1.550+ Zeilen Dokumentation (via refactoring-dokumentation Agent)
- Quality Gate Check bestanden (via refactoring-quality-check Agent)

### Agent-Workflow
- 🤖 **Phase 4:** refactoring-test Agent → 22 Tests, >80% Coverage
- 🤖 **Phase 5:** refactoring-dokumentation Agent → 1.550+ Zeilen Docs
- 🤖 **Phase 6.5:** refactoring-quality-check Agent → GO für Merge

### Nächste Schritte
- [x] Phase 0.3 abgeschlossen
- [ ] Master-Checklist aktualisieren
- [ ] Phase 1.1 (Campaign Edit Page) vorbereiten
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** 529 → ~200-280 Zeilen (-40%)
- **Komponenten-Größe:** Alle < 300 Zeilen ✅
- **Wiederverwendbarkeit:** FolderSelectorDialog kann in anderen Modulen genutzt werden
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** >80%
- **Anzahl Tests:** 22 Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Reduktion um ~30-40% durch React.memo + useCallback
- **Boilerplate-Processing:** Separiert und optimiert
- **Preview-Rendering:** Optimiert mit useMemo

### Dokumentation

- **Zeilen:** 1.550+ Zeilen
- **Dateien:** 4 Dokumente (README, Hooks, Components, ADR)
- **Code-Beispiele:** Funktionierend und getestet

---

## 📝 Checkliste: Gesamtes Refactoring

### Vorbereitung (Phase 0)

- [x] Feature-Branch: main (kein separater Branch)
- [x] Ist-Zustand dokumentiert
- [x] ✅ Toast-Migration BEREITS ERLEDIGT (d7114392)

### Phase 0.5: Pre-Refactoring Cleanup

- [ ] TODO-Kommentare entfernt oder umgesetzt
- [ ] Debug-Console-Logs entfernt
- [ ] Deprecated Functions entfernt
- [ ] Unused State-Variablen entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test durchgeführt

### Phase 1: React Query

- [x] NICHT ANWENDBAR - Keine Server-Daten-Verwaltung ✅

### Phase 2: Modularisierung

- [ ] FolderSelectorDialog extrahiert
- [ ] usePDFGeneration Hook erstellt
- [ ] useBoilerplateProcessing Hook erstellt
- [ ] CampaignContentComposer auf ~200-280 Zeilen reduziert
- [ ] Backward Compatibility sichergestellt

### Phase 3: Performance

- [ ] useCallback für Handler
- [ ] useMemo für Computed Values
- [ ] React.memo für FolderSelectorDialog

### Phase 4: Testing ⭐ AGENT-WORKFLOW

- [ ] refactoring-test Agent aufgerufen
- [ ] 22 Tests erstellt (KEINE TODOs)
- [ ] Alle Tests bestehen
- [ ] Coverage >80%

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] README.md (400+ Zeilen)
- [ ] Hooks-Docs (500+ Zeilen)
- [ ] Component-Docs (400+ Zeilen)
- [ ] ADR-Docs (250+ Zeilen)

### Phase 6: Code Quality

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup
- [ ] Design System Compliance
- [ ] Build erfolgreich
- [ ] Production-Test bestanden

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] ALLE Phasen überprüft
- [ ] GO-Empfehlung erhalten

### Phase 7: Merge

- [ ] Phase 6.5 Quality Gate bestanden (GO)
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Master-Checklist aktualisiert

---

## 🔗 Referenzen

### Projekt-Spezifisch

- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Project Instructions:** `CLAUDE.md`
- **Master Checklist:** `docs/planning/campaigns-refactoring-master-checklist.md`
- **Template:** `docs/templates/module-refactoring-template.md`

### Verwandte Refactorings

- **Phase 0.1:** PR SEO Tool ✅ ABGESCHLOSSEN
- **Phase 0.2:** KI Assistent ✅ ABGESCHLOSSEN

---

**Maintainer:** CeleroPress Team
**Erstellt:** 2025-11-04
**Letzte Aktualisierung:** 2025-11-04

**Changelog:**
- 2025-11-04: Implementierungsplan erstellt basierend auf Template v2.0
- 2025-11-04: Toast-Migration bereits abgeschlossen markiert (d7114392)
