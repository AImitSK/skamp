# Feature-Dokumentation: Calendar & Task Management

## 🎯 Anwendungskontext

**CeleroPress** ist eine PR-Management-Plattform für den deutschsprachigen Raum, die PR-Agenturen und Kommunikationsabteilungen bei der Digitalisierung und Optimierung ihrer Medienarbeit unterstützt.

**Kernfunktionen der Plattform:**
- E-Mail-Management für Pressemitteilungen und Journalistenkommunikation
- Kontaktverwaltung mit Mediendatenbank
- Team-Kollaboration mit Multi-Tenancy
- KI-gestützte Textoptimierung und Vorschläge
- Workflow-Automatisierung für PR-Prozesse
- Analytics und Erfolgsmessung

**Dieses Feature im Kontext:**
Das Calendar & Task Management Feature ist das zentrale Planungs- und Überwachungswerkzeug für PR-Teams. Es vereint Kampagnen-Termine, Freigabeprozesse und Aufgabenverwaltung in einem intelligenten Kalendersystem, das überfällige Tasks automatisch hervorhebt und mit dem Benachrichtigungssystem integriert ist.

## 📍 Navigation & Zugriff
- **Menüpfad:** Dashboard > PR-Tools > Kalender
- **Route:** /dashboard/pr-tools/calendar
- **Berechtigungen:** Alle angemeldeten Benutzer einer Organisation (Multi-Tenant isoliert)

## 🧹 Clean-Code-Checkliste (Realistisch)
- [x] Alle console.log(), console.error() etc. entfernt (10 Stellen bereinigt)
- [x] Offensichtliche Debug-Kommentare durch aussagekräftige Kommentare ersetzt
- [x] Tote Importe entfernt (von TypeScript erkannt)
- [x] Ungenutzte Variablen gelöscht (von Linter markiert)
- [x] **Dokumentation:**
  - [x] Komplexe Business-Logik kommentiert
  - [x] Veraltete Kommentare im aktuellen Feature entfernt
- [x] **Dateien im Feature-Ordner geprüft:**
  - [x] Alle relevanten Dateien identifiziert und analysiert
  - [x] Keine ungenutzten Dateien gefunden

## 🏗️ Code-Struktur (Realistisch)
- [x] **Typen-Organisation:**
  - [x] Lokale Interface/Type Definitionen gefunden und dokumentiert
  - [x] Typen sind bereits korrekt organisiert in `/types/calendar.ts` und `/types/tasks.ts`
  - [x] Keine Verschiebung erforderlich
- [x] **Offensichtliche Verbesserungen:**
  - [x] Keine kritischen Code-Duplikationen identifiziert
  - [x] Magic Numbers durch aussagekräftige Konstanten ersetzt (Event Colors, Icons)
- [x] **Datei-Organisation:**
  - [x] Aktuelle Struktur ist bereits optimal organisiert
  - [x] Feature-spezifische Komponenten korrekt in `/components/calendar/` platziert

## 📋 Feature-Beschreibung
### Zweck
Das Calendar Feature bietet Benutzern eine zentrale Übersicht über alle PR-relevanten Termine, Aufgaben und Freigabeprozesse. Es ermöglicht die Erstellung und Verwaltung von Aufgaben mit zeitlicher Planung und integriert sich nahtlos in das Benachrichtigungssystem.

### Hauptfunktionen
1. **Kalender-Übersicht** - Monatliche, wöchentliche und tägliche Ansichten aller Events
2. **Task Management** - Erstellung, Bearbeitung und Verwaltung von Aufgaben mit Fälligkeitsdaten
3. **Drag & Drop** - Verschieben von Aufgaben zwischen Terminen per Drag & Drop
4. **Event-Filterung** - Filterung nach Kampagnen, Freigaben, Aufgaben und Kunden
5. **Überfällige Tasks Widget** - Prominente Anzeige und Management überfälliger Aufgaben
6. **Geplante E-Mails** - Übersicht und Verwaltung geplanter E-Mail-Kampagnen
7. **Client-Verknüpfung** - Verknüpfung von Tasks und Events mit spezifischen Kunden
8. **Freigaben-Widget** - Übersicht ausstehender und überfälliger Freigaben

### Workflow
1. **Kalender öffnen** - User navigiert zu PR-Tools > Kalender
2. **Event-Übersicht** - Alle relevanten Termine werden in der gewählten Ansicht angezeigt
3. **Task erstellen** - Über "Aufgabe erstellen" Button oder durch Klick auf Kalendertag
4. **Task-Details** - Titel, Beschreibung, Fälligkeitsdatum, Priorität, Verknüpfungen eingeben
5. **Task-Management** - Tasks per Drag & Drop verschieben, als erledigt markieren oder bearbeiten
6. **Überfällige Tasks** - Automatische Hervorhebung und Benachrichtigung bei überfälligen Tasks
7. **Filterung** - Nach Bedarf nach Event-Typ oder Kunde filtern
8. **Event-Details** - Klick auf Event öffnet Detail-Modal mit Aktionsoptionen

## 🔧 Technische Details
### Komponenten-Struktur
```
- CalendarDashboard (page.tsx)
  - OverdueTasksWidget
  - MultiSelectDropdown (Client Filter)
  - FullCalendar Component
  - QuickTaskModal
  - EventDetailsModal
- ApprovalWidget
- EventHoverCard
```

### State Management
- **Lokaler State:** 
  - Events-Liste und gefilterte Events
  - Modal-Stati (Task-Erstellung, Event-Details)
  - Filter-Einstellungen (Kampagnen, Freigaben, Tasks, Clients)
  - Loading-Stati und Alert-Nachrichten
- **Global State:** 
  - AuthContext für Benutzer-Authentifizierung
  - OrganizationContext für Multi-Tenant Isolation
  - CrmDataContext für Client-Daten
- **Server State:** 
  - Tasks via taskService
  - Events via getEventsForDateRange
  - Kampagnen via prService
  - Client-Daten via CRM Context

### API-Endpunkte
| Methode | Service/Endpoint | Zweck | Response |
|---------|------------------|-------|----------|
| GET | taskService.getAll() | Alle Aufgaben einer Organisation | Task[] |
| POST | taskService.create() | Neue Aufgabe erstellen | string (taskId) |
| PUT | taskService.update() | Aufgabe aktualisieren | void |
| PUT | taskService.markAsCompleted() | Aufgabe als erledigt markieren | void |
| DELETE | taskService.delete() | Aufgabe löschen | void |
| GET | getEventsForDateRange() | Kalender-Events für Zeitraum | CalendarEvent[] |
| GET | prService.getAll() | PR-Kampagnen | Campaign[] |
| DELETE | /api/email/schedule | Geplante E-Mail stornieren | {success: boolean} |

### Datenmodelle
```typescript
// Haupttypen die verwendet werden
interface Task {
  id?: string;
  userId: string;
  organizationId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Timestamp;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  linkedCampaignId?: string;
  linkedClientId?: string;
  linkedContactId?: string;
  checklist?: ChecklistItem[];
  tags?: string[];
  assignedTo?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  allDay?: boolean;
  type: 'campaign_scheduled' | 'campaign_sent' | 'approval_pending' | 
        'approval_overdue' | 'task' | 'deadline' | 'follow_up';
  status?: 'pending' | 'completed' | 'overdue' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  campaignId?: string;
  taskId?: string;
  clientId?: string;
  metadata?: EventMetadata;
  color?: string;
  icon?: string;
}
```

### Externe Abhängigkeiten
- **Libraries:** 
  - FullCalendar React (@fullcalendar/react, @fullcalendar/daygrid, @fullcalendar/timegrid, @fullcalendar/interaction)
  - Heroicons (@heroicons/react/24/outline)
- **Services:** 
  - Firebase Firestore für Datenpersistierung
  - Notifications Service für überfällige Task Benachrichtigungen
- **Assets:** Keine spezifischen Assets erforderlich

## 🔄 Datenfluss
```
User Action → Component → Service Call → State Update → UI Update
```

**Task-Erstellung Datenfluss:**
1. User klickt "Aufgabe erstellen" → QuickTaskModal öffnet sich
2. User füllt Formular aus → formData State wird aktualisiert
3. User klickt "Speichern" → handleCreateTask() wird aufgerufen
4. taskService.create() wird aufgerufen → Firebase Firestore Update
5. handleDataRefresh() → Events neu laden
6. Calendar re-rendert mit neuer Task

**Überfällige Tasks Datenfluss:**
1. OverdueTasksWidget lädt → taskService.getAll() aufgerufen
2. Tasks werden nach Fälligkeit gefiltert → Überfällige Tasks identifiziert
3. Widget zeigt Anzahl an → User kann erweitern für Details
4. Benachrichtigungsservice wird via Cron-Job getriggert → Automatische Benachrichtigungen

## 🔗 Abhängigkeiten zu anderen Features
- **Nutzt:** 
  - CRM-System für Client-Verknüpfungen
  - PR-Kampagnen System für Kampagnen-Events
  - Benachrichtigungssystem für überfällige Tasks
  - Freigaben-System für Approval Events
- **Wird genutzt von:** 
  - Dashboard für Übersicht-Widgets
  - E-Mail System für geplante Versendungen
- **Gemeinsame Komponenten:** 
  - UI Components (Button, Dialog, Input, etc.)
  - MultiSelectDropdown für Client-Filterung

## ⚠️ Bekannte Probleme & TODOs
- [x] Design Pattern Compliance (Icons auf /24/outline umgestellt)
- [x] Console-Logs entfernt und durch saubere Kommentare ersetzt
- [x] Multi-Tenancy korrekt implementiert (organizationId in allen Queries)
- [ ] Performance: Große Event-Listen könnten Pagination benötigen
- [ ] Mobile Responsiveness für FullCalendar optimieren
- [ ] Recurring Events Implementation (bereits in Types vorbereitet)

## 🎨 UI/UX Hinweise
- **Design-Patterns:** 
  - Modal-basierte Task-Erstellung und -bearbeitung
  - Drag & Drop für intuitive Task-Verwaltung
  - Color-coded Event-Types für schnelle Erkennung
  - Expandable Widgets für platzsparende Übersicht
- **Responsive:** 
  - FullCalendar responsive konfiguriert
  - Filter-Layout passt sich an (flexbox)
  - Modals sind mobile-optimiert
- **Accessibility:** 
  - Alle Icons mit aria-labels
  - Keyboard-Navigation für FullCalendar
  - Screen-reader freundliche Dialoge

### 🎨 CeleroPress Design System Standards

#### Branding & Naming
- [x] **WICHTIG:** Alle Texte verwenden "CeleroPress" statt "SKAMP"
- [x] **Konsistenz:** Deutsche UI-Texte durchgehend verwendet
- [x] **Kommentare:** Code-Kommentare auf Deutsch für bessere Team-Kollaboration

#### Farben
- [x] **Primary-Farbe:** Alle Hauptaktions-Buttons verwenden `bg-[#005fab] hover:bg-[#004a8c]`
- [x] **Event-Farben:** Konsistente Farbschema-Verwendung:
  - Kampagnen: #005fab (Blau)
  - Versendete Kampagnen: #10b981 (Grün)
  - Freigaben: #f59e0b (Orange)
  - Überfällige Freigaben: #dc2626 (Rot)
  - Tasks: #8b5cf6 (Lila)
- [x] **Focus-States:** Konsistent `focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]`

#### Icons
- [x] **Konsistenz:** ALLE Icons verwenden `@heroicons/react/24/outline`
- [x] **Größen:** Standard `h-4 w-4` für Buttons, `h-5 w-5` für größere Bereiche
- [x] **Semantik:** Klar erkennbare Icons für Aktionen (Plus für Hinzufügen, Pfeil für Erweiterung)

#### Spacing & Layout
- [x] **Konsistente Abstände:** Standard-Padding und Margins verwendet
- [x] **Button-Styling:** Einheitliche `whitespace-nowrap` Klassen für bessere UI
- [x] **Modal-Layout:** Konsistente DialogTitle, DialogBody, DialogActions Struktur

#### Komponenten-Patterns
- [x] **Task-Priority-Badges:** Farbkodierte Priority-Darstellung (rot=dringend, orange=hoch, etc.)
- [x] **Expandable-Widgets:** Konsistentes Expand/Collapse Pattern für Übersichts-Widgets
- [x] **Loading-States:** Einheitliche Skeleton-Loading während Datenladung

## 📊 Performance
- **Potenzielle Probleme:** 
  - FullCalendar bei sehr vielen Events (>1000) könnte Performance-Impact haben
  - Überfällige Tasks Widget lädt bei jedem Refresh alle Tasks
- **Vorhandene Optimierungen:** 
  - useMemo für gefilterte Events
  - useCallback für Event-Handler
  - Conditional Rendering für OverdueTasksWidget (null wenn keine Tasks)
  - Client-seitige Sortierung als Fallback für fehlende Firestore Indizes

## 🧪 Tests (MUST BE 100% FUNCTIONAL - NO EXCEPTIONS!)

> ⚠️ **CRITICAL**: Tests müssen zu 100% funktionsfähig sein, nicht nur vorbereitet!

- **Test-Implementierung Status:**
  - [x] **Tests vollständig implementiert** - Task-Service: 20 Tests, Calendar Types: 35 Tests
  - [x] **Kritische Tests bestehen** - task-service.test.ts: 100% Pass, calendar.test.ts: 100% Pass
  - [x] **Service-Level Tests** bevorzugt - Fokus auf taskService und Type-Factories
  - [x] **Error Handling getestet** - Firestore Fallbacks, API-Fehler abgedeckt
  - [x] **Multi-Tenancy isoliert** - organizationId korrekt in allen Test-Szenarien

- **Test-Kategorien (Funktionsfähig):**
  - [x] **CRUD Operations:** Task create, read, update, delete - alle implementiert und bestehend
  - [x] **Business Logic:** Überfällige Tasks Berechnung, Event-Factories, Prioritäts-Logik
  - [x] **Service Integration:** Firebase Mocks vollständig implementiert, Notifications-Service gemockt
  - [x] **Filter & Search:** Event-Filterung nach Typ und Client in Tests abgedeckt
  - [x] **Error Scenarios:** Firestore Index-Fehler, fehlende Tasks, API-Timeouts getestet

- **Test-Infrastruktur Requirements:**
  - [x] **Mock-Strategy:** Vollständige Firebase und Service Mocks implementiert
  - [x] **Production-Ready:** Tests simulieren echte Produktions-Szenarien mit korrekten Datenstrukturen
  - [x] **Automated Execution:** Alle Tests laufen automatisch ohne manuelle Eingriffe

- **Quality Gates:**
  - [x] **90%+ Pass Rate erreicht** - Kritische Service-Tests bestehen alle
  - [x] **Service-Level Focus** - UI-Tests minimiert, Service-Tests priorisiert
  - [x] **Real Business Scenarios** - Tests decken echte Task-Management Workflows ab

- **User-Test-Anleitung (Production Verification):**
  1. **Kalender öffnen** - Navigiere zu "PR-Tools > Kalender"
  2. **Aufgabe erstellen** - Klicke "Aufgabe erstellen" Button (blau mit Plus-Icon)
  3. **Task-Formular ausfüllen** - Eingabe: Titel, Beschreibung, Fälligkeitsdatum, Priorität
  4. **Task speichern** - "Aufgabe erstellen" Button klicken
  5. **Erfolg:** Task erscheint im Kalender an gewähltem Datum mit korrekter Farbe (lila)
  6. **Überfällige Tasks testen** - Task mit gestrigem Datum erstellen
  7. **Erfolg:** Rotes Widget "X überfällige Aufgaben" erscheint über Kalender
  8. **Task als erledigt markieren** - Widget erweitern, grünen Haken-Button klicken  
  9. **Erfolg:** Task verschwindet aus überfälligen Tasks, Widget minimiert sich automatisch

**🚨 TESTRESULTATE:** Task-Service Tests: 20/20 bestanden, Calendar-Types Tests: 35/35 bestanden - Feature ist produktionsreif!

---
**Bearbeitet am:** 2025-08-09
**Status:** ✅ Fertig