# Projekt Task-Management System - Implementierungsplan

## Überblick
Implementierung eines umfassenden Task-Management-Systems auf Projekt-Ebene mit Multi-Level-Filtern und projektübergreifender Tages-Liste.

## 1. Systemarchitektur

### Ebenen-Konzept
- **Organisations-Ebene**: Bestehender Kalender + OverdueTasksWidget (bleibt unverändert)
- **Projekt-Ebene**: Neue Task-Liste für spezifisches Projekt
- **Projektübergreifend**: Neue Tages-Aufgabenliste über alle Projekte

### Bestehende Infrastruktur (bereits vorhanden)
- ✅ **task-service.ts**: Vollständiger CRUD mit Firebase
- ✅ **notifications-service.ts**: Push-Benachrichtigungen für `TASK_OVERDUE`
- ✅ **Task-Interface**: Basis-Struktur mit userId, organizationId, dueDate, priority
- ✅ **QuickTaskModal**: Erstellung über Kalender
- ✅ **OverdueTasksWidget**: Organisations-weite überfällige Tasks

## 2. Task-Interface Erweiterungen

### Neue Required Fields
```typescript
interface ProjectTask extends Task {
  projectId: string;              // Required für Projekt-Tasks
  progress: number;               // 0-100 Prozent
  assignedUserId: string;         // Standard: Projekt-Manager
  projectTitle?: string;          // Für projektübergreifende Ansicht
  isOverdue?: boolean;            // Computed field für UI-Highlighting
}
```

### Neue Task-Service Methoden
```typescript
// Neue Methoden für task-service.ts
async delete(taskId: string): Promise<void>
async updateProgress(taskId: string, progress: number): Promise<void>
async getByProject(projectId: string, organizationId: string): Promise<ProjectTask[]>
async getTodayTasks(userId: string, organizationId: string, projectIds?: string[]): Promise<ProjectTask[]>
async getOverdueTasks(projectId: string, organizationId: string): Promise<ProjectTask[]>
```

## 3. UI-Komponenten Entwicklung

### 3.1 ProjectTaskManager Komponente
**Datei**: `src/components/projects/ProjectTaskManager.tsx`

**Features**:
- Task-Erstellung mit Projekt-Manager als Standard-Zuweisung
- Progress-Balken mit Click-to-Edit
- **3-Punkte-Menü** für Aktionen (Edit, Complete, Delete)
- **Avatar-Darstellung** für zuständige Mitarbeiter
- **Fälligkeits-basierte Sortierung** mit Überfällig-Highlighting
- Team-Member Assignment Dropdown

**Props**:
```typescript
interface ProjectTaskManagerProps {
  projectId: string;
  organizationId: string;
  projectManagerId: string;
  teamMembers: TeamMember[];
}
```

### 3.2 TaskFilterSystem Komponente
**Datei**: `src/components/projects/TaskFilterSystem.tsx`

**Multi-Level-Filter**:
1. **Personen-Filter**:
   - "Team Tasks (alle)"
   - "Meine Tasks"
2. **Zeit-Filter**:
   - "Heute fällig" (hervorgehoben)
   - Datum-Range Picker
3. **Projekt-Filter**:
   - "Aktuelles Projekt" (Standard)
   - "Alle Projekte" (für Tages-Liste)

### 3.3 TodayTasksList Komponente
**Datei**: `src/components/tasks/TodayTasksList.tsx`

**Killer-Feature**: Projektübergreifende Tages-Aufgabenliste
- Zeigt alle heute fälligen Tasks aller Projekte
- **Projekt-Spalte** mit direktem Link zum Projekt
- Ein-Klick Navigation: Task → Ursprungsprojekt
- Progress-Update direkt in der Liste

**Tabellen-Struktur**:
| Task | Projekt | Zuständig | Fortschritt | Fälligkeit | Status | Aktionen |
|------|---------|-----------|-------------|------------|--------|----------|
| Task 1 | [Projekt A →] | [👤] User X | [████▒▒▒▒▒▒] 40% | **Überfällig** | ⏰ | [⋮] |
| Task 2 | [Projekt B →] | [👤] User Y | [██████████] 100% | Heute | ✅ | [⋮] |

**UI-Pattern**:
- **Avatar**: Wie in Projekt-Tabelle (`Avatar` Komponente)
- **3-Punkte-Menü**: `Dropdown` + `EllipsisVerticalIcon`
- **Überfällig-Badge**: Rote Hervorhebung für überfällige Tasks
- **Progress-Balken**: Click-to-Edit Funktionalität

## 4. Integration in bestehende Struktur

### 4.1 Projekt-Detail-Seite
**Datei**: `src/app/dashboard/projects/[projectId]/page.tsx`

**Tasks-Tab Erweiterung**:
```typescript
// Ersetze bestehenden Platzhalter durch:
<ProjectTaskManager
  projectId={project.id}
  organizationId={currentOrganization.id}
  projectManagerId={project.managerId}
  teamMembers={project.teamMembers}
/>
```

### 4.2 Neue Route für Tages-Liste
**Datei**: `src/app/dashboard/tasks/today/page.tsx`

**Globale Tages-Aufgabenliste**:
- Zugriff über Hauptnavigation
- Projektübergreifende Sicht
- Optimiert für Daily-Workflow

## 5. Push-Benachrichtigungen (bereits implementiert)

### Bestehende Integration
- ✅ **notificationsService**: `TASK_OVERDUE` Type vorhanden
- ✅ **task-service**: `checkAndNotifyOverdueTasks()` implementiert
- ✅ **User-Settings**: Task-Benachrichtigungen konfigurierbar
- ✅ **Automatische Prüfung**: System prüft täglich überfällige Tasks

### Erweiterung für Projekt-Tasks
```typescript
// In task-service.ts erweitern:
async notifyProjectTaskOverdue(task: ProjectTask): Promise<void> {
  await notificationsService.create({
    userId: task.assignedUserId,
    organizationId: task.organizationId,
    type: 'TASK_OVERDUE',
    title: 'Projekt-Task überfällig',
    message: `Task "${task.title}" in Projekt "${task.projectTitle}" ist überfällig`,
    linkUrl: `/dashboard/projects/${task.projectId}?tab=tasks`,
    metadata: {
      taskId: task.id,
      projectId: task.projectId,
      projectTitle: task.projectTitle
    }
  });
}
```

## 6. Implementierungs-Reihenfolge

### Phase 1: Basis-Erweiterungen
1. **Task-Interface erweitern** (projectId, progress, sortOrder)
2. **Task-Service neue Methoden** (delete, updateProgress, getByProject)
3. **Bestehende Typen-Kompatibilität** sicherstellen

### Phase 2: Projekt-Task-Manager
1. **ProjectTaskManager Komponente** erstellen
2. **Task-Erstellung** mit Projekt-Kontext
3. **Progress-Balken** mit Click-to-Edit
4. **Delete-Funktion** implementieren

### Phase 3: Filter-System
1. **TaskFilterSystem Komponente** entwickeln
2. **Multi-Level-Filter** implementieren
3. **Filter-State-Management** einrichten

### Phase 4: Fälligkeits-Sortierung
1. **Automatische Sortierung** nach Fälligkeit (heute zuerst)
2. **Überfällig-Highlighting** mit rotem Badge
3. **Datum-basierte Gruppierung** (Heute, Morgen, Diese Woche)

### Phase 5: Tages-Liste
1. **TodayTasksList Komponente** erstellen
2. **Projektübergreifende Queries** implementieren
3. **Navigation zu Ursprungsprojekt**
4. **Neue Route** `/dashboard/tasks/today`

### Phase 6: Integration & Testing
1. **Projekt-Detail-Seite** Integration
2. **Benachrichtigungs-Tests**
3. **Performance-Optimierung**
4. **User-Feedback** Integration

## 7. Technische Spezifikationen

### Dependencies
```json
{
  // Bestehende Dependencies reichen aus
  // Keine zusätzlichen Packages für Drag & Drop erforderlich
}
```

### Firebase-Queries Optimierung
```typescript
// Compound Indexes erforderlich:
// tasks: [organizationId, projectId, dueDate]
// tasks: [organizationId, assignedUserId, dueDate]
// tasks: [organizationId, dueDate, status] // Für Überfällig-Queries
```

### Performance-Überlegungen
- **Real-time Updates**: onSnapshot für aktuelle Projekt-Tasks
- **Lazy Loading**: Pagination für große Task-Listen
- **Optimistic Updates**: UI-Updates vor Backend-Bestätigung
- **Caching**: React Query für projektübergreifende Abfragen

## 8. User Experience Features

### Shortcuts & Workflows
- **Schnell-Erstellung**: Ctrl+N für neue Task
- **Progress-Update**: Click auf Balken für direktes Update
- **Heute-Fokus**: Dedicated "Heute fällig" Button
- **Projekt-Sprung**: Ein-Klick Navigation zwischen Projekten

### Mobile Optimierung
- **Touch-friendly** Drag & Drop
- **Responsive** Filter-Collapse
- **Swipe-Actions** für Mobile (Complete/Delete)

## 9. Daten-Migration

### Bestehende Tasks
- Bestehende Tasks **ohne projectId** bleiben in Organisations-Ebene
- Neue Projekt-Tasks erhalten **projectId als Required**
- **Rückwärts-Kompatibilität** durch optionale projectId in Service-Layer

### Default-Werte
- **assignedUserId**: Projekt-Manager bei Erstellung
- **progress**: 0% bei neuen Tasks
- **sortOrder**: Auto-increment basierend auf bestehenden Tasks

## 10. Testing-Strategie

### Unit Tests
- **Task-Service** neue Methoden
- **Filter-Logic** verschiedene Kombinationen
- **Progress-Updates** Edge Cases

### Integration Tests
- **Projekt-Task-Erstellung** End-to-End
- **Benachrichtigungen** bei überfälligen Tasks
- **Drag & Drop** Reihenfolge-Updates

### User Acceptance Tests
- **Daily Workflow**: Tages-Liste → Projekt → Task-Update
- **Multi-Projekt**: Tasks in 5+ Projekten verwalten
- **Team-Kollaboration**: Zuweisung und Status-Updates

---

## Geschätzter Aufwand: 8-10 Entwicklungstage

**Phase 1-2**: 3 Tage (Basis + Projekt-Manager)
**Phase 3-4**: 3 Tage (Filter + Drag & Drop)
**Phase 5-6**: 2-4 Tage (Tages-Liste + Integration)

## Nächste Schritte
1. ✅ Spezifikation Review
2. ⏳ Task-Interface Erweiterung
3. ⏳ ProjectTaskManager Komponente
4. ⏳ Filter-System Implementation
5. ⏳ Tages-Liste Development