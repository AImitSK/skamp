// src/lib/firebase/task-service.ts - UPDATED WITH NOTIFICATION INTEGRATION
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
  Timestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { Task, PipelineAwareTask, TaskPriority, ProjectTask, TaskFilters } from '@/types/tasks';

// Export PipelineAwareTask für Tests
export type { PipelineAwareTask };
import type { PipelineStage } from '@/types/project';
import { notificationsService } from './notifications-service';

export const taskService = {
  /**
   * Erstellt eine neue Aufgabe
   */
  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // ========== NOTIFICATION INTEGRATION: Task mit Fälligkeitsdatum ==========
    // Wenn die Task ein Fälligkeitsdatum in der Zukunft hat, könnten wir hier
    // eine Erinnerung planen (optional für später)
    
    return docRef.id;
  },

  /**
   * Holt eine Aufgabe anhand der ID
   */
  async getById(taskId: string): Promise<Task | null> {
    const docRef = doc(db, 'tasks', taskId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Task;
    }
    return null;
  },

  /**
   * Holt alle Aufgaben eines Benutzers
   */
  async getAll(organizationId: string, userId?: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, 'tasks'),
        where('organizationId', '==', organizationId),
        orderBy('dueDate', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
    } catch (error: any) {
      // Fallback ohne orderBy falls Index fehlt
      if (error.code === 'failed-precondition') {
        // Firestore Index missing for tasks, using fallback without orderBy
        const q = query(
          collection(db, 'tasks'),
          where('organizationId', '==', organizationId)
        );
        const snapshot = await getDocs(q);
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Task));
        
        // Client-seitige Sortierung
        return tasks.sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0;
          return a.dueDate.toMillis() - b.dueDate.toMillis();
        });
      }
      throw error;
    }
  },

  /**
   * Holt alle Aufgaben für einen bestimmten Zeitraum
   */
  async getByDateRange(organizationId: string, startDate: Date, endDate: Date, userId?: string): Promise<Task[]> {
    
    const tasks = await this.getAll(organizationId, userId);
    
    const filteredTasks = tasks.filter(task => {
      if (!task.dueDate) {
        return false;
      }
      const taskDate = task.dueDate.toDate();
      const inRange = taskDate >= startDate && taskDate <= endDate;
      return inRange;
    });
    
    return filteredTasks;
  },

  /**
   * Holt alle Aufgaben für einen bestimmten Kunden
   */
  async getByClientId(organizationId: string, clientId: string, userId?: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
      where('linkedClientId', '==', clientId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  },

  /**
   * Holt alle Aufgaben für eine bestimmte Kampagne
   */
  async getByCampaignId(organizationId: string, campaignId: string, userId?: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
      where('linkedCampaignId', '==', campaignId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  },

  /**
   * Aktualisiert eine Aufgabe
   */
  async update(taskId: string, data: Partial<Omit<Task, 'id' | 'userId'>>): Promise<void> {
    const docRef = doc(db, 'tasks', taskId);
    
    // ========== NOTIFICATION INTEGRATION: Check for overdue status ==========
    // Hole die aktuelle Task um zu prüfen ob sie überfällig wird
    const currentTask = await this.getById(taskId);
    if (currentTask && data.dueDate && data.status !== 'completed') {
      const newDueDate = data.dueDate instanceof Timestamp ? data.dueDate.toDate() : data.dueDate;
      const now = new Date();
      
      // Wenn das neue Fälligkeitsdatum in der Vergangenheit liegt und die Task nicht erledigt ist
      if (newDueDate < now && currentTask.status !== 'completed') {
        try {
          await notificationsService.create({
            userId: currentTask.userId,
            type: 'TASK_OVERDUE',
            title: 'Task ist überfällig',
            message: `Die Task "${currentTask.title}" ist jetzt überfällig.`,
            linkUrl: `/dashboard/tasks/${taskId}`,
            linkType: 'task',
            linkId: taskId,
            isRead: false,
            metadata: {
              taskName: currentTask.title
            }
          });
          // Notification sent: Task is overdue
        } catch (notificationError) {
          // Error sending overdue notification
        }
      }
    }
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Markiert eine Aufgabe als erledigt
   */
  async markAsCompleted(taskId: string): Promise<void> {
    // ========== NOTIFICATION INTEGRATION: Optional - Task completed ==========
    // Hier könntest du eine Benachrichtigung für erledigte Tasks hinzufügen
    // wenn das gewünscht ist
    
    await this.update(taskId, {
      status: 'completed',
      completedAt: Timestamp.now()
    });
  },

  /**
   * Löscht eine Aufgabe
   */
  async delete(taskId: string): Promise<void> {
    await deleteDoc(doc(db, 'tasks', taskId));
  },

  /**
   * Holt Statistiken zu Aufgaben
   */
  async getStats(organizationId: string, userId?: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  }> {
    const tasks = await this.getAll(organizationId, userId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return tasks.reduce((acc, task) => {
      acc.total++;
      
      if (task.status === 'completed') {
        acc.completed++;
      } else {
        acc.pending++;
        
        if (task.dueDate) {
          const dueDate = task.dueDate.toDate();
          
          if (dueDate < today) {
            acc.overdue++;
          } else if (dueDate.toDateString() === today.toDateString()) {
            acc.dueToday++;
          } else if (dueDate <= weekEnd) {
            acc.dueThisWeek++;
          }
        }
      }
      
      return acc;
    }, {
      total: 0,
      pending: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0
    });
  },

  /**
   * Prüft überfällige Tasks und sendet Benachrichtigungen
   * Diese Methode wird vom Cron-Job aufgerufen
   */
  async checkAndNotifyOverdueTasks(organizationId: string, userId?: string): Promise<void> {
    try {
      if (!userId) {
        // No userId provided for overdue task check
        return;
      }
      
      // Checking for overdue tasks for user
      
      // Hole die Benachrichtigungseinstellungen
      const settings = await notificationsService.getSettings(userId);
      if (!settings.taskOverdue) {
        // Task overdue notifications disabled for user
        return;
      }
      
      // Hole alle nicht-erledigten Tasks
      const tasks = await this.getAll(organizationId, userId);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Filtere überfällige Tasks
      const overdueTasks = tasks.filter(task => {
        if (task.status === 'completed' || !task.dueDate) {
          return false;
        }
        
        const dueDate = task.dueDate.toDate();
        // Task ist überfällig wenn Fälligkeitsdatum vor heute liegt
        return dueDate < todayStart;
      });
      
      // Found overdue tasks
      
      // Erstelle Benachrichtigungen für überfällige Tasks
      for (const task of overdueTasks) {
        // Prüfe ob wir heute schon eine Benachrichtigung für diese Task gesendet haben
        const existingNotifications = await getDocs(
          query(
            collection(db, 'notifications'),
            where('organizationId', '==', organizationId),
            where('type', '==', 'TASK_OVERDUE'),
            where('linkId', '==', task.id),
            where('createdAt', '>=', Timestamp.fromDate(todayStart))
          )
        );
        
        if (existingNotifications.empty) {
          // Keine Benachrichtigung heute, also senden
          await notificationsService.create({
            userId: userId,
            organizationId: organizationId,
            type: 'TASK_OVERDUE',
            title: 'Überfälliger Task',
            message: `Dein Task "${task.title}" ist überfällig.`,
            linkUrl: `/dashboard/tasks/${task.id}`,
            linkType: 'task',
            linkId: task.id!,
            isRead: false,
            metadata: {
              taskName: task.title
            }
          });
          
          // Notification sent for overdue task
        } else {
          // Notification for task already sent today
        }
      }
      
    } catch (error) {
      // Error checking overdue tasks
      throw error;
    }
  },

  // ========================================
  // PLAN 8/9: PIPELINE-TASK-INTEGRATION
  // ========================================

  /**
   * Holt alle Tasks für ein Projekt und eine Stage
   */
  async getByProjectStage(
    organizationId: string, 
    projectId: string, 
    stage: PipelineStage
  ): Promise<PipelineAwareTask[]> {
    const q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
      where('linkedProjectId', '==', projectId),
      where('pipelineStage', '==', stage)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PipelineAwareTask));
  },

  /**
   * Holt alle Tasks für ein Projekt - BUGFIX: Konsistente Property-Namen
   */
  async getByProjectId(
    organizationId: string,
    projectId: string
  ): Promise<PipelineAwareTask[]> {
    // Versuche mit beiden Property-Namen für Backward-Compatibility
    const qLinked = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
      where('linkedProjectId', '==', projectId)
    );
    const qDirect = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
      where('projectId', '==', projectId)
    );

    const [linkedSnapshot, directSnapshot] = await Promise.all([
      getDocs(qLinked),
      getDocs(qDirect)
    ]);

    const linkedTasks = linkedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PipelineAwareTask));

    const directTasks = directSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PipelineAwareTask));

    // Kombiniere und dedupliziere basierend auf Task-ID
    const allTasks = [...linkedTasks, ...directTasks];
    const uniqueTasks = allTasks.filter((task, index, self) =>
      self.findIndex(t => t.id === task.id) === index
    );

    return uniqueTasks;
  },

  /**
   * Holt kritische Tasks für eine Stage
   */
  async getCriticalTasksForStage(
    organizationId: string, 
    projectId: string, 
    stage: PipelineStage
  ): Promise<PipelineAwareTask[]> {
    const q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
      where('linkedProjectId', '==', projectId),
      where('pipelineStage', '==', stage),
      where('requiredForStageCompletion', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PipelineAwareTask));
  },

  /**
   * Prüft Stage-Completion-Anforderungen
   */
  async checkStageCompletionRequirements(
    projectId: string,
    stage: PipelineStage
  ): Promise<StageCompletionCheck> {
    const task = await this.getByProjectId('', projectId); // organizationId wird in der Praxis übergeben
    const stageTasks = task.filter(t => t.pipelineStage === stage);
    const criticalTasks = stageTasks.filter(t => t.requiredForStageCompletion);
    const completedCriticalTasks = criticalTasks.filter(t => t.status === 'completed');
    const blockingTasks = stageTasks.filter(t => t.blocksStageTransition && t.status !== 'completed');
    
    const completionPercentage = criticalTasks.length > 0 
      ? (completedCriticalTasks.length / criticalTasks.length) * 100 
      : 100;
    
    return {
      canComplete: criticalTasks.length === completedCriticalTasks.length && blockingTasks.length === 0,
      missingCriticalTasks: criticalTasks.filter(t => t.status !== 'completed').map(t => t.id!),
      blockingTasks: blockingTasks.map(t => t.id!),
      completionPercentage,
      readyForTransition: completionPercentage === 100 && blockingTasks.length === 0
    };
  },

  /**
   * Erstellt Tasks aus Templates
   */
  async createTasksFromTemplates(
    projectId: string,
    stage: PipelineStage,
    templates: TaskTemplate[]
  ): Promise<string[]> {
    const createdTaskIds: string[] = [];
    
    for (const template of templates) {
      const taskData = {
        userId: '', // wird in der Praxis übergeben
        organizationId: '', // wird in der Praxis übergeben
        title: template.title,
        priority: template.priority,
        linkedProjectId: projectId,
        pipelineStage: stage,
        requiredForStageCompletion: template.requiredForStageCompletion,
        templateCategory: template.category,
        status: 'pending' as const,
        stageContext: {
          createdOnStageEntry: true,
          inheritedFromTemplate: template.id,
          stageProgressWeight: 3,
          criticalPath: template.requiredForStageCompletion
        },
        deadlineRules: template.daysAfterStageEntry ? {
          relativeToPipelineStage: true,
          daysAfterStageEntry: template.daysAfterStageEntry,
          cascadeDelay: false
        } : undefined
      };
      
      const taskId = await this.create(taskData);
      createdTaskIds.push(taskId);
    }
    
    return createdTaskIds;
  },

  /**
   * Behandelt Task-Completion mit Pipeline-Logik
   */
  async handleTaskCompletion(taskId: string): Promise<TaskCompletionResult> {
    const task = await this.getById(taskId) as PipelineAwareTask;
    if (!task) {
      throw new Error('Task nicht gefunden');
    }

    // Markiere als abgeschlossen
    await this.markAsCompleted(taskId);
    
    // Finde abhängige Tasks
    const projectTasks = await this.getByProjectId(task.organizationId, task.linkedProjectId!);
    const dependentTasks = projectTasks.filter(t =>
      t.dependsOnTaskIds?.includes(taskId) && t.status === 'blocked'
    );
    
    const unblockedTaskIds: string[] = [];
    
    // Entsperre abhängige Tasks
    for (const dependentTask of dependentTasks) {
      const allDependenciesMet = dependentTask.dependsOnTaskIds?.every(depTaskId => {
        const depTask = projectTasks.find(t => t.id === depTaskId);
        return depTask?.status === 'completed';
      }) ?? true;
      
      if (allDependenciesMet) {
        await this.update(dependentTask.id!, { status: 'pending' });
        unblockedTaskIds.push(dependentTask.id!);
      }
    }
    
    return {
      taskId,
      unblockedDependentTasks: unblockedTaskIds,
      createdFollowUpTasks: [] // TODO: Follow-up Task Logic
    };
  },

  /**
   * Aktualisiert Task-Abhängigkeiten
   */
  async updateTaskDependencies(taskId: string): Promise<void> {
    // Implementation der Dependency-Update-Logik
    await this.handleTaskCompletion(taskId);
  },

  /**
   * Validiert Task-Integrität für ein Projekt
   */
  async validateTaskIntegrity(projectId: string): Promise<TaskIntegrityReport> {
    // TODO: Implementierung der Integritäts-Validierung
    return {
      projectId,
      totalTasks: 0,
      validTasks: 0,
      issues: [],
      lastChecked: Timestamp.now()
    };
  }
};

// ========================================
// PIPELINE-TASK-INTEGRATION INTERFACES
// ========================================

export interface StageCompletionCheck {
  canComplete: boolean;
  missingCriticalTasks: string[];
  blockingTasks: string[];
  completionPercentage: number;
  readyForTransition: boolean;
}

export interface TaskCompletionResult {
  taskId: string;
  unblockedDependentTasks: string[];
  triggeredStageTransition?: {
    fromStage: PipelineStage;
    toStage: PipelineStage;
  };
  createdFollowUpTasks: string[];
}

export interface TaskTemplate {
  id: string;
  title: string;
  category: string;
  stage: PipelineStage;
  priority: TaskPriority;
  requiredForStageCompletion: boolean;
  daysAfterStageEntry: number;
  assignmentRules?: {
    assignTo: 'project_lead' | 'team_member' | 'role_based';
    role?: string;
  };
}

export interface TaskIntegrityReport {
  projectId: string;
  totalTasks: number;
  validTasks: number;
  issues: string[];
  lastChecked: Timestamp;
}

// ========================================
// PROJECT TASK MANAGEMENT METHODS
// ========================================

// Erweitere den bestehenden taskService
Object.assign(taskService, {
  /**
   * Holt alle Tasks für ein spezifisches Projekt
   */
  async getByProject(projectId: string, organizationId: string): Promise<ProjectTask[]> {
    try {
      // Laden ohne orderBy um Flexibilität bei der Sortierung zu haben
      const q = query(
        collection(db, 'tasks'),
        where('organizationId', '==', organizationId),
        where('projectId', '==', projectId)
      );

      const snapshot = await getDocs(q);
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectTask));

      // Client-seitige Sortierung:
      // 1. Tasks mit dueDate nach Fälligkeit
      // 2. Tasks ohne dueDate nach Erstellungsdatum
      const sortedTasks = tasks.sort((a, b) => {
        // Beide haben dueDate -> nach dueDate sortieren
        if (a.dueDate && b.dueDate) {
          return a.dueDate.toMillis() - b.dueDate.toMillis();
        }

        // Nur a hat dueDate -> a kommt zuerst
        if (a.dueDate && !b.dueDate) return -1;

        // Nur b hat dueDate -> b kommt zuerst
        if (!a.dueDate && b.dueDate) return 1;

        // Beide haben kein dueDate -> nach createdAt sortieren
        if (a.createdAt && b.createdAt) {
          return a.createdAt.toMillis() - b.createdAt.toMillis();
        }

        return 0;
      });

      // Computed fields hinzufügen
      return this.addComputedFields(sortedTasks);
    } catch (error: any) {
      // Fallback ohne orderBy falls Index fehlt
      if (error.code === 'failed-precondition') {
        const q = query(
          collection(db, 'tasks'),
          where('organizationId', '==', organizationId),
          where('projectId', '==', projectId)
        );
        const snapshot = await getDocs(q);
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ProjectTask));

        // Client-seitige Sortierung:
        // 1. Tasks mit dueDate nach Fälligkeit
        // 2. Tasks ohne dueDate nach Erstellungsdatum
        const sortedTasks = tasks.sort((a, b) => {
          // Beide haben dueDate -> nach dueDate sortieren
          if (a.dueDate && b.dueDate) {
            return a.dueDate.toMillis() - b.dueDate.toMillis();
          }

          // Nur a hat dueDate -> a kommt zuerst
          if (a.dueDate && !b.dueDate) return -1;

          // Nur b hat dueDate -> b kommt zuerst
          if (!a.dueDate && b.dueDate) return 1;

          // Beide haben kein dueDate -> nach createdAt sortieren
          if (a.createdAt && b.createdAt) {
            return a.createdAt.toMillis() - b.createdAt.toMillis();
          }

          return 0;
        });

        return this.addComputedFields(sortedTasks);
      }
      throw error;
    }
  },

  /**
   * Holt alle heute fälligen Tasks (optional für spezifische Projekte)
   */
  async getTodayTasks(userId: string, organizationId: string, projectIds?: string[]): Promise<ProjectTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
      where('assignedUserId', '==', userId)
    );

    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProjectTask));

    // Client-seitige Filterung
    tasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = task.dueDate.toDate();
      dueDate.setHours(0, 0, 0, 0);

      const isDueToday = dueDate.getTime() === today.getTime();
      const matchesProject = !projectIds || projectIds.includes(task.projectId || '');

      return isDueToday && matchesProject;
    });

    return this.addComputedFields(tasks);
  },

  /**
   * Holt überfällige Tasks für ein Projekt
   */
  async getOverdueTasks(projectId: string, organizationId: string): Promise<ProjectTask[]> {
    const tasks = await this.getByProject(projectId, organizationId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return tasks.filter(task => {
      if (!task.dueDate || task.status === 'completed') return false;
      const dueDate = task.dueDate.toDate();
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < now;
    });
  },

  /**
   * Update Task Progress
   */
  async updateProgress(taskId: string, progress: number): Promise<void> {
    const docRef = doc(db, 'tasks', taskId);
    await updateDoc(docRef, {
      progress: Math.max(0, Math.min(100, progress)), // 0-100 Clamp
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Holt Tasks mit Filtern
   */
  async getTasksWithFilters(organizationId: string, filters: TaskFilters): Promise<ProjectTask[]> {
    let q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId)
    );

    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProjectTask));

    // Client-seitige Filterung
    tasks = tasks.filter(task => {
      // Assigned Filter
      if (filters.assignedToMe && filters.assignedUserId && task.assignedUserId !== filters.assignedUserId) return false;
      if (filters.teamTasks === false && filters.assignedToMe && filters.assignedUserId) return task.assignedUserId === filters.assignedUserId;

      // Projekt Filter
      if (filters.projectIds && filters.projectIds.length > 0) {
        if (!task.projectId || !filters.projectIds.includes(task.projectId)) return false;
      }

      // Status Filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(task.status)) return false;
      }

      // Priorität Filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(task.priority)) return false;
      }

      // Heute Filter
      if (filters.today) {
        if (!task.dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate.getTime() !== today.getTime()) return false;
      }

      // Überfällig Filter
      if (filters.overdue) {
        if (!task.dueDate || task.status === 'completed') return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate >= now) return false;
      }

      return true;
    });

    // Sortierung nach Fälligkeit
    tasks.sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return a.dueDate.toMillis() - b.dueDate.toMillis();
    });

    return this.addComputedFields(tasks);
  },

  /**
   * Fügt computed fields zu Tasks hinzu
   */
  addComputedFields(tasks: ProjectTask[]): ProjectTask[] {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return tasks.map(task => {
      const computedTask = { ...task };

      if (task.dueDate) {
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        computedTask.isOverdue = diffDays < 0 && task.status !== 'completed';
        computedTask.daysUntilDue = diffDays >= 0 ? diffDays : 0;
        computedTask.overdueBy = diffDays < 0 ? Math.abs(diffDays) : 0;
      } else {
        computedTask.isOverdue = false;
        computedTask.daysUntilDue = 0;
        computedTask.overdueBy = 0;
      }

      return computedTask;
    });
  },
});