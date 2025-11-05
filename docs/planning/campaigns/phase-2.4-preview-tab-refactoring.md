# Phase 2.4: PreviewTab Refactoring - Implementierungsplan

**Version:** 1.0
**Basiert auf:** Module-Refactoring Template v2.1
**Erstellt:** 2025-11-05
**Modul:** PreviewTab (Vorschau & PDF-Generierung)
**Status:** 🟡 GEPLANT

---

## 📋 Übersicht

Refactoring des **PreviewTab** im Campaign Edit Bereich:
- Live-Vorschau (CampaignPreviewStep)
- PDF-Generierung und Versionen-Historie
- Template-Auswahl
- Pipeline-PDF-Viewer (bei Projekt-Verknüpfung)

**Besonderheit:** PreviewTab ist **BEREITS GUT STRUKTURIERT** (267 Zeilen)
- ✅ Nutzt CampaignContext (kein React Query nötig)
- ✅ React.memo bereits vorhanden
- ✅ Toast-Meldungen vollständig integriert
- ✅ Externe Komponenten gut separiert
- ⚠️ Minimale Modularisierung sinnvoll

**Geschätzter Aufwand:** S (Small) - 0.5-1 Tag

---

## 🎯 Ziele

- [x] ~~React Query für State Management~~ (NICHT NÖTIG - nutzt Context)
- [ ] Minimale Komponenten-Modularisierung (optional)
- [ ] Performance-Optimierungen prüfen
- [ ] Test-Coverage erreichen (>80%)
- [ ] Dokumentation erstellen
- [ ] Production-Ready Code Quality

---

## 📊 IST-ZUSTAND

### Aktuelle Struktur

**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/PreviewTab.tsx`
**Zeilen:** 267 Zeilen
**Status:** ✅ Bereits gut strukturiert

**Komponenten:**
- CampaignPreviewStep (extern, shared)
- PDFVersionHistory (extern, shared)
- PipelinePDFViewer (extern, shared)
- Workflow-Status Banner (inline, ~40 Zeilen, conditional)

**Context-Integration:**
- `campaign` → Kampagnen-Daten
- `campaignTitle`, `editorContent`, `keyVisual`, `keywords`, `boilerplateSections`, `attachedAssets` → Content-Daten
- `seoScore` → SEO-Analyse
- `selectedCompanyName`, `approvalData` → Approval-Daten
- `selectedTemplateId`, `updateSelectedTemplate` → Template-Actions
- `currentPdfVersion`, `generatingPdf`, `generatePdf` → PDF-Actions
- `editLockStatus` → Edit-Lock-Status

**Toast-Meldungen:**
- ✅ PDF-Generierung (Context): Validierung, Success, Error
- ✅ Template-Auswahl (Context): Success mit Template-Name
- ✅ Pipeline-PDF (PreviewTab): Success Callback

**Performance:**
- ✅ React.memo vorhanden
- ✅ useMemo für `finalContentHtml`
- ⚠️ Keine weiteren Performance-Optimierungen nötig (< 300 Zeilen)

### Code-Metriken

| Metrik | Wert |
|--------|------|
| Gesamt-Zeilen | 267 |
| Externe Komponenten | 3 (CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer) |
| Inline-Komponenten | 1 (Workflow-Status Banner, ~40 Zeilen, conditional) |
| React.memo | Ja |
| useMemo | Ja (finalContentHtml) |
| Context-basiert | Ja |
| Toast-Meldungen | Vollständig |

---

## 🎨 SOLL-ZUSTAND

### Geplante Struktur

**Option A: Minimale Modularisierung (EMPFOHLEN)**
```
tabs/
├── PreviewTab.tsx (230 Zeilen, -14%)
└── components/
    ├── ApprovalWorkflowBanner.tsx (50 Zeilen, optional)
    └── __tests__/
        ├── ApprovalWorkflowBanner.test.tsx
        └── PreviewTab.integration.test.tsx
```

**Option B: Keine Modularisierung**
```
tabs/
├── PreviewTab.tsx (267 Zeilen, unverändert)
└── __tests__/
    └── PreviewTab.integration.test.tsx
```

**Empfehlung:** Option B (keine Modularisierung)
- Workflow-Status Banner ist conditional (nur wenn `approvalWorkflowResult` vorhanden)
- Extraktion würde mehr Overhead erzeugen als Nutzen bringen
- Code ist bereits sehr gut lesbar

### Erwartete Code-Metriken

| Datei | Vorher | Nachher | Differenz |
|-------|--------|---------|-----------|
| PreviewTab.tsx | 267 | 267 | 0 (unverändert) |
| **Tests** | 0 | ~500 | +500 Zeilen |
| **Dokumentation** | 0 | 2.500+ | +2.500 Zeilen |
| **Gesamt (ohne Tests/Docs)** | **267** | **267** | **0** |

**Analyse:** Keine Code-Änderung nötig, Fokus auf Tests und Dokumentation.

---

## 🚀 Implementierungs-Phasen

### Phase 0: Setup & Vorbereitung ⚠️ ÜBERSPRUNGEN

**Entscheidung:** ÜBERSPRUNGEN - Keine Code-Änderungen geplant

**Begründung:**
- PreviewTab ist bereits optimal strukturiert (267 Zeilen)
- Keine Modularisierung nötig
- Kein React Query nötig
- Kein Breaking Change
- Direktes Arbeiten auf `main` akzeptabel

**Falls gewünscht:**
```bash
git checkout -b feature/preview-tab-refactoring
cp src/.../PreviewTab.tsx src/.../PreviewTab.backup.tsx
git add . && git commit -m "chore: Phase 0 - PreviewTab Backup erstellt"
```

---

### Phase 0.5: Pre-Refactoring Cleanup

**Ziel:** Toten Code und unnötige Kommentare entfernen

#### Zu prüfen

- [ ] Ungenutzte Imports
- [ ] Auskommentierter Code
- [ ] Console-Logs
- [ ] Obsolete Kommentare
- [ ] Unnötige Type-Deklarationen

**Status:** PreviewTab ist bereits sehr sauber - nur TODO prüfen

#### TODO-Kommentar

**Zeile 76-77:**
```typescript
// TODO: Add approvalWorkflowResult to Context once approval workflow is implemented
const approvalWorkflowResult = null as ApprovalWorkflowResult | null;
```

**Aktion:** TODO-Kommentar entfernen (Workflow wird in separater Task implementiert)

#### Checkliste Phase 0.5

- [ ] TODO-Kommentar bei approvalWorkflowResult entfernt
- [ ] Ungenutzte Imports geprüft
- [ ] Code kompiliert ohne Fehler

**Falls Änderungen:**
```bash
git add .
git commit -m "chore: Phase 0.5 - PreviewTab Pre-Refactoring Cleanup

- TODO-Kommentar bei approvalWorkflowResult entfernt

PreviewTab.tsx: 267 Zeilen (unverändert)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration ⚠️ ÜBERSPRUNGEN

**Entscheidung:** NICHT NÖTIG

**Begründung:**
- PreviewTab nutzt **CampaignContext** für State Management
- Alle Daten kommen aus dem Context:
  - Campaign-Daten
  - Content-Daten (title, editorContent, keyVisual, etc.)
  - PDF-Daten (currentPdfVersion, generatePdf)
  - Template-Daten (selectedTemplateId, updateSelectedTemplate)
  - Edit-Lock-Status
- Context ist zentral und konsistent mit anderen Tabs
- React Query würde Duplikation erzeugen

**Architecture Decision:**
→ Siehe ADR-001 (wird in Phase 5 erstellt)

---

### Phase 2: Code-Separation & Modularisierung ⚠️ ÜBERSPRUNGEN

**Entscheidung:** NICHT NÖTIG

**Begründung:**
- PreviewTab ist bereits optimal strukturiert (267 Zeilen)
- Externe Komponenten bereits gut separiert:
  - CampaignPreviewStep (Live-Vorschau)
  - PDFVersionHistory (Versionen-Historie)
  - PipelinePDFViewer (Pipeline-PDFs)
- Workflow-Status Banner ist conditional (~40 Zeilen, nur wenn Workflow aktiv)
- Extraktion würde mehr Overhead erzeugen als Nutzen bringen

**Analysis:**
- Zeilen pro Datei: 267 (< 300, optimal)
- Komponenten-Separation: Bereits vorhanden
- Code-Lesbarkeit: Sehr gut

---

### Phase 3: Performance-Optimierung ⚠️ ÜBERSPRUNGEN

**Entscheidung:** NICHT NÖTIG

**Begründung:**
- PreviewTab ist bereits performance-optimiert:
  - ✅ React.memo vorhanden
  - ✅ useMemo für `finalContentHtml` (computed value)
  - ✅ Callbacks kommen aus Context (bereits optimiert)
  - ✅ Komponente ist kompakt (267 Zeilen)
  - ✅ Keine Scroll-Listen (keine Virtualization nötig)

**Analysis:**
- Keine Re-Render-Probleme
- Keine Performance-Bottlenecks
- Kein weiterer Optimierungsbedarf

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**🤖 Agent-Workflow:** refactoring-test Agent verwenden

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle comprehensive Test Suite für PreviewTab-Refactoring nach Phase 3.

Context:
- Modul: PreviewTab (Campaign Edit - Vorschau & PDF Tab)
- Hauptdatei: src/app/.../tabs/PreviewTab.tsx (267 Zeilen)
- Komponenten:
  - CampaignPreviewStep (extern, shared)
  - PDFVersionHistory (extern, shared)
  - PipelinePDFViewer (extern, shared)
- Context: CampaignContext (useCampaign Hook)

Requirements:
- Integration Test für PreviewTab (Context-Integration, PDF-Generierung, Template-Auswahl)
- Alle Tests müssen bestehen
- Coverage >80%

Besonderheiten:
- KEIN React Query (nutzt Context)
- useMemo für finalContentHtml (boilerplateSections kombinieren)
- Conditional Rendering (Workflow-Banner nur wenn approvalWorkflowResult)
- PDF-Generierung über Context (generatePdf)
- Template-Auswahl über Context (updateSelectedTemplate)
- Pipeline-PDF Callback mit Toast

Test-Schwerpunkte:
- Context-Integration (campaign, campaignTitle, editorContent, etc.)
- PDF-Generierung (Button, Loading-State, generatePdf aufgerufen)
- Template-Auswahl (updateSelectedTemplate aufgerufen)
- Conditional Rendering (Workflow-Banner, Pipeline-PDF-Viewer)
- Edit-Lock-Status (Button disabled wenn locked)
- PDF-Version anzeigen (Download-Button, Status-Badge)
- Toast-Meldungen (Pipeline-PDF generiert)

Deliverable:
- Test-Suite vollständig implementiert (KEINE TODOs)
- Coverage Report
- Test-Dokumentation
```

**Der Agent wird:**
1. PreviewTab.integration.test.tsx schreiben (25+ Tests)
2. Mocks für CampaignContext erstellen
3. Mocks für externe Komponenten erstellen
4. Coverage Report erstellen

**Output:**
- `tabs/__tests__/PreviewTab.integration.test.tsx` (~500 Zeilen, 25+ Tests)
- Coverage Report (>80%)

#### Checkliste Phase 4

- [ ] refactoring-test Agent aufgerufen
- [ ] Agent hat Test-Suite vollständig erstellt (KEINE TODOs)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80%
- [ ] Test-Dokumentation vorhanden

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite PreviewTab

25+ Tests (via refactoring-test Agent)
- PreviewTab.integration.test.tsx (25 Tests)

Coverage >80%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Ziel:** Vollständige Dokumentation

**🤖 Agent-Workflow:** refactoring-dokumentation Agent verwenden

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle umfassende Dokumentation für PreviewTab-Refactoring nach Phase 4.

Context:
- Modul: PreviewTab (Campaign Edit - Vorschau & PDF Tab)
- Hauptdatei: tabs/PreviewTab.tsx (267 Zeilen)
- Externe Komponenten:
  - CampaignPreviewStep (Live-Vorschau)
  - PDFVersionHistory (Versionen-Historie)
  - PipelinePDFViewer (Pipeline-PDFs)
- Context: CampaignContext (State Management)
- Tests: 25+ Tests, Coverage >80%

Besonderheiten:
- KEIN React Query (nutzt CampaignContext)
- useMemo für finalContentHtml
- Conditional Rendering (Workflow-Banner, Pipeline-PDF-Viewer)
- PDF-Generierung über Context
- Template-Auswahl über Context
- Toast-Meldungen vollständig integriert

Code-Metriken:
- PreviewTab: 267 Zeilen (kompakt, optimal strukturiert)
- Externe Komponenten: 3 (CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer)
- Tests: 25+ Tests
- Keine Modularisierung nötig (bereits optimal)

Ziel-Ordner: docs/campaigns/campaign-edit/tabs/preview-tab/

Erstelle:
1. README.md (Hauptdokumentation)
2. components/README.md (Externe Komponenten-Übersicht)
3. api/README.md (Context-API für PDF & Template)
4. adr/README.md (Architecture Decision Records)

Deliverable:
- 500+ Zeilen Dokumentation
- Vollständig, keine TODOs
- Markdown-formatiert
- Code-Beispiele enthalten
```

**Der Agent wird:**
1. README.md erstellen (Übersicht, Architektur, Verwendung)
2. components/README.md erstellen (CampaignPreviewStep, PDFVersionHistory, PipelinePDFViewer)
3. api/README.md erstellen (CampaignContext PDF & Template API)
4. adr/README.md erstellen (ADR-001: Context statt React Query, ADR-002: Keine Modularisierung)

**Output:**
- `docs/campaigns/campaign-edit/tabs/preview-tab/README.md`
- `docs/campaigns/campaign-edit/tabs/preview-tab/components/README.md`
- `docs/campaigns/campaign-edit/tabs/preview-tab/api/README.md`
- `docs/campaigns/campaign-edit/tabs/preview-tab/adr/README.md`

#### Checkliste Phase 5

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] Alle Dokumentations-Dateien erstellt
- [ ] Keine TODOs/Platzhalter
- [ ] Code-Beispiele vollständig
- [ ] ADRs mit Begründung

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - PreviewTab Vollständige Dokumentation

500+ Zeilen Dokumentation erstellt (via refactoring-dokumentation Agent)
- README.md: Hauptdokumentation
- components/README.md: Externe Komponenten
- api/README.md: CampaignContext PDF & Template API
- adr/README.md: Architecture Decision Records

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code Quality sicherstellen

#### Checkliste

- [ ] TypeScript: `npx tsc --noEmit` (0 Fehler)
- [ ] ESLint: `npx eslint src/.../tabs/PreviewTab.tsx --max-warnings=0`
- [ ] Tests: `npm test -- --testPathPatterns="PreviewTab"` (alle bestehen)
- [ ] Coverage: >80%
- [ ] Design System: Nur `/24/outline` Icons, Primary Color `#005fab`
- [ ] Console-Logs: Alle entfernt
- [ ] Build: `npm run build` (erfolgreich)

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Ziel:** Automatisierte Qualitätsprüfung

**🤖 Agent-Workflow:** refactoring-quality-check Agent verwenden

#### Agent aufrufen

**Prompt:**
```markdown
Führe comprehensive Quality Gate Check für PreviewTab-Refactoring nach Phase 5 durch.

Context:
- Modul: PreviewTab (Campaign Edit - Vorschau & PDF Tab)
- Refactoring-Plan: docs/planning/campaigns/phase-2.4-preview-tab-refactoring.md

Durchgeführte Phasen:
- ✅ Phase 0.5: Pre-Refactoring Cleanup (TODO entfernt)
- ✅ Phase 1: React Query (übersprungen - nutzt Context)
- ✅ Phase 2: Modularisierung (übersprungen - bereits optimal)
- ✅ Phase 3: Performance (übersprungen - bereits optimiert)
- ✅ Phase 4: Test Suite (25+ Tests, >80% Coverage)
- ✅ Phase 5: Dokumentation (500+ Zeilen)

Zu prüfen:
1. Wurden ALLE geplanten Tests erstellt?
2. Ist die Dokumentation vollständig (keine TODOs)?
3. Sind alle Tests lauffähig und bestehen?
4. Sind alle imports korrekt?
5. Ist die Integration funktionsfähig?

Besondere Prüfungen:
- PreviewTab verwendet CampaignContext
- Toast-Meldungen vollständig integriert
- Externe Komponenten korrekt verwendet
- Conditional Rendering funktioniert

Deliverable:
- Quality Gate Report mit Pass/Fail Status
- Liste aller Probleme (falls vorhanden)
- Empfehlungen für Production-Readiness
```

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] Quality Gate Report erhalten
- [ ] Alle kritischen Probleme behoben
- [ ] Status: READY TO MERGE

---

### Phase 7: Merge zu Main

**Ziel:** Änderungen in Main-Branch integrieren

#### Checkliste

- [ ] Alle Phasen abgeschlossen
- [ ] Alle Tests bestehen
- [ ] Quality Gate bestanden
- [ ] Dokumentation vollständig

**Merge:**
```bash
git push origin main
# ODER (falls Feature-Branch verwendet)
git checkout main
git merge feature/preview-tab-refactoring --no-ff
git push origin main
```

**Post-Merge:**
- [ ] Feature-Branch löschen (falls verwendet)
- [ ] Master-Checkliste aktualisieren
- [ ] Team informieren

---

## 📋 Master-Checkliste

### Pre-Refactoring
- [ ] Phase 0: Setup & Backup (übersprungen - nicht nötig)
- [ ] Phase 0.5: Pre-Refactoring Cleanup (TODO entfernen)

### Core-Refactoring
- [ ] Phase 1: React Query (übersprungen - nutzt Context)
- [ ] Phase 2: Modularisierung (übersprungen - bereits optimal)
- [ ] Phase 3: Performance (übersprungen - bereits optimiert)

### Testing & Documentation
- [ ] Phase 4: Testing (Agent)
- [ ] Phase 5: Dokumentation (Agent)

### Quality & Merge
- [ ] Phase 6: Code Quality
- [ ] Phase 6.5: Quality Gate (Agent)
- [ ] Phase 7: Merge zu Main

---

## 🎯 Erwartete Ergebnisse

### Code-Metriken

| Metrik | Vorher | Nachher | Verbesserung |
|--------|--------|---------|--------------|
| Zeilen PreviewTab | 267 | 267 | 0% (optimal) |
| Externe Komponenten | 3 | 3 | 0% (bereits gut) |
| Test-Coverage | 0% | >80% | +∞ |
| Dokumentation | 0 | 500+ | +∞ |

### Qualitäts-Metriken

- **Tests:** 25+ Tests, 100% bestanden
- **TypeScript:** 0 Fehler
- **ESLint:** 0 Warnings
- **Coverage:** >80%
- **Performance:** Bereits optimiert (React.memo + useMemo)
- **Toast-Meldungen:** Vollständig integriert

---

## 📚 Referenzen

### Projekt-Spezifisch
- **CampaignContext:** `src/app/.../context/CampaignContext.tsx`
- **CampaignPreviewStep:** `src/components/campaigns/CampaignPreviewStep.tsx`
- **PDFVersionHistory:** `src/components/campaigns/PDFVersionHistory.tsx`
- **PipelinePDFViewer:** `src/components/campaigns/PipelinePDFViewer.tsx`
- **Template:** `docs/templates/module-refactoring-template.md`

### Verwandte Refactorings
- **Phase 2.1:** ContentTab Refactoring
- **Phase 2.2:** AttachmentsTab Refactoring
- **Phase 2.3:** ApprovalTab Refactoring (Vorbild für minimale Modularisierung)

---

## 🔄 Change Log

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2025-11-05 | Initial Plan erstellt |

---

**Status:** 🟡 GEPLANT → Bereit für Umsetzung

**Besonderheit:** Fokus auf Tests und Dokumentation, keine Code-Änderungen nötig
