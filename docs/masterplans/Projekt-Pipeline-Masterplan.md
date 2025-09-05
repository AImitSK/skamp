# Projekt-Pipeline Masterplan

## Übersicht
Vollständiger Implementierungsplan für das Projekt-Pipeline-System als visuelles Kanban-Board mit 7 Phasen. Dieses System wird als zentrale Organisationsebene über alle bestehenden CeleroPress-Module implementiert, ohne bestehende Funktionalitäten zu zerstören.

## ZIELSETZUNG
- **Kanban-Board** mit 7 Pipeline-Phasen als visuelle Projekt-Übersicht
- **Projekt-Karten** als zentrale Anlaufstelle für alle verknüpften Elemente
- **Task-System Integration** für Checklisten und Arbeitsabläufe pro Phase
- **Multi-Tenancy-Sicherheit** ohne Beeinträchtigung bestehender Module
- **Nahtlose Integration** aller bestehenden CeleroPress-Features

---

## PHASE 1: FOUNDATION & DATENSTRUKTUR

### 1.1 Projekt-Entity und Core Services implementieren
**Referenz:** `docs/features/Projekt-Pipeline/Pipeline-Datenstruktur-Analyse.md`

**Umsetzung:**
- **Agent:** `general-purpose` für komplexe Service-Implementierung
- **Implementierungsdauer:** 3-5 Tage
- **Multi-Tenancy-Check:** Alle Queries mit `organizationId` filtern

**Konkrete Schritte:**
1. `src/types/projects.ts` - Project Entity definieren
2. `src/lib/firebase/project-service.ts` - CRUD Operations implementieren  
3. `src/lib/firebase/project-integration-service.ts` - Verknüpfungen zu bestehenden Systemen
4. Firestore Indices erstellen (siehe Dokumentation)
5. **Test:** `src/__tests__/features/project-service.test.ts` erstellen

**Erfolgskriterien:**
- ✅ Project kann erstellt, gelesen, aktualisiert, gelöscht werden
- ✅ Verknüpfungen zu Kampagnen, Assets, Kontakten funktionieren
- ✅ Multi-Tenancy vollständig implementiert
- ✅ Tests mit 100% Coverage bestehen

### 1.2 Task-System für Projekte erweitern  
**Referenz:** `docs/features/Projekt-Pipeline/Projekt-Task-System-Integration.md`

**Umsetzung:**
- **Agent:** `general-purpose` für Service-Erweiterungen
- **Implementierungsdauer:** 2-3 Tage
- **Bestehende Tests erweitern:** `src/lib/firebase/__tests__/task-service.test.ts`

**Konkrete Schritte:**
1. `src/types/tasks.ts` erweitern um `linkedProjectId`, `pipelineStage`
2. `src/lib/firebase/task-service.ts` erweitern um projekt-spezifische Methoden
3. Task-Template System implementieren
4. Pipeline-Stage Abhängigkeiten definieren

**Erfolgskriterien:**
- ✅ Tasks können Projekten zugeordnet werden
- ✅ Pipeline-Stages haben definierte Task-Templates  
- ✅ Bestehende Task-Funktionen bleiben unverändert
- ✅ Erweiterte Tests bestehen

### 1.3 Navigation Menu-Punkt "Projekte" hinzufügen
**Navigation:** Top-Navigation erweitern
**Agent:** `general-purpose` 
**Implementierungsdauer:** 0.5 Tage

**Umsetzung:**
1. Top-Navigation-Komponente erweitern um "Projekte" Menüpunkt
2. Routing für `/dashboard/projects` konfigurieren
3. Projekt-Übersichtsseite (zunächst Placeholder) erstellen
4. Navigation-Tests erweitern

**Erfolgskriterien:**
- ✅ "Projekte" in Hauptebene der Navigation sichtbar
- ✅ Routing funktioniert
- ✅ Placeholder-Page lädt korrekt
- ✅ Navigation bleibt für andere Module unverändert

### 1.4 Dokumentation aktualisieren
**Agent:** `documentation-orchestrator` - Synchronisation aller Dokumentationsebenen
- Pipeline-Datenstruktur-Analyse aktualisieren
- Task-System-Integration Status dokumentieren
- README-Index erweitern
- Navigation-Änderung dokumentieren

---

## PHASE 2: PIPELINE STAGES INTEGRATION

### 2.1 Ideas/Planning Phase implementieren
**Referenz:** `docs/features/Projekt-Pipeline/Idee-Planungsphase-Integration.md`

**Umsetzung:**
- **Agent:** `feature-starter` für initiale Struktur, dann `general-purpose`
- **Implementierungsdauer:** 3-4 Tage
- **UI-Framework:** CeleroPress Design System v2.0

**Konkrete Schritte:**
1. Strategie-Dokument Editor (TipTap-basiert, **OHNE Auto-Save**)
2. Projekt-Ordner automatische Erstellung im Media-System
3. Team-Kommunikations-Feed Integration
4. **Test:** `src/__tests__/features/ideas-planning-integration.test.tsx`

**Erfolgskriterien:**
- ✅ Strategie-Dokumente können erstellt und gespeichert werden
- ✅ Projekt-Ordner werden automatisch angelegt
- ✅ Team-Chat funktioniert (Firestore-basiert)
- ✅ Integration mit bestehendem Media-System

### 2.2 Creation Phase implementieren  
**Referenz:** `src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx`

**Umsetzung:**
- **Agent:** `general-purpose` für Kampagnen-Integration
- **Implementierungsdauer:** 2-3 Tage
- **Integration:** Bestehende Kampagnen-Erstellung erweitern

**Konkrete Schritte:**
1. Automatische Kampagnen-Verknüpfung bei Projekt-Transition
2. Asset-Auswahl aus Projekt-Ordnern
3. Content-Erstellung Workflows
4. **Test:** Bestehende Kampagnen-Tests erweitern

### 2.3 Internal Approval implementieren
**Referenz:** `docs/features/Projekt-Pipeline/Interne-Freigabe-Integration.md`

**Umsetzung:**
- **Agent:** `general-purpose` für PDF-System-Integration  
- **Implementierungsdauer:** 3-4 Tage
- **Integration:** Bestehende PDF-Versionierung nutzen

**Konkrete Schritte:**
1. Interne PDF-Version Generierung (erweitert bestehenden PDF-Service)
2. Team-Review Workflows
3. Kommentar-System Integration
4. **Test:** `src/__tests__/features/internal-approval-workflow.test.tsx`

### 2.4 Customer Approval implementieren
**Referenz:** `docs/features/Projekt-Pipeline/Freigabeprozess-Dokumentation.md`

**Umsetzung:**  
- **Agent:** `general-purpose` - Komplexe Integration bestehender Approval-Services
- **Implementierungsdauer:** 2-3 Tage
- **Integration:** Bestehende Approval-Services erweitern

**Konkrete Schritte:**
1. Projekt-Approval-Verknüpfung implementieren
2. Customer-Facing Materials Generierung
3. Freigabe-Status Synchronisation
4. **Test:** Bestehende Approval-Tests erweitern

### 2.5 Distribution implementieren
**Referenz:** `docs/features/Projekt-Pipeline/Distributionsprozess-Dokumentation.md`

**Umsetzung:**
- **Agent:** `general-purpose` - Email-System Integration
- **Implementierungsdauer:** 2-3 Tage  
- **Integration:** Bestehende Distribution-Services nutzen

**Konkrete Schritte:**
1. Automatische Kampagnen-Konfiguration
2. Versand-Timeline Integration
3. Distribution-Tracking
4. **Test:** Distribution-Tests erweitern

### 2.6 Monitoring & Completed Phasen vorbereiten
**Umsetzung:**
- **Agent:** `general-purpose` - Basis-Struktur ohne Full-Implementation
- **Implementierungsdauer:** 1-2 Tage
- **Hinweis:** Vollständige Analytics kommen später

**Dokumentation aktualisieren:**
**Agent:** `documentation-orchestrator` - Alle Pipeline-Stage Dokumentationen synchronisieren

---

## PHASE 3: KANBAN-BOARD UI IMPLEMENTIERUNG

### 3.1 Projekt-Karten UI-Komponenten
**Referenz:** `docs/features/Projekt-Pipeline/Task-UI-Komponenten-Spezifikation.md`

**Umsetzung:**
- **Agent:** `general-purpose` für React-Komponenten
- **Implementierungsdauer:** 4-5 Tage
- **Design:** Vollständige Design System v2.0 Compliance

**Konkrete Schritte:**
1. `ProjectCard` Komponente (Basis-Karte für Kanban)
2. `ProjectDetailPanel` (Sidebar mit allen verknüpften Elementen)  
3. `ProjectTaskPanel` (Task-Management Integration)
4. `StageCompletionIndicator` (Fortschritts-Anzeige)
5. **Test:** `src/__tests__/components/projects/ProjectCard.test.tsx`

**Design-Anforderungen:**
- ✅ Nur /24/outline Heroicons verwenden
- ✅ Keine Shadow-Effekte
- ✅ CeleroPress Farb-Schema
- ✅ Mobile-responsive Design

### 3.2 Kanban-Board Haupt-Interface
**Umsetzung:**
- **Agent:** `general-purpose` für komplexe Board-Logic
- **Implementierungsdauer:** 3-4 Tage
- **Framework:** React DnD für Drag & Drop

**Konkrete Schritte:**
1. `KanbanBoard` Komponente mit 7 Spalten
2. Drag & Drop zwischen Stages
3. Filter- und Such-Funktionen
4. Real-time Updates über Firestore Listeners
5. **Test:** `src/__tests__/components/projects/KanbanBoard.test.tsx`

### 3.3 Projekt-Erstellung Workflow
**Referenz:** `docs/features/Projekt-Pipeline/Projekt-Anlage-Datenabfrage.md`

**Umsetzung:**
- **Agent:** `general-purpose` für mehrstufigen Wizard
- **Implementierungsdauer:** 3-4 Tage
- **Integration:** Bestehende Komponenten wiederverwenden

**Konkrete Schritte:**
1. `ProjectCreationWizard` - Mehrstufiges Formular
2. Kunden-Auswahl (bestehende `ModernCustomerSelector` nutzen)
3. Team-Zuordnung Interface
4. Template-basierte Projekt-Erstellung
5. **Test:** `src/__tests__/features/project-creation-workflow.test.tsx`

**Validierung:**
- ✅ Mindestanforderungen: Titel, Kunde, Team
- ✅ Template-System funktional
- ✅ Automatische Ordner-Erstellung

### 3.4 Dokumentation aktualisieren
**Agent:** `documentation-orchestrator` - UI-Komponenten und User-Flows dokumentieren

---

## PHASE 4: TASK-SYSTEM UI INTEGRATION  

### 4.1 Task-Management Interface
**Referenz:** `docs/features/Projekt-Pipeline/Task-UI-Komponenten-Spezifikation.md`

**Umsetzung:**
- **Agent:** `general-purpose` für erweiterte UI-Komponenten
- **Implementierungsdauer:** 4-5 Tage
- **Basis:** Bestehende `OverdueTasksWidget` als Template

**Konkrete Schritte:**
1. `ProjectTaskPanel` - Hauptkomponente für Task-Management
2. `TaskSection` - Gruppierung (kritisch/aktuell/kommend/erledigt)
3. `ProjectTaskItem` - Einzelne Task mit Actions
4. `TaskCreateButton` + Dialog - Neue Task-Erstellung
5. **Test:** `src/__tests__/components/tasks/ProjectTaskPanel.test.tsx`

**Feature-Anforderungen:**
- ✅ Stage-spezifische Task-Gruppierung
- ✅ Critical Tasks Hervorhebung
- ✅ Quick-Actions (Complete, Priority, Assign)
- ✅ Mobile-optimierte Darstellung

### 4.2 Pipeline-Task Integration Workflows
**Referenz:** `docs/features/Projekt-Pipeline/Pipeline-Task-Integration-Workflows.md`

**Umsetzung:**
- **Agent:** `general-purpose` für komplexe Workflow-Logic
- **Implementierungsdauer:** 3-4 Tage
- **Integration:** Task-Service und Project-Service erweitern

**Konkrete Schritte:**
1. Automatische Task-Erstellung bei Stage-Wechsel
2. Task-Template System aktivieren  
3. Stage-Completion Checks implementieren
4. Dependency-Management zwischen Tasks
5. **Test:** `src/__tests__/features/task-workflow-integration.test.ts`

### 4.3 Task-Benachrichtigungen Integration
**Umsetzung:**
- **Agent:** `general-purpose` für Notification-Service Extension
- **Implementierungsdauer:** 1-2 Tage
- **Erweiterung:** Bestehende Notifications-Service nutzen

**Konkrete Schritte:**
1. Projekt-spezifische Task-Benachrichtigungen
2. Critical-Task Deadline-Alerts
3. Stage-Completion Notifications
4. **Test:** Bestehende Notification-Tests erweitern

### 4.4 Dokumentation aktualisieren
**Agent:** `documentation-orchestrator` - Task-Integration Status und Workflows dokumentieren

---

## PHASE 5: KOMMUNIKATIONS-FEED INTEGRATION

### 5.1 Email-Projekt-Zuordnung implementieren  
**Referenz:** `docs/features/Projekt-Pipeline/Kommunikations-Feed-Integration.md`

**Umsetzung:**
- **Agent:** `general-purpose` für AI-gestützte Email-Analyse
- **Implementierungsdauer:** 4-5 Tage
- **KI-Integration:** Bestehende Gemini-AI Services erweitern

**Konkrete Schritte:**
1. Email-Header Parsing für Projekt-Zuordnung
2. KI-basierte Content-Analyse für automatische Zuordnung
3. Reply-To Pattern-Detection
4. Manual Override Interface
5. **Test:** `src/__tests__/features/email-project-assignment.test.ts`

### 5.2 Kommunikations-Feed UI
**Umsetzung:**
- **Agent:** `general-purpose` für Timeline-Komponenten  
- **Implementierungsdauer:** 2-3 Tage
- **Integration:** Bestehende Inbox-Components erweitern

**Konkrete Schritte:**
1. `ProjectCommunicationFeed` Komponente
2. Email-Projekt-Assignment Interface
3. Communication-Timeline Integration
4. **Test:** `src/__tests__/components/communication/ProjectCommunicationFeed.test.tsx`

### 5.3 Dokumentation aktualisieren
**Agent:** `documentation-orchestrator` - Kommunikations-Integration dokumentieren

---

## PHASE 6: ADVANCED FEATURES & OPTIMIERUNG

### 6.1 Performance-Optimierung
**Agent:** `performance-optimizer` - Performance-Analyse und Optimierung

**Umsetzung:**
- **Implementierungsdauer:** 2-3 Tage
- **Fokus:** React Performance, Firestore Queries, Bundle Size

**Konkrete Schritte:**
1. Kanban-Board Virtualisierung für große Projekt-Listen
2. Firestore Query-Optimierung
3. Component-Level Code-Splitting
4. **Test:** Performance-Tests und Bundle-Size Monitoring

### 6.2 Mobile-Optimierung
**Umsetzung:**
- **Agent:** `general-purpose` für Mobile-UI-Anpassungen
- **Implementierungsdauer:** 2-3 Tage
- **Fokus:** Touch-optimierte Interfaces

**Konkrete Schritte:**
1. Mobile-spezifische Kanban-Board Darstellung
2. Touch-Gesten für Task-Management
3. Responsive Task-Panels
4. **Test:** Mobile-specific UI Tests

### 6.3 Analytics & Reporting Vorbereitung
**Umsetzung:**
- **Agent:** `general-purpose` für Analytics-Foundation
- **Implementierungsdauer:** 2-3 Tage
- **Hinweis:** Full Analytics werden später ausgebaut

**Konkrete Schritte:**
1. Projekt-Performance-Metriken Datenstruktur
2. Basic Dashboard-Components
3. Export-Funktionen
4. **Test:** Analytics-Service Basic Tests

### 6.4 Dokumentation finalisieren
**Agent:** `documentation-orchestrator` - Alle Dokumentationen final synchronisieren

---

## PHASE 7: TESTING & QUALITÄTSSICHERUNG

### 7.1 Comprehensive Testing Suite
**Agent:** `test-writer` - Vollständige Test-Suite mit 100% Coverage

**Umsetzung:**
- **Implementierungsdauer:** 3-4 Tage
- **Basis:** Bestehende Test-Patterns erweitern

**Test-Kategorien:**
1. **Unit Tests:** Alle Services und Components
2. **Integration Tests:** Pipeline-Stage Übergänge
3. **E2E Tests:** Komplette Projekt-Workflows
4. **Multi-Tenancy Tests:** Isolation zwischen Organizations

**Bestehende Test-Struktur nutzen:**
```
src/__tests__/
├── features/                    # Feature-spezifische Tests
├── components/                  # UI-Component Tests  
├── api/                        # Service-Layer Tests
├── e2e/                        # End-to-End Tests
└── utils/                      # Utility-Tests
```

### 7.2 Migration & Data Safety Testing
**Agent:** `test-writer` für Migration-Tests

**Umsetzung:**
- **Implementierungsdauer:** 2-3 Tage
- **Fokus:** Bestehende Daten nicht zerstören

**Test-Szenarien:**
1. Bestehende Kampagnen bleiben funktional
2. Asset-Verknüpfungen bleiben intakt
3. User-Permissions unverändert
4. Multi-Tenancy-Isolation gewährleistet

### 7.3 User Acceptance Testing Vorbereitung
**Agent:** `documentation-orchestrator` für User-Dokumentation

**Umsetzung:**
- **Implementierungsdauer:** 1-2 Tage

**Deliverables:**
1. User-Manual für Pipeline-System
2. Migration-Guide für bestehende Workflows
3. Feature-Rollout Plan

---

## PHASE 8: DEPLOYMENT & MONITORING

### 8.1 Staged Deployment
**Agent:** `production-deploy` für sicheren Rollout

**Deployment-Strategie:**
1. **Staging-Tests:** Vollständige Feature-Tests
2. **Canary-Release:** 10% User-Traffic
3. **Gradual Rollout:** 25% → 50% → 100%
4. **Rollback-Plan:** Bei kritischen Issues

### 8.2 Post-Launch Monitoring
**Agent:** `performance-optimizer` für Live-Performance-Monitoring

**Monitoring-Metriken:**
1. System-Performance (Ladezeiten, Errors)
2. User-Adoption (Feature-Usage, Workflows)
3. Data-Integrity (Multi-Tenancy, Verknüpfungen)
4. User-Feedback (Support-Tickets, Feature-Requests)

### 8.3 Final Documentation Update
**Agent:** `documentation-orchestrator` - Finale Dokumentations-Synchronisation

---

## AGENTEN-ÜBERSICHT

### Primary Implementation Agents:
- **`general-purpose`**: Komplexe Service- und UI-Implementierungen
- **`feature-starter`**: Initiale Feature-Strukturen aufsetzen
- **`test-writer`**: Comprehensive Test-Suites mit 100% Coverage  
- **`production-deploy`**: Sichere Production-Deployments
- **`performance-optimizer`**: Performance-Analyse und Optimierung
- **`documentation-orchestrator`**: Dokumentations-Synchronisation

### Quality Assurance:
- **Nach jedem Implementierungs-Step:** `documentation-orchestrator` für Status-Updates
- **Nach komplexen Features:** `test-writer` für erweiterte Test-Coverage
- **Vor Production-Rollout:** `production-deploy` für sichere Deployments

---

## RISIKO-MINIMIERUNG

### Multi-Tenancy-Schutz:
- ✅ Alle Queries mit `organizationId` filtern
- ✅ Service-Layer Isolation beibehalten
- ✅ Bestehende Permission-Systeme erweitern, nicht ersetzen

### Bestehende Funktionalitäten:
- ✅ Keine Breaking Changes an bestehenden APIs
- ✅ Rückwärts-Kompatibilität für alle Interfaces
- ✅ Bestehende UI-Komponenten bleiben unverändert

### Test-Coverage:
- ✅ 100% Test-Coverage für neue Features
- ✅ Regression-Tests für bestehende Systeme  
- ✅ Migration-Tests für Daten-Integrität

### Rollback-Strategien:
- ✅ Feature-Flags für graduelle Aktivierung
- ✅ Database-Rollback-Scripts
- ✅ Component-Level Fallback-Mechanismen

---

## ERFOLGSKRITERIEN

### Technische Ziele:
- ✅ Vollständiges 7-Phasen Kanban-Board implementiert
- ✅ Alle bestehenden CeleroPress-Features funktional
- ✅ Multi-Tenancy-Sicherheit gewährleistet
- ✅ 100% Test-Coverage für neue Features
- ✅ Performance unter 2s Ladezeit für Kanban-Board

### Business-Ziele:
- ✅ Zentrale Projekt-Übersicht für alle Stakeholder
- ✅ Verbesserte Workflow-Effizienz durch Task-Integration
- ✅ Nahtlose Integration aller bestehenden Tools
- ✅ Skalierbare Architektur für zukünftige Features

### User-Experience Ziele:
- ✅ Intuitive Kanban-Board Navigation
- ✅ Mobile-optimierte Interfaces
- ✅ Real-time Collaboration Features
- ✅ Konsistente CeleroPress Design-Language

---

## TIMELINE-ÜBERSICHT

| Phase | Dauer | Fokus |
|-------|-------|-------|
| 1 | 5-8 Tage | Foundation & Datenstruktur |
| 2 | 12-16 Tage | Pipeline Stages Implementation |
| 3 | 10-13 Tage | Kanban-Board UI |
| 4 | 8-11 Tage | Task-System Integration |  
| 5 | 6-8 Tage | Kommunikations-Feed |
| 6 | 6-9 Tage | Advanced Features & Optimization |
| 7 | 6-9 Tage | Testing & Quality Assurance |
| 8 | 3-5 Tage | Deployment & Monitoring |

**Gesamt-Timeline: 56-79 Arbeitstage (11-16 Wochen)**

---

## NÄCHSTE SCHRITTE

1. **Masterplan-Review** und Freigabe
2. **Phase 1 starten:** Projekt-Entity und Services implementieren
3. **Entwickler-Team briefen** über Multi-Tenancy-Requirements
4. **Test-Umgebung vorbereiten** für Pipeline-Development
5. **Stakeholder informieren** über Rollout-Timeline

**Dieser Masterplan ist der definitive Leitfaden für die Projekt-Pipeline Implementation und wird bei jeder Phase-Completion aktualisiert.**