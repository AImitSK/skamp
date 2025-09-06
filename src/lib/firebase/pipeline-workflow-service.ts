// src/lib/firebase/pipeline-workflow-service.ts - PLAN 8/9: PIPELINE-TASK-INTEGRATION
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { PipelineStage } from '@/types/project';
import type { PipelineAwareTask } from '@/types/tasks';
import { taskService } from './task-service';
import { projectService } from './project-service';

export class PipelineWorkflowService {
  
  /**
   * Automatische Stage-Übergänge verarbeiten
   */
  async processStageTransition(
    projectId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage
  ): Promise<void> {
    const workflow = this.getWorkflowForTransition(fromStage, toStage);
    
    try {
      // Pre-transition validation
      await this.validateTransitionRequirements(projectId, workflow);
      
      // Execute transition actions
      await this.executeTransitionActions(projectId, workflow);
      
      // Update project stage
      await projectService.update(projectId, { 
        currentStage: toStage,
        workflowState: {
          stageHistory: [
            {
              stage: toStage,
              enteredAt: serverTimestamp() as Timestamp,
              triggeredBy: 'automatic'
            }
          ],
          lastIntegrityCheck: serverTimestamp() as Timestamp,
          integrityIssues: []
        }
      }, { organizationId: '', userId: '' }); // In Praxis werden diese übergeben
      
      // Post-transition cleanup
      await this.postTransitionCleanup(projectId, workflow);
      
    } catch (error: any) {
      await this.handleTransitionError(projectId, fromStage, toStage, error);
    }
  }
  
  /**
   * Task-Abhängigkeiten verwalten
   */
  async updateTaskDependencies(completedTaskId: string): Promise<void> {
    const completedTask = await taskService.getById(completedTaskId) as PipelineAwareTask;
    if (!completedTask || !completedTask.linkedProjectId) return;
    
    // Finde abhängige Tasks
    const dependentTasks = await taskService.getByProjectId(
      completedTask.organizationId,
      completedTask.linkedProjectId
    );
    
    const unblockableTasks = dependentTasks.filter(task =>
      task.dependsOnTaskIds?.includes(completedTaskId) &&
      task.status === 'blocked'
    );
    
    // Tasks freischalten
    for (const task of unblockableTasks) {
      const allDependenciesMet = await this.checkAllDependencies(task, dependentTasks);
      
      if (allDependenciesMet) {
        await taskService.update(task.id!, {
          status: 'pending'
        });
        
        // Benachrichtigung senden
        await this.notifyTaskUnblocked(task);
      }
    }
  }
  
  /**
   * Projekt-Progress berechnen
   */
  async calculateProjectProgress(projectId: string): Promise<ProjectProgress> {
    const project = await projectService.getById(projectId, { organizationId: '' });
    if (!project) {
      throw new Error('Projekt nicht gefunden');
    }

    const tasks = await taskService.getByProjectId(project.organizationId, projectId);
    
    // Stage-spezifischer Progress
    const stageProgress: Record<PipelineStage, number> = {} as any;
    const stages: PipelineStage[] = [
      'ideas_planning', 'creation', 'internal_approval', 
      'customer_approval', 'distribution', 'monitoring', 'completed'
    ];
    
    stages.forEach(stage => {
      const stageTasks = tasks.filter(t => t.pipelineStage === stage);
      stageProgress[stage] = this.calculateStageProgress(stageTasks);
    });
    
    // Gesamt-Progress mit Gewichtung
    const stageWeights = {
      'ideas_planning': 10,
      'creation': 25,
      'internal_approval': 15,
      'customer_approval': 15,
      'distribution': 25,
      'monitoring': 8,
      'completed': 2
    };
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    Object.entries(stageWeights).forEach(([stage, weight]) => {
      totalWeight += weight;
      completedWeight += (stageProgress[stage as PipelineStage] / 100) * weight;
    });
    
    const overallPercent = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
    
    return {
      overallPercent,
      stageProgress,
      taskCompletion: tasks.length > 0 
        ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 
        : 0,
      criticalTasksRemaining: tasks.filter(t => 
        t.requiredForStageCompletion && t.status !== 'completed'
      ).length,
      lastUpdated: serverTimestamp() as Timestamp,
      milestones: []
    };
  }

  /**
   * Stage-Progress für eine spezifische Stage berechnen
   */
  private calculateStageProgress(stageTasks: PipelineAwareTask[]): number {
    if (stageTasks.length === 0) return 0;
    
    const completedTasks = stageTasks.filter(t => t.status === 'completed');
    return (completedTasks.length / stageTasks.length) * 100;
  }

  /**
   * Workflow für Transition abrufen
   */
  private getWorkflowForTransition(fromStage: PipelineStage, toStage: PipelineStage): StageTransitionWorkflow {
    const workflowKey = `${fromStage}_to_${toStage}`;
    
    // Beispiel-Workflow für ideas_planning -> creation
    if (workflowKey === 'ideas_planning_to_creation') {
      return {
        currentStage: fromStage,
        nextStage: toStage,
        requiredTasks: ['Projekt-Briefing erstellen', 'Strategie-Dokument verfassen'],
        validationChecks: [
          {
            check: 'strategy_document_exists',
            rule: 'project.linkedElements.strategyDocument !== null',
            message: 'Strategie-Dokument muss erstellt werden'
          }
        ],
        onTransition: [
          {
            action: 'auto_complete_tasks',
            data: { filter: { autoCompleteOnStageChange: true } }
          },
          {
            action: 'create_stage_tasks',
            data: { templates: ['content_outline', 'text_creation', 'media_selection'] }
          }
        ]
      };
    }

    // Default minimal workflow
    return {
      currentStage: fromStage,
      nextStage: toStage,
      requiredTasks: [],
      validationChecks: [],
      onTransition: []
    };
  }

  /**
   * Validiere Transition-Anforderungen
   */
  private async validateTransitionRequirements(
    projectId: string, 
    workflow: StageTransitionWorkflow
  ): Promise<void> {
    // Prüfe ob alle erforderlichen Tasks abgeschlossen sind
    const tasks = await taskService.getByProjectId('', projectId);
    
    for (const requiredTaskTitle of workflow.requiredTasks) {
      const requiredTask = tasks.find(t => t.title === requiredTaskTitle);
      if (!requiredTask || requiredTask.status !== 'completed') {
        throw new Error(`Erforderliche Task nicht abgeschlossen: ${requiredTaskTitle}`);
      }
    }

    // Führe Validation Checks aus
    for (const check of workflow.validationChecks) {
      const isValid = await this.executeValidationCheck(projectId, check);
      if (!isValid) {
        throw new Error(check.message);
      }
    }
  }

  /**
   * Führe Transition-Aktionen aus
   */
  private async executeTransitionActions(
    projectId: string, 
    workflow: StageTransitionWorkflow
  ): Promise<void> {
    for (const action of workflow.onTransition) {
      await this.executeTransitionAction(projectId, action);
    }
  }

  /**
   * Einzelne Transition-Aktion ausführen
   */
  private async executeTransitionAction(
    projectId: string, 
    action: TransitionAction
  ): Promise<void> {
    switch (action.action) {
      case 'auto_complete_tasks':
        await this.autoCompleteTasks(projectId, action.data.filter);
        break;
      case 'create_stage_tasks':
        await this.createStageTasks(projectId, action.data.templates);
        break;
      case 'update_deadlines':
        await this.updateTaskDeadlines(projectId, action.data);
        break;
      default:
        console.warn(`Unbekannte Transition-Action: ${action.action}`);
    }
  }

  /**
   * Auto-complete Tasks basierend auf Filter
   */
  private async autoCompleteTasks(projectId: string, filter: any): Promise<void> {
    const tasks = await taskService.getByProjectId('', projectId);
    const tasksToComplete = tasks.filter(t => 
      filter.autoCompleteOnStageChange && t.autoCompleteOnStageChange
    );

    for (const task of tasksToComplete) {
      await taskService.markAsCompleted(task.id!);
    }
  }

  /**
   * Erstelle Tasks für neue Stage basierend auf Templates
   */
  private async createStageTasks(projectId: string, templates: string[]): Promise<void> {
    // In der Praxis würde hier auf TASK_TEMPLATES zugegriffen
    const taskTemplates = this.getTaskTemplatesForCategories(templates);
    
    for (const template of taskTemplates) {
      await taskService.create({
        userId: '',
        organizationId: '',
        title: template.title,
        priority: template.priority,
        status: 'pending',
        linkedProjectId: projectId,
        requiredForStageCompletion: template.requiredForStageCompletion,
        templateCategory: template.category,
        stageContext: {
          createdOnStageEntry: true,
          inheritedFromTemplate: template.id,
          stageProgressWeight: 3,
          criticalPath: template.requiredForStageCompletion
        }
      } as any);
    }
  }

  /**
   * Task-Deadlines aktualisieren
   */
  private async updateTaskDeadlines(projectId: string, data: any): Promise<void> {
    const tasks = await taskService.getByProjectId('', projectId);
    
    for (const task of tasks) {
      if (task.deadlineRules?.relativeToPipelineStage) {
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + task.deadlineRules.daysAfterStageEntry);
        
        await taskService.update(task.id!, {
          dueDate: Timestamp.fromDate(newDueDate)
        });
      }
    }
  }

  /**
   * Post-Transition Cleanup
   */
  private async postTransitionCleanup(
    projectId: string, 
    workflow: StageTransitionWorkflow
  ): Promise<void> {
    // Aktualisiere Projekt-Progress
    await this.calculateProjectProgress(projectId);
    
    // Plane neue Deadlines
    await projectService.scheduleStageDeadlines(projectId, workflow.nextStage);
  }

  /**
   * Behandle Transition-Fehler
   */
  private async handleTransitionError(
    projectId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage,
    error: Error
  ): Promise<void> {
    console.error(`Stage-Transition-Fehler von ${fromStage} zu ${toStage}:`, error);
    
    // Logge Fehler im Projekt
    await projectService.update(projectId, {
      workflowState: {
        stageHistory: [],
        lastIntegrityCheck: serverTimestamp() as Timestamp,
        integrityIssues: [
          `Transition-Fehler ${fromStage} -> ${toStage}: ${error.message}`
        ]
      }
    }, { organizationId: '', userId: '' });
  }

  /**
   * Prüfe alle Abhängigkeiten einer Task
   */
  private async checkAllDependencies(
    task: PipelineAwareTask,
    allTasks: PipelineAwareTask[]
  ): Promise<boolean> {
    if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
      return true;
    }

    return task.dependsOnTaskIds.every(depTaskId => {
      const depTask = allTasks.find(t => t.id === depTaskId);
      return depTask?.status === 'completed';
    });
  }

  /**
   * Benachrichtige über entsperrte Task
   */
  private async notifyTaskUnblocked(task: PipelineAwareTask): Promise<void> {
    // In der Praxis würde hier eine Benachrichtigung gesendet
    console.log(`Task entsperrt: ${task.title}`);
  }

  /**
   * Führe Validation Check aus
   */
  private async executeValidationCheck(
    projectId: string,
    check: ValidationCheck
  ): Promise<boolean> {
    // Vereinfachte Validation-Logik
    switch (check.check) {
      case 'strategy_document_exists':
        // Prüfe ob Strategie-Task abgeschlossen ist
        const tasks = await taskService.getByProjectId('', projectId);
        return tasks.some(t => 
          t.title.includes('Strategie') && t.status === 'completed'
        );
      default:
        return true;
    }
  }

  /**
   * Hole Task-Templates für Kategorien
   */
  private getTaskTemplatesForCategories(categories: string[]): TaskTemplate[] {
    // Vereinfachte Template-Logik
    const templates: TaskTemplate[] = [];
    
    if (categories.includes('content_outline')) {
      templates.push({
        id: 'content_outline_template',
        title: 'Content-Outline erstellen',
        category: 'content_creation',
        stage: 'creation',
        priority: 'high',
        requiredForStageCompletion: true,
        daysAfterStageEntry: 2
      });
    }
    
    if (categories.includes('text_creation')) {
      templates.push({
        id: 'text_creation_template',
        title: 'Texte verfassen',
        category: 'content_creation',
        stage: 'creation',
        priority: 'high',
        requiredForStageCompletion: true,
        daysAfterStageEntry: 5
      });
    }

    return templates;
  }

  /**
   * Setup Real-time Pipeline-Task-Listener
   */
  setupPipelineTaskListener(projectId: string): () => void {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('linkedProjectId', '==', projectId)
      ),
      async (snapshot) => {
        const changes = snapshot.docChanges();
        
        for (const change of changes) {
          const task = { id: change.doc.id, ...change.doc.data() } as PipelineAwareTask;
          
          if (change.type === 'modified') {
            // Check for task completion
            if (task.status === 'completed' && task.requiredForStageCompletion) {
              await this.handleCriticalTaskCompletion(task);
            }
            
            // Update dependencies
            if (task.status === 'completed') {
              await this.updateTaskDependencies(task.id!);
            }
          }
        }
        
        // Re-calculate project progress
        await this.calculateProjectProgress(projectId);
      }
    );

    return unsubscribe;
  }

  /**
   * Behandle Completion einer kritischen Task
   */
  private async handleCriticalTaskCompletion(task: PipelineAwareTask): Promise<void> {
    if (!task.linkedProjectId) return;

    // Prüfe ob Stage-Übergang möglich ist
    const stageCompletion = await taskService.checkStageCompletionRequirements(
      task.linkedProjectId,
      task.pipelineStage!
    );

    if (stageCompletion.readyForTransition) {
      // Automatischer Stage-Übergang falls konfiguriert
      const project = await projectService.getById(task.linkedProjectId, { 
        organizationId: task.organizationId 
      });

      if (project?.workflowConfig?.autoStageTransition) {
        const nextStage = this.getNextStage(task.pipelineStage!);
        if (nextStage) {
          await this.processStageTransition(task.linkedProjectId, task.pipelineStage!, nextStage);
        }
      }
    }
  }

  /**
   * Bestimme nächste Stage
   */
  private getNextStage(currentStage: PipelineStage): PipelineStage | null {
    const stageOrder: PipelineStage[] = [
      'ideas_planning', 'creation', 'internal_approval', 
      'customer_approval', 'distribution', 'monitoring', 'completed'
    ];
    
    const currentIndex = stageOrder.indexOf(currentStage);
    return currentIndex >= 0 && currentIndex < stageOrder.length - 1 
      ? stageOrder[currentIndex + 1] 
      : null;
  }
}

// ========================================
// PIPELINE-WORKFLOW-SERVICE INTERFACES
// ========================================

export interface StageTransitionWorkflow {
  currentStage: PipelineStage;
  nextStage: PipelineStage;
  requiredTasks: string[];
  validationChecks: ValidationCheck[];
  onTransition: TransitionAction[];
}

export interface TransitionAction {
  action: string;
  data: any;
  rollbackAction?: string;
}

export interface ValidationCheck {
  check: string;
  rule: string;
  message: string;
}

export interface ProjectProgress {
  overallPercent: number;
  stageProgress: Record<PipelineStage, number>;
  taskCompletion: number;
  criticalTasksRemaining: number;
  lastUpdated: Timestamp;
  milestones: Array<{
    percent: number;
    achievedAt?: Timestamp;
    notificationSent: boolean;
  }>;
}

export interface TaskTemplate {
  id: string;
  title: string;
  category: string;
  stage: PipelineStage;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requiredForStageCompletion: boolean;
  daysAfterStageEntry: number;
  assignmentRules?: {
    assignTo: 'project_lead' | 'team_member' | 'role_based';
    role?: string;
  };
}

// Export Service-Instance
export const pipelineWorkflowService = new PipelineWorkflowService();