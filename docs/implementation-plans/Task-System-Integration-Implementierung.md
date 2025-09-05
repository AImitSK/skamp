# Task-System Integration Implementierungsplan

## Referenz-Dokumentation
**Basis:** `docs/features/Projekt-Pipeline/Projekt-Task-System-Integration.md`

## Übersicht
Implementierungsplan für die Erweiterung des bestehenden CeleroPress Task-Systems zur Integration mit der Projekt-Pipeline. Baut auf der bereits vorhandenen Task-Infrastruktur auf.

---

## SCHRITT 1: TASK-INTERFACE ERWEITERUNG

### 1.1 Bestehende Task-Types erweitern
**Datei:** `src/types/tasks.ts` (erweitern, nicht ersetzen)
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung:**
```typescript
// src/types/tasks.ts - ERWEITERUNG der bestehenden Interface
export interface Task {
  // ... ALLE BESTEHENDEN FELDER BLEIBEN UNVERÄNDERT ...
  
  // NEU: Projekt-Pipeline Integration
  linkedProjectId?: string;
  pipelineStage?: PipelineStage; // Welcher Pipeline-Phase zugeordnet
  
  // NEU: Template-System
  templateId?: string; // Aus welchem Template erstellt
  templateCategory?: TaskTemplateCategory;
  
  // NEU: Abhängigkeiten
  dependsOnTaskIds?: string[]; // Task-Abhängigkeiten
  blockingTaskIds?: string[]; // Welche Tasks blockiert diese Task
  
  // NEU: Pipeline-Automatisierung
  autoCompleteOnStageChange?: boolean; // Automatisch erledigt bei Stage-Wechsel
  requiredForStageCompletion?: boolean; // Muss erledigt sein für Stage-Fortschritt
  
  // NEU: Erweiterte Metadaten
  estimatedDuration?: number; // Minuten
  actualDuration?: number; // Tatsächlich benötigte Zeit
}

// NEU: Task-Template System
export interface TaskTemplate {
  id: string;
  organizationId: string;
  
  title: string;
  description?: string;
  category: TaskTemplateCategory;
  pipelineStage: PipelineStage;
  
  // Standard-Werte für erstellte Tasks
  defaultPriority: TaskPriority;
  estimatedDuration?: number;
  
  // Abhängigkeiten
  dependsOnCategories?: TaskTemplateCategory[];
  
  // Automatisierung
  autoCompleteOnStageChange?: boolean;
  requiredForStageCompletion?: boolean;
  
  // Sortierung und Darstellung
  order: number;
  isActive: boolean;
  
  // Multi-Tenancy
  organizationId: string;
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

// NEU: Projekt-Task Statistiken
export interface ProjectTaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byStage: Record<PipelineStage, TaskStageStats>;
  byPriority: Record<TaskPriority, number>;
  completionPercent: number;
}

export interface TaskStageStats {
  total: number;
  completed: number;
  required: number; // Required für Stage-Completion
  requiredCompleted: number;
}

export interface StageCompletionCheck {
  canComplete: boolean;
  requiredTasks: Task[];
  missingTasks: Task[];
  completionPercent: number;
}
```

**Rückwärts-Kompatibilität sicherstellen:**
```typescript
// Bestehende Task-Interfaces MÜSSEN unverändert bleiben
// Alle neuen Felder sind optional (?)
// Bestehende Services funktionieren weiter ohne Änderungen
```

**Test für Erweiterung:**
```typescript
// src/__tests__/types/tasks-extended.test.ts
import { Task, TaskTemplate } from '@/types/tasks';

describe('Extended Task Types', () => {
  it('should maintain backward compatibility with existing Task interface', () => {
    // Bestehender Task sollte weiter funktionieren
    const existingTask: Task = {
      id: '123',
      userId: 'user1',
      organizationId: 'org1',
      title: 'Existing Task',
      status: 'pending',
      priority: 'medium'
    };

    expect(existingTask.title).toBe('Existing Task');
    expect(existingTask.linkedProjectId).toBeUndefined(); // Neues Feld ist optional
  });

  it('should support new project-pipeline fields', () => {
    const projectTask: Task = {
      id: '456',
      userId: 'user1', 
      organizationId: 'org1',
      title: 'Project Task',
      status: 'pending',
      priority: 'high',
      // Neue Felder
      linkedProjectId: 'project_123',
      pipelineStage: 'creation',
      templateCategory: 'content_creation',
      requiredForStageCompletion: true
    };

    expect(projectTask.linkedProjectId).toBe('project_123');
    expect(projectTask.pipelineStage).toBe('creation');
  });

  it('should validate TaskTemplate interface', () => {
    const template: TaskTemplate = {
      id: 'template_1',
      organizationId: 'org1',
      title: 'Content erstellen',
      category: 'content_creation',
      pipelineStage: 'creation',
      defaultPriority: 'high',
      requiredForStageCompletion: true,
      order: 1,
      isActive: true,
      organizationId: 'org1',
      createdAt: new Date() as any,
      updatedAt: new Date() as any
    };

    expect(template.category).toBe('content_creation');
    expect(template.pipelineStage).toBe('creation');
  });
});
```

---

## SCHRITT 2: TASK-SERVICE ERWEITERUNG

### 2.1 Bestehende task-service.ts erweitern
**Datei:** `src/lib/firebase/task-service.ts` (erweitern)
**Agent:** `general-purpose`
**Dauer:** 2-3 Tage

**Umsetzung - Neue Methoden hinzufügen:**
```typescript
// src/lib/firebase/task-service.ts - ERWEITERN, nicht ersetzen

export const taskService = {
  // ... ALLE BESTEHENDEN METHODEN BLEIBEN UNVERÄNDERT ...

  // ========== NEUE PROJEKT-SPEZIFISCHE METHODEN ==========

  /**
   * Tasks nach Projekt abrufen
   */
  async getByProjectId(organizationId: string, projectId: string, userId?: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId), // MULTI-TENANCY
      where('linkedProjectId', '==', projectId),
      orderBy('pipelineStage', 'asc'),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));

    // Optional: Nach User filtern
    if (userId) {
      tasks = tasks.filter(task => 
        !task.assignedTo || 
        task.assignedTo.length === 0 || 
        task.assignedTo.includes(userId)
      );
    }

    return tasks;
  },

  /**
   * Tasks nach Projekt und Stage
   */
  async getByProjectStage(
    organizationId: string, 
    projectId: string, 
    stage: PipelineStage
  ): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId), // MULTI-TENANCY
      where('linkedProjectId', '==', projectId),
      where('pipelineStage', '==', stage),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  },

  /**
   * Projekt-Task Statistiken
   */
  async getProjectTaskStats(organizationId: string, projectId: string): Promise<ProjectTaskStats> {
    const tasks = await this.getByProjectId(organizationId, projectId);
    const now = new Date();
    
    const stats: ProjectTaskStats = {
      total: tasks.length,
      completed: 0,
      pending: 0,
      overdue: 0,
      byStage: {} as Record<PipelineStage, TaskStageStats>,
      byPriority: {
        low: 0,
        medium: 0, 
        high: 0,
        urgent: 0
      },
      completionPercent: 0
    };

    // Statistiken berechnen
    tasks.forEach(task => {
      // Status-Statistiken
      if (task.status === 'completed') {
        stats.completed++;
      } else {
        stats.pending++;
        
        // Überfällig prüfen
        if (task.dueDate && task.dueDate.toDate() < now) {
          stats.overdue++;
        }
      }

      // Prioritäts-Statistiken
      stats.byPriority[task.priority]++;

      // Stage-Statistiken
      if (task.pipelineStage) {
        if (!stats.byStage[task.pipelineStage]) {
          stats.byStage[task.pipelineStage] = {
            total: 0,
            completed: 0,
            required: 0,
            requiredCompleted: 0
          };
        }

        const stageStats = stats.byStage[task.pipelineStage];
        stageStats.total++;
        
        if (task.status === 'completed') {
          stageStats.completed++;
        }

        if (task.requiredForStageCompletion) {
          stageStats.required++;
          if (task.status === 'completed') {
            stageStats.requiredCompleted++;
          }
        }
      }
    });

    stats.completionPercent = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100) 
      : 0;

    return stats;
  },

  /**
   * Stage-Completion Prüfung
   */
  async checkStageCompletionRequirements(
    projectId: string, 
    stage: PipelineStage, 
    organizationId: string
  ): Promise<StageCompletionCheck> {
    const stageTasks = await this.getByProjectStage(organizationId, projectId, stage);
    
    const requiredTasks = stageTasks.filter(task => task.requiredForStageCompletion);
    const missingTasks = requiredTasks.filter(task => task.status !== 'completed');
    
    const canComplete = missingTasks.length === 0;
    const completionPercent = requiredTasks.length > 0
      ? Math.round(((requiredTasks.length - missingTasks.length) / requiredTasks.length) * 100)
      : 100;

    return {
      canComplete,
      requiredTasks,
      missingTasks,
      completionPercent
    };
  },

  /**
   * Tasks aus Template erstellen
   */
  async createFromTemplate(
    projectId: string, 
    templateId: string, 
    context: ServiceContext
  ): Promise<string[]> {
    const template = await taskTemplateService.getById(templateId, context.organizationId);
    if (!template) {
      throw new Error('Template nicht gefunden');
    }

    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: template.title,
      description: template.description,
      status: 'pending',
      priority: template.defaultPriority,
      
      // Projekt-Verknüpfung
      linkedProjectId: projectId,
      pipelineStage: template.pipelineStage,
      
      // Template-Informationen
      templateId: template.id,
      templateCategory: template.category,
      
      // Automatisierungs-Einstellungen
      autoCompleteOnStageChange: template.autoCompleteOnStageChange,
      requiredForStageCompletion: template.requiredForStageCompletion,
      
      // Schätzungen
      estimatedDuration: template.estimatedDuration,
      
      // Multi-Tenancy
      userId: context.userId,
      organizationId: context.organizationId
    };

    const taskId = await this.create(taskData);
    return [taskId];
  },

  /**
   * Stage-Tasks für Projekt erstellen
   */
  async createProjectTasks(
    projectId: string, 
    stage: PipelineStage, 
    context: ServiceContext
  ): Promise<string[]> {
    const templates = await taskTemplateService.getByStage(context.organizationId, stage);
    
    const createdTaskIds: string[] = [];
    
    for (const template of templates) {
      if (template.isActive) {
        const taskIds = await this.createFromTemplate(projectId, template.id, context);
        createdTaskIds.push(...taskIds);
      }
    }

    return createdTaskIds;
  },

  /**
   * Tasks bei Stage-Wechsel aktualisieren
   */
  async updateTasksOnStageChange(
    projectId: string, 
    newStage: PipelineStage, 
    context: ServiceContext
  ): Promise<void> {
    const allProjectTasks = await this.getByProjectId(context.organizationId, projectId);
    
    // Auto-Complete Tasks der vorherigen Stage
    const autoCompleteTasks = allProjectTasks.filter(task =>
      task.pipelineStage !== newStage &&
      task.autoCompleteOnStageChange &&
      task.status !== 'completed'
    );

    for (const task of autoCompleteTasks) {
      await this.update(task.id!, {
        status: 'completed',
        completedAt: Timestamp.now()
      });
    }

    // Neue Stage-Tasks erstellen
    await this.createProjectTasks(projectId, newStage, context);
  },

  /**
   * Task-Abhängigkeiten auflösen
   */
  async resolveDependencies(projectId: string, organizationId: string): Promise<void> {
    const tasks = await this.getByProjectId(organizationId, projectId);
    
    tasks.forEach(async (task) => {
      if (task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0) {
        // Prüfen ob alle abhängigen Tasks erledigt sind
        const dependentTasks = tasks.filter(t => 
          task.dependsOnTaskIds!.includes(t.id!) && 
          t.status === 'completed'
        );
        
        // Wenn alle Abhängigkeiten erfüllt sind, Task verfügbar machen
        if (dependentTasks.length === task.dependsOnTaskIds.length && task.status === 'blocked') {
          await this.update(task.id!, {
            status: 'pending'
          });
        }
      }
    });
  }
};
```

**Erweiterte Test-Suite:**
```typescript
// src/__tests__/features/task-service-extended.test.ts
import { taskService } from '@/lib/firebase/task-service';
import { Task, TaskTemplate, PipelineStage } from '@/types/tasks';

describe('TaskService - Project Integration', () => {
  const mockContext = {
    organizationId: 'org_test_123',
    userId: 'user_test_456'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByProjectId', () => {
    it('should return only tasks for specific project', async () => {
      const projectId = 'project_123';
      const tasks = await taskService.getByProjectId(mockContext.organizationId, projectId);
      
      tasks.forEach(task => {
        expect(task.linkedProjectId).toBe(projectId);
        expect(task.organizationId).toBe(mockContext.organizationId);
      });
    });

    it('should enforce multi-tenancy isolation', async () => {
      const wrongOrgId = 'wrong_org_456';
      const tasks = await taskService.getByProjectId(wrongOrgId, 'any_project');
      
      // Should return empty array, not throw error
      expect(tasks).toEqual([]);
    });
  });

  describe('getProjectTaskStats', () => {
    it('should calculate correct task statistics', async () => {
      const projectId = 'project_stats_test';
      const stats = await taskService.getProjectTaskStats(mockContext.organizationId, projectId);
      
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.completed + stats.pending).toBe(stats.total);
      expect(stats.completionPercent).toBeGreaterThanOrEqual(0);
      expect(stats.completionPercent).toBeLessThanOrEqual(100);
    });

    it('should include stage-specific statistics', async () => {
      const projectId = 'project_stage_stats';
      const stats = await taskService.getProjectTaskStats(mockContext.organizationId, projectId);
      
      Object.values(stats.byStage).forEach(stageStats => {
        expect(stageStats.completed).toBeLessThanOrEqual(stageStats.total);
        expect(stageStats.requiredCompleted).toBeLessThanOrEqual(stageStats.required);
      });
    });
  });

  describe('checkStageCompletionRequirements', () => {
    it('should return correct completion status', async () => {
      const projectId = 'project_completion_test';
      const stage: PipelineStage = 'creation';
      
      const completionCheck = await taskService.checkStageCompletionRequirements(
        projectId, 
        stage, 
        mockContext.organizationId
      );
      
      expect(typeof completionCheck.canComplete).toBe('boolean');
      expect(Array.isArray(completionCheck.requiredTasks)).toBe(true);
      expect(Array.isArray(completionCheck.missingTasks)).toBe(true);
      expect(completionCheck.completionPercent).toBeGreaterThanOrEqual(0);
    });

    it('should identify missing required tasks correctly', async () => {
      // Create project with required tasks
      const projectId = 'project_required_tasks';
      const stage: PipelineStage = 'internal_approval';
      
      const completionCheck = await taskService.checkStageCompletionRequirements(
        projectId,
        stage,
        mockContext.organizationId
      );
      
      if (!completionCheck.canComplete) {
        expect(completionCheck.missingTasks.length).toBeGreaterThan(0);
        completionCheck.missingTasks.forEach(task => {
          expect(task.requiredForStageCompletion).toBe(true);
          expect(task.status).not.toBe('completed');
        });
      }
    });
  });

  describe('createFromTemplate', () => {
    it('should create task with template properties', async () => {
      const mockTemplate: TaskTemplate = {
        id: 'template_test',
        title: 'Test Template Task',
        category: 'content_creation',
        pipelineStage: 'creation',
        defaultPriority: 'high',
        requiredForStageCompletion: true,
        organizationId: mockContext.organizationId
      } as TaskTemplate;

      // Mock template service
      jest.spyOn(taskTemplateService, 'getById').mockResolvedValue(mockTemplate);

      const taskIds = await taskService.createFromTemplate(
        'project_123',
        'template_test',
        mockContext
      );

      expect(taskIds).toHaveLength(1);
      
      const createdTask = await taskService.getById(taskIds[0]);
      expect(createdTask?.title).toBe('Test Template Task');
      expect(createdTask?.linkedProjectId).toBe('project_123');
      expect(createdTask?.templateId).toBe('template_test');
    });
  });

  describe('backward compatibility', () => {
    it('should not break existing task operations', async () => {
      // Test that existing task methods still work
      const existingTaskData = {
        title: 'Existing Task',
        description: 'This should work as before',
        status: 'pending' as const,
        priority: 'medium' as const,
        userId: mockContext.userId,
        organizationId: mockContext.organizationId
      };

      const taskId = await taskService.create(existingTaskData);
      const retrievedTask = await taskService.getById(taskId);
      
      expect(retrievedTask?.title).toBe('Existing Task');
      expect(retrievedTask?.linkedProjectId).toBeUndefined(); // Should be optional
    });

    it('should maintain existing getAll functionality', async () => {
      const allTasks = await taskService.getAll(mockContext.organizationId);
      
      // Should return array and respect multi-tenancy
      expect(Array.isArray(allTasks)).toBe(true);
      allTasks.forEach(task => {
        expect(task.organizationId).toBe(mockContext.organizationId);
      });
    });
  });
});
```

---

## SCHRITT 3: TASK-TEMPLATE SERVICE IMPLEMENTIERUNG

### 3.1 Task-Template Management
**Datei:** `src/lib/firebase/task-template-service.ts` (neu)
**Agent:** `general-purpose`
**Dauer:** 1-2 Tage

**Umsetzung:**
```typescript
// src/lib/firebase/task-template-service.ts
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { TaskTemplate, PipelineStage, TaskTemplateCategory } from '@/types/tasks';
import { nanoid } from 'nanoid';

export const taskTemplateService = {
  /**
   * Template erstellen
   */
  async create(templateData: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>, organizationId: string): Promise<string> {
    const docRef = await addDoc(collection(db, 'task_templates'), {
      ...templateData,
      id: nanoid(),
      organizationId, // MULTI-TENANCY
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return docRef.id;
  },

  /**
   * Template abrufen
   */
  async getById(templateId: string, organizationId: string): Promise<TaskTemplate | null> {
    const docRef = doc(db, 'task_templates', templateId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const template = { id: docSnap.id, ...docSnap.data() } as TaskTemplate;
      
      // MULTI-TENANCY SCHUTZ
      if (template.organizationId !== organizationId) {
        return null;
      }
      
      return template;
    }
    return null;
  },

  /**
   * Templates nach Stage
   */
  async getByStage(organizationId: string, stage: PipelineStage): Promise<TaskTemplate[]> {
    const q = query(
      collection(db, 'task_templates'),
      where('organizationId', '==', organizationId), // MULTI-TENANCY
      where('pipelineStage', '==', stage),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TaskTemplate));
  },

  /**
   * Alle Templates einer Organisation
   */
  async getAll(organizationId: string): Promise<TaskTemplate[]> {
    const q = query(
      collection(db, 'task_templates'),
      where('organizationId', '==', organizationId), // MULTI-TENANCY
      orderBy('pipelineStage', 'asc'),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TaskTemplate));
  },

  /**
   * Template aktualisieren
   */
  async update(templateId: string, updates: Partial<TaskTemplate>, organizationId: string): Promise<void> {
    // Berechtigung prüfen
    const existingTemplate = await this.getById(templateId, organizationId);
    if (!existingTemplate) {
      throw new Error('Template nicht gefunden oder keine Berechtigung');
    }

    const docRef = doc(db, 'task_templates', templateId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Standard-Templates für Organisation erstellen
   */
  async createDefaultTemplates(organizationId: string): Promise<void> {
    const defaultTemplates = this.getDefaultTemplateDefinitions();
    
    for (const templateData of defaultTemplates) {
      await this.create(templateData, organizationId);
    }
  },

  /**
   * Standard-Template-Definitionen
   * Diese werden bei neuen Organisationen automatisch erstellt
   */
  private getDefaultTemplateDefinitions(): Omit<TaskTemplate, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[] {
    return [
      // Ideas/Planning Templates
      {
        title: 'Projekt-Briefing erstellen',
        description: 'Detailliertes Briefing mit Zielen, Zielgruppe und Anforderungen',
        category: 'project_setup',
        pipelineStage: 'ideas_planning',
        defaultPriority: 'high',
        estimatedDuration: 120,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 1,
        isActive: true
      },
      {
        title: 'Strategie-Dokument verfassen',
        description: 'Kommunikationsstrategie und Kernbotschaften definieren',
        category: 'content_planning',
        pipelineStage: 'ideas_planning',
        defaultPriority: 'high',
        estimatedDuration: 180,
        dependsOnCategories: ['project_setup'],
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 2,
        isActive: true
      },
      
      // Creation Templates
      {
        title: 'Content-Outline erstellen',
        description: 'Struktur und Gliederung aller Inhalte',
        category: 'content_creation',
        pipelineStage: 'creation',
        defaultPriority: 'high',
        estimatedDuration: 90,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 1,
        isActive: true
      },
      {
        title: 'Texte verfassen',
        description: 'Alle Texte für Pressemitteilung, E-Mails, Social Media',
        category: 'content_creation',
        pipelineStage: 'creation',
        defaultPriority: 'high',
        estimatedDuration: 240,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 2,
        isActive: true
      },
      {
        title: 'Bilder und Grafiken auswählen',
        description: 'Passende Medien aus der Media Library oder extern beschaffen',
        category: 'media_selection',
        pipelineStage: 'creation',
        defaultPriority: 'high',
        estimatedDuration: 120,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 3,
        isActive: true
      },
      
      // Internal Approval Templates
      {
        title: 'Interne Review durchführen',
        description: 'Erste interne Prüfung aller Inhalte und Materialien',
        category: 'internal_review',
        pipelineStage: 'internal_approval',
        defaultPriority: 'high',
        estimatedDuration: 60,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 1,
        isActive: true
      },
      {
        title: 'PDF-Version für Review erstellen',
        description: 'Zusammenfassung aller Materialien als PDF für einfache Freigabe',
        category: 'internal_review',
        pipelineStage: 'internal_approval',
        defaultPriority: 'high',
        estimatedDuration: 30,
        autoCompleteOnStageChange: true, // Wird automatisch erledigt
        order: 2,
        isActive: true
      },
      
      // Customer Approval Templates
      {
        title: 'Freigabe-Materialien vorbereiten',
        description: 'Alle Materialien für Kundenfreigabe zusammenstellen',
        category: 'customer_approval',
        pipelineStage: 'customer_approval',
        defaultPriority: 'high',
        estimatedDuration: 45,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 1,
        isActive: true
      },
      
      // Distribution Templates
      {
        title: 'E-Mail-Kampagnen konfigurieren',
        description: 'Alle E-Mail-Kampagnen mit korrekten Einstellungen vorbereiten',
        category: 'campaign_launch',
        pipelineStage: 'distribution',
        defaultPriority: 'high',
        estimatedDuration: 60,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 1,
        isActive: true
      },
      {
        title: 'Pressemitteilung versenden',
        description: 'Offizielle Pressemitteilung an alle relevanten Kontakte',
        category: 'campaign_launch',
        pipelineStage: 'distribution',
        defaultPriority: 'high',
        estimatedDuration: 30,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 2,
        isActive: true
      },
      
      // Monitoring Templates
      {
        title: 'Medienresonanz verfolgen',
        description: 'Alle Erwähnungen und Berichterstattung dokumentieren',
        category: 'performance_monitoring',
        pipelineStage: 'monitoring',
        defaultPriority: 'high',
        estimatedDuration: 60,
        requiredForStageCompletion: true,
        autoCompleteOnStageChange: false,
        order: 1,
        isActive: true
      }
    ];
  }
};
```

**Test für Task-Template Service:**
```typescript
// src/__tests__/features/task-template-service.test.ts
import { taskTemplateService } from '@/lib/firebase/task-template-service';
import { TaskTemplate, PipelineStage } from '@/types/tasks';

describe('TaskTemplateService', () => {
  const testOrgId = 'org_template_test_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create template with correct organizationId', async () => {
      const templateData = {
        title: 'Test Template',
        category: 'content_creation' as const,
        pipelineStage: 'creation' as PipelineStage,
        defaultPriority: 'medium' as const,
        order: 1,
        isActive: true
      };

      const templateId = await taskTemplateService.create(templateData, testOrgId);
      const created = await taskTemplateService.getById(templateId, testOrgId);

      expect(created?.organizationId).toBe(testOrgId);
      expect(created?.title).toBe('Test Template');
    });
  });

  describe('getByStage', () => {
    it('should return templates for specific stage only', async () => {
      const stage: PipelineStage = 'creation';
      const templates = await taskTemplateService.getByStage(testOrgId, stage);

      templates.forEach(template => {
        expect(template.pipelineStage).toBe(stage);
        expect(template.organizationId).toBe(testOrgId);
      });
    });

    it('should enforce multi-tenancy', async () => {
      const wrongOrgId = 'wrong_org_456';
      const templates = await taskTemplateService.getByStage(wrongOrgId, 'creation');
      
      expect(templates).toEqual([]);
    });
  });

  describe('createDefaultTemplates', () => {
    it('should create default templates for all stages', async () => {
      await taskTemplateService.createDefaultTemplates(testOrgId);
      
      const allTemplates = await taskTemplateService.getAll(testOrgId);
      
      // Should have templates for all pipeline stages
      const stagesWithTemplates = new Set(allTemplates.map(t => t.pipelineStage));
      const expectedStages: PipelineStage[] = [
        'ideas_planning', 'creation', 'internal_approval', 
        'customer_approval', 'distribution', 'monitoring'
      ];
      
      expectedStages.forEach(stage => {
        expect(stagesWithTemplates.has(stage)).toBe(true);
      });
    });

    it('should create templates with correct required flags', async () => {
      await taskTemplateService.createDefaultTemplates(testOrgId);
      
      const creationTemplates = await taskTemplateService.getByStage(testOrgId, 'creation');
      const requiredTemplates = creationTemplates.filter(t => t.requiredForStageCompletion);
      
      expect(requiredTemplates.length).toBeGreaterThan(0);
    });
  });
});
```

---

## SCHRITT 4: BESTEHENDE KOMPONENTEN ERWEITERN

### 4.1 OverdueTasksWidget für Projekte erweitern
**Datei:** `src/components/calendar/OverdueTasksWidget.tsx` (erweitern)
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung:**
```typescript
// src/components/calendar/OverdueTasksWidget.tsx - ERWEITERT
// Original-Komponente bleibt funktional, neue Props hinzufügen

interface OverdueTasksWidgetProps {
  organizationId: string;
  userId?: string;
  onTaskClick?: (task: Task) => void;
  onRefresh?: () => void;
  
  // NEU: Projekt-Filter
  projectId?: string; // Optional: Nur Tasks für bestimmtes Projekt
  showProjectInfo?: boolean; // Projekt-Info anzeigen
}

export function OverdueTasksWidget({ 
  organizationId, 
  userId, 
  onTaskClick, 
  onRefresh,
  projectId, // NEU
  showProjectInfo = false // NEU
}: OverdueTasksWidgetProps) {
  // ... bestehender Code bleibt unverändert ...

  const loadOverdueTasks = async () => {
    setLoading(true);
    try {
      let tasks: Task[];
      
      if (projectId) {
        // NEU: Projekt-spezifische Tasks laden
        tasks = await taskService.getByProjectId(organizationId, projectId, userId);
      } else {
        // Bestehende Logic: Alle Tasks laden
        tasks = await taskService.getAll(organizationId, userId);
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const overdue = tasks.filter(task => {
        if (task.status === 'completed') return false;
        if (!task.dueDate) return false;
        
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
      }).sort((a, b) => {
        return a.dueDate!.toMillis() - b.dueDate!.toMillis();
      });
      
      setOverdueTasks(overdue);
    } catch (error) {
      // Task loading failed silently
    } finally {
      setLoading(false);
    }
  };

  // Render-Logic erweitern für Projekt-Info
  const renderTaskItem = (task: Task) => (
    <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
      {/* Bestehender Task-Inhalt */}
      <div className="flex items-start justify-between gap-4">
        {/* ... bestehende Task-Darstellung ... */}
        
        {/* NEU: Projekt-Information */}
        {showProjectInfo && task.linkedProjectId && (
          <Text className="text-xs text-blue-600 mt-1">
            🗂️ Projekt-Task
          </Text>
        )}
        
        {/* NEU: Pipeline-Stage Badge */}
        {task.pipelineStage && (
          <Badge color="gray" className="text-xs">
            {getStageName(task.pipelineStage)}
          </Badge>
        )}
      </div>
    </div>
  );

  // ... Rest der Komponente bleibt unverändert ...
}

// Helper-Funktion für Stage-Namen
function getStageName(stage: PipelineStage): string {
  const stageNames = {
    'ideas_planning': 'Planung',
    'creation': 'Erstellung',
    'internal_approval': 'Interne Freigabe',
    'customer_approval': 'Kunden-Freigabe',
    'distribution': 'Versand',
    'monitoring': 'Monitoring',
    'completed': 'Abgeschlossen'
  };
  
  return stageNames[stage] || stage;
}
```

**Test für erweiterte Komponente:**
```typescript
// src/components/calendar/__tests__/OverdueTasksWidget-extended.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { OverdueTasksWidget } from '../OverdueTasksWidget';

describe('OverdueTasksWidget - Project Integration', () => {
  const defaultProps = {
    organizationId: 'org_test_123'
  };

  it('should maintain backward compatibility', () => {
    render(<OverdueTasksWidget {...defaultProps} />);
    
    // Widget sollte normal funktionieren ohne neue Props
    expect(screen.getByText(/überfällige/i)).toBeInTheDocument();
  });

  it('should filter by project when projectId provided', () => {
    render(<OverdueTasksWidget {...defaultProps} projectId="project_123" />);
    
    // Mock taskService.getByProjectId sollte aufgerufen werden
    // anstelle von taskService.getAll
  });

  it('should show project info when showProjectInfo enabled', () => {
    const mockTaskWithProject = {
      id: '1',
      title: 'Project Task',
      linkedProjectId: 'project_123',
      pipelineStage: 'creation',
      status: 'pending',
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day overdue
    };

    // Mock-Response für überfällige Tasks
    jest.spyOn(taskService, 'getByProjectId').mockResolvedValue([mockTaskWithProject]);

    render(
      <OverdueTasksWidget 
        {...defaultProps} 
        projectId="project_123" 
        showProjectInfo={true} 
      />
    );

    // Sollte Projekt-Info und Stage-Badge anzeigen
    expect(screen.getByText('🗂️ Projekt-Task')).toBeInTheDocument();
    expect(screen.getByText('Erstellung')).toBeInTheDocument();
  });
});
```

---

## SCHRITT 5: FIRESTORE-ERWEITERUNGEN

### 5.1 Neue Indices für Task-Projekt-Abfragen
**Agent:** `general-purpose`
**Dauer:** 0.5 Tage

**Firebase Config erweitern:**
```json
{
  "firestore": {
    "indexes": [
      // Bestehende Indices bleiben unverändert...
      
      // NEU: Projekt-Task Indices
      {
        "collectionGroup": "tasks",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "organizationId", "order": "ASCENDING" },
          { "fieldPath": "linkedProjectId", "order": "ASCENDING" },
          { "fieldPath": "status", "order": "ASCENDING" }
        ]
      },
      {
        "collectionGroup": "tasks", 
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "organizationId", "order": "ASCENDING" },
          { "fieldPath": "linkedProjectId", "order": "ASCENDING" },
          { "fieldPath": "pipelineStage", "order": "ASCENDING" },
          { "fieldPath": "order", "order": "ASCENDING" }
        ]
      },
      {
        "collectionGroup": "tasks",
        "queryScope": "COLLECTION", 
        "fields": [
          { "fieldPath": "organizationId", "order": "ASCENDING" },
          { "fieldPath": "templateCategory", "order": "ASCENDING" },
          { "fieldPath": "requiredForStageCompletion", "order": "ASCENDING" }
        ]
      },

      // NEU: Task-Template Indices
      {
        "collectionGroup": "task_templates",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "organizationId", "order": "ASCENDING" },
          { "fieldPath": "pipelineStage", "order": "ASCENDING" },
          { "fieldPath": "order", "order": "ASCENDING" }
        ]
      },
      {
        "collectionGroup": "task_templates",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "organizationId", "order": "ASCENDING" },
          { "fieldPath": "category", "order": "ASCENDING" },
          { "fieldPath": "pipelineStage", "order": "ASCENDING" }
        ]
      }
    ]
  }
}
```

**Firestore Security Rules erweitern:**
```javascript
// firestore.rules - Task-Template Collection
match /task_templates/{templateId} {
  allow read, write: if request.auth != null 
    && request.auth.token.organizationId == resource.data.organizationId;
  
  allow create: if request.auth != null 
    && request.auth.token.organizationId == request.resource.data.organizationId;
}

// Bestehende tasks collection rules erweitern
match /tasks/{taskId} {
  // Bestehende Rules bleiben...
  
  // Zusätzlich: Projekt-Tasks dürfen nur von Projekt-Mitgliedern bearbeitet werden
  allow update: if request.auth != null 
    && request.auth.token.organizationId == resource.data.organizationId
    && (resource.data.linkedProjectId == null || isProjectMember(resource.data.linkedProjectId));
}

function isProjectMember(projectId) {
  return exists(/databases/$(database)/documents/projects/$(projectId)) 
    && request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.assignedTeamMembers;
}
```

---

## SCHRITT 6: INTEGRATION MIT BESTEHENDEN SERVICES

### 6.1 Project-Service Task-Hooks
**Datei:** `src/lib/firebase/project-service.ts` (erweitern)
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Task-Integration in project-service hinzufügen:**
```typescript
// src/lib/firebase/project-service.ts - ERWEITERTE METHODEN

export const projectService = {
  // ... bestehende Methoden ...

  /**
   * Stage-Wechsel mit automatischer Task-Behandlung
   */
  async moveToStage(projectId: string, newStage: PipelineStage, context: ServiceContext): Promise<void> {
    const project = await this.getById(projectId, context.organizationId);
    if (!project) {
      throw new Error('Projekt nicht gefunden');
    }

    // NEUE INTEGRATION: Stage-Completion Check
    const completionCheck = await taskService.checkStageCompletionRequirements(
      projectId, 
      project.stage, 
      context.organizationId
    );
    
    if (!completionCheck.canComplete) {
      throw new Error(
        `Stage kann nicht abgeschlossen werden. Fehlende Aufgaben: ${
          completionCheck.missingTasks.map(t => t.title).join(', ')
        }`
      );
    }

    // Original Stage-Wechsel
    const updatedHistory = [...project.stageHistory];
    const currentStageEntry = updatedHistory.find(entry => 
      entry.stage === project.stage && !entry.exitedAt
    );
    
    if (currentStageEntry) {
      currentStageEntry.exitedAt = Timestamp.now();
    }

    updatedHistory.push({
      stage: newStage,
      enteredAt: Timestamp.now(),
      userId: context.userId,
      notes: `Übergang von ${project.stage} zu ${newStage}`
    });

    await this.update(projectId, {
      stage: newStage,
      stageUpdatedAt: Timestamp.now(),
      stageHistory: updatedHistory
    }, context);

    // NEUE INTEGRATION: Task-Updates für neuen Stage
    await taskService.updateTasksOnStageChange(projectId, newStage, context);
    
    // Fortschritt neu berechnen
    await this.updateProgressWithTasks(projectId, context);
  },

  /**
   * Fortschritt-Berechnung mit Task-Integration
   */
  async updateProgressWithTasks(projectId: string, context: ServiceContext): Promise<void> {
    const [project, taskStats] = await Promise.all([
      this.getById(projectId, context.organizationId),
      taskService.getProjectTaskStats(context.organizationId, projectId)
    ]);

    if (!project) return;

    // Gewichtete Berechnung mit Task-Fortschritt
    const stageProgress: Record<PipelineStage, number> = {} as any;
    const stages: PipelineStage[] = [
      'ideas_planning', 'creation', 'internal_approval', 
      'customer_approval', 'distribution', 'monitoring', 'completed'
    ];

    stages.forEach(stage => {
      const stageTaskStats = taskStats.byStage[stage];
      if (stageTaskStats && stageTaskStats.total > 0) {
        stageProgress[stage] = Math.round((stageTaskStats.completed / stageTaskStats.total) * 100);
      } else {
        stageProgress[stage] = project.stage === stage ? 50 : 0; // Aktuelle Stage hat Default-Progress
      }
    });

    // Gesamt-Fortschritt aus verschiedenen Quellen
    const overallPercent = Math.round(
      (taskStats.completionPercent * 0.6) + // Tasks haben 60% Gewicht
      ((project.progress?.campaignStatus || 0) * 0.25) + // Kampagne 25%
      ((project.progress?.approvalStatus || 0) * 0.15)   // Freigaben 15%
    );

    await this.update(projectId, {
      progress: {
        overallPercent,
        stageProgress,
        taskCompletion: taskStats.completionPercent,
        campaignStatus: project.progress?.campaignStatus || 0,
        approvalStatus: project.progress?.approvalStatus || 0,
        distributionStatus: project.progress?.distributionStatus || 0,
        lastUpdated: Timestamp.now()
      }
    }, context);
  }
};
```

---

## SCHRITT 7: DOKUMENTATION AKTUALISIEREN

### 7.1 Implementation Status dokumentieren
**Agent:** `documentation-orchestrator`
**Dauer:** 0.5 Tage

**Aufgaben:**
1. `docs/features/Projekt-Pipeline/Projekt-Task-System-Integration.md` aktualisieren
   - Implementation Status: "✅ COMPLETED"
   - Service-Referenzen und Code-Beispiele hinzufügen
   - Test-Coverage Details dokumentieren

2. Masterplan aktualisieren
   - Task-Integration Phase als "COMPLETED" markieren  
   - Nächste UI-Phase vorbereiten

3. API-Dokumentation erstellen
   - Neue Task-Service Methoden dokumentieren
   - Template-Service API-Reference
   - Integration-Beispiele

---

## ERFOLGSKRITERIEN

### Funktionale Anforderungen:
- ✅ Task-Interface rückwärts-kompatibel erweitert
- ✅ Projekt-Task Verknüpfung vollständig implementiert
- ✅ Template-System für alle Pipeline-Stages
- ✅ Stage-Completion Checks funktional
- ✅ Automatische Task-Workflows aktiv

### Qualitätsanforderungen:
- ✅ 100% Test-Coverage für neue Funktionen
- ✅ Bestehende Task-Tests bestehen weiterhin
- ✅ Multi-Tenancy in allen neuen Queries
- ✅ Performance-optimierte Firestore-Indices

### Integration-Requirements:
- ✅ Bestehende OverdueTasksWidget funktioniert unverändert
- ✅ Alle bestehenden Task-Service Methoden unverändert
- ✅ Projekt-Service Integration nahtlos
- ✅ Template-System bereit für UI-Integration

### Backward-Compatibility:
- ✅ Bestehende Tasks funktionieren ohne Projekt-Verknüpfung
- ✅ API-Kompatibilität für alle Consumer
- ✅ UI-Komponenten zeigen neue Features optional an
- ✅ Datenbank-Migrationen sind non-breaking

---

## RISIKEN & MITIGATION

### Risiko 1: Bestehende Tasks beschädigen
**Mitigation:** Alle neuen Felder sind optional, extensive Backward-Compatibility Tests

### Risiko 2: Performance-Impact durch erweiterte Queries  
**Mitigation:** Spezielle Firestore-Indices, Query-Optimierung, Cache-Strategien

### Risiko 3: Template-System zu komplex
**Mitigation:** Standard-Templates automatisch erstellen, einfache UI für Custom-Templates

---

## NÄCHSTE SCHRITTE

Nach erfolgreichem Abschluss:
1. **UI-Komponenten implementieren** (nächste Phase)
2. **Task-Templates in Produktion testen**
3. **User-Training für neue Task-Features**
4. **Performance-Monitoring für erweiterte Queries**

**Die Task-Integration bildet das Herzstück des Pipeline-Systems und muss vollständig funktional sein, bevor die UI-Komponenten implementiert werden.**