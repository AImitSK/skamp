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

**Gesamt LOC Services:** 1.407 Zeilen

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

### 0.2 MarkPublishedModal & EditClippingModal (SHARED MODALS)

**Problem:** MITTEL (655 Zeilen gesamt) ✅ GELÖST
**Entry Point:** `src/components/monitoring/MarkPublishedModal.tsx`, `EditClippingModal.tsx`
**LOC:** 655 Zeilen → 541 Zeilen (-17% Code-Reduktion)
**Aufwand:** M (Medium) - 2-3 Tage ✅ ABGESCHLOSSEN
**Verwendet in:** RecipientTrackingList (Empfänger Tab)

**Probleme identifiziert (alle behoben):**
- ~~Kein Toast-System~~ ✅ BEHOBEN (17. Nov 2025)
- ~~Modal zu schmal~~ ✅ BEHOBEN (17. Nov 2025)
- ~~Felder 1-spaltig~~ ✅ BEHOBEN (17. Nov 2025)
- ~~Notizen-Feld~~ ✅ ENTFERNT (17. Nov 2025)
- ~~Keine React Query Mutations~~ ✅ BEHOBEN (17. Nov 2025)
- ~~Keine Performance-Optimierungen~~ ✅ BEHOBEN (17. Nov 2025)
- ~~Keine Tests~~ ✅ BEHOBEN (17. Nov 2025)

**Refactoring-Ziele:**
- [x] ✅ Toast-Integration (17. Nov 2025)
  - toastService import hinzugefügt
  - Success-Toast implementiert
  - Error-Toast statt Error-Dialog
  - Error-State und Error-Dialog entfernt
- [x] ✅ Design-Verbesserungen (17. Nov 2025)
  - Modal breiter (size="3xl")
  - Felder 2-spaltig (3 Gruppen)
  - Notizen-Feld entfernt
- [x] ✅ React Query Mutations (17. Nov 2025)
  - useMonitoringMutations.ts (235 Zeilen) erstellt
  - useMarkAsPublished() Mutation (-73 Zeilen inline Firebase)
  - useUpdateClipping() Mutation (-41 Zeilen inline Firebase)
- [x] ✅ Performance-Optimierung (17. Nov 2025)
  - useCallback für alle Handler
  - useMemo für calculatedAVE
  - Dependency Arrays korrekt
- [x] ✅ Tests schreiben (17. Nov 2025)
  - 76 Tests (100% passing)
  - Coverage >90% (95% + 91.66%)
- [x] ✅ Dokumentation (17. Nov 2025)
  - 4,197 Zeilen erstellt
  - 5 ADRs erstellt

**Tracking:**
- [x] ✅ **Plan erstellt:** `docs/planning/monitoring/shared/mark-published-modal-refactoring.md`
- [x] ✅ **Implementierung durchgeführt** (Phase 0.5-3)
- [x] ✅ **Tests & Docs** (Phase 4-5, via Agents)
- [x] ✅ **Quality Gate** (Phase 6.5, via Agent - GO)
- [x] ✅ **Merged to Main** (Phase 7) - 17. November 2025

**Ergebnis-Zusammenfassung:**
```
✅ ABGESCHLOSSEN (17. November 2025)

Metriken:
- Code-Reduktion: 655 → 541 Zeilen (-17%)
  - MarkPublishedModal: 393 → 311 Zeilen (-21%)
  - EditClippingModal: 262 → 230 Zeilen (-12%)
- Inline Firebase Code entfernt: -114 Zeilen
- Hook erstellt: useMonitoringMutations.ts (235 Zeilen)
- Tests: 76/76 passed (100%)
- Coverage: >90% (MarkPublished 95%, EditClipping 91.66%)
- Dokumentation: 4,197 Zeilen + 5 ADRs

Code-Qualität:
- ESLint: 0 Errors, 0 Warnings ✅
- TypeScript: 0 Errors (refactored files) ✅
- Console-Cleanup: ✅ Production-ready
- Design System: ✅ Fully compliant

Phasen abgeschlossen:
✅ Phase 0.5: Pre-Refactoring Cleanup
✅ Phase 1: React Query Integration
✅ Phase 3: Performance-Optimierung
✅ Phase 4: Testing (76 Tests via refactoring-test Agent)
✅ Phase 5: Dokumentation (4,197 Zeilen via refactoring-dokumentation Agent)
✅ Phase 6: Production-Ready Code Quality
✅ Phase 6.5: Quality Gate Check (GO via refactoring-quality-check Agent)
✅ Phase 7: Merged to Main (Commit: 22696581)

Features implementiert:
✅ Bidirektionale Sentiment-Synchronisation (Select ↔ Slider)
✅ AVE-Berechnung in beiden Modals mit Live-Update
✅ aria-label für Accessibility
✅ Query Invalidation für Cache-Updates
✅ Multi-Tenancy Support (organizationId)

Quality Gate Check: ✅ GO FOR MERGE
- Alle 76 Tests bestehen
- Keine TypeScript-Errors in refactored files
- Feature-Branch gepushed
- Code ist production-ready
```

---

## 🟡 PHASE 1: HAUPTSEITEN & TAB-STRUKTUR

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
- [ ] Performance-Optimierung (React.memo, useMemo)

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
- [ ] React Query Integration (via MonitoringContext)
- [ ] Performance-Optimierung (React.memo, useMemo)

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
- 0.2 MarkPublishedModal (Shared Modal)

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
  - useMarkPublished.ts (aus Phase 0.2)

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
- [ ] React Query Integration (via MonitoringContext)
- [ ] Performance-Optimierung (React.memo, useMemo)
- [ ] Filter-Logik in Hook extrahieren (useClippingFilters.ts)

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
| Phase 0: Shared Components | 2 | 2/2 | 2/2 | 2/2 | 100% ✅ |
| Phase 1: Hauptseiten | 2 | 0/2 | 0/2 | 0/2 | 0% ⏳ |
| Phase 2: Tab-Module | 5 | 0/5 | 0/5 | 0/5 | 0% ⏳ |
| **GESAMT** | **9** | **2/9** | **2/9** | **2/9** | **22%** |

### Aufwands-Verteilung

- **L (Large):** 2 Module (~~PDF-Report Service~~ ✅, Monitoring Detail Page) - ~3-4 Tage/Modul
- **M (Medium):** 4 Module (~~MarkPublishedModal~~ ✅, Analytics Tab, Recipients Tab, Suggestions Tab) - ~2-3 Tage/Modul
- **S (Small):** 3 Module (Overview Page, Performance Tab, Clippings Tab) - ~1-2 Tage/Modul

**Geschätzter Gesamt-Aufwand:** 16-26 Tage (~3-5 Wochen)
**Abgeschlossen:** 5-7 Tage (Phase 0.1 + 0.2)
**Verbleibend:** 11-19 Tage (~2-4 Wochen)

---

## 🎯 EMPFOHLENE REIHENFOLGE

### Optimale Reihenfolge (Abhängigkeiten beachten):

1. ~~**Phase 0.1** → PDF-Report Service (blockiert Analytics Tab!)~~ ✅ **ABGESCHLOSSEN (16. Nov 2025)**
2. ~~**Phase 0.2** → MarkPublishedModal & EditClippingModal (blockiert Recipients Tab!)~~ ✅ **ABGESCHLOSSEN (17. Nov 2025)**
3. **Phase 1.1** → Monitoring Overview Page (Foundation) ⬅️ **NÄCHSTER SCHRITT**
4. **Phase 1.2** → Monitoring Detail Page (Foundation, MonitoringContext)
5. **Phase 2.1** → Analytics Tab (P1 - Hauptfunktion)
6. **Phase 2.2** → E-Mail Performance Tab (P1 - Reporting)
7. **Phase 2.3** → Recipients Tab (P1 - Workflow)
8. **Phase 2.4** → Clipping-Archiv Tab (P2 - Archiv)
9. **Phase 2.5** → Auto-Funde Tab (P2 - KI-Feature)

---

## 🔧 DATEI-STRUKTUR

```
docs/planning/monitoring/
├── monitoring-refactoring-master-checklist.md    # DIESE DATEI
├── shared/
│   ├── pdf-report-refactoring.md                # ✅ ABGESCHLOSSEN
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
- **PDF-Report Service:** In Analytics Tab verwendet → Phase 0.1 ✅ ERLEDIGT!
- **MarkPublishedModal:** In Recipients Tab → Phase 0.2 (nächster Schritt)

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

1. ~~**Phase 0.1** → PDF-Report Service Refactoring (KRITISCH!)~~ ✅ **ABGESCHLOSSEN (16. Nov)**
2. ~~**Phase 0.2** → MarkPublishedModal Refactoring~~ ✅ **ABGESCHLOSSEN (17. Nov)**
3. **Phase 1.1** → Monitoring Overview Page ⬅️ **NÄCHSTER SCHRITT**
4. **Phase 1.2** → Monitoring Detail Foundation (MonitoringContext!)
5. **Phase 2.1-2.5** → Tab-Module Refactorings

**Status:** 🚧 IN ARBEIT - 22% abgeschlossen (2/9 Module - Phase 0 Complete ✅)

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
   - ~~PDF-Report Service: 703 Zeilen~~ ✅ Refactored → 204 Zeilen (-76%)
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

**Zuletzt aktualisiert:** 2025-11-17
**Maintainer:** CeleroPress Team

**Changelog:**
- 2025-11-17 (17:00): ✅ Phase 0.2 ABGESCHLOSSEN - MarkPublishedModal & EditClippingModal
  - React Query Integration komplett (useMonitoringMutations.ts Hook erstellt)
  - Alle 7 Phasen durchgeführt (0.5, 1, 3, 4, 5, 6, 6.5, 7)
  - Code-Reduktion: 655 → 541 Zeilen (-17%)
  - 76 Tests erstellt (100% passing, >90% coverage)
  - 4,197 Zeilen Dokumentation + 5 ADRs
  - Quality Gate: GO (via refactoring-quality-check Agent)
  - Merged to Main (Commit: 22696581)
  - **Phase 0 jetzt zu 100% abgeschlossen! ✅**
  - Fortschritt: 11% → 22% (2/9 Module)
  - Verbleibender Aufwand: 11-19 Tage

- 2025-11-17 (vormittags): 🔥 Excel-Export komplett entfernt
  - Excel-Export-Feature nicht mehr benötigt (User-Entscheidung)
  - Datei gelöscht: `src/lib/exports/monitoring-excel-export.ts` (186 Zeilen)
  - Alle Verwendungen entfernt aus Monitoring Detail Page
  - Module reduziert: 10 → 9
  - Aufwand reduziert: 18-28 Tage → 16-26 Tage
  - Phase 0.2 entfernt, Phase 0.3 → 0.2 (MarkPublishedModal)

- 2025-11-16: ✅ Master-Checklist erstellt basierend auf Codebase-Analyse
  - IST-Zustand analysiert (4.000+ Zeilen Code)
  - 10 Module identifiziert (3 Shared, 2 Pages, 5 Tabs)
  - Aufwand geschätzt: 18-28 Tage (~4-6 Wochen)
  - Prioritäten definiert (P1/P2)
  - Tab-Routing bereits vorhanden (✅ Vorteil!)
  - Größte Probleme: ~~PDF-Report Service (703 Zeilen)~~ ✅, ~~MarkPublishedModal (393 Zeilen)~~ ✅, MonitoringDashboard (393 Zeilen)
