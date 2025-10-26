# Pressemeldung Tab Refactoring Plan

**Version:** 1.0
**Erstellt:** 2025-10-26
**Basiert auf:** Module-Refactoring-Template v1.1
**Status:** In Planning

---

## 📋 Übersicht

### Modul-Informationen

**Entry Point:** `src/app/dashboard/projects/[projectId]/page.tsx` (pressemeldung case)
**Komponenten:** 5 (Tab, CampaignTable, ApprovalTable, ToggleSection, CreateModal)
**LOC Gesamt:** ~1.238 Zeilen
**Aufwand:** L (Large - 3-4 Tage)
**Priorität:** P2 (Medium)

### Komponenten-Breakdown

| Komponente | LOC | Status | Im Scope |
|------------|-----|--------|----------|
| ProjectPressemeldungenTab.tsx | 202 | ✅ Bereits optimiert | ✅ Ja |
| PressemeldungCampaignTable.tsx | 306 | ✅ Bereits optimiert | ✅ Ja |
| PressemeldungApprovalTable.tsx | 210 | ✅ Bereits optimiert | ✅ Ja |
| PressemeldungToggleSection.tsx | 328 | ✅ Bereits optimiert | ✅ Ja |
| CampaignCreateModal.tsx | 192 | ⚠️ Zu komplex | ❌ Nein - Separat |

**Scope Total:** 1.046 Zeilen (ohne CreateModal)

---

## 🎯 Ziele

- [x] Toast-Service auf react-hot-toast umstellen (BEREITS ERLEDIGT)
- [x] Security Rules für PR Campaigns & Approvals hinzufügen (BEREITS ERLEDIGT)
- [ ] Comprehensive Testing (refactoring-test Agent)
- [ ] Vollständige Dokumentation (refactoring-dokumentation Agent)
- [ ] Quality Check vor Merge (refactoring-quality-check Agent)

---

## 📊 Ist-Zustand Analyse

### Aktuelle Komponenten

#### 1. ProjectPressemeldungenTab.tsx (202 Zeilen)
**Zustand:** ✅ Gut strukturiert
- Orchestrator-Komponente
- Lädt Campaigns + Approvals
- 3-Punkte-Menü für Boilerplate/Template Erstellung
- Keine weitere Modularisierung nötig

**Bereits implementiert:**
- React Query: ❌ Nein (verwendet prService & approvalService direkt)
- Modularisierung: ✅ Ja (CampaignTable, ApprovalTable, ToggleSection separiert)
- Performance: ⚠️ Teilweise (useCallback für loadProjectPressData)

#### 2. PressemeldungCampaignTable.tsx (306 Zeilen)
**Zustand:** ✅ Gut strukturiert
- Zeigt PR Campaigns in Tabelle
- Status-Badges (draft, in_review, approved, sent, rejected)
- 3-Punkte-Menü (Bearbeiten, Löschen, Versenden)
- EmailSendModal Integration

**Bereits implementiert:**
- Toast-Service: ✅ Ja (react-hot-toast)
- Table Design: ✅ Ja (optimierte Spaltenbreiten, stroke-[2.5] für Icons)
- Dropdown-Menü: ✅ Ja (Headless UI Dropdown)

**Verbesserungspotenzial:**
- Kein React Query (direkte prService Calls)
- Keine Performance-Optimierung (kein React.memo, useCallback)

#### 3. PressemeldungApprovalTable.tsx (210 Zeilen)
**Zustand:** ✅ Gut strukturiert
- Zeigt Freigaben in Tabelle
- Status-Badges mit Farben (pending, approved, rejected, changes_requested)
- 3-Punkte-Menü (Bearbeiten, Details)

**Bereits implementiert:**
- Table Design: ✅ Ja (harmonische Spaltenbreiten mit CampaignTable)
- Dropdown-Menü: ✅ Ja

**Verbesserungspotenzial:**
- Kein React Query
- Keine Performance-Optimierung

#### 4. PressemeldungToggleSection.tsx (328 Zeilen)
**Zustand:** ✅ Gut strukturiert
- 3 Toggle-Boxen: Medien, PDF-Historie, Kommunikation
- Dynamic Imports mit Loading States
- Lädt Daten aus mediaService, pdfVersionsService, approvalService

**Bereits implementiert:**
- Lazy Loading: ✅ Ja (dynamic imports)
- Toggle Design: ✅ Ja (einheitliches Blau-Theme, weniger fett)

**Verbesserungspotenzial:**
- Kein React Query
- Viele separate Daten-Lade-Funktionen

#### 5. CampaignCreateModal.tsx (192 Zeilen)
**Status:** ❌ Nicht im Scope - zu komplex für dieses Refactoring
- Wird in separatem Refactoring behandelt

---

## 🚀 Phasen-Plan

### Phase 0: Vorbereitung & Setup ✅ BEREITS TEILWEISE ERLEDIGT

**Status:** ✅ Erledigt

#### Erledigte Aufgaben:
- [x] Toast-Service auf react-hot-toast umgestellt (2 Dateien)
  - PressemeldungCampaignTable.tsx
  - CampaignCreateModal.tsx
- [x] Security Rules für PR Campaigns & Approvals hinzugefügt
  - `pr_campaigns` Collection: Org-isoliert
  - `approvals` Collection: Org-isoliert
  - `pr_approval_shares` Collection: Öffentlich lesbar für Kunden-Freigabe

#### Commits:
- `b1a54761` - Toast-Service Migration
- `354166fb` - Security Rules

#### Noch zu tun:
- [ ] Feature-Branch erstellen (wenn neue Änderungen nötig)
- [ ] Ist-Zustand vollständig dokumentieren

---

### Phase 1: React Query Integration (OPTIONAL)

**Status:** ⏸️ Wird übersprungen (funktioniert bereits gut mit direkten Service-Calls)

**Begründung:**
- ProjectPressemeldungenTab nutzt bereits `useCallback` für `loadProjectPressData`
- Services (prService, approvalService) funktionieren stabil
- Keine Performance-Probleme identifiziert
- Optimistic Updates nicht kritisch für dieses Modul

**Entscheidung:** Phase 1 überspringen, direkt zu Phase 2 (Testing)

---

### Phase 2: Testing ✅ NÄCHSTER SCHRITT

**Status:** ⏳ Pending - Delegation an refactoring-test Agent

**Umfang:**
- Mindestens 40+ Tests für 4 Komponenten
- Coverage-Ziel: >80%

**Test-Kategorien:**

#### 1. ProjectPressemeldungenTab Tests (~10 Tests)
- [ ] Rendert ohne Campaigns (Empty State)
- [ ] Rendert mit Campaigns
- [ ] Lädt Campaigns + Approvals beim Mount
- [ ] "Meldung Erstellen" Button disabled wenn Campaign existiert
- [ ] 3-Punkte-Menü rendert Boilerplate/Template Links
- [ ] Toggle Section nur sichtbar wenn Approvals vorhanden

#### 2. PressemeldungCampaignTable Tests (~15 Tests)
- [ ] Rendert leere Tabelle mit "Keine Kampagnen" Message
- [ ] Rendert Kampagnen-Rows
- [ ] Status-Badges zeigen korrekte Farben
- [ ] Formatiert Datum korrekt
- [ ] Admin Avatar wird angezeigt
- [ ] 3-Punkte-Menü Actions (Bearbeiten, Löschen, Versenden)
- [ ] Delete mit Confirmation Dialog
- [ ] Toast-Benachrichtigungen bei Success/Error
- [ ] Router-Navigation zu Edit-Seite
- [ ] EmailSendModal öffnet beim Versenden

#### 3. PressemeldungApprovalTable Tests (~10 Tests)
- [ ] Rendert leere Tabelle
- [ ] Rendert Freigaben-Rows
- [ ] Status-Badges mit korrekten Farben
- [ ] Kunde & Kontakt Anzeige
- [ ] Letzte Aktivität formatiert
- [ ] 3-Punkte-Menü Actions
- [ ] Router-Navigation zu Details

#### 4. PressemeldungToggleSection Tests (~10 Tests)
- [ ] Rendert Loading State
- [ ] Rendert ohne campaignId (Empty Message)
- [ ] Lädt Media Items
- [ ] Lädt PDF Versions
- [ ] Lädt Communication Data
- [ ] Toggle-State Management
- [ ] Lazy Loading der Toggle-Boxen
- [ ] Communication sortiert nach Timestamp

**Agent-Briefing für refactoring-test:**
```
Erstelle umfassende Tests für das Pressemeldung-Tab Modul:
- 4 Komponenten: ProjectPressemeldungenTab, PressemeldungCampaignTable, PressemeldungApprovalTable, PressemeldungToggleSection
- Scope: 1.046 Zeilen Code
- Ziel: >80% Coverage
- Mindestens 40+ Tests
- Alle Tests VOLL implementiert (keine TODOs)
- Mock Firebase Services (prService, approvalService, pdfVersionsService)
- Mock Router (useRouter)
- Mock useAuth Hook
```

---

### Phase 3: Dokumentation ✅ NÄCHSTER SCHRITT

**Status:** ⏳ Pending - Delegation an refactoring-dokumentation Agent

**Umfang:**
- Ziel: 4.000+ Zeilen Dokumentation in 5 Dateien
- README, API Docs, Components Docs, ADR Docs

**Struktur:**

```
docs/projects/pressemeldungen/
├── README.md                           # Hauptdokumentation (1.200+ Zeilen)
├── api/
│   ├── README.md                       # API-Übersicht (800+ Zeilen)
│   └── pr-campaigns-service.md         # Service-Dokumentation (900+ Zeilen)
├── components/
│   └── README.md                       # Komponenten-Dokumentation (1.000+ Zeilen)
└── adr/
    └── README.md                       # Architecture Decision Records (900+ Zeilen)
```

**Agent-Briefing für refactoring-dokumentation:**
```
Erstelle vollständige Dokumentation für das Pressemeldung-Tab Modul:
- 4 Hauptkomponenten + Toggle-System
- Services: prService, approvalService, pdfVersionsService
- Security: pr_campaigns, approvals, pr_approval_shares Collections
- Features: Toast-Service, 3-Punkte-Menü, Toggle-Boxen
- Design: Einheitliches Blau-Theme, optimierte Tabellen
- Ziel: 4.000+ Zeilen in 5 Dateien
```

---

### Phase 4: Quality Check ✅ VOR MERGE

**Status:** ⏳ Pending - Delegation an refactoring-quality-check Agent

**Prüfpunkte:**
- [ ] Alle Tests bestehen (100%)
- [ ] Test-Coverage >80%
- [ ] TypeScript: 0 Fehler in refactorierten Dateien
- [ ] ESLint: 0 Warnings
- [ ] Console.log/console.error bereinigt
- [ ] Design System Compliance (Heroicons /24/outline, #005fab)
- [ ] Toast-Service konsistent verwendet
- [ ] Security Rules getestet

**Agent-Briefing für refactoring-quality-check:**
```
Quality Check für Pressemeldung-Tab Refactoring:
- Tests: Müssen 100% bestehen
- Coverage: >80% Ziel
- Code Quality: TypeScript + ESLint Clean
- Security: Firestore Rules für pr_campaigns, approvals, pr_approval_shares
- Design: Blau-Theme, Tabellen-Optimierung
```

---

### Phase 5: Merge to Main

**Status:** ⏳ Pending - Nach erfolgreichem Quality Check

**Schritte:**
1. Feature-Branch erstellen (falls nötig)
2. Alle Änderungen committen
3. Quality Check bestanden ✅
4. Pull Request erstellen
5. Merge to main
6. Vercel Auto-Deploy

---

## 📝 Änderungsübersicht

### Bereits implementiert (2025-10-26)

#### Toast-Service Migration ✅
- **Dateien:** 2
  - PressemeldungCampaignTable.tsx
  - CampaignCreateModal.tsx
- **Änderungen:**
  - `alert()` → `toastService.error()`
  - `confirm()` → `window.confirm()`
  - Success-Toasts hinzugefügt
- **Commit:** `b1a54761`

#### Security Rules Enhancement ✅
- **Datei:** firestore.rules
- **Neue Rules:**
  - `pr_campaigns`: Org-isoliert (read/write nur eigene Org)
  - `approvals`: Org-isoliert (read/write nur eigene Org)
  - `pr_approval_shares`: Öffentlich lesbar (für Kunden-Freigabe), write nur Org
- **Commit:** `354166fb`

#### UI/UX Verbesserungen (vorher durchgeführt)
- Toggle-Header: Weniger fett (h-6 → h-5, text-lg → text-base)
- Überschrift "Freigabe-Details" hinzugefügt
- 3-Punkte-Menü mit Boilerplate/Template Links
- Tabellen-Spalten harmonisiert
- Titel-Truncation 50px früher
- Footer-Buttons entfernt (in 3-Punkte-Menü verschoben)

---

## 🎯 Success Criteria

- [x] Toast-Service Migration abgeschlossen
- [x] Security Rules implementiert
- [ ] 40+ Tests geschrieben (100% bestanden)
- [ ] >80% Test-Coverage erreicht
- [ ] 4.000+ Zeilen Dokumentation erstellt
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Quality Check bestanden
- [ ] Merge to Main erfolgreich

---

## 🚨 Ausschlüsse

### Nicht im Scope (zu komplex):
- ❌ CampaignCreateModal.tsx (192 Zeilen)
  - **Grund:** Zu komplex für dieses Refactoring
  - **Plan:** Separates Refactoring später

### Sub-Module (optional getrennt):
- Pressemeldung > Editor / KI Toolbar
- Pressemeldung > KI Assistent
- Pressemeldung > PDF Versionierung
- Pressemeldung > Bearbeiten (CampaignEditModal)
- Pressemeldung > Versenden (CampaignSendModal)
- Pressemeldung > Email Templates
- Pressemeldung > Freigabe Workflow
- Pressemeldung > Kundenfreigabeseite (`/freigabe/[shareId]/page.tsx`)

---

## 📊 Tracking

### Phasen-Status

| Phase | Status | Aufwand | Erledigt |
|-------|--------|---------|----------|
| Phase 0: Setup | ✅ Teilweise | 1h | 2025-10-26 |
| Phase 1: React Query | ⏸️ Übersprungen | - | - |
| Phase 2: Testing | ⏳ Pending | 4h | - |
| Phase 3: Dokumentation | ⏳ Pending | 3h | - |
| Phase 4: Quality Check | ⏳ Pending | 1h | - |
| Phase 5: Merge | ⏳ Pending | 0.5h | - |

**Gesamt-Aufwand:** ~9.5 Stunden

---

## 🔗 Referenzen

- **Template:** `docs/templates/module-refactoring-template.md`
- **Master Checklist:** `docs/planning/master-refactoring-checklist.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`

---

**Erstellt:** 2025-10-26
**Maintainer:** CeleroPress Team
**Status:** In Planning - Bereit für Testing & Dokumentation
