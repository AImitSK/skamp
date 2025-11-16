# Analytics/Monitoring: Master Refactoring Checkliste

**Version:** 1.0
**Erstellt:** 2025-11-16
**Bereich:** `/dashboard/analytics/monitoring`
**Status:** ⏳ PLANUNG

---

## 📚 Wichtige Referenzen

### Implementierungs-Template
**Pfad:** `docs/templates/module-refactoring-template.md`
**Verwendung:** Jeder Implementierungsplan wird nach diesem Template erstellt

### Design System
**Pfad:** `docs/design-system/DESIGN_SYSTEM.md`
**Compliance:** Alle Module müssen Design System Guidelines einhalten
- Primary Color: #005fab
- Nur Heroicons /24/outline
- Zinc-Palette für neutrale Farben
- Keine Schatten (außer Dropdowns)

### Test-Richtlinien
- Tests sind Teil des Templates (Phase 4)
- Mindest-Coverage: 80%
- Integration Tests + Unit Tests

### Referenz-Refactorings
**Campaign-Refactoring:** `docs/planning/campaigns-refactoring-master-checklist.md`
**Status:** 50% abgeschlossen (5/10 Module) - Bewährtes Pattern!

**Projekt-Monitoring-Refactoring:** `docs/projects/monitoring/`
**Status:** ✅ ABGESCHLOSSEN (Phase 0-4) - React Query, Modularisierung, Testing
**ADRs:** `docs/projects/monitoring/adr/README.md` - Architektur-Entscheidungen

---

## 🎯 Scope

Refactoring des gesamten Analytics/Monitoring-Bereichs:
- **Übersichtsseite:** `src/app/dashboard/analytics/monitoring/page.tsx` (249 Zeilen)
- **Detailseite:** `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx` (526 Zeilen)
- **5 Tabs:** Analytics, E-Mail Performance, Empfänger & Veröffentlichungen, Clipping-Archiv, Auto-Funde
- **8 Komponenten:** MonitoringDashboard, EmailPerformanceStats, RecipientTrackingList, ClippingArchive, MonitoringSuggestionsTable, EditClippingModal, MarkPublishedModal, PublicationSelector (gesamt: 2.352 Zeilen)
- **Shared Features:** PDF-Report, Excel-Export (889 Zeilen Services)

**Gesamt LOC (geschätzt):** ~4.000 Zeilen

---

## 🔍 IST-ZUSTAND ANALYSE

### Übersichtsseite: Monitoring Overview

**Entry Point:** `src/app/dashboard/analytics/monitoring/page.tsx`
**LOC:** 249 Zeilen
**Status:** ✅ Relativ gut strukturiert, aber React Query fehlt

**Hauptfunktionen:**
- Liste aller versendeten Kampagnen
- Filter: Search + Projekt-Filter
- Stats-Berechnung (Sends + Clippings)
- Routing zur Detailseite

**Probleme identifiziert:**
- ❌ Kein React Query (useEffect/loadCampaigns Pattern)
- ❌ Inline Stats-Berechnung
- ❌ Keine Performance-Optimierungen (useCallback, useMemo)
- ❌ Alert-State statt Toast-Service (falls vorhanden)

---

### Detailseite: Monitoring Detail

**Entry Point:** `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx`
**LOC:** 526 Zeilen
**Status:** ⚠️ GROSS - Alle 5 Tabs + PDF/Excel Export in einer Datei

**Hauptfunktionen:**
- Header mit Campaign-Titel + Zurück-Button
- Tab-Navigation (5 Tabs)
- PDF-Report Generator
- Excel-Export
- PDF-Liste mit Delete-Dialog
- Success/Error-Dialog
- Tab-Routing via URL-Parameter (?tab=dashboard) ✅ BEREITS IMPLEMENTIERT!

**Probleme identifiziert:**
- ⚠️ Monolithische Komponente (526 Zeilen)
- ❌ Kein React Query (useEffect/loadData Pattern)
- ❌ Tab-Content inline (sollte eigene Komponenten sein)
- ❌ PDF/Excel Export inline (sollte Hooks sein)
- ❌ Dialogs inline (sollte shared components sein)
- ❌ Keine Performance-Optimierungen

**Besonderheit:**
- ✅ Tab-Routing via URL-Parameter bereits vorhanden (`?tab=dashboard`)
- ✅ Separate Tab-Komponenten bereits vorhanden

---

### Tab-Komponenten (bereits extern)

| Komponente | Pfad | LOC | Status | Komplexität |
|------------|------|-----|--------|-------------|
| **MonitoringDashboard** | `src/components/monitoring/MonitoringDashboard.tsx` | 393 | ⚠️ GROSS - Charts + AVE-Berechnung | HOCH |
| **EmailPerformanceStats** | `src/components/monitoring/EmailPerformanceStats.tsx` | 148 | ✅ Okay | MITTEL |
| **RecipientTrackingList** | `src/components/monitoring/RecipientTrackingList.tsx` | 363 | ⚠️ GROSS - Tabelle + Modal | MITTEL |
| **ClippingArchive** | `src/components/monitoring/ClippingArchive.tsx` | 224 | ✅ Okay | NIEDRIG |
| **MonitoringSuggestionsTable** | `src/components/monitoring/MonitoringSuggestionsTable.tsx` | 339 | ⚠️ GROSS - Tabelle + Actions | MITTEL |
| **EditClippingModal** | `src/components/monitoring/EditClippingModal.tsx` | 262 | ✅ Okay | MITTEL |
| **MarkPublishedModal** | `src/components/monitoring/MarkPublishedModal.tsx` | 393 | ⚠️ GROSS - Multi-Step Form | HOCH |
| **PublicationSelector** | `src/components/monitoring/PublicationSelector.tsx` | 230 | ✅ Okay | NIEDRIG |

**Gesamt LOC Komponenten:** 2.352 Zeilen

**Größte Komponenten (>300 Zeilen):**
1. MonitoringDashboard (393 Zeilen) - Analytics Tab
2. MarkPublishedModal (393 Zeilen) - Shared Modal
3. RecipientTrackingList (363 Zeilen) - Empfänger Tab
4. MonitoringSuggestionsTable (339 Zeilen) - Auto-Funde Tab

---

### Services & Utilities

| Service | Pfad | LOC | Funktion |
|---------|------|-----|----------|
| **monitoring-report-service** | `src/lib/firebase/monitoring-report-service.ts` | 703 | ⚠️ SEHR GROSS - PDF-Report Generator |
| **campaign-monitoring-service** | `src/lib/firebase/campaign-monitoring-service.ts` | 468 | Stats-Aggregation, Helpers |
| **monitoring-suggestion-service** | `src/lib/firebase/monitoring-suggestion-service.ts` | 236 | Auto-Funde CRUD |
| **monitoring-excel-export** | `src/lib/exports/monitoring-excel-export.ts` | 186 | Excel-Export |

**Gesamt LOC Services:** 1.593 Zeilen

**Probleme:**
- ⚠️ monitoring-report-service zu groß (703 Zeilen)
- ❌ Keine React Query Integration

---

## 🟢 PHASE 0: SHARED COMPONENTS (ZUERST!)

> **Warum zuerst?** Diese werden in mehreren Bereichen verwendet → Einmal refactorn, überall profitieren

### 0.1 PDF-Report Service (KRITISCH!)

**Problem:** SEHR GROSS (867 Zeilen) und komplex ✅ GELÖST
**Entry Point:** `src/lib/firebase/monitoring-report-service.ts`
**LOC:** 867 → 204 Zeilen (-76% Code-Reduktion)
**Aufwand:** L (Large) - 3-4 Tage ✅ ABGESCHLOSSEN
**Verwendet in:** Monitoring Detail Page (Analytics Tab)

**Probleme identifiziert:**
- ~~Monolithischer Service~~ ✅ GELÖST
- ~~PDF-Generierung mit HTML-String inline~~ ✅ GELÖST
- ~~Stats-Berechnung inline~~ ✅ GELÖST
- ~~Timeline fehlte im PDF~~ ✅ GELÖST

**Refactoring-Ziele:**
- [x] Modularisierung in Sub-Module (10 Module erstellt)
  - [x] types.ts (124 Zeilen)
  - [x] core/data-collector.ts (120 Zeilen)
  - [x] core/stats-calculator.ts (150 Zeilen)
  - [x] core/timeline-builder.ts (103 Zeilen)
  - [x] templates/styles.ts (235 Zeilen + Timeline-CSS)
  - [x] templates/report-template.ts (396 Zeilen + Timeline-Sektion)
  - [x] generators/html-generator.ts (37 Zeilen)
  - [x] generators/pdf-generator.ts (124 Zeilen)
  - [x] delivery/download-handler.ts (163 Zeilen)
  - [x] index.ts (47 Zeilen - Re-Exports)
- [x] Types extrahieren (types.ts)
- [x] Custom Hook erstellen (useMonitoringReport.ts - 76 Zeilen)
- [x] Performance-Optimierung (useCallback, parallele API-Calls)
- [x] Tests schreiben (85 Tests, 100% Coverage)
- [x] **BONUS:** Timeline-Visualisierung im PDF

**Tracking:**
- [x] **Plan erstellt:** `docs/planning/monitoring/shared/pdf-report-refactoring.md`
- [x] **Implementierung durchgeführt** (Phase 0-5)
- [x] **Merged to Main** ✅ 16. November 2025

**Ergebnis-Zusammenfassung:**
```
✅ ABGESCHLOSSEN (16. November 2025)

Metriken:
- Code-Reduktion: 867 → 204 Zeilen (-76%)
- Module erstellt: 10
- Tests: 85/85 bestehen (100%)
- Coverage: 100% für Core-Module
- Dokumentation: 7 Docs (4.593 Zeilen)

Quality Check: ✅ READY FOR MERGE
- Critical Issues: 0
- Minor Issues: 0
```

---

### 0.2 Excel-Export Utility (WICHTIG!)

**Problem:** MITTEL (186 Zeilen)
**Entry Point:** `src/lib/exports/monitoring-excel-export.ts`
**LOC:** 186 Zeilen
**Aufwand:** S (Small) - 1-2 Tage
**Verwendet in:** Monitoring Detail Page (alle Tabs)

**Probleme identifiziert:**
- Standalone Utility (gut strukturiert)
- Könnte generischer sein (für andere Module)

**Refactoring-Ziele:**
- [ ] Generischen Export-Service erstellen
  - Wiederverwendbar für andere Module (CRM, Projects, etc.)
- [ ] Custom Hook erstellen
  - useExcelExport.ts (React Query Mutation)
- [ ] TypeScript Types verbessern
- [ ] Tests schreiben

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/shared/excel-export-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 0.3 MarkPublishedModal (SHARED MODAL)

**Problem:** GROSS (393 Zeilen)
**Entry Point:** `src/components/monitoring/MarkPublishedModal.tsx`
**LOC:** 393 Zeilen
**Aufwand:** M (Medium) - 2-3 Tage
**Verwendet in:** RecipientTrackingList (Empfänger Tab)

**Probleme identifiziert:**
- Multi-Step Form inline
- Publication-Selector inline
- Komplexe State-Logik

**Refactoring-Ziele:**
- [ ] Modularisierung
  - StepIndicator.tsx
  - PublicationSearchStep.tsx
  - ClippingDetailsStep.tsx
  - ReviewStep.tsx
- [ ] Custom Hook
  - useMarkPublished.ts (React Query Mutation)
- [ ] Performance-Optimierung
- [ ] Tests schreiben

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/shared/mark-published-modal-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

## 🟡 PHASE 1: HAUPTSEITE & TAB-STRUKTUR

> **Blockiert:** Alle Tab-Refactorings hängen davon ab

### 1.1 Monitoring Overview Page

**Entry Point:** `src/app/dashboard/analytics/monitoring/page.tsx`
**LOC:** 249 Zeilen
**Aufwand:** S (Small) - 1-2 Tage
**Problem:** React Query fehlt, inline Stats-Berechnung

**Refactoring-Ziele:**
- [ ] **React Query Integration**
  - useMonitoringCampaigns.ts (Query Hook)
  - useCampaignStats.ts (Stats-Berechnung)

- [ ] **Toast-Service Migration**
  - Alert-State entfernen (falls vorhanden)
  - toastService verwenden

- [ ] **Performance-Optimierung**
  - useCallback für Handler
  - useMemo für filteredCampaigns, stats
  - Debouncing für Search (300ms)

- [ ] **Code-Reduktion Ziel:** 249 → ~180 Zeilen (-28%)

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/phase-1.1-monitoring-overview-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 1.2 Monitoring Detail Page (Orchestrator)

**Entry Point:** `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx`
**LOC:** 526 Zeilen
**Aufwand:** L (Large) - 3-4 Tage
**Problem:** Monolithische Komponente mit allen 5 Tabs + PDF/Excel inline

**Besonderheit:**
- ✅ Tab-Routing via URL-Parameter bereits vorhanden (`?tab=dashboard`)
- ✅ Separate Tab-Komponenten bereits vorhanden

**Refactoring-Ziele:**
- [ ] **MonitoringContext erstellen** (wie CampaignContext)
  - Shared State: campaign, sends, clippings, suggestions, loading, error
  - Shared Actions: reloadData, handlePDFExport, handleExcelExport
  - Props-Drilling eliminieren

- [ ] **Shared Components extrahieren**
  - MonitoringHeader.tsx (Zurück-Button, Titel, PDF/Excel Buttons)
  - TabNavigation.tsx (5 Tabs)
  - LoadingState.tsx
  - ErrorState.tsx

- [ ] **Dialogs extrahieren**
  - DeletePDFDialog.tsx (shared/dialogs/)
  - SuccessDialog.tsx (shared/dialogs/)

- [ ] **Custom Hooks**
  - useMonitoringData.ts (React Query - Campaign, Sends, Clippings, Suggestions)
  - usePDFExport.ts (React Query Mutation)
  - useExcelExport.ts (React Query Mutation)
  - useAnalysisPDFs.ts (React Query - PDF-Liste)

- [ ] **Code-Reduktion Ziel:** 526 → ~250 Zeilen (-52%)

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/phase-1.2-monitoring-detail-foundation.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

## 🟡 PHASE 2: TAB-MODULE

> **Reihenfolge:** Nach Priorität P1 (hoch) → P2 (mittel)

### 2.1 Analytics Tab (P1 - Hauptfunktion)

**Entry Point:** Monitoring Detail Page (activeTab === 'dashboard')
**Komponente:** MonitoringDashboard.tsx
**LOC:** 393 Zeilen
**Aufwand:** M (Medium) - 2-3 Tage
**Abhängigkeiten:**
- 0.1 PDF-Report Service ✅ (für Report-Button)

**Besonderheiten:**
- Charts (Recharts-Library)
- AVE-Berechnung (Advertising Value Equivalency)
- Sentiment-Analyse
- Timeline-Darstellung

**Refactoring-Ziele:**
- [ ] Charts modularisieren
  - SentimentPieChart.tsx
  - TimelineChart.tsx
  - TopOutletsBarChart.tsx
  - ReachByMediaTypeChart.tsx

- [ ] Custom Hooks
  - useAVECalculation.ts (AVE-Berechnung)
  - useClippingStats.ts (Stats-Aggregation)

- [ ] Integration mit MonitoringContext

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/tabs/analytics-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 2.2 E-Mail Performance Tab (P1 - Wichtig für Reporting)

**Entry Point:** Monitoring Detail Page (activeTab === 'performance')
**Komponente:** EmailPerformanceStats.tsx
**LOC:** 148 Zeilen
**Aufwand:** S (Small) - 1 Tag
**Status:** ✅ Bereits gut strukturiert

**Besonderheiten:**
- Stats-Karten (Delivered, Opened, Clicked, Bounced)
- Open-Rate, Click-Rate Berechnung
- Status-Distribution Charts

**Refactoring-Ziele:**
- [ ] Minor Refactoring (falls nötig)
  - React Query Integration (via MonitoringContext)
  - Performance-Optimierung (React.memo, useMemo)

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/tabs/performance-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 2.3 Empfänger & Veröffentlichungen Tab (P1 - Wichtig für Workflow)

**Entry Point:** Monitoring Detail Page (activeTab === 'recipients')
**Komponente:** RecipientTrackingList.tsx
**LOC:** 363 Zeilen
**Aufwand:** M (Medium) - 2-3 Tage
**Abhängigkeiten:**
- 0.3 MarkPublishedModal ✅ (Shared Modal)

**Besonderheiten:**
- Recipient-Tabelle (Sends-Liste)
- Filter: Status, Search
- "Als veröffentlicht markieren" Action
- Send-Status Tracking

**Refactoring-Ziele:**
- [ ] Tabelle modularisieren
  - RecipientTable.tsx
  - RecipientFilters.tsx
  - RecipientActions.tsx

- [ ] Custom Hooks
  - useRecipientFilters.ts (Filter-Logik)
  - useMarkPublished.ts (aus Phase 0.3)

- [ ] Integration mit MonitoringContext

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/tabs/recipients-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 2.4 Clipping-Archiv Tab (P2 - Archiv)

**Entry Point:** Monitoring Detail Page (activeTab === 'clippings')
**Komponente:** ClippingArchive.tsx
**LOC:** 224 Zeilen
**Aufwand:** S (Small) - 1 Tag
**Status:** ✅ Relativ gut strukturiert

**Besonderheiten:**
- Clipping-Liste
- Filter: Sentiment, Outlet, Datum
- Edit-Clipping-Modal
- Reach/AVE Display

**Refactoring-Ziele:**
- [ ] Minor Refactoring
  - React Query Integration (via MonitoringContext)
  - Performance-Optimierung
  - Filter-Logik in Hook extrahieren (useClippingFilters.ts)

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/tabs/clippings-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 2.5 Auto-Funde Tab (P2 - KI-Feature)

**Entry Point:** Monitoring Detail Page (activeTab === 'suggestions')
**Komponente:** MonitoringSuggestionsTable.tsx
**LOC:** 339 Zeilen
**Aufwand:** M (Medium) - 2 Tage

**Besonderheiten:**
- KI-generierte Vorschläge
- Actions: Confirm, Mark as Spam
- Spam-Pattern-Erstellung
- Status-Tracking (pending, confirmed, spam)

**Refactoring-Ziele:**
- [ ] Modularisierung
  - SuggestionsTable.tsx
  - SuggestionActions.tsx
  - SpamPatternDialog.tsx (neu)

- [ ] Custom Hooks
  - useSuggestionActions.ts (Confirm, Spam)
  - useSpamPatterns.ts (Pattern-Management)

- [ ] Integration mit MonitoringContext

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/monitoring/tabs/suggestions-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

## 📊 FORTSCHRITTS-TRACKING

### Übersicht nach Phasen

| Phase | Module | Pläne | Implementiert | Merged | Fortschritt |
|-------|--------|-------|---------------|--------|-------------|
| Phase 0: Shared Components | 3 | 1/3 | 1/3 | 1/3 | 33% 🚧 |
| Phase 1: Hauptseiten | 2 | 0/2 | 0/2 | 0/2 | 0% ⏳ |
| Phase 2: Tab-Module | 5 | 0/5 | 0/5 | 0/5 | 0% ⏳ |
| **GESAMT** | **10** | **1/10** | **1/10** | **1/10** | **10%** |

### Aufwands-Verteilung

- **L (Large):** 2 Module (PDF-Report Service, Monitoring Detail Page) - ~3-4 Tage/Modul
- **M (Medium):** 4 Module (MarkPublishedModal, Analytics Tab, Recipients Tab, Suggestions Tab) - ~2-3 Tage/Modul
- **S (Small):** 4 Module (Excel-Export, Overview Page, Performance Tab, Clippings Tab) - ~1-2 Tage/Modul

**Geschätzter Gesamt-Aufwand:** 18-28 Tage (~4-6 Wochen)

---

## 🎯 EMPFOHLENE REIHENFOLGE

### Optimale Reihenfolge (Abhängigkeiten beachten):

1. **Phase 0.1** → PDF-Report Service (blockiert Analytics Tab!)
2. **Phase 0.2** → Excel-Export Utility (blockiert alle Tabs!)
3. **Phase 0.3** → MarkPublishedModal (blockiert Recipients Tab!)
4. **Phase 1.1** → Monitoring Overview Page (Foundation)
5. **Phase 1.2** → Monitoring Detail Page (Foundation, MonitoringContext)
6. **Phase 2.1** → Analytics Tab (P1 - Hauptfunktion)
7. **Phase 2.2** → E-Mail Performance Tab (P1 - Reporting)
8. **Phase 2.3** → Recipients Tab (P1 - Workflow)
9. **Phase 2.4** → Clipping-Archiv Tab (P2 - Archiv)
10. **Phase 2.5** → Auto-Funde Tab (P2 - KI-Feature)

---

## 🔧 DATEI-STRUKTUR

```
docs/planning/monitoring/
├── monitoring-refactoring-master-checklist.md    # DIESE DATEI
├── shared/
│   ├── pdf-report-refactoring.md
│   ├── excel-export-refactoring.md
│   └── mark-published-modal-refactoring.md
├── tabs/
│   ├── analytics-tab-refactoring.md
│   ├── performance-tab-refactoring.md
│   ├── recipients-tab-refactoring.md
│   ├── clippings-tab-refactoring.md
│   └── suggestions-tab-refactoring.md
├── pages/
│   ├── monitoring-overview-refactoring.md
│   └── monitoring-detail-foundation.md
└── templates/
    └── module-refactoring-template.md          # MASTER TEMPLATE
```

---

## 📝 VERWENDUNG DIESER CHECKLISTE

### Für jedes Modul:

1. **Plan erstellen:**
   - Template kopieren: `docs/templates/module-refactoring-template.md`
   - An Modul anpassen
   - In entsprechenden Ordner speichern

2. **Implementierung:**
   - Alle 8 Phasen des Templates durchführen (inkl. Phase 0.5 Cleanup!)
   - Design System Guidelines beachten
   - Tests schreiben (Teil von Phase 4)

3. **Nach Abschluss:**
   - Checkbox abhaken
   - Ergebnis-Zusammenfassung ausfüllen
   - TODOs dokumentieren
   - Test-Ergebnis notieren

4. **Dokumentation:**
   - Am Ende: Vollständige Modul-Doku erstellen (Phase 5 des Templates)
   - refactoring-dokumentation Agent nutzen

---

## 💡 HINWEISE

### Code-Duplication vermeiden
- **PDF-Report Service:** In Analytics Tab verwendet → Phase 0.1 ZUERST!
- **Excel-Export:** In allen Tabs verwendet → Phase 0.2 ZUERST!
- **MarkPublishedModal:** In Recipients Tab → Phase 0.3 ZUERST!

### Design System
- Alle Module müssen `docs/design-system/DESIGN_SYSTEM.md` einhalten
- Primary Color: #005fab
- Nur Heroicons /24/outline verwenden
- Keine Schatten (außer Dropdowns)

### Testing
- Tests sind Teil des Templates (Phase 4)
- Mindest-Coverage: 80%
- Test-Ergebnisse hier kurz notieren

### Agents verwenden
- **Phase 4 (Testing):** → refactoring-test Agent
- **Phase 5 (Dokumentation):** → refactoring-dokumentation Agent
- **Phase 6.5 (Quality Gate):** → refactoring-quality-check Agent

### Tab-Routing
- ✅ **WICHTIG:** Tab-Routing via URL-Parameter (`?tab=dashboard`) bereits implementiert!
- Bei Refactoring beibehalten und verwenden
- Pattern: `router.push(`/dashboard/analytics/monitoring/${campaignId}?tab=performance`)`

---

## 🚀 NÄCHSTE SCHRITTE

### Zu erledigen:

1. **IST-Zustand final reviewen**
   - Größte Komponenten priorisieren
   - Abhängigkeiten klären

2. **Phase 0.1** → PDF-Report Service Refactoring (KRITISCH!)
3. **Phase 0.2** → Excel-Export Refactoring
4. **Phase 0.3** → MarkPublishedModal Refactoring
5. **Phase 1.1** → Monitoring Overview Page
6. **Phase 1.2** → Monitoring Detail Foundation (MonitoringContext!)

**Status:** ⏳ PLANUNG - Ready to Start! 🚀

---

## 🔍 BESONDERHEITEN MONITORING-MODUL

### Unterschiede zu Campaigns-Refactoring:

1. **Tab-Routing bereits vorhanden** ✅
   - Campaigns: Musste implementiert werden
   - Monitoring: Bereits via `?tab=dashboard` vorhanden

2. **Separate Tab-Komponenten** ✅
   - Campaigns: Tabs inline in page.tsx
   - Monitoring: Tabs bereits als separate Komponenten

3. **Shared Modals** ⚠️
   - MarkPublishedModal wird nur in Recipients Tab verwendet
   - Sollte trotzdem als Shared Component behandelt werden (Phase 0)

4. **Services-Heavy** ⚠️
   - PDF-Report Service: 703 Zeilen (größte Komponente!)
   - Excel-Export: 186 Zeilen
   - Monitoring-Suggestion Service: 236 Zeilen
   - Campaign-Monitoring Service: 468 Zeilen

5. **Charts-Library** 📊
   - Recharts-Library in MonitoringDashboard
   - Muss bei Refactoring berücksichtigt werden

### Unterschied zu Projekt-Monitoring ⚠️

**WICHTIG:** Es gibt zwei verschiedene Monitoring-Bereiche!

**Analytics/Monitoring** (DIESER Refactoring-Plan):
- **Scope:** Organization-wide, alle versendeten Kampagnen
- **Pfad:** `/dashboard/analytics/monitoring`
- **Status:** ⏳ PLANUNG
- **Features:** Globale Übersicht, Campaign-Detail mit 5 Tabs

**Projekt-Monitoring** (BEREITS REFACTORED):
- **Scope:** Projekt-spezifisch, nur Kampagnen eines Projekts
- **Pfad:** `/dashboard/projects/[projectId]` → Tab "Monitoring"
- **Status:** ✅ ABGESCHLOSSEN (Phase 0-4, Oktober 2025)
- **Dokumentation:** `docs/projects/monitoring/`
- **Features:** Projekt-Dashboard, Config-Panel, Status-Widget

### Wiederverwendbare Patterns vom Projekt-Monitoring

Vom erfolgreichen Projekt-Monitoring-Refactoring übernehmen:
- ✅ **React Query Integration** (ADR-001) - Automatisches Caching, Background Refetch
- ✅ **Komponenten-Modularisierung** (ADR-002) - Code-Reduktion -43% bis -66%
- ✅ **Performance-Optimierung** (ADR-003) - React.memo, useCallback, useMemo
- ✅ **TypeScript Strict Mode** (ADR-004) - Weniger Runtime Errors
- ✅ **Test-Driven Refactoring** (ADR-005) - >80% Coverage, 100% passing

### Mögliche Shared Components

**Zu prüfen ob wiederverwendbar:**
- `EmptyState` (docs/projects/monitoring/EmptyState.tsx - 43 Zeilen, 100% Coverage)
- `LoadingState` (docs/projects/monitoring/LoadingState.tsx - 29 Zeilen, 100% Coverage)

**Shared Services (bereits verwendet):**
- `clippingService` (in beiden Bereichen)
- `monitoringSuggestionService` (in beiden Bereichen)

**Achtung - Komponenten-Namen-Konflikte:**
- Projekt: `ProjectMonitoringOverview` vs. Analytics: `MonitoringDashboard`
- Projekt: `ProjectMonitoringTab` vs. Analytics: `MonitoringDetailPage`

---

**Zuletzt aktualisiert:** 2025-11-16
**Maintainer:** CeleroPress Team

**Changelog:**
- 2025-11-16: ✅ Master-Checklist erstellt basierend auf Codebase-Analyse
  - IST-Zustand analysiert (4.000+ Zeilen Code)
  - 10 Module identifiziert (3 Shared, 2 Pages, 5 Tabs)
  - Aufwand geschätzt: 18-28 Tage (~4-6 Wochen)
  - Prioritäten definiert (P1/P2)
  - Tab-Routing bereits vorhanden (✅ Vorteil!)
  - Größte Probleme: PDF-Report Service (703 Zeilen), MarkPublishedModal (393 Zeilen), MonitoringDashboard (393 Zeilen)
