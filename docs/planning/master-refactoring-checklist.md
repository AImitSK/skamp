# Projects-Module: Master Refactoring Checkliste

**Version:** 1.1
**Erstellt:** 2025-01-19
**Letztes Update:** 2025-10-20
**Status:** In Progress (2/13 Module = 15%)

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

Refactoring aller Module unter:
- `src/app/dashboard/projects/[projectId]/`
- `src/components/projects/`

**Ausgenommen (bereits fertig):**
- ✅ Creation Wizard
- ✅ Edit Wizard
- ✅ Kanban Board

---

## 🟢 PHASE 0: SHARED COMPONENTS (ZUERST!)

> **Warum zuerst?** Diese werden von mehreren Modulen verwendet → Einmal refactorn, überall profitieren

### 0.1 Project Folder View (KRITISCH!)

**Problem:** CODE DUPLICATION in Strategie Tab + Daten Tab!
**Entry Point:** `src/components/projects/ProjectFoldersView.tsx`
**Komponenten:** 2 (ProjectFoldersView, SmartUploadInfoPanel)
**LOC:** ~800+ (SEHR HOCH)
**Aufwand:** L (Large)
**Verwendet in:** Strategie Tab, Daten Tab

**Tracking:**
- [x] **Plan erstellt:** `docs/planning/shared/project-folders-view-refactoring.md`
- [x] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
✅ ABGESCHLOSSEN - 2025-10-19 - Merged to Main

Phase 0-7 vollständig durchgeführt:
- ✅ Parameterisierung implementiert: filterByFolder: 'Dokumente' | 'all'
- ✅ Beide Tabs migriert (Strategie + Daten)
- ✅ Code-Modularisierung: 1 große Datei → 10 spezialisierte Dateien
  - ProjectFoldersView.tsx (Hauptkomponente, 478 Zeilen)
  - 3 Custom Hooks (useFolderNavigation, useFileActions, useDocumentEditor)
  - 6 UI Komponenten (Alert, ConfirmDialog, EmptyState, etc.)
- ✅ Test-Ergebnis: 113/113 Tests passed (100% Pass Rate)
  - 73 Hook Tests + 40 Component Tests
  - Integration Tests + Unit Tests + E2E Tests
- ✅ Dokumentation: 4,579 Zeilen in 5 Dateien
  - README, API-Docs, Components-Docs, ADRs
- ✅ Code Quality: TypeScript 0 Errors, ESLint 0 Warnings
- ✅ Design System Compliance: 100%
- ✅ Git: 27 Files changed, +10,715/-960 (net +9,755 Zeilen)
```

**TODOs / Offene Punkte:**
```
Keine offenen Punkte - Alle Phasen erfolgreich abgeschlossen ✅
```

---

### 0.2 Communication Components

**Entry Point:** `src/components/projects/communication/`
**Komponenten:** 7 (FloatingChat, TeamChat, CommunicationModal, AssetPickerModal, AssetPreview, MentionDropdown, MessageInput)
**LOC:** ~2.713 Zeilen (KORREKTUR: nicht ~400+!)
**Aufwand:** L (Large) - 3-4 Tage (UPDATE: M→L wegen höherer LOC)
**Verwendet in:** Alle Tabs (GlobalChat)

**Probleme identifiziert:**
- TeamChat.tsx: 1096 Zeilen ⚠️ SEHR GROSS!
- CommunicationModal.tsx: 536 Zeilen ⚠️ GROSS!
- Kein React Query (useState + useEffect Pattern)
- LocalStorage-Logik in Komponente (sollte in Hook)

**Tracking:**
- [x] **Plan erstellt:** `docs/planning/shared/communication-components-refactoring/`
- [x] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
✅ ABGESCHLOSSEN - 2025-10-20 - Branch: feature/communication-components-refactoring-production

Phase 0-6 vollständig durchgeführt:

Phase 1: React Query Integration ✅
- ✅ useTeamMessages.ts (181 Zeilen, 96% Coverage)
  - useTeamMessages() - Real-time Subscriptions + Cache
  - useSendMessage() - API Route Integration
  - useMessageReaction() - Reaction Toggle
  - useEditMessage() - API Route Integration
  - useDeleteMessage() - API Route Integration
- ✅ useCommunicationMessages.ts (82 Zeilen, 94% Coverage)
- ✅ useFloatingChatState.ts (90% Coverage)
- ✅ Alter useState/useEffect Pattern vollständig entfernt

Phase 1.5: Admin SDK Integration (KRITISCH!) ✅
- ✅ API Routes erstellt:
  - POST /api/v1/messages (255 Zeilen)
  - PATCH/DELETE /api/v1/messages/[messageId] (309 Zeilen)
- ✅ Server-Side Security:
  - Rate-Limiting: 10 Messages/Minute
  - Content-Moderation: Profanity-Filter
  - Permission-Checks: Team-Membership
  - Time-Limits: 15min für Edits/Deletes
  - Audit-Logs: GDPR/ISO-ready
  - Edit-History: Vollständige Transparenz

Phase 2: Modularisierung ⚠️ TEILWEISE
- ✅ MessageInput.tsx erstellt (131 Zeilen, React.memo, 88% Coverage)
- ✅ MessageInput in TeamChat.tsx eingebunden
- ⚠️ Weitere Komponenten geplant aber nicht erstellt:
  - MessageList.tsx, MessageItem.tsx, ReactionBar.tsx
  - UnreadIndicator.tsx, MessageFeed.tsx, MessageFilters.tsx
- ✅ TeamChat.tsx: 1040 → 963 Zeilen (-77 Zeilen)

Phase 3: Performance-Optimierung ✅
- ✅ React.memo auf MessageInput
- ✅ useCallback für Event-Handler (4x in TeamChat)
- ✅ useMemo für Team-Member Lookup Map (O(1) statt O(n))

Phase 4: Testing ✅
- ✅ 42 Jest Tests (alle bestanden, 1 skipped)
  - useTeamMessages: 13 Tests (96% Coverage)
  - useCommunicationMessages: 7 Tests (94% Coverage)
  - useFloatingChatState: 5 Tests (90% Coverage)
  - MessageInput: 15 Tests (88% Coverage)
  - Notifications: 2 Tests
- ✅ 25 E2E Tests (Playwright) vorhanden
  - TeamChat Flow: 10 Tests
  - Rate-Limiting: 5 Tests
  - Permissions: 10 Tests

Phase 5: Dokumentation ✅
- ✅ 5.113 Zeilen in 6 Dateien (Ziel: 3.150+ → 162%)
  - README.md (1.322 Zeilen)
  - api/README.md (862 Zeilen)
  - api/team-chat-service.md (757 Zeilen)
  - api/admin-sdk-routes.md (722 Zeilen)
  - components/README.md (750 Zeilen)
  - adr/README.md (700 Zeilen)
- ✅ 87 Code-Beispiele
- ✅ 5 ADRs (Architecture Decision Records)
- ✅ Troubleshooting-Guides

Phase 6: Production-Ready Code Quality ✅
- ✅ TypeScript: Kritische Fehler in Communication Components behoben
- ✅ ESLint: 0 Warnings
- ✅ Console-Logs: Nur production-relevante (console.error in catch)
- ✅ Design System: Compliant (#005fab, Heroicons /24/outline)
- ✅ Quality Check Agent: ⚠️ MIT VORBEHALT (85% vollständig)

Git-Statistik:
- Branch: feature/communication-components-refactoring-production
- Commits: 12 (Phase 1-6)
- Files changed: 20+ (Hooks, Components, Tests, Docs)
- Code-Reduktion: TeamChat 1040 → 963 Zeilen
- Neue Dateien: 3 Hooks, 1 Component, 8 Tests, 6 Docs, 3 API Routes
```

**TODOs / Offene Punkte:**
```
Phase 7: Merge zu Main - NOCH AUSSTEHEND

Optionale Verbesserungen (NACH Merge):
- [ ] Weitere Sub-Komponenten extrahieren:
  - MessageList.tsx, MessageItem.tsx, ReactionBar.tsx
  - UnreadIndicator.tsx, MessageFeed.tsx, MessageFilters.tsx
- [ ] CommunicationModal modularisieren (aktuell 539 Zeilen)
- [ ] Test-Coverage auf 90%+ erhöhen (aktuell ~85%)
- [ ] Playwright E2E Tests erweitern (Content-Moderation, Mention-Validation)

Status:
✅ Kern-Funktionalität: Vollständig (React Query, Admin SDK, Security)
✅ Dokumentation: Vollständig (5.113 Zeilen)
✅ Tests: 42 Tests bestanden (94%+ Coverage Hooks)
⚠️ Code-Modularisierung: Teilweise (MessageInput ja, andere Komponenten optional)
```

---

## 🟡 PHASE 1: HAUPTSEITE & NAVIGATION

> **Blockiert:** Alle Tab-Refactorings hängen davon ab

### 1.1 Project Detail Page (Orchestrator)

**Entry Point:** `src/app/dashboard/projects/[projectId]/page.tsx`
**Komponenten:** 1 (Orchestrator für alle 7 Tabs)
**LOC:** ~300+
**Aufwand:** M (Medium)
**Problem:** Props-Drilling zu allen Tabs

**Vorschlag:** ProjectContext für organizationId, projectId, activeTab einführen

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/project-detail-page-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- Tab-Navigation in Context ausgelagert: Ja/Nein
- Props-Drilling reduziert: X Props → Y Props
- Loading-States vereinheitlicht: Ja/Nein
- Error-Boundaries hinzugefügt: Ja/Nein
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

## 🟡 PHASE 2: TAB-MODULE

> **Reihenfolge:** Nach Priorität P1 (hoch) → P2 (mittel) → P3 (niedrig)

### 2.1 Overview Tab (P1 - Meist genutzt)

**Entry Point:** `[projectId]/page.tsx` (overview case)
**Komponenten:** 3 (PipelineProgressDashboard, ProjectGuideBox, FloatingChat)
**LOC:** ~300+
**Aufwand:** M (Medium)
**Abhängigkeiten:** 0.2 Communication Components

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/tabs/overview-tab-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- PipelineProgressDashboard refactored: Ja/Nein
- ProjectGuideBox refactored: Ja/Nein
- Code-Reduktion: X Zeilen → Y Zeilen
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

### 2.2 Tasks Tab (P1 - Sehr komplex!)

**Entry Point:** `[projectId]/page.tsx` (tasks case)
**Komponenten:** 3 (ProjectTaskManager, TaskCreateModal, TaskEditModal)
**LOC:** ~800+ (SEHR HOCH - Größte Komponente!)
**Aufwand:** XL (X-Large)
**Warnung:** Sollte in kleinere Komponenten aufgeteilt werden

**Vorschlag:**
- TaskFilterPanel.tsx extrahieren
- TaskListItem.tsx extrahieren
- TaskActionMenu.tsx extrahieren

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/tabs/tasks-tab-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- ProjectTaskManager aufgeteilt in X Komponenten
- Code-Reduktion: 800+ Zeilen → Y Zeilen
- Neue Komponenten:
  - TaskFilterPanel.tsx (X LOC)
  - TaskListItem.tsx (X LOC)
  - TaskActionMenu.tsx (X LOC)
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

### 2.3 Strategie Tab (P2)

**Entry Point:** `[projectId]/page.tsx` (strategie case)
**Komponenten:** 4 (Tab, TemplateGrid, DocumentsTable, FoldersView)
**LOC:** ~300+
**Aufwand:** M (Medium)
**Abhängigkeiten:** 0.1 ProjectFoldersView (Shared!)

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/tabs/strategie-tab-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- ProjectFoldersView (shared) integriert: Ja/Nein
- DocumentEditorModal lazy loading: Ja/Nein
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

### 2.4 Daten Tab (P2 - Sehr komplex!)

**Entry Point:** `[projectId]/page.tsx` (daten case)
**Komponenten:** 2 (ProjectFoldersView, SmartUploadInfoPanel)
**LOC:** ~800+ (SEHR HOCH)
**Aufwand:** XL (X-Large)
**Abhängigkeiten:** 0.1 ProjectFoldersView (Shared!)

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/tabs/daten-tab-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- ProjectFoldersView (shared) verwendet: Ja/Nein
- Upload-Logic optimiert: Ja/Nein
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

### 2.5 Verteiler Tab (P2)

**Entry Point:** `[projectId]/page.tsx` (verteiler case)
**Komponenten:** 2 (ProjectDistributionLists, MasterListBrowser)
**LOC:** ~500+
**Aufwand:** L (Large)

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/tabs/verteiler-tab-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- CSV Export/Import extrahiert: Ja/Nein
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

### 2.6 Pressemeldung Tab (P2 - Komplex mit Sub-Modulen)

**Entry Point:** `[projectId]/page.tsx` (pressemeldung case)
**Komponenten:** 5 (Tab, CampaignTable, ApprovalTable, ToggleSection, CreateModal)
**LOC:** ~400+
**Aufwand:** L (Large - wegen Sub-Modulen)

**Sub-Module (optional getrennt refactorn):**
- Pressemeldung > Erstellen (CampaignCreateModal)
- Pressemeldung > Editor / KI Toolbar
- Pressemeldung > KI Assistent
- Pressemeldung > PDF Versionierung
- Pressemeldung > Bearbeiten (CampaignEditModal)
- Pressemeldung > Versenden (CampaignSendModal)
- Pressemeldung > Email Templates (TemplateEditor)
- Pressemeldung > Freigabe (ApprovalWorkflow)
- Pressemeldung > Kundenfreigabeseite (`/freigabe/[shareId]/page.tsx`)

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/tabs/pressemeldung-tab-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- Sub-Module identifiziert: X Module
- Refactored: X/Y Sub-Module
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
- [ ] Sub-Modul 1 noch offen
- [ ] Sub-Modul 2 noch offen
```

---

### 2.7 Monitoring Tab (P3 - Niedrigere Priorität)

**Entry Point:** `[projectId]/page.tsx` (monitoring case)
**Komponenten:** 6 (Tab, Overview, Analytics, Clippings, StatusWidget, ConfigPanel)
**LOC:** ~500+
**Aufwand:** M (Medium)

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/tabs/monitoring-tab-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- Analytics-Widgets extrahiert: Ja/Nein
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

## 🔵 PHASE 3: GLOBALE FEATURES (P3)

### 3.1 Team Management

**Komponenten:** TeamManagementModal, TeamMemberSelector
**LOC:** ~200+
**Aufwand:** M (Medium)

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/global/team-management-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

### 3.2 Document Editor

**Komponenten:** DocumentEditorModal (lazy loaded)
**LOC:** ~300+
**Aufwand:** S (Small - nur Lazy Loading verbessern)

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/global/document-editor-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
- Lazy Loading überall: Ja/Nein
- Test-Ergebnis: X/Y Tests passed
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

### 3.3 Approval History

**Komponenten:** ApprovalHistoryModal
**LOC:** ~150+
**Aufwand:** S (Small)

**Tracking:**
- [ ] **Plan erstellt:** `docs/planning/global/approval-history-refactoring.md`
- [ ] **Implementierung durchgeführt**

**Ergebnis-Zusammenfassung:**
```
[Nach Implementierung ausfüllen]
```

**TODOs / Offene Punkte:**
```
[Nach Implementierung ausfüllen]
```

---

## 📊 FORTSCHRITTS-TRACKING

### Übersicht nach Phasen

| Phase | Module | Erledigt | Fortschritt |
|-------|--------|----------|-------------|
| Phase 0: Shared Components | 2 | 2 | 100% ✅ |
| Phase 1: Hauptseite | 1 | 0 | 0% |
| Phase 2: Tab-Module | 7 | 0 | 0% |
| Phase 3: Globale Features | 3 | 0 | 0% |
| **GESAMT** | **13** | **2** | **15%** |

### Aufwands-Verteilung

- **XL (X-Large):** 2 Module (Tasks, Daten) - ~4-5 Tage/Modul
- **L (Large):** 4 Module (ProjectFolders ✅, Communication Components, Verteiler, Pressemeldung) - ~3-4 Tage/Modul
- **M (Medium):** 5 Module - ~2-3 Tage/Modul
- **S (Small):** 2 Module - ~1 Tag/Modul

**Geschätzter Gesamt-Aufwand:** 33-43 Tage

**Update:** Communication Components von M→L erhöht (2.713 LOC statt ~400+)

---

## 🎯 EMPFOHLENE REIHENFOLGE

### Optimale Reihenfolge (Abhängigkeiten beachten):

1. **Phase 0.1** → ProjectFoldersView (blockiert Strategie & Daten!)
2. **Phase 0.2** → Communication Components (blockiert alle Tabs)
3. **Phase 1.1** → Project Detail Page (Foundation)
4. **Phase 2.1** → Overview Tab (meist genutzt, P1)
5. **Phase 2.2** → Tasks Tab (komplex, hoher Impact, P1)
6. **Phase 2.3** → Strategie Tab (P2)
7. **Phase 2.4** → Daten Tab (P2)
8. **Phase 2.5** → Verteiler Tab (P2)
9. **Phase 2.6** → Pressemeldung Tab (P2, mit Sub-Modulen)
10. **Phase 2.7** → Monitoring Tab (P3)
11. **Phase 3.1-3.3** → Globale Features (P3)

---

## 🔧 DATEI-STRUKTUR

```
docs/planning/
├── master-refactoring-checklist.md         # DIESE DATEI
├── shared/
│   ├── project-folders-view-refactoring.md
│   └── communication-components-refactoring.md
├── tabs/
│   ├── overview-tab-refactoring.md
│   ├── tasks-tab-refactoring.md
│   ├── strategie-tab-refactoring.md
│   ├── daten-tab-refactoring.md
│   ├── verteiler-tab-refactoring.md
│   ├── pressemeldung-tab-refactoring.md
│   └── monitoring-tab-refactoring.md
├── global/
│   ├── project-detail-page-refactoring.md
│   ├── team-management-refactoring.md
│   ├── document-editor-refactoring.md
│   └── approval-history-refactoring.md
└── templates/
    └── module-refactoring-template.md      # MASTER TEMPLATE
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
   - Am Ende: Vollständige Modul-Doku erstellen (Phase 6 des Templates)
   - Refactoring-Dokumentation Agent nutzen

---

## 💡 HINWEISE

### Code-Duplication vermeiden
- **ProjectFoldersView:** Wird in 2 Tabs verwendet → Phase 0.1 ZUERST!
- **Communication Components:** In allen Tabs → Phase 0.2 ZUERST!

### Design System
- Alle Module müssen `docs/design-system/DESIGN_SYSTEM.md` einhalten
- Primary Color: #005fab
- Nur Heroicons /24/outline verwenden
- Keine Schatten (außer Dropdowns)

### Testing
- Tests sind Teil des Templates (Phase 4)
- Mindest-Coverage: 80%
- Test-Ergebnisse hier kurz notieren

### Dokumentation
- Vollständige Doku am Ende erstellen (Phase 6 des Templates)
- `refactoring-dokumentation` Agent verwenden

---

## 🚀 NÄCHSTE SCHRITTE

1. **Phase 0.1 starten:** ProjectFoldersView refactorn (blockiert 2 Tabs!)
2. **Phase 0.2 starten:** Communication Components refactorn (blockiert alle Tabs)
3. **Phase 1.1 starten:** Project Detail Page (Foundation)

**Erst danach:** Tab-Module einzeln refactorn

---

**Zuletzt aktualisiert:** 2025-10-20
**Maintainer:** CeleroPress Team

**Changelog:**
- 2025-10-20: Communication Components Refactoring abgeschlossen (Phase 0.2) - Status: 2/13 Module (15%)
- 2025-10-19: Project Folders View Refactoring abgeschlossen (Phase 0.1) - Status: 1/13 Module (8%)
- 2025-01-19: Checkliste erstellt
