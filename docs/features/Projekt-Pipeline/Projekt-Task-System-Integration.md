# Projekt-Task-System Integration

## Übersicht
Dokumentation zur Integration des bestehenden CeleroPress Task-Systems mit der neuen Projekt-Pipeline. Überraschenderweise existiert bereits eine vollständige Task-Management-Infrastruktur, die für Projekt-Checklisten erweitert werden kann.

## 1. BESTEHENDE TASK-INFRASTRUKTUR (ANALYSE)

### 1.1 Task-Datenstruktur (bereits vorhanden)
```typescript
// src/types/tasks.ts - BEREITS IMPLEMENTIERT
export interface Task {
  id?: string;
  userId: string;
  organizationId: string;
  
  // Basis-Informationen
  title: string;
  description?: string;
  status: TaskStatus; // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: TaskPriority; // 'low' | 'medium' | 'high' | 'urgent'
  
  // Zeitdaten
  dueDate?: Timestamp;
  startTime?: string; // Format: "HH:MM"
  endTime?: string;   
  isAllDay?: boolean;
  duration?: number;  // Dauer in Minuten
  completedAt?: Timestamp;
  reminder?: Timestamp;
  
  // WICHTIG: Bestehende Verknüpfungen
  linkedCampaignId?: string;
  linkedClientId?: string;
  linkedContactId?: string;
  
  // Checkliste (bereits vorhanden!)
  checklist?: ChecklistItem[];
  
  // Metadaten
  tags?: string[];
  assignedTo?: string[];
  
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Timestamp;
}
```

### 1.2 Task-Service (vollständig implementiert)
```typescript
// src/lib/firebase/task-service.ts - BEREITS IMPLEMENTIERT
export const taskService = {
  // CRUD Operations
  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  async getById(taskId: string): Promise<Task | null>
  async getAll(organizationId: string, userId?: string): Promise<Task[]>
  async update(taskId: string, data: Partial<Omit<Task, 'id' | 'userId'>>): Promise<void>
  async markAsCompleted(taskId: string): Promise<void>
  async delete(taskId: string): Promise<void>
  
  // Spezielle Abfragen
  async getByDateRange(organizationId: string, startDate: Date, endDate: Date, userId?: string): Promise<Task[]>
  async getByClientId(organizationId: string, clientId: string, userId?: string): Promise<Task[]>
  async getByCampaignId(organizationId: string, campaignId: string, userId?: string): Promise<Task[]>
  
  // Statistiken & Benachrichtigungen
  async getStats(organizationId: string, userId?: string): Promise<TaskStats>
  async checkAndNotifyOverdueTasks(organizationId: string, userId?: string): Promise<void>
}
```

### 1.3 Bestehende UI-Komponenten
```typescript
// src/components/calendar/OverdueTasksWidget.tsx - BEREITS IMPLEMENTIERT
export function OverdueTasksWidget({ 
  organizationId, 
  userId, 
  onTaskClick, 
  onRefresh 
}: OverdueTasksWidgetProps) {
  // Vollständig implementiert:
  // - Überfällige Tasks anzeigen
  // - Expandable Widget
  // - Task als erledigt markieren
  // - Prioritäts-Badges
  // - Kunden-Verknüpfung anzeigen
  // - Refresh-Funktionalität
}
```

## 2. PROJEKT-TASK INTEGRATION (NEUE ERWEITERUNG)

### 2.1 Task-Interface Erweiterung
```typescript
// src/types/tasks.ts - ERWEITERUNG
export interface Task {
  // ... bestehende Felder ...
  
  // NEU: Projekt-Verknüpfung
  linkedProjectId?: string;
  
  // NEU: Pipeline-Stage spezifisch
  pipelineStage?: PipelineStage; // Welcher Pipeline-Phase zugeordnet
  
  // NEU: Template-basiert
  templateId?: string; // Aus welchem Template erstellt
  templateCategory?: TaskTemplateCategory;
  
  // NEU: Abhängigkeiten
  dependsOnTaskIds?: string[]; // Task-Abhängigkeiten
  blockingTaskIds?: string[]; // Welche Tasks blockiert diese Task
  
  // NEU: Automatisierung
  autoCompleteOnStageChange?: boolean; // Automatisch erledigt bei Stage-Wechsel
  requiredForStageCompletion?: boolean; // Muss erledigt sein für Stage-Fortschritt
}

// NEU: Task-Template System
export interface TaskTemplate {
  id: string;
  organizationId: string;
  
  title: string;
  description?: string;
  category: TaskTemplateCategory;
  pipelineStage: PipelineStage;
  
  // Standard-Werte
  defaultPriority: TaskPriority;
  estimatedDuration?: number; // Minuten
  
  // Abhängigkeiten
  dependsOnCategories?: TaskTemplateCategory[];
  
  // Automatisierung
  autoCompleteOnStageChange?: boolean;
  requiredForStageCompletion?: boolean;
  
  // Sortierung
  order: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TaskTemplateCategory = 
  | 'project_setup'
  | 'content_planning'
  | 'content_creation'
  | 'media_selection'
  | 'internal_review'
  | 'customer_approval'
  | 'distribution_prep'
  | 'campaign_launch'
  | 'performance_monitoring'
  | 'project_closure';
```

### 2.2 Task-Service Erweiterungen
```typescript
// src/lib/firebase/task-service.ts - NEUE METHODEN
export const taskService = {
  // ... bestehende Methoden ...
  
  // NEUE: Projekt-spezifische Abfragen
  async getByProjectId(organizationId: string, projectId: string, userId?: string): Promise<Task[]>
  async getByProjectStage(organizationId: string, projectId: string, stage: PipelineStage): Promise<Task[]>
  async getProjectTaskStats(organizationId: string, projectId: string): Promise<ProjectTaskStats>
  
  // NEUE: Template-basierte Erstellung
  async createFromTemplate(projectId: string, templateId: string, context: ServiceContext): Promise<string[]>
  async createProjectTasks(projectId: string, stage: PipelineStage, context: ServiceContext): Promise<string[]>
  
  // NEUE: Pipeline-Integration
  async updateTasksOnStageChange(projectId: string, newStage: PipelineStage, context: ServiceContext): Promise<void>
  async checkStageCompletionRequirements(projectId: string, stage: PipelineStage): Promise<StageCompletionCheck>
  
  // NEUE: Bulk-Operations
  async completeTasksByCategory(projectId: string, category: TaskTemplateCategory, context: ServiceContext): Promise<void>
  async reassignProjectTasks(projectId: string, fromUserId: string, toUserId: string): Promise<void>
}

// NEUE: Interfaces
interface ProjectTaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byStage: Record<PipelineStage, TaskStageStats>;
  byPriority: Record<TaskPriority, number>;
  completionPercent: number;
}

interface TaskStageStats {
  total: number;
  completed: number;
  required: number; // Required für Stage-Completion
  requiredCompleted: number;
}

interface StageCompletionCheck {
  canComplete: boolean;
  requiredTasks: Task[];
  missingTasks: Task[];
  completionPercent: number;
}
```

## 3. TASK-TEMPLATES FÜR PIPELINE-STAGES

### 3.1 Ideas/Planning Stage Templates
```typescript
const ideasPlanningTemplates: TaskTemplate[] = [
  {
    title: "Projekt-Briefing erstellen",
    description: "Detailliertes Briefing mit Zielen, Zielgruppe und Anforderungen",
    category: 'project_setup',
    pipelineStage: 'ideas_planning',
    defaultPriority: 'high',
    estimatedDuration: 120,
    requiredForStageCompletion: true,
    order: 1
  },
  {
    title: "Strategie-Dokument verfassen",
    description: "Kommunikationsstrategie und Kernbotschaften definieren",
    category: 'content_planning',
    pipelineStage: 'ideas_planning',
    defaultPriority: 'high',
    estimatedDuration: 180,
    dependsOnCategories: ['project_setup'],
    requiredForStageCompletion: true,
    order: 2
  },
  {
    title: "Zeitplan und Meilensteine festlegen",
    description: "Detaillierte Projektplanung mit Deadlines",
    category: 'project_setup',
    pipelineStage: 'ideas_planning',
    defaultPriority: 'medium',
    estimatedDuration: 60,
    order: 3
  },
  {
    title: "Budget und Ressourcen planen",
    description: "Kostenrahmen und benötigte Ressourcen definieren",
    category: 'project_setup',
    pipelineStage: 'ideas_planning',
    defaultPriority: 'medium',
    estimatedDuration: 90,
    order: 4
  },
  {
    title: "Team-Rollen zuweisen",
    description: "Verantwortlichkeiten und Ansprechpartner definieren",
    category: 'project_setup',
    pipelineStage: 'ideas_planning',
    defaultPriority: 'medium',
    estimatedDuration: 30,
    order: 5
  }
];
```

### 3.2 Creation Stage Templates
```typescript
const creationTemplates: TaskTemplate[] = [
  {
    title: "Content-Outline erstellen",
    description: "Struktur und Gliederung aller Inhalte",
    category: 'content_creation',
    pipelineStage: 'creation',
    defaultPriority: 'high',
    estimatedDuration: 90,
    requiredForStageCompletion: true,
    order: 1
  },
  {
    title: "Texte verfassen",
    description: "Alle Texte für Pressemitteilung, E-Mails, Social Media",
    category: 'content_creation',
    pipelineStage: 'creation',
    defaultPriority: 'high',
    estimatedDuration: 240,
    dependsOnCategories: ['content_creation'],
    requiredForStageCompletion: true,
    order: 2
  },
  {
    title: "Bilder und Grafiken auswählen",
    description: "Passende Medien aus der Media Library oder extern beschaffen",
    category: 'media_selection',
    pipelineStage: 'creation',
    defaultPriority: 'high',
    estimatedDuration: 120,
    requiredForStageCompletion: true,
    order: 3
  },
  {
    title: "Presseverteiler zusammenstellen",
    description: "Relevante Kontakte und Medien identifizieren",
    category: 'distribution_prep',
    pipelineStage: 'creation',
    defaultPriority: 'medium',
    estimatedDuration: 60,
    order: 4
  },
  {
    title: "Textbausteine erstellen",
    description: "Wiederverwendbare Textbausteine für verschiedene Kanäle",
    category: 'content_creation',
    pipelineStage: 'creation',
    defaultPriority: 'low',
    estimatedDuration: 90,
    order: 5
  }
];
```

### 3.3 Internal Approval Templates
```typescript
const internalApprovalTemplates: TaskTemplate[] = [
  {
    title: "Interne Review durchführen",
    description: "Erste interne Prüfung aller Inhalte und Materialien",
    category: 'internal_review',
    pipelineStage: 'internal_approval',
    defaultPriority: 'high',
    estimatedDuration: 60,
    requiredForStageCompletion: true,
    order: 1
  },
  {
    title: "PDF-Version für Review erstellen",
    description: "Zusammenfassung aller Materialien als PDF für einfache Freigabe",
    category: 'internal_review',
    pipelineStage: 'internal_approval',
    defaultPriority: 'high',
    estimatedDuration: 30,
    autoCompleteOnStageChange: true, // Wird automatisch beim Erstellen erledigt
    order: 2
  },
  {
    title: "Feedback Team-Mitglieder einholen",
    description: "Kommentare und Verbesserungsvorschläge sammeln",
    category: 'internal_review',
    pipelineStage: 'internal_approval',
    defaultPriority: 'medium',
    estimatedDuration: 120,
    requiredForStageCompletion: true,
    order: 3
  },
  {
    title: "Korrekturen implementieren",
    description: "Feedback einarbeiten und finale Version erstellen",
    category: 'content_creation',
    pipelineStage: 'internal_approval',
    defaultPriority: 'high',
    estimatedDuration: 90,
    dependsOnCategories: ['internal_review'],
    requiredForStageCompletion: true,
    order: 4
  }
];
```

### 3.4 Customer Approval Templates
```typescript
const customerApprovalTemplates: TaskTemplate[] = [
  {
    title: "Freigabe-Materialien vorbereiten",
    description: "Alle Materialien für Kundenfreigabe zusammenstellen",
    category: 'customer_approval',
    pipelineStage: 'customer_approval',
    defaultPriority: 'high',
    estimatedDuration: 45,
    requiredForStageCompletion: true,
    order: 1
  },
  {
    title: "Freigabe-Request versenden",
    description: "Offizielle Freigabe-Anfrage an den Kunden senden",
    category: 'customer_approval',
    pipelineStage: 'customer_approval',
    defaultPriority: 'high',
    estimatedDuration: 15,
    dependsOnCategories: ['customer_approval'],
    requiredForStageCompletion: true,
    order: 2
  },
  {
    title: "Kunden-Feedback verfolgen",
    description: "Status der Freigabe überwachen und bei Bedarf nachfassen",
    category: 'customer_approval',
    pipelineStage: 'customer_approval',
    defaultPriority: 'medium',
    estimatedDuration: 30,
    order: 3
  },
  {
    title: "Kunden-Änderungen einarbeiten",
    description: "Anpassungen basierend auf Kunden-Feedback implementieren",
    category: 'content_creation',
    pipelineStage: 'customer_approval',
    defaultPriority: 'high',
    estimatedDuration: 120,
    order: 4
  }
];
```

### 3.5 Distribution Templates
```typescript
const distributionTemplates: TaskTemplate[] = [
  {
    title: "Versand-Timeline finalisieren",
    description: "Optimale Versendezeitpunkte für verschiedene Kanäle festlegen",
    category: 'distribution_prep',
    pipelineStage: 'distribution',
    defaultPriority: 'high',
    estimatedDuration: 30,
    requiredForStageCompletion: true,
    order: 1
  },
  {
    title: "E-Mail-Kampagnen konfigurieren",
    description: "Alle E-Mail-Kampagnen mit korrekten Einstellungen vorbereiten",
    category: 'campaign_launch',
    pipelineStage: 'distribution',
    defaultPriority: 'high',
    estimatedDuration: 60,
    requiredForStageCompletion: true,
    order: 2
  },
  {
    title: "Pressemitteilung versenden",
    description: "Offizielle Pressemitteilung an alle relevanten Kontakte",
    category: 'campaign_launch',
    pipelineStage: 'distribution',
    defaultPriority: 'high',
    estimatedDuration: 30,
    dependsOnCategories: ['distribution_prep'],
    requiredForStageCompletion: true,
    order: 3
  },
  {
    title: "Social Media Posts veröffentlichen",
    description: "Begleitende Posts auf relevanten Social Media Kanälen",
    category: 'campaign_launch',
    pipelineStage: 'distribution',
    defaultPriority: 'medium',
    estimatedDuration: 45,
    order: 4
  },
  {
    title: "Direktansprache wichtiger Medien",
    description: "Persönliche Kontaktaufnahme mit Schlüsselkontakten",
    category: 'campaign_launch',
    pipelineStage: 'distribution',
    defaultPriority: 'medium',
    estimatedDuration: 90,
    order: 5
  }
];
```

### 3.6 Monitoring Templates
```typescript
const monitoringTemplates: TaskTemplate[] = [
  {
    title: "Medienresonanz verfolgen",
    description: "Alle Erwähnungen und Berichterstattung dokumentieren",
    category: 'performance_monitoring',
    pipelineStage: 'monitoring',
    defaultPriority: 'high',
    estimatedDuration: 60,
    requiredForStageCompletion: true,
    order: 1
  },
  {
    title: "Engagement-Metriken analysieren",
    description: "Öffnungsraten, Klicks und Social Media Interaktionen auswerten",
    category: 'performance_monitoring',
    pipelineStage: 'monitoring',
    defaultPriority: 'high',
    estimatedDuration: 90,
    requiredForStageCompletion: true,
    order: 2
  },
  {
    title: "ROI-Analyse durchführen",
    description: "Erfolg der Kampagne im Verhältnis zu Aufwand und Zielen bewerten",
    category: 'performance_monitoring',
    pipelineStage: 'monitoring',
    defaultPriority: 'medium',
    estimatedDuration: 120,
    order: 3
  },
  {
    title: "Lessons Learned dokumentieren",
    description: "Erkenntnisse und Verbesserungen für zukünftige Projekte festhalten",
    category: 'project_closure',
    pipelineStage: 'monitoring',
    defaultPriority: 'low',
    estimatedDuration: 60,
    order: 4
  }
];
```

## 4. PROJEKT-TASK AUTOMATISIERUNG

### 4.1 Automatische Task-Erstellung bei Projekt-Anlage
```typescript
// src/lib/firebase/project-service.ts - NEUE METHODE
export const projectService = {
  async createProject(data: CreateProjectData, context: ServiceContext): Promise<string> {
    // 1. Projekt erstellen
    const projectId = await createProjectEntity(data, context);
    
    // 2. Automatisch Tasks für Ideas/Planning Stage erstellen
    await taskService.createProjectTasks(projectId, 'ideas_planning', context);
    
    // 3. Optional: Template-basierte Tasks erstellen
    if (data.templateId) {
      await taskService.createFromTemplate(projectId, data.templateId, context);
    }
    
    return projectId;
  }
}

// Task-Template Service (NEU)
export const taskTemplateService = {
  async getByStage(organizationId: string, stage: PipelineStage): Promise<TaskTemplate[]>
  async createTasksFromTemplates(projectId: string, stage: PipelineStage, context: ServiceContext): Promise<string[]>
}
```

### 4.2 Stage-Wechsel Automatisierung
```typescript
// src/lib/firebase/project-service.ts - ERWEITERTE METHODE  
export const projectService = {
  async moveProjectToStage(projectId: string, newStage: PipelineStage, context: ServiceContext): Promise<void> {
    // 1. Prüfen ob alle Required-Tasks der aktuellen Stage erledigt sind
    const completionCheck = await taskService.checkStageCompletionRequirements(projectId, currentStage);
    if (!completionCheck.canComplete && !context.forceMove) {
      throw new Error(`Nicht alle erforderlichen Aufgaben erledigt: ${completionCheck.missingTasks.map(t => t.title).join(', ')}`);
    }
    
    // 2. Projekt-Stage aktualisieren
    await updateProjectStage(projectId, newStage, context);
    
    // 3. Tasks für neue Stage erstellen
    await taskService.createProjectTasks(projectId, newStage, context);
    
    // 4. Auto-Complete Tasks der alten Stage (falls konfiguriert)
    await taskService.updateTasksOnStageChange(projectId, newStage, context);
    
    // 5. Projekt-Fortschritt neu berechnen
    await updateProjectProgress(projectId);
  }
}
```

### 4.3 Smart Task Dependencies
```typescript
// Task-Abhängigkeiten automatisch auflösen
export const taskDependencyService = {
  async resolveDependencies(projectId: string): Promise<TaskDependencyMap> {
    const tasks = await taskService.getByProjectId(organizationId, projectId);
    
    // Kategorie-basierte Abhängigkeiten auflösen
    const dependencyMap: TaskDependencyMap = {};
    tasks.forEach(task => {
      if (task.templateCategory) {
        const template = getTemplateByCategory(task.templateCategory);
        if (template.dependsOnCategories) {
          // Finde alle Tasks der abhängigen Kategorien
          const dependentTasks = tasks.filter(t => 
            template.dependsOnCategories!.includes(t.templateCategory!)
          );
          dependencyMap[task.id!] = dependentTasks.map(t => t.id!);
        }
      }
    });
    
    return dependencyMap;
  },
  
  async updateTaskAvailability(projectId: string): Promise<void> {
    // Tasks basierend auf Abhängigkeiten verfügbar/nicht verfügbar setzen
  }
}
```

## 5. UI-INTEGRATION KONZEPT

### 5.1 Projekt-Karte Task-Anzeige
```typescript
// Erweiterte Projekt-Karte mit Task-Zusammenfassung
interface ProjectCardTaskSummary {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  criticalTasks: number; // Required für Stage-Completion
  completionPercent: number;
  nextTask?: Task; // Nächste zu erledigende Task
}

// UI-Komponente Erweiterung
<ProjectCard 
  project={project}
  taskSummary={taskSummary} // NEU
  onTaskClick={(task) => openTaskModal(task)} // NEU
  showTaskProgress={true} // NEU
/>
```

### 5.2 Task-Panel Integration
```typescript
// Neues Task-Panel für Projekt-Detail-Ansicht
interface ProjectTaskPanelProps {
  projectId: string;
  currentStage: PipelineStage;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onStageCompleteCheck: () => Promise<StageCompletionCheck>;
}

export function ProjectTaskPanel({ 
  projectId, 
  currentStage, 
  onTaskUpdate, 
  onStageCompleteCheck 
}: ProjectTaskPanelProps) {
  // Gruppierung nach:
  // 1. Critical Tasks (Required für Stage-Completion)
  // 2. Standard Tasks der aktuellen Stage  
  // 3. Upcoming Tasks (nächste Stage)
  // 4. Completed Tasks (mit Collapse)
}
```

### 5.3 Stage-Completion Indicator
```typescript
// Stage-Fortschritt Indikator mit Task-Details
export function StageCompletionIndicator({ 
  projectId, 
  stage 
}: { projectId: string; stage: PipelineStage }) {
  const [completionStatus, setCompletionStatus] = useState<StageCompletionCheck>();
  
  return (
    <div className="stage-completion">
      <ProgressBar 
        value={completionStatus?.completionPercent || 0}
        className={completionStatus?.canComplete ? 'text-green-600' : 'text-amber-600'}
      />
      
      {!completionStatus?.canComplete && (
        <div className="missing-tasks">
          <Text className="text-sm text-amber-700">
            Noch {completionStatus?.requiredTasks.length} Aufgaben erforderlich:
          </Text>
          {completionStatus?.requiredTasks.map(task => (
            <TaskQuickAction 
              key={task.id} 
              task={task} 
              onComplete={() => handleTaskComplete(task.id!)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

## 6. MIGRATION & IMPLEMENTIERUNG

### 6.1 Phase 1: Basis-Integration
1. **Task-Interface erweitern** mit `linkedProjectId` und `pipelineStage`
2. **TaskService erweitern** um projekt-spezifische Methoden
3. **Bestehende OverdueTasksWidget** für Projekt-Kontext erweitern
4. **Einfache Task-Liste** in Projekt-Detail-Ansicht integrieren

### 6.2 Phase 2: Template-System
1. **TaskTemplate-Entity** und Service implementieren
2. **Standard-Templates** für alle Pipeline-Stages erstellen
3. **Automatische Task-Erstellung** bei Projekt-Anlage
4. **Template-Auswahl** im Projekt-Erstellungs-Wizard

### 6.3 Phase 3: Erweiterte Automation
1. **Stage-Completion Checks** implementieren
2. **Task-Abhängigkeiten** und Smart Dependencies
3. **Automatisierte Task-Updates** bei Stage-Wechseln
4. **Bulk-Operations** und Team-Zuweisungen

### 6.4 Phase 4: Advanced UI
1. **Vollständiges Task-Panel** mit Drag & Drop
2. **Task-Templates Editor** für Custom Templates
3. **Gantt-Chart Ansicht** für Task-Timeline
4. **Mobile Task-Management** Optimierungen

## 7. FIRESTORE-ERWEITERUNGEN

### 7.1 Neue Indices (ergänzend)
```javascript
// tasks Collection (ERWEITERN)
{ organizationId: 'asc', linkedProjectId: 'asc', status: 'asc' }
{ organizationId: 'asc', linkedProjectId: 'asc', pipelineStage: 'asc', order: 'asc' }
{ organizationId: 'asc', templateCategory: 'asc', requiredForStageCompletion: 'asc' }

// task_templates Collection (NEU)
{ organizationId: 'asc', pipelineStage: 'asc', order: 'asc' }
{ organizationId: 'asc', category: 'asc', pipelineStage: 'asc' }
```

### 7.2 Neue Collections
```
/task_templates
  /{templateId}
    - TaskTemplate Entity
    - organizationId für Multi-Tenancy
    - Vordefinierte Templates für alle Stages
```

## 8. INTEGRATION MIT BESTEHENDEN NOTIFICATIONS

### 8.1 Task-Benachrichtigungen erweitern
```typescript
// Bestehende checkAndNotifyOverdueTasks erweitern für Projekt-Context
export const taskService = {
  async checkProjectTaskDeadlines(projectId: string, organizationId: string): Promise<void> {
    const tasks = await this.getByProjectId(organizationId, projectId);
    const criticalTasks = tasks.filter(t => 
      t.requiredForStageCompletion && 
      t.status !== 'completed' && 
      t.dueDate && 
      isApproachingDeadline(t.dueDate)
    );
    
    if (criticalTasks.length > 0) {
      // Projekt-spezifische Benachrichtigungen senden
      await notificationsService.create({
        type: 'PROJECT_CRITICAL_TASKS',
        title: `${criticalTasks.length} kritische Aufgaben in Projekt`,
        message: `Projekt kann nicht fortgesetzt werden ohne: ${criticalTasks.map(t => t.title).join(', ')}`,
        linkUrl: `/dashboard/projects/${projectId}`,
        linkType: 'project',
        linkId: projectId
      });
    }
  }
}
```

## ZUSAMMENFASSUNG

Das bestehende CeleroPress Task-System bietet bereits eine solide Grundlage:

### ✅ BEREITS VORHANDEN:
- **Vollständige Task-Datenstruktur** mit Checklisten
- **Implementierter Task-Service** mit CRUD und Statistiken
- **UI-Komponente** für überfällige Tasks
- **Notification-Integration** für Deadlines
- **Multi-Tenancy Support** mit organizationId
- **Verknüpfungen** zu Kampagnen und Kunden

### 🆕 BENÖTIGTE ERWEITERUNGEN:
- **Projekt-Verknüpfung** (`linkedProjectId`)
- **Pipeline-Stage Zuordnung** (`pipelineStage`)
- **Template-System** für standardisierte Aufgaben
- **Stage-Completion Checks** für Workflow-Kontrolle
- **Enhanced UI-Komponenten** für Projekt-Integration

### 🎯 IMPLEMENTIERUNGS-VORTEIL:
Durch die bereits vorhandene Infrastruktur kann die Projekt-Task-Integration **deutlich schneller** umgesetzt werden als ursprünglich geplant. Das Task-System ist bereits produktionsreif und muss nur für Projekt-Kontext erweitert werden.
