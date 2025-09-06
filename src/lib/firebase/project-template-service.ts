// src/lib/firebase/project-template-service.ts - Template Service für Projekt-Anlage-Wizard
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
  limit
} from 'firebase/firestore';
import { db } from './client-init';
import { 
  ProjectTemplate, 
  TemplateApplicationResult, 
  CreateTemplateData,
  ProjectTask,
  PipelineStage,
  TaskPriority,
  ProjectPriority
} from '@/types/project';
import { nanoid } from 'nanoid';

export const projectTemplateService = {
  
  /**
   * Holt alle Templates einer Organisation
   */
  async getAll(organizationId: string): Promise<ProjectTemplate[]> {
    try {
      // Standard-Templates (organization-agnostic)
      const standardTemplatesQuery = query(
        collection(db, 'project_templates'),
        where('category', '==', 'standard'),
        orderBy('usageCount', 'desc')
      );

      // Custom Templates der Organisation
      const customTemplatesQuery = query(
        collection(db, 'project_templates'),
        where('organizationId', '==', organizationId),
        where('category', 'in', ['custom', 'industry']),
        orderBy('usageCount', 'desc')
      );

      const [standardSnapshot, customSnapshot] = await Promise.all([
        getDocs(standardTemplatesQuery),
        getDocs(customTemplatesQuery)
      ]);

      const standardTemplates = standardSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectTemplate));

      const customTemplates = customSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectTemplate));

      // Falls keine Templates in DB, lade Standard-Templates
      if (standardTemplates.length === 0) {
        return [...this.getDefaultTemplates(), ...customTemplates];
      }

      return [...standardTemplates, ...customTemplates];
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
      // Fallback auf Default-Templates
      return this.getDefaultTemplates();
    }
  },

  /**
   * Holt ein Template nach ID
   */
  async getById(
    templateId: string, 
    organizationId: string
  ): Promise<ProjectTemplate | null> {
    try {
      // Erst versuchen aus DB zu laden
      const docRef = doc(db, 'project_templates', templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ProjectTemplate;
        
        // Multi-Tenancy Sicherheit für Custom Templates
        if (data.organizationId && data.organizationId !== organizationId) {
          return null;
        }
        
        return { ...data, id: docSnap.id };
      }

      // Fallback auf Standard-Templates
      const defaultTemplates = this.getDefaultTemplates();
      return defaultTemplates.find(t => t.id === templateId) || null;
    } catch (error) {
      console.error('Fehler beim Laden des Templates:', error);
      return null;
    }
  },

  /**
   * Wendet ein Template auf ein Projekt an
   */
  async applyTemplate(
    projectId: string,
    templateId: string,
    customizations?: Record<string, any>
  ): Promise<TemplateApplicationResult> {
    try {
      const organizationId = ''; // In der Praxis wird dies übergeben
      const template = await this.getById(templateId, organizationId);
      
      if (!template) {
        return {
          success: false,
          tasksCreated: [],
          deadlinesCreated: [],
          configurationApplied: {},
          errors: ['Template nicht gefunden']
        };
      }

      const result: TemplateApplicationResult = {
        success: true,
        tasksCreated: [],
        deadlinesCreated: [],
        configurationApplied: {},
        errors: []
      };

      // Tasks erstellen
      if (template.defaultTasks && template.defaultTasks.length > 0) {
        const { taskService } = await import('./task-service');
        
        const startDate = new Date();
        
        for (const taskTemplate of template.defaultTasks) {
          try {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + taskTemplate.daysAfterStart);

            const taskData: Omit<ProjectTask, 'id'> = {
              title: taskTemplate.title,
              description: `Erstellt aus Template: ${template.name}`,
              category: taskTemplate.category,
              stage: taskTemplate.stage,
              priority: taskTemplate.priority,
              dueDate: dueDate,
              status: 'pending',
              requiredForStageCompletion: taskTemplate.requiredForStageCompletion,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            };

            // Assignment-Rule anwenden
            if (taskTemplate.assignmentRule === 'project_manager') {
              // In der Praxis würde hier der Projekt-Manager ermittelt
              taskData.assignedTo = 'project_manager_placeholder';
            }

            // Mock task creation - in der Praxis würde hier der echte taskService verwendet
            const taskId = nanoid();
            // await taskService.create(organizationId, projectId, taskData);
            result.tasksCreated.push(taskId);
          } catch (error: any) {
            result.errors?.push(`Task "${taskTemplate.title}" konnte nicht erstellt werden: ${error.message}`);
          }
        }
      }

      // Deadlines erstellen
      if (template.defaultDeadlines && template.defaultDeadlines.length > 0) {
        const startDate = new Date();
        
        for (const deadlineTemplate of template.defaultDeadlines) {
          try {
            const deadlineDate = new Date(startDate);
            deadlineDate.setDate(deadlineDate.getDate() + deadlineTemplate.daysAfterStart);

            // Deadline-Implementierung würde hier erfolgen
            // Für jetzt als Placeholder
            const deadlineId = nanoid();
            result.deadlinesCreated.push(deadlineId);
          } catch (error: any) {
            result.errors?.push(`Deadline "${deadlineTemplate.title}" konnte nicht erstellt werden: ${error.message}`);
          }
        }
      }

      // Konfiguration anwenden
      result.configurationApplied = {
        autoCreateCampaign: template.defaultConfiguration.autoCreateCampaign,
        defaultPriority: template.defaultConfiguration.defaultPriority,
        estimatedDuration: template.defaultConfiguration.estimatedDuration,
        recommendedTeamSize: template.defaultConfiguration.recommendedTeamSize,
        appliedCustomizations: customizations || {}
      };

      // Template Usage Count erhöhen
      await this.incrementUsageCount(templateId);

      // Template-Config am Projekt speichern
      const { projectService } = await import('./project-service');
      await projectService.update(projectId, {
        templateConfig: {
          appliedTemplateId: templateId,
          templateVersion: '1.0.0', // In der Praxis aus Template
          customizations: customizations || {},
          inheritedTasks: result.tasksCreated,
          inheritedDeadlines: result.deadlinesCreated
        }
      }, { organizationId, userId: '' });

      return result;
    } catch (error: any) {
      return {
        success: false,
        tasksCreated: [],
        deadlinesCreated: [],
        configurationApplied: {},
        errors: [error.message || 'Template-Anwendung fehlgeschlagen']
      };
    }
  },

  /**
   * Holt Standard-Templates (hardcoded)
   */
  getDefaultTemplates(): ProjectTemplate[] {
    return STANDARD_TEMPLATES;
  },

  /**
   * Erstellt ein Custom Template
   */
  async createCustomTemplate(
    templateData: CreateTemplateData,
    organizationId: string
  ): Promise<string> {
    try {
      const template: Omit<ProjectTemplate, 'id'> = {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        defaultTasks: templateData.defaultTasks,
        defaultDeadlines: templateData.defaultDeadlines,
        defaultConfiguration: templateData.defaultConfiguration,
        usageCount: 0,
        organizationId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'project_templates'), template);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Erhöht den Usage-Count eines Templates
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    try {
      const docRef = doc(db, 'project_templates', templateId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentCount = docSnap.data().usageCount || 0;
        await updateDoc(docRef, {
          usageCount: currentCount + 1,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Fehler beim Erhöhen des Usage-Counts:', error);
      // Nicht kritisch - kein throw
    }
  },

  /**
   * Aktualisiert ein Template
   */
  async update(
    templateId: string,
    data: Partial<Omit<ProjectTemplate, 'id' | 'createdAt' | 'organizationId'>>,
    organizationId: string
  ): Promise<void> {
    try {
      // Sicherheitsprüfung
      const existing = await this.getById(templateId, organizationId);
      if (!existing) {
        throw new Error('Template nicht gefunden oder keine Berechtigung');
      }

      // Standard-Templates können nicht bearbeitet werden
      if (!existing.organizationId) {
        throw new Error('Standard-Templates können nicht bearbeitet werden');
      }

      const docRef = doc(db, 'project_templates', templateId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Löscht ein Custom Template
   */
  async delete(templateId: string, organizationId: string): Promise<void> {
    try {
      // Sicherheitsprüfung
      const existing = await this.getById(templateId, organizationId);
      if (!existing) {
        throw new Error('Template nicht gefunden oder keine Berechtigung');
      }

      // Standard-Templates können nicht gelöscht werden
      if (!existing.organizationId) {
        throw new Error('Standard-Templates können nicht gelöscht werden');
      }

      await deleteDoc(doc(db, 'project_templates', templateId));
    } catch (error) {
      throw error;
    }
  }
};

// ========================================
// STANDARD-TEMPLATES
// ========================================

const STANDARD_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'pr-campaign-standard',
    name: 'Standard PR-Kampagne',
    description: 'Klassischer PR-Kampagnen-Workflow mit allen Standard-Phasen',
    category: 'standard',
    defaultTasks: [
      // Ideas/Planning
      {
        title: 'Projekt-Briefing erstellen',
        category: 'planning',
        stage: 'ideas_planning',
        priority: 'high',
        daysAfterStart: 1,
        assignmentRule: 'project_manager',
        requiredForStageCompletion: true
      },
      {
        title: 'Strategie-Dokument verfassen',
        category: 'planning', 
        stage: 'ideas_planning',
        priority: 'high',
        daysAfterStart: 3,
        assignmentRule: 'project_manager',
        requiredForStageCompletion: true
      },
      {
        title: 'Zielgruppen-Analyse durchführen',
        category: 'research',
        stage: 'ideas_planning',
        priority: 'medium',
        daysAfterStart: 5,
        assignmentRule: 'team_lead',
        requiredForStageCompletion: false
      },
      
      // Creation
      {
        title: 'Content-Outline erstellen',
        category: 'content_creation',
        stage: 'creation',
        priority: 'high',
        daysAfterStart: 7,
        assignmentRule: 'auto',
        requiredForStageCompletion: true
      },
      {
        title: 'Texte verfassen',
        category: 'content_creation',
        stage: 'creation',
        priority: 'high',
        daysAfterStart: 10,
        assignmentRule: 'auto',
        requiredForStageCompletion: true
      },
      {
        title: 'Bildmaterial sammeln',
        category: 'asset_management',
        stage: 'creation',
        priority: 'medium',
        daysAfterStart: 12,
        assignmentRule: 'auto',
        requiredForStageCompletion: false
      },
      
      // Internal Approval
      {
        title: 'Interne Review durchführen',
        category: 'review',
        stage: 'internal_approval',
        priority: 'high',
        daysAfterStart: 15,
        assignmentRule: 'project_manager',
        requiredForStageCompletion: true
      },
      
      // Customer Approval
      {
        title: 'Kundenpräsentation vorbereiten',
        category: 'presentation',
        stage: 'customer_approval',
        priority: 'high',
        daysAfterStart: 17,
        assignmentRule: 'project_manager',
        requiredForStageCompletion: true
      },
      
      // Distribution
      {
        title: 'Medienverteiler finalisieren',
        category: 'distribution',
        stage: 'distribution',
        priority: 'high',
        daysAfterStart: 20,
        assignmentRule: 'auto',
        requiredForStageCompletion: true
      },
      {
        title: 'Pressemitteilung versenden',
        category: 'distribution',
        stage: 'distribution',
        priority: 'high',
        daysAfterStart: 21,
        assignmentRule: 'auto',
        requiredForStageCompletion: true
      }
    ],
    
    defaultDeadlines: [
      {
        title: 'Strategiephase abgeschlossen',
        stage: 'ideas_planning',
        daysAfterStart: 6,
        type: 'milestone'
      },
      {
        title: 'Content erstellt',
        stage: 'creation',
        daysAfterStart: 14,
        type: 'milestone'
      },
      {
        title: 'Kundenfreigabe erforderlich',
        stage: 'customer_approval',
        daysAfterStart: 18,
        type: 'deadline'
      },
      {
        title: 'Launch-Termin',
        stage: 'distribution',
        daysAfterStart: 21,
        type: 'deadline'
      }
    ],
    
    defaultConfiguration: {
      autoCreateCampaign: true,
      defaultPriority: 'medium',
      recommendedTeamSize: 3,
      estimatedDuration: 21
    },
    
    usageCount: 0,
    organizationId: undefined, // Standard-Template
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  
  {
    id: 'product-launch',
    name: 'Produkt-Launch',
    description: 'Spezialisierter Workflow für Produkteinführungen',
    category: 'standard',
    defaultTasks: [
      // Planning
      {
        title: 'Marktanalyse durchführen',
        category: 'research',
        stage: 'ideas_planning',
        priority: 'high',
        daysAfterStart: 2,
        assignmentRule: 'auto',
        requiredForStageCompletion: true
      },
      {
        title: 'Competitive Analysis',
        category: 'research',
        stage: 'ideas_planning',
        priority: 'high',
        daysAfterStart: 4,
        assignmentRule: 'auto',
        requiredForStageCompletion: true
      },
      {
        title: 'Product Messaging definieren',
        category: 'planning',
        stage: 'ideas_planning',
        priority: 'high',
        daysAfterStart: 6,
        assignmentRule: 'project_manager',
        requiredForStageCompletion: true
      },
      
      // Creation
      {
        title: 'Product Story entwickeln',
        category: 'content_creation',
        stage: 'creation',
        priority: 'high',
        daysAfterStart: 8,
        assignmentRule: 'auto',
        requiredForStageCompletion: true
      },
      {
        title: 'Launch-Materialien erstellen',
        category: 'content_creation',
        stage: 'creation',
        priority: 'high',
        daysAfterStart: 12,
        assignmentRule: 'auto',
        requiredForStageCompletion: true
      },
      {
        title: 'Product Demo vorbereiten',
        category: 'presentation',
        stage: 'creation',
        priority: 'medium',
        daysAfterStart: 14,
        assignmentRule: 'auto',
        requiredForStageCompletion: false
      },
      
      // Distribution
      {
        title: 'Launch-Event planen',
        category: 'event_planning',
        stage: 'distribution',
        priority: 'high',
        daysAfterStart: 18,
        assignmentRule: 'project_manager',
        requiredForStageCompletion: true
      },
      {
        title: 'Product Launch durchführen',
        category: 'distribution',
        stage: 'distribution',
        priority: 'high',
        daysAfterStart: 28,
        assignmentRule: 'project_manager',
        requiredForStageCompletion: true
      }
    ],
    
    defaultDeadlines: [
      {
        title: 'Research Phase abgeschlossen',
        stage: 'ideas_planning',
        daysAfterStart: 7,
        type: 'milestone'
      },
      {
        title: 'Launch-Materialien finalisiert',
        stage: 'creation',
        daysAfterStart: 16,
        type: 'milestone'
      },
      {
        title: 'Launch-Event',
        stage: 'distribution',
        daysAfterStart: 28,
        type: 'deadline'
      }
    ],
    
    defaultConfiguration: {
      autoCreateCampaign: true,
      defaultPriority: 'high',
      recommendedTeamSize: 4,
      estimatedDuration: 30
    },
    
    usageCount: 0,
    organizationId: undefined, // Standard-Template
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];