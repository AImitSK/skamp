// src/lib/kanban/kanban-board-service.ts - Kanban Board Service für Plan 10/9
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { Project, PipelineStage, ProjectPriority } from '@/types/project';
import { projectService } from '@/lib/firebase/project-service';

// ========================================
// KANBAN BOARD INTERFACES
// ========================================

export interface BoardData {
  projectsByStage: Record<PipelineStage, Project[]>;
  totalProjects: number;
  activeUsers: ActiveUser[];
  recentUpdates: ProjectUpdate[];
}

export interface BoardFilters {
  search?: string;
  customers?: string[];
  teamMembers?: string[];
  priority?: ProjectPriority[];
  tags?: string[];
  dateRange?: [Date, Date];
  overdue?: boolean;
  critical?: boolean;
}

export interface MoveResult {
  success: boolean;
  project: Project;
  validationMessages?: string[];
  errors?: string[];
}

export interface DragLock {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  lockedAt: Timestamp;
  expiresAt: Timestamp;
}

export interface ActiveUser {
  id: string;
  name: string;
  avatar?: string;
  currentProject?: string;
  lastSeen: Timestamp;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  projectTitle: string;
  action: 'moved' | 'updated' | 'created';
  fromStage?: PipelineStage;
  toStage?: PipelineStage;
  userId: string;
  userName: string;
  timestamp: Timestamp;
}

// ========================================
// KANBAN BOARD SERVICE
// ========================================

class KanbanBoardService {
  
  /**
   * Lädt alle Board-Daten für eine Organisation
   */
  async getBoardData(
    organizationId: string,
    filters: BoardFilters = {}
  ): Promise<BoardData> {
    try {
      // Projekte laden
      const projects = await projectService.getAll({ organizationId, filters: {} });
      
      // Nach Stages gruppieren
      const projectsByStage = this.groupProjectsByStage(projects);
      
      // Filter anwenden
      const filteredProjectsByStage = await this.applyFiltersToStages(projectsByStage, filters);
      
      // Aktive User laden
      const activeUsers = await this.getActiveUsers(organizationId);
      
      // Recent Updates laden
      const recentUpdates = await this.getRecentUpdates(organizationId, 10);
      
      return {
        projectsByStage: filteredProjectsByStage,
        totalProjects: Object.values(filteredProjectsByStage).flat().length,
        activeUsers,
        recentUpdates
      };
    } catch (error) {
      console.error('Fehler beim Laden der Board-Daten:', error);
      return {
        projectsByStage: this.getEmptyStageStructure(),
        totalProjects: 0,
        activeUsers: [],
        recentUpdates: []
      };
    }
  }

  /**
   * Verschiebt ein Projekt zu einer anderen Stage
   */
  async moveProject(
    projectId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage,
    userId: string,
    organizationId: string
  ): Promise<MoveResult> {
    try {
      // Validierung des Übergangs
      const validation = await this.validateStageTransition(fromStage, toStage);
      if (!validation.isValid) {
        return {
          success: false,
          project: {} as Project,
          errors: validation.issues
        };
      }

      // Drag-Lock prüfen
      const existingLock = await this.getActiveDragLock(projectId);
      if (existingLock && existingLock.userId !== userId) {
        return {
          success: false,
          project: {} as Project,
          errors: [`Projekt wird bereits von ${existingLock.userName} bearbeitet`]
        };
      }

      // Projekt laden
      const project = await projectService.getById(projectId, { organizationId });
      if (!project) {
        return {
          success: false,
          project: {} as Project,
          errors: ['Projekt nicht gefunden']
        };
      }

      // Stage-Transition durchführen
      const context = { organizationId, userId };
      await projectService.update(projectId, {
        currentStage: toStage,
        updatedAt: Timestamp.now()
      }, context);

      // Update-Event tracken
      await this.trackProjectUpdate({
        projectId,
        projectTitle: project.title,
        action: 'moved',
        fromStage,
        toStage,
        userId,
        userName: 'User', // TODO: Get real user name
        timestamp: Timestamp.now()
      }, organizationId);

      // Drag-Lock freigeben
      if (existingLock) {
        await this.releaseDragLock(existingLock.id);
      }

      // Aktualisiertes Projekt laden
      const updatedProject = await projectService.getById(projectId, { organizationId });
      
      return {
        success: true,
        project: updatedProject!,
        validationMessages: [`Projekt erfolgreich von ${fromStage} zu ${toStage} verschoben`]
      };
    } catch (error: any) {
      console.error('Fehler beim Verschieben des Projekts:', error);
      return {
        success: false,
        project: {} as Project,
        errors: [error.message || 'Unbekannter Fehler beim Verschieben']
      };
    }
  }

  /**
   * Wendet Filter auf Board-Daten an
   */
  async applyFilters(
    projects: Project[],
    filters: BoardFilters
  ): Promise<Project[]> {
    let filteredProjects = [...projects];

    // Such-Filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filteredProjects = filteredProjects.filter(project =>
        project.title.toLowerCase().includes(searchTerm) ||
        project.description?.toLowerCase().includes(searchTerm) ||
        project.customer?.name.toLowerCase().includes(searchTerm)
      );
    }

    // Kunden-Filter
    if (filters.customers && filters.customers.length > 0) {
      filteredProjects = filteredProjects.filter(project =>
        project.customer && filters.customers!.includes(project.customer.id)
      );
    }

    // Team-Mitglieder-Filter
    if (filters.teamMembers && filters.teamMembers.length > 0) {
      filteredProjects = filteredProjects.filter(project =>
        project.assignedTo && 
        project.assignedTo.some(memberId => filters.teamMembers!.includes(memberId))
      );
    }

    // Prioritäts-Filter
    if (filters.priority && filters.priority.length > 0) {
      filteredProjects = filteredProjects.filter(project => {
        // Annahme: Projekt hat Priorität in einem erweiterten Type
        const projectPriority = (project as any).priority as ProjectPriority;
        return projectPriority && filters.priority!.includes(projectPriority);
      });
    }

    // Datum-Filter
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [startDate, endDate] = filters.dateRange;
      filteredProjects = filteredProjects.filter(project => {
        const projectDate = project.createdAt.toDate();
        return projectDate >= startDate && projectDate <= endDate;
      });
    }

    // Überfällig-Filter
    if (filters.overdue) {
      const now = new Date();
      filteredProjects = filteredProjects.filter(project =>
        project.dueDate && project.dueDate.toDate() < now && project.status !== 'completed'
      );
    }

    // Kritisch-Filter
    if (filters.critical) {
      filteredProjects = filteredProjects.filter(project => {
        const projectPriority = (project as any).priority as ProjectPriority;
        return projectPriority === 'urgent' || projectPriority === 'high';
      });
    }

    return filteredProjects;
  }

  /**
   * Sucht Projekte basierend auf einem Query-String
   */
  async searchProjects(
    query: string,
    projects: Project[]
  ): Promise<Project[]> {
    if (!query || !query.trim()) {
      return projects;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return projects.filter(project => {
      // Titel-Match
      if (project.title.toLowerCase().includes(searchTerm)) return true;
      
      // Beschreibung-Match
      if (project.description?.toLowerCase().includes(searchTerm)) return true;
      
      // Kunden-Match
      if (project.customer?.name.toLowerCase().includes(searchTerm)) return true;
      
      // Tag-Match (falls vorhanden)
      const projectTags = (project as any).tags as string[];
      if (projectTags && projectTags.some(tag => tag.toLowerCase().includes(searchTerm))) return true;
      
      return false;
    });
  }

  /**
   * Sperrt ein Projekt für Drag-Operation
   */
  async lockProjectForDrag(
    projectId: string,
    userId: string,
    userName: string = 'Unknown User'
  ): Promise<DragLock | null> {
    try {
      // Prüfe auf bestehende Locks
      const existingLock = await this.getActiveDragLock(projectId);
      if (existingLock) {
        if (existingLock.userId === userId) {
          // Erneuere eigenen Lock
          const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 1000)); // 30 Sekunden
          await updateDoc(doc(db, 'drag_locks', existingLock.id), {
            expiresAt,
            lockedAt: Timestamp.now()
          });
          return { ...existingLock, expiresAt };
        } else {
          // Lock von anderem User - verweigern
          return null;
        }
      }

      // Neuen Lock erstellen
      const lockData: Omit<DragLock, 'id'> = {
        projectId,
        userId,
        userName,
        lockedAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 1000)) // 30 Sekunden
      };

      const docRef = await addDoc(collection(db, 'drag_locks'), lockData);
      return { id: docRef.id, ...lockData };
    } catch (error) {
      console.error('Fehler beim Erstellen des Drag-Locks:', error);
      return null;
    }
  }

  /**
   * Gibt einen Drag-Lock frei
   */
  async releaseDragLock(lockId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'drag_locks', lockId));
    } catch (error) {
      console.error('Fehler beim Freigeben des Drag-Locks:', error);
    }
  }

  /**
   * Lädt aktive User einer Organisation
   */
  async getActiveUsers(organizationId: string): Promise<ActiveUser[]> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const q = query(
        collection(db, 'user_presence'),
        where('organizationId', '==', organizationId),
        where('lastSeen', '>', Timestamp.fromDate(fiveMinutesAgo)),
        orderBy('lastSeen', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActiveUser));
    } catch (error) {
      console.error('Fehler beim Laden der aktiven User:', error);
      return [];
    }
  }

  // ========================================
  // HELPER METHODEN
  // ========================================

  /**
   * Gruppiert Projekte nach Pipeline-Stages
   */
  private groupProjectsByStage(projects: Project[]): Record<PipelineStage, Project[]> {
    const stages: PipelineStage[] = [
      'ideas_planning',
      'creation', 
      'internal_approval',
      'customer_approval',
      'distribution',
      'monitoring',
      'completed'
    ];

    const grouped = stages.reduce((acc, stage) => {
      acc[stage] = projects.filter(project => project.currentStage === stage);
      return acc;
    }, {} as Record<PipelineStage, Project[]>);

    return grouped;
  }

  /**
   * Wendet Filter auf Stage-gruppierte Projekte an
   */
  private async applyFiltersToStages(
    projectsByStage: Record<PipelineStage, Project[]>,
    filters: BoardFilters
  ): Promise<Record<PipelineStage, Project[]>> {
    const filteredStages: Record<PipelineStage, Project[]> = {} as any;

    for (const [stage, projects] of Object.entries(projectsByStage)) {
      filteredStages[stage as PipelineStage] = await this.applyFilters(projects, filters);
    }

    return filteredStages;
  }

  /**
   * Erstellt leere Stage-Struktur
   */
  private getEmptyStageStructure(): Record<PipelineStage, Project[]> {
    return {
      'ideas_planning': [],
      'creation': [],
      'internal_approval': [],
      'customer_approval': [],
      'distribution': [],
      'monitoring': [],
      'completed': []
    };
  }

  /**
   * Validiert Stage-Transition
   */
  private async validateStageTransition(
    fromStage: PipelineStage,
    toStage: PipelineStage
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // BUGFIX: Gültige Übergänge auf 6 Phasen aktualisiert (konsistent mit useDragAndDrop)
    const validTransitions: Record<PipelineStage, PipelineStage[]> = {
      'ideas_planning': ['creation'],
      'creation': ['ideas_planning', 'approval'],
      'approval': ['creation', 'distribution'],
      'distribution': ['approval', 'monitoring'],
      'monitoring': ['distribution', 'completed'],
      'completed': ['monitoring'] // Rollback möglich
    };

    if (!validTransitions[fromStage]?.includes(toStage)) {
      issues.push(`Übergang von ${fromStage} zu ${toStage} ist nicht erlaubt`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Holt aktiven Drag-Lock für ein Projekt
   */
  private async getActiveDragLock(projectId: string): Promise<DragLock | null> {
    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, 'drag_locks'),
        where('projectId', '==', projectId),
        where('expiresAt', '>', now)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const lockDoc = snapshot.docs[0];
      return { id: lockDoc.id, ...lockDoc.data() } as DragLock;
    } catch (error) {
      console.error('Fehler beim Laden des Drag-Locks:', error);
      return null;
    }
  }

  /**
   * Trackt Projekt-Updates für Recent-Activity
   */
  private async trackProjectUpdate(
    update: Omit<ProjectUpdate, 'id'>,
    organizationId: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'project_updates'), {
        ...update,
        organizationId
      });

      // Cleanup: Lösche Updates älter als 7 Tage
      await this.cleanupOldUpdates(organizationId);
    } catch (error) {
      console.error('Fehler beim Tracken des Projekt-Updates:', error);
    }
  }

  /**
   * Lädt recent Updates für eine Organisation
   */
  private async getRecentUpdates(organizationId: string, limitCount: number = 10): Promise<ProjectUpdate[]> {
    try {
      const q = query(
        collection(db, 'project_updates'),
        where('organizationId', '==', organizationId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectUpdate));
    } catch (error) {
      console.error('Fehler beim Laden der Recent Updates:', error);
      return [];
    }
  }

  /**
   * Cleanup alte Updates (7+ Tage)
   */
  private async cleanupOldUpdates(organizationId: string): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, 'project_updates'),
        where('organizationId', '==', organizationId),
        where('timestamp', '<', Timestamp.fromDate(sevenDaysAgo))
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Fehler beim Cleanup der alten Updates:', error);
    }
  }
}

// Service-Instanz exportieren
export const kanbanBoardService = new KanbanBoardService();