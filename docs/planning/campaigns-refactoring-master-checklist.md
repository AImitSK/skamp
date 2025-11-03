# Campaign-Module: Master Refactoring Checkliste

**Version:** 1.0
**Erstellt:** 2025-11-03
**Bereich:** `/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]`
**Status:** 📋 PHASE 0 - PLANUNG (1/10 Pläne erstellt = 10%)

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

---

## 🎯 Scope

Refactoring des gesamten Campaign-Edit-Bereichs:
- **Hauptseite:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx` (2.437 Zeilen!)
- **4 Tabs:** Inhalt, Versand, Freigabe, Versionen
- **KI-Komponenten:** Toolbar, Assistent, Headline Generator, PR SEO Tool
- **PDF Versionierung**
- **Freigabe-Workflow**

**Ausgenommen (bereits fertig oder separat):**
- ✅ CampaignCreateModal (bereits durch Wizard ersetzt)
- ✅ CampaignSendModal (separates Modul)

---

## 🔍 IST-ZUSTAND ANALYSE

### Hauptseite: Campaign Edit Page

**Entry Point:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`
**LOC:** 2.437 Zeilen (⚠️ EXTREM GROSS!)
**Problem:** Monolithische Komponente mit allen Features in einer Datei

**Hauptkomponenten eingebettet:**
- 4 Tab-Bereiche (Inhalt, Versand, Freigabe, Versionen)
- Edit-Lock-Management
- Project-Assignment mit Migration-Dialog
- Approval-Workflow
- PDF-Versionierung
- Asset-Management (KeyVisual, Attachments)
- Boilerplate-Verwaltung

### Sub-Komponenten (bereits extern)

| Komponente | Pfad | LOC | Status |
|------------|------|-----|--------|
| **CampaignContentComposer** | `src/components/pr/campaign/CampaignContentComposer.tsx` | 529 | ⚠️ Groß, enthält Editor + SEO + Boilerplates |
| **StructuredGenerationModal** | `src/components/pr/ai/StructuredGenerationModal.tsx` | 1.374 | ⚠️ SEHR GROSS - KI Assistent |
| **HeadlineGenerator** | `src/components/pr/ai/HeadlineGenerator.tsx` | 184 | ✅ Okay |
| **PRSEOHeaderBar** | `src/components/campaigns/PRSEOHeaderBar.tsx` | 1.182 | ⚠️ SEHR GROSS - PR SEO Tool |
| **PDFVersionHistory** | `src/components/campaigns/PDFVersionHistory.tsx` | 222 | ✅ Okay |
| **ApprovalSettings** | `src/components/campaigns/ApprovalSettings.tsx` | ? | Zu prüfen |
| **EditLockBanner** | `src/components/campaigns/EditLockBanner.tsx` | ? | Zu prüfen |
| **ProjectLinkBanner** | `src/components/campaigns/ProjectLinkBanner.tsx` | ? | Zu prüfen |

**Gesamt LOC (geschätzt):** ~7.000+ Zeilen

---

## 🟢 PHASE 0: SHARED COMPONENTS (ZUERST!)

> **Warum zuerst?** Diese werden in mehreren Bereichen verwendet → Einmal refactorn, überall profitieren

### 0.1 PR SEO Tool (KRITISCH!)

**Problem:** EXTREM GROSS (1.182 Zeilen) und komplex
**Entry Point:** `src/components/campaigns/PRSEOHeaderBar.tsx`
**LOC:** 1.182 Zeilen
**Aufwand:** XL (X-Large) - 4-5 Tage
**Verwendet in:** CampaignContentComposer, Campaign Edit Page

**Probleme identifiziert:**
- Monolithische Komponente
- SEO Score Berechnung inline
- Keyword-Analyse inline
- Komplexe State-Logik

**Refactoring-Ziele:**
- [ ] Modularisierung in Sub-Komponenten (< 300 Zeilen)
  - SEOScoreDisplay.tsx
  - KeywordAnalyzer.tsx
  - SEOHints.tsx
  - KeywordInput.tsx
- [ ] Custom Hooks extrahieren
  - useSEOScore.ts
  - useKeywordAnalysis.ts
- [ ] Helper-Module erstellen
  - seo-score-calculator.ts
  - keyword-analyzer.ts
- [ ] React Query Integration (falls Backend-Calls)
- [ ] Performance-Optimierung (React.memo, useCallback, useMemo)
- [ ] Tests schreiben (>80% Coverage)

**Tracking:**
- [x] **Plan erstellen:** `docs/planning/campaigns/shared/pr-seo-tool-refactoring.md` ✅ (2025-11-03)
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
📋 PLAN ERSTELLT (2025-11-03)

Implementierungsplan vollständig:
- 8 Phasen definiert (0, 0.5, 1, 2, 3, 4, 5, 6, 6.5, 7)
- 14 Module geplant (Utils, Hooks, Components)
- 1.182 → ~250 Zeilen Hauptdatei (-79%)
- Agent-Workflow für Phasen 4, 5, 6.5 eingeplant
- Geschätzter Aufwand: 4-5 Tage (XL)

Status: Bereit für Phase 0 (Setup & Backup)
```

---

### 0.2 KI Assistent (KRITISCH!)

**Problem:** EXTREM GROSS (1.374 Zeilen)
**Entry Point:** `src/components/pr/ai/StructuredGenerationModal.tsx`
**LOC:** 1.374 Zeilen
**Aufwand:** XL (X-Large) - 4-5 Tage
**Verwendet in:** Campaign Edit Page, Content Composer

**Probleme identifiziert:**
- Monolithische Modal-Komponente
- Komplexe Genkit/AI Integration inline
- Multi-Step Wizard inline
- Document Picker inline

**Refactoring-Ziele:**
- [ ] Modularisierung in Sub-Komponenten
  - GenerationWizard.tsx (Steps)
  - DocumentPicker.tsx (bereits separate Komponente?)
  - IndustrySelector.tsx
  - ToneSelector.tsx
  - GenerationPreview.tsx
- [ ] Custom Hooks extrahieren
  - useStructuredGeneration.ts
  - useDocumentContext.ts
- [ ] API Integration sauber trennen
- [ ] State Management verbessern
- [ ] Tests schreiben

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/campaigns/shared/ki-assistent-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 0.3 Content Composer (WICHTIG!)

**Problem:** GROSS (529 Zeilen) und komplex
**Entry Point:** `src/components/pr/campaign/CampaignContentComposer.tsx`
**LOC:** 529 Zeilen
**Aufwand:** L (Large) - 3-4 Tage
**Verwendet in:** Campaign Edit Page (Inhalt Tab)

**Probleme identifiziert:**
- Editor + Boilerplates + SEO Tool in einer Komponente
- Komplexe Folder-Picker-Logik inline
- PDF-Generierung inline
- Alert-Komponente inline

**Refactoring-Ziele:**
- [ ] Modularisierung
  - EditorSection.tsx
  - BoilerplateSection.tsx (bereits IntelligentBoilerplateSection?)
  - FolderPicker.tsx
  - AlertMessage.tsx → shared component
- [ ] Custom Hooks
  - usePDFGeneration.ts
  - useBoilerplateProcessing.ts
- [ ] Performance-Optimierung
- [ ] Tests schreiben

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/campaigns/shared/content-composer-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

## 🟡 PHASE 1: HAUPTSEITE & TAB-STRUKTUR

> **Blockiert:** Alle Tab-Refactorings hängen davon ab

### 1.1 Campaign Edit Page (Orchestrator)

**Entry Point:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page.tsx`
**LOC:** 2.437 Zeilen (⚠️ EXTREM GROSS!)
**Aufwand:** XXL (Double X-Large) - 5-7 Tage
**Problem:** Monolithische Komponente mit allen 4 Tabs + Edit-Lock + Project-Assignment

**Vorschlag:** CampaignContext für organizationId, campaignId, activeTab, campaign einführen

**Refactoring-Ziele:**
- [ ] **CampaignContext erstellen**
  - Shared State: campaign, loading, error, activeTab
  - Shared Actions: reloadCampaign, saveCampaign, updateCampaign
  - Props-Drilling eliminieren (aktuell: viele Props durch alle Tabs)

- [ ] **Tab-Navigation extrahieren**
  - TabNavigation.tsx (4 Tabs: Inhalt, Versand, Freigabe, Versionen)
  - URL-based Navigation (Query Parameter: ?tab=inhalt)

- [ ] **Shared Components extrahieren**
  - CampaignHeader.tsx (Zurück-Button, Titel, Status-Badge)
  - EditLockBanner.tsx (bereits vorhanden, integrieren)
  - ProjectLinkBanner.tsx (bereits vorhanden, integrieren)
  - LoadingState.tsx
  - ErrorState.tsx

- [ ] **Tab Content Wrapper erstellen**
  - InhaltTabContent.tsx (leitet zu Sub-Komponenten weiter)
  - VersandTabContent.tsx
  - FreigabeTabContent.tsx
  - VersionenTabContent.tsx

- [ ] **Helper-Module**
  - campaign-utils.ts (Status-Labels, Validierung)
  - edit-lock-utils.ts (Edit-Lock-Logik)

- [ ] **Code-Reduktion Ziel:** 2.437 → ~500 Zeilen (-79%)

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/campaigns/global/campaign-edit-page-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

## 🟡 PHASE 2: TAB-MODULE

> **Reihenfolge:** Nach Priorität P1 (hoch) → P2 (mittel)

### 2.1 Inhalt Tab (P1 - Meist genutzt)

**Entry Point:** `[campaignId]/page.tsx` (Inhalt Tab case)
**Komponenten:** CampaignContentComposer, KeyVisualSection, SimpleBoilerplateLoader
**LOC:** ~800+ (geschätzt aus page.tsx)
**Aufwand:** L (Large) - 3-4 Tage
**Abhängigkeiten:**
- 0.1 PR SEO Tool ✅
- 0.2 KI Assistent ✅
- 0.3 Content Composer ✅

**Besonderheiten:**
- Editor mit KI Toolbar integriert
- Boilerplate-Verwaltung
- KeyVisual Management
- PR SEO Score Live-Berechnung
- Headline Generator Integration

**Refactoring-Ziele:**
- [ ] Inhalt Tab Content extrahieren
  - InhaltTabContent.tsx (Orchestrator)
  - KeyVisualManager.tsx
  - EditorSection.tsx (bereits in ContentComposer?)
  - BoilerplateManager.tsx

- [ ] Custom Hooks
  - useCampaignContent.ts (React Query)
  - useKeyVisual.ts
  - useBoilerplates.ts

- [ ] Integration mit Shared Components
  - CampaignContentComposer (aus Phase 0.3)
  - HeadlineGenerator
  - PRSEOHeaderBar (aus Phase 0.1)

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/campaigns/tabs/inhalt-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 2.2 Versand Tab (P1 - Wichtig für Workflow)

**Entry Point:** `[campaignId]/page.tsx` (Versand Tab case)
**Komponenten:** CampaignRecipientManager, Distribution List Selection
**LOC:** ~500+ (geschätzt)
**Aufwand:** M (Medium) - 2-3 Tage

**Besonderheiten:**
- Verteiler-Auswahl (optional)
- Recipient-Management
- Preview vor Versand

**Refactoring-Ziele:**
- [ ] Versand Tab Content extrahieren
  - VersandTabContent.tsx
  - RecipientListSelector.tsx
  - RecipientPreview.tsx

- [ ] Custom Hooks
  - useCampaignRecipients.ts
  - useDistributionLists.ts

- [ ] Integration mit CampaignRecipientManager

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/campaigns/tabs/versand-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 2.3 Freigabe Tab (P1 - Wichtig für Approval-Workflow)

**Entry Point:** `[campaignId]/page.tsx` (Freigabe Tab case)
**Komponenten:** ApprovalSettings, CustomerContactSelector, Project Approval Display
**LOC:** ~600+ (geschätzt)
**Aufwand:** M (Medium) - 2-3 Tage

**Besonderheiten:**
- Kunden-Freigabe Workflow
- Projekt-Freigabe Integration
- Approval-Status Tracking
- Auto-Transition on Approval

**Refactoring-Ziele:**
- [ ] Freigabe Tab Content extrahieren
  - FreigabeTabContent.tsx
  - ApprovalWorkflow.tsx
  - ProjectApprovalDisplay.tsx
  - CustomerApprovalSettings.tsx

- [ ] Custom Hooks
  - useApprovalWorkflow.ts
  - useProjectApproval.ts

- [ ] Integration mit ApprovalSettings Komponente

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/campaigns/tabs/freigabe-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 2.4 Versionen Tab (P2 - PDF Management)

**Entry Point:** `[campaignId]/page.tsx` (Versionen Tab case)
**Komponenten:** PDFVersionHistory, PipelinePDFViewer
**LOC:** ~400+ (geschätzt)
**Aufwand:** S (Small) - 1-2 Tage

**Besonderheiten:**
- PDF-Versionen-Historie
- PDF-Vorschau
- Version-Vergleich
- Download-Funktionalität

**Refactoring-Ziele:**
- [ ] Versionen Tab Content extrahieren
  - VersionenTabContent.tsx
  - PDFVersionList.tsx
  - PDFVersionViewer.tsx

- [ ] Custom Hooks
  - usePDFVersions.ts (React Query)
  - usePDFDownload.ts

- [ ] Integration mit PDFVersionHistory Komponente

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/campaigns/tabs/versionen-tab-refactoring.md`
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

## 🔵 PHASE 3: UNTERSTÜTZENDE FEATURES (P2)

### 3.1 Edit-Lock System

**Status:** ⚠️ ZU PRÜFEN - Bereits Komponenten vorhanden
**Komponenten:** EditLockBanner, EditLockStatusIndicator, Edit-Lock Utils
**LOC:** ~300+ (geschätzt)
**Aufwand:** S (Small) - 1 Tag

**Besonderheiten:**
- Concurrent-Editing Prevention
- Lock-Status Anzeige
- Auto-Unlock bei Verlassen
- Request-Unlock Workflow

**Refactoring-Ziele:**
- [ ] Prüfen ob bereits gut strukturiert
- [ ] Ggf. Custom Hook extrahieren
  - useEditLock.ts
- [ ] Integration in CampaignContext

**Tracking:**
- [ ] **Prüfung:** Ist Refactoring nötig?
- [ ] **Plan erstellen:** `docs/planning/campaigns/features/edit-lock-refactoring.md` (falls nötig)
- [ ] **Implementierung durchführen**
- [ ] **Merged to Main**

**Ergebnis-Zusammenfassung:**
```
⏳ AUSSTEHEND
```

---

### 3.2 Project Assignment

**Status:** ⚠️ ZU PRÜFEN
**Komponenten:** ProjectSelector, ProjectLinkBanner, ProjectAssignmentMigrationDialog
**LOC:** ~400+ (geschätzt)
**Aufwand:** M (Medium) - 2 Tage

**Besonderheiten:**
- Projekt-Zuweisung mit Asset-Migration
- Dialog bei Asset-Konflikten
- Auto-Client-Update bei Projekt-Wechsel

**Refactoring-Ziele:**
- [ ] Project Assignment Logik extrahieren
  - ProjectAssignmentManager.tsx
  - AssetMigrationHandler.tsx

- [ ] Custom Hook
  - useProjectAssignment.ts
  - useAssetMigration.ts

**Tracking:**
- [ ] **Plan erstellen:** `docs/planning/campaigns/features/project-assignment-refactoring.md`
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
| Phase 0: Shared Components | 3 | 1/3 | 0/3 | 0/3 | 10% 📋 |
| Phase 1: Hauptseite | 1 | 0/1 | 0/1 | 0/1 | 0% ⏳ |
| Phase 2: Tab-Module | 4 | 0/4 | 0/4 | 0/4 | 0% ⏳ |
| Phase 3: Features | 2 | 0/2 | 0/2 | 0/2 | 0% ⏳ |
| **GESAMT** | **10** | **1/10** | **0/10** | **0/10** | **3%** 📋 |

### Aufwands-Verteilung

- **XXL (Double X-Large):** 1 Modul (Campaign Edit Page) - ~5-7 Tage
- **XL (X-Large):** 2 Module (PR SEO Tool, KI Assistent) - ~4-5 Tage/Modul
- **L (Large):** 2 Module (Content Composer, Inhalt Tab) - ~3-4 Tage/Modul
- **M (Medium):** 3 Module (Versand, Freigabe, Project Assignment) - ~2-3 Tage/Modul
- **S (Small):** 2 Module (Versionen Tab, Edit-Lock) - ~1-2 Tage/Modul

**Geschätzter Gesamt-Aufwand:** 30-42 Tage (~6-8 Wochen)

---

## 🎯 EMPFOHLENE REIHENFOLGE

### Optimale Reihenfolge (Abhängigkeiten beachten):

1. **Phase 0.1** → PR SEO Tool (blockiert Content Composer & Inhalt Tab!)
2. **Phase 0.2** → KI Assistent (blockiert Inhalt Tab!)
3. **Phase 0.3** → Content Composer (blockiert Inhalt Tab!)
4. **Phase 1.1** → Campaign Edit Page (Foundation, Tab-Struktur)
5. **Phase 2.1** → Inhalt Tab (meist genutzt, P1)
6. **Phase 2.2** → Versand Tab (wichtig für Workflow, P1)
7. **Phase 2.3** → Freigabe Tab (wichtig für Approval, P1)
8. **Phase 2.4** → Versionen Tab (P2)
9. **Phase 3.1** → Edit-Lock System (P2)
10. **Phase 3.2** → Project Assignment (P2)

---

## 🔧 DATEI-STRUKTUR

```
docs/planning/campaigns/
├── campaigns-refactoring-master-checklist.md    # DIESE DATEI
├── shared/
│   ├── pr-seo-tool-refactoring.md
│   ├── ki-assistent-refactoring.md
│   └── content-composer-refactoring.md
├── tabs/
│   ├── inhalt-tab-refactoring.md
│   ├── versand-tab-refactoring.md
│   ├── freigabe-tab-refactoring.md
│   └── versionen-tab-refactoring.md
├── global/
│   └── campaign-edit-page-refactoring.md
├── features/
│   ├── edit-lock-refactoring.md
│   └── project-assignment-refactoring.md
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
   - Alle 7 Phasen des Templates durchführen
   - Design System Guidelines beachten
   - Tests schreiben (Teil von Phase 4)

3. **Nach Abschluss:**
   - Checkbox abhaken
   - Ergebnis-Zusammenfassung ausfüllen
   - TODOs dokumentieren
   - Test-Ergebnis notieren

4. **Dokumentation:**
   - Am Ende: Vollständige Modul-Doku erstellen (Phase 5 des Templates)
   - Refactoring-Dokumentation Agent nutzen

---

## 💡 HINWEISE

### Code-Duplication vermeiden
- **PR SEO Tool:** In Content Composer verwendet → Phase 0.1 ZUERST!
- **KI Assistent:** In mehreren Tabs → Phase 0.2 ZUERST!
- **Content Composer:** In Inhalt Tab → Phase 0.3 ZUERST!

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

---

## 🚀 NÄCHSTE SCHRITTE

### Zu erledigen:

1. ~~**Phase 0.1** → PR SEO Tool Refactoring planen~~ ✅ ERLEDIGT (2025-11-03)
2. **Phase 0.1** → PR SEO Tool Implementierung starten (Phase 0: Setup & Backup)
3. **Phase 0.2** → KI Assistent Refactoring planen
4. **Phase 0.3** → Content Composer Refactoring planen

**Status:** 📋 PLANUNG - Phase 0.1 Plan erstellt, bereit für Implementierung

---

**Zuletzt aktualisiert:** 2025-11-03
**Maintainer:** CeleroPress Team

**Changelog:**
- 2025-11-03 (14:30): Phase 0.1 Implementierungsplan erstellt (PR SEO Tool - 1.182 Zeilen)
- 2025-11-03 (13:00): Master-Checklist erstellt basierend auf Analyse der Campaign Edit Page (2.437 Zeilen)
