# Phase 2.3: ApprovalTab Refactoring - Implementierungsplan

**Version:** 1.0
**Basiert auf:** Module-Refactoring Template v2.1
**Erstellt:** 2025-11-05
**Modul:** ApprovalTab (Freigaben)
**Status:** 🟡 GEPLANT

---

## 📋 Übersicht

Refactoring des **ApprovalTab** im Campaign Edit Bereich:
- Freigabe-Einstellungen (ApprovalSettings)
- PDF-Workflow Preview
- Bereits: Context-basiert, React.memo vorhanden

**Besonderheit:** ApprovalTab ist **BEREITS SEHR GUT STRUKTURIERT** (104 Zeilen)
- ✅ Nutzt CampaignContext (kein React Query nötig)
- ✅ React.memo bereits vorhanden
- ✅ useMemo für Performance bereits implementiert
- ⚠️ Modularisierung optional (< 300 Zeilen)

**Geschätzter Aufwand:** XS (Extra-Small) - 0.25-0.5 Tag

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

**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ApprovalTab.tsx`
**Zeilen:** 104 Zeilen
**Status:** ✅ Bereits sehr gut strukturiert

**Komponenten:**
- ApprovalSettings (extern, shared)
- PDF Workflow Preview (inline, 30 Zeilen)

**Context-Integration:**
- `approvalData` → Freigabe-Einstellungen
- `updateApprovalData` → Update-Handler
- `selectedCompanyId/Name` → Client-Info
- `previousFeedback` → Änderungsanforderungen

**Performance:**
- ✅ React.memo vorhanden
- ✅ useMemo für `pdfWorkflowPreview`

### Code-Metriken

| Metrik | Wert |
|--------|------|
| Gesamt-Zeilen | 104 |
| Komponente: ApprovalSettings | extern |
| Inline: PDF Workflow Preview | ~30 Zeilen |
| React.memo | Ja |
| useMemo | Ja |
| Context-basiert | Ja |

---

## 🎨 SOLL-ZUSTAND

### Geplante Struktur

```
tabs/
├── ApprovalTab.tsx (70 Zeilen, -33%)
└── components/
    ├── PDFWorkflowPreview.tsx (40 Zeilen)
    └── __tests__/
        ├── PDFWorkflowPreview.test.tsx
        └── ApprovalTab.test.tsx
```

### Erwartete Code-Reduktion

| Datei | Vorher | Nachher | Differenz |
|-------|--------|---------|-----------|
| ApprovalTab.tsx | 104 | 70 | -34 (-33%) |
| **Neue Komponenten** | 0 | 40 | +40 |
| **Gesamt** | **104** | **110** | **+6 (+6%)** |

**Analyse:** Minimale Code-Erhöhung durch Modularisierung, aber bessere Testbarkeit.

---

## 🚀 Implementierungs-Phasen

### Phase 0: Setup & Vorbereitung ⚠️ OPTIONAL

**Entscheidung:** ÜBERSPRUNGEN - Änderungen sind minimal (< 50 Zeilen)

**Begründung:**
- Nur 1 Komponente wird extrahiert
- Kein React Query nötig
- Kein Breaking Change
- Direktes Arbeiten auf `main` akzeptabel

**Falls gewünscht:**
```bash
git checkout -b feature/approval-tab-refactoring
cp src/.../ApprovalTab.tsx src/.../ApprovalTab.backup.tsx
git add . && git commit -m "chore: Phase 0 - ApprovalTab Backup erstellt"
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

**Hinweis:** ApprovalTab ist bereits sehr sauber - wahrscheinlich SKIP

#### Checkliste Phase 0.5

- [ ] Ungenutzte Imports entfernt
- [ ] Console-Logs entfernt
- [ ] Obsolete Kommentare entfernt
- [ ] Code kompiliert ohne Fehler

**Falls Änderungen:**
```bash
git add .
git commit -m "chore: Phase 0.5 - ApprovalTab Pre-Refactoring Cleanup

- Ungenutzte Imports entfernt
- Console-Logs bereinigt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration ⚠️ ÜBERSPRUNGEN

**Entscheidung:** NICHT NÖTIG

**Begründung:**
- ApprovalTab nutzt **CampaignContext** für State Management
- Alle Daten kommen aus dem Context:
  - `approvalData` (Freigabe-Einstellungen)
  - `updateApprovalData` (Update-Funktion)
  - `previousFeedback` (Änderungsanforderungen)
- Context ist zentral und konsistent mit anderen Tabs
- React Query würde Duplikation erzeugen

**Architecture Decision:**
→ Siehe ADR-001 (wird in Phase 5 erstellt)

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** PDF Workflow Preview in eigene Komponente extrahieren

#### 2.1 Komponenten extrahieren

**PDFWorkflowPreview.tsx** (~40 Zeilen)

**Verantwortlichkeit:**
- Anzeige des PDF-Workflow Status
- Schritte-Liste rendering
- Visuelles Feedback für aktivierten Workflow

**Props:**
```typescript
interface PDFWorkflowPreviewProps {
  enabled: boolean;
  estimatedSteps: string[];
}
```

**Features:**
- Gradient Background (green-50 to blue-50)
- CheckCircleIcon + ArrowRightIcon
- Step-by-Step Liste
- Tipp-Box mit Info-Text

#### Code-Beispiele

**PDFWorkflowPreview.tsx:**
```typescript
import React from 'react';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';

interface PDFWorkflowPreviewProps {
  enabled: boolean;
  estimatedSteps: string[];
}

export function PDFWorkflowPreview({ enabled, estimatedSteps }: PDFWorkflowPreviewProps) {
  if (!enabled) return null;

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
      <div className="flex items-start">
        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            ✅ PDF-Workflow bereit
          </h4>
          <Text className="text-sm text-green-700 mb-3">
            Beim Speichern wird automatisch ein vollständiger Freigabe-Workflow aktiviert:
          </Text>

          <div className="space-y-2">
            {estimatedSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                <ArrowRightIcon className="h-4 w-4" />
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-green-300">
            <Text className="text-xs text-green-600">
              💡 Tipp: Nach dem Speichern finden Sie alle Freigabe-Links und den aktuellen
              Status in Step 4 &ldquo;Vorschau&rdquo;.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**ApprovalTab.tsx (refactored):**
```typescript
import React, { useMemo } from 'react';
import { FieldGroup } from '@/components/ui/fieldset';
import ApprovalSettings from '@/components/campaigns/ApprovalSettings';
import { useCampaign } from '../context/CampaignContext';
import { PDFWorkflowPreview } from './components/PDFWorkflowPreview';

export default React.memo(function ApprovalTab({ organizationId }: ApprovalTabProps) {
  const {
    selectedCompanyId: clientId,
    selectedCompanyName: clientName,
    approvalData,
    updateApprovalData,
    previousFeedback
  } = useCampaign();

  // Computed: PDF Workflow Preview Data
  const pdfWorkflowData = useMemo(() => {
    const enabled = approvalData?.customerApprovalRequired || false;
    const estimatedSteps: string[] = [];

    if (enabled) {
      estimatedSteps.push('1. PDF wird automatisch generiert');
      estimatedSteps.push('2. Freigabe-Link wird an Kunde versendet');
      estimatedSteps.push('3. Kunde kann PDF prüfen und freigeben');
    }

    return { enabled, estimatedSteps };
  }, [approvalData]);

  return (
    <div className="bg-white rounded-lg border p-6">
      <FieldGroup>
        {/* Freigabe-Einstellungen */}
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Freigabe-Einstellungen</h3>
            <p className="text-sm text-gray-600 mt-1">
              Legen Sie fest, wer die Kampagne vor dem Versand freigeben muss.
            </p>
          </div>
          <ApprovalSettings
            value={approvalData}
            onChange={updateApprovalData}
            organizationId={organizationId}
            clientId={clientId}
            clientName={clientName}
            previousFeedback={previousFeedback}
          />
        </div>

        {/* PDF-Workflow Preview */}
        <PDFWorkflowPreview
          enabled={pdfWorkflowData.enabled}
          estimatedSteps={pdfWorkflowData.estimatedSteps}
        />
      </FieldGroup>
    </div>
  );
});
```

#### Checkliste Phase 2

- [ ] PDFWorkflowPreview.tsx erstellt (40 Zeilen)
- [ ] ApprovalTab.tsx refactored (70 Zeilen, -33%)
- [ ] Imports aktualisiert
- [ ] Manueller Test durchgeführt

**Commit:**
```bash
git add .
git commit -m "refactor: Phase 2 - ApprovalTab Modularisierung

PDFWorkflowPreview extrahiert
ApprovalTab: 104 → 70 Zeilen (-33%)

Code-Struktur:
- PDFWorkflowPreview.tsx (40 Zeilen)

Bessere Testbarkeit, wiederverwendbare Komponenten

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Performance prüfen und ggf. optimieren

#### Ist-Analyse

**Bereits vorhanden:**
- ✅ React.memo (ApprovalTab)
- ✅ useMemo (pdfWorkflowData)

**Zu prüfen:**
- [ ] React.memo für PDFWorkflowPreview? → **JA** (empfohlen)
- [ ] useMemo für estimatedSteps? → **NEIN** (bereits in Parent)

#### 3.1 React.memo für PDFWorkflowPreview

**PDFWorkflowPreview.tsx:**
```typescript
export const PDFWorkflowPreview = React.memo(function PDFWorkflowPreview({
  enabled,
  estimatedSteps
}: PDFWorkflowPreviewProps) {
  // ...
});
```

#### Checkliste Phase 3

- [ ] React.memo für PDFWorkflowPreview hinzugefügt
- [ ] Performance-Test durchgeführt (keine Re-Render-Probleme)

**Commit:**
```bash
git add .
git commit -m "perf: Phase 3 - Performance-Optimierung ApprovalTab

React.memo für PDFWorkflowPreview
Verhindert unnötige Re-Renders

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**🤖 Agent-Workflow:** refactoring-test Agent verwenden

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle comprehensive Test Suite für ApprovalTab-Refactoring nach Phase 3.

Context:
- Modul: ApprovalTab (Campaign Edit - Freigaben Tab)
- Hauptdatei: src/app/.../tabs/ApprovalTab.tsx (70 Zeilen)
- Neue Komponenten:
  - tabs/components/PDFWorkflowPreview.tsx (40 Zeilen)
- Context: CampaignContext (useCampaign Hook)
- Externe Komponenten: ApprovalSettings

Requirements:
- Component Tests für PDFWorkflowPreview (enabled/disabled, Steps-Rendering)
- Integration Test für ApprovalTab (Context-Integration, ApprovalSettings + Preview)
- Alle Tests müssen bestehen
- Coverage >80%

Besonderheiten:
- KEIN React Query (nutzt Context)
- useMemo für pdfWorkflowData (estimatedSteps)
- Conditional Rendering (Preview nur wenn customerApprovalRequired=true)

Deliverable:
- Test-Suite vollständig implementiert (KEINE TODOs)
- Coverage Report
- Test-Dokumentation
```

**Der Agent wird:**
1. PDFWorkflowPreview.test.tsx schreiben (10+ Tests)
2. ApprovalTab.test.tsx schreiben (Integration, 10+ Tests)
3. Mocks für CampaignContext erstellen
4. Mocks für ApprovalSettings erstellen
5. Coverage Report erstellen

**Output:**
- `tabs/components/__tests__/PDFWorkflowPreview.test.tsx`
- `tabs/__tests__/ApprovalTab.test.tsx`
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
git commit -m "test: Phase 4 - Comprehensive Test Suite ApprovalTab

20+ Tests (via refactoring-test Agent)
- PDFWorkflowPreview.test.tsx (10 Tests)
- ApprovalTab.test.tsx (10 Tests)

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
Erstelle umfassende Dokumentation für ApprovalTab-Refactoring nach Phase 4.

Context:
- Modul: ApprovalTab (Campaign Edit - Freigaben Tab)
- Hauptdatei: tabs/ApprovalTab.tsx (70 Zeilen)
- Komponenten:
  - PDFWorkflowPreview.tsx (40 Zeilen)
- Context: CampaignContext (State Management)
- Tests: 20+ Tests, Coverage >80%

Besonderheiten:
- KEIN React Query (nutzt CampaignContext)
- useMemo für pdfWorkflowData
- Conditional Rendering (PDF Preview nur wenn enabled)
- ApprovalSettings ist shared component

Code-Reduktion:
- ApprovalTab: 104 → 70 Zeilen (-33%)
- Neue Komponenten: 40 Zeilen
- Gesamt: 104 → 110 Zeilen (+6 Zeilen, aber +100% Testbarkeit)

Ziel-Ordner: docs/campaigns/campaign-edit/tabs/approval-tab/

Erstelle:
1. README.md (Hauptdokumentation)
2. components/README.md (Komponenten-Details)
3. api/README.md (Context-API)
4. adr/README.md (Architecture Decision Records)

Deliverable:
- 500+ Zeilen Dokumentation
- Vollständig, keine TODOs
- Markdown-formatiert
- Code-Beispiele enthalten
```

**Der Agent wird:**
1. README.md erstellen (Übersicht, Architektur, Verwendung)
2. components/README.md erstellen (PDFWorkflowPreview Details)
3. api/README.md erstellen (CampaignContext Approval API)
4. adr/README.md erstellen (ADR-001: Context statt React Query)

**Output:**
- `docs/campaigns/campaign-edit/tabs/approval-tab/README.md`
- `docs/campaigns/campaign-edit/tabs/approval-tab/components/README.md`
- `docs/campaigns/campaign-edit/tabs/approval-tab/api/README.md`
- `docs/campaigns/campaign-edit/tabs/approval-tab/adr/README.md`

#### Checkliste Phase 5

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] Alle Dokumentations-Dateien erstellt
- [ ] Keine TODOs/Platzhalter
- [ ] Code-Beispiele vollständig
- [ ] ADRs mit Begründung

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - ApprovalTab Vollständige Dokumentation

500+ Zeilen Dokumentation erstellt (via refactoring-dokumentation Agent)
- README.md: Hauptdokumentation
- components/README.md: PDFWorkflowPreview
- api/README.md: CampaignContext Approval API
- adr/README.md: Architecture Decision Records

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code Quality sicherstellen

#### Checkliste

- [ ] TypeScript: `npx tsc --noEmit` (0 Fehler)
- [ ] ESLint: `npx eslint src/.../tabs/*.tsx --max-warnings=0`
- [ ] Tests: `npm test -- --testPathPatterns="ApprovalTab"` (alle bestehen)
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
Führe comprehensive Quality Gate Check für ApprovalTab-Refactoring nach Phase 5 durch.

Context:
- Modul: ApprovalTab (Campaign Edit - Freigaben Tab)
- Refactoring-Plan: docs/planning/campaigns/phase-2.3-approval-tab-refactoring.md

Durchgeführte Phasen:
- ✅ Phase 2: Modularisierung (PDFWorkflowPreview extrahiert)
- ✅ Phase 3: Performance-Optimierung (React.memo)
- ✅ Phase 4: Test Suite (20+ Tests, >80% Coverage)
- ✅ Phase 5: Dokumentation (500+ Zeilen)

Zu prüfen:
1. Wurden ALLE Dateien aus dem Plan tatsächlich erstellt?
2. Sind alte Code-Teile wirklich entfernt (nicht nur auskommentiert)?
3. Sind alle Tests lauffähig und bestehen?
4. Ist die Dokumentation vollständig (keine TODOs)?
5. Sind alle imports korrekt?
6. Ist die Integration funktionsfähig?

Besondere Prüfungen:
- ApprovalTab verwendet PDFWorkflowPreview
- Alte Inline-Implementierung wurde entfernt
- ApprovalSettings Integration funktioniert
- CampaignContext Integration ist vollständig

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
git merge feature/approval-tab-refactoring --no-ff
git push origin main
```

**Post-Merge:**
- [ ] Feature-Branch löschen (falls verwendet)
- [ ] Master-Checkliste aktualisieren
- [ ] Team informieren

---

## 📋 Master-Checkliste

### Pre-Refactoring
- [ ] Phase 0: Setup & Backup (optional)
- [ ] Phase 0.5: Pre-Refactoring Cleanup

### Core-Refactoring
- [ ] Phase 1: React Query (übersprungen)
- [ ] Phase 2: Modularisierung
- [ ] Phase 3: Performance

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
| Zeilen ApprovalTab | 104 | 70 | -33% |
| Komponenten | 1 | 2 | +100% |
| Test-Coverage | 0% | >80% | +∞ |
| Dokumentation | 0 | 500+ | +∞ |

### Qualitäts-Metriken

- **Tests:** 20+ Tests, 100% bestanden
- **TypeScript:** 0 Fehler
- **ESLint:** 0 Warnings
- **Coverage:** >80%
- **Performance:** React.memo + useMemo optimiert

---

## 📚 Referenzen

### Projekt-Spezifisch
- **CampaignContext:** `src/app/.../context/CampaignContext.tsx`
- **ApprovalSettings:** `src/components/campaigns/ApprovalSettings.tsx`
- **Template:** `docs/templates/module-refactoring-template.md`

### Verwandte Refactorings
- **Phase 2.1:** ContentTab Refactoring
- **Phase 2.2:** AttachmentsTab Refactoring (Vorbild)

---

## 🔄 Change Log

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2025-11-05 | Initial Plan erstellt |

---

**Status:** 🟡 GEPLANT → Bereit für Umsetzung
