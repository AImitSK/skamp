// src/lib/firebase/project-service.ts - Basis Project Service für Pipeline-Integration
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
import { Project, ProjectFilters } from '@/types/project';
import type { PRCampaign } from '@/types/pr';

export const projectService = {
  
  /**
   * Erstellt ein neues Projekt
   */
  async create(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const dataToSave = {
        ...projectData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'projects'), dataToSave);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Holt ein Projekt nach ID
   */
  async getById(
    projectId: string, 
    context: { organizationId: string }
  ): Promise<Project | null> {
    try {
      const docRef = doc(db, 'projects', projectId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Multi-Tenancy Sicherheit
        if (data.organizationId !== context.organizationId) {
          return null;
        }
        
        return { id: docSnap.id, ...data } as Project;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Holt alle Projekte einer Organisation
   */
  async getAll(context: { 
    organizationId: string; 
    filters?: ProjectFilters 
  }): Promise<Project[]> {
    try {
      let q = query(
        collection(db, 'projects'),
        where('organizationId', '==', context.organizationId),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
      
      // Zusätzliche Filter anwenden
      if (context.filters?.status) {
        q = query(q, where('status', '==', context.filters.status));
      }
      
      if (context.filters?.currentStage) {
        q = query(q, where('currentStage', '==', context.filters.currentStage));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
    } catch (error) {
      return [];
    }
  },

  /**
   * Aktualisiert ein Projekt
   */
  async update(
    projectId: string,
    data: Partial<Omit<Project, 'id' | 'organizationId' | 'userId'>>,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Sicherheitsprüfung: Prüfe ob Projekt der Organisation gehört
      const existing = await this.getById(projectId, context);
      if (!existing) {
        throw new Error('Projekt nicht gefunden oder keine Berechtigung');
      }
      
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fügt eine Kampagne zu einem Projekt hinzu
   */
  async addLinkedCampaign(
    projectId: string,
    campaignId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }
      
      const updatedCampaigns = [...(project.linkedCampaigns || []), campaignId];
      
      await this.update(projectId, {
        linkedCampaigns: updatedCampaigns
      }, context);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Holt verknüpfte Kampagnen eines Projekts
   */
  async getLinkedCampaigns(
    projectId: string,
    context: { organizationId: string }
  ): Promise<PRCampaign[]> {
    try {
      const project = await this.getById(projectId, context);
      
      if (!project?.linkedCampaigns || project.linkedCampaigns.length === 0) {
        return [];
      }
      
      // Dynamischer Import um circular dependencies zu vermeiden
      const { prService } = await import('./pr-service');
      
      const campaigns = await Promise.all(
        project.linkedCampaigns.map(campaignId => 
          prService.getById(campaignId)
        )
      );
      
      return campaigns
        .filter(Boolean)
        .filter(campaign => campaign!.organizationId === context.organizationId) as PRCampaign[];
    } catch (error) {
      return [];
    }
  },

  /**
   * ✅ Plan 2/9: Holt Projekte nach Kunde (Client-Filter)
   */
  async getProjectsByClient(
    organizationId: string, 
    clientId: string
  ): Promise<Project[]> {
    try {
      const q = query(
        collection(db, 'projects'),
        where('organizationId', '==', organizationId),
        where('customer.id', '==', clientId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
    } catch (error) {
      console.error('Fehler beim Laden der Projekte nach Kunde:', error);
      return [];
    }
  },

  /**
   * ✅ Plan 2/9: Holt alle aktiven Projekte einer Organisation
   */
  async getActiveProjects(organizationId: string): Promise<Project[]> {
    try {
      const q = query(
        collection(db, 'projects'),
        where('organizationId', '==', organizationId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
    } catch (error) {
      console.error('Fehler beim Laden der aktiven Projekte:', error);
      return [];
    }
  },

  /**
   * Löscht ein Projekt
   */
  async delete(
    projectId: string, 
    context: { organizationId: string }
  ): Promise<void> {
    try {
      // Sicherheitsprüfung
      const existing = await this.getById(projectId, context);
      if (!existing) {
        throw new Error('Projekt nicht gefunden oder keine Berechtigung');
      }
      
      await deleteDoc(doc(db, 'projects', projectId));
    } catch (error) {
      throw error;
    }
  },

  // ========================================
  // Approval-Integration Methoden (Plan 3/9)
  // ========================================
  
  /**
   * Holt verknüpfte Approvals eines Projekts
   */
  async getLinkedApprovals(
    projectId: string,
    context: { organizationId: string }
  ): Promise<any[]> {
    try {
      // Dynamic import um circular dependencies zu vermeiden
      const { approvalService } = await import('./approval-service');
      
      const q = query(
        collection(db, 'approvals'),
        where('projectId', '==', projectId),
        where('organizationId', '==', context.organizationId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const approvals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return approvals;
    } catch (error) {
      console.error('Fehler beim Laden der Projekt-Approvals:', error);
      return [];
    }
  },
  
  /**
   * Stage-Transition mit Approval-Validation
   */
  async updateStage(
    projectId: string,
    newStage: any,
    transitionData: any,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Validierung: Wenn zu Distribution-Phase gewechselt wird,
      // prüfe ob Customer-Approval vorhanden und approved ist
      if (newStage === 'distribution') {
        const { approvalService } = await import('./approval-service');
        
        const approval = await approvalService.getByProjectId(projectId, context);
        
        if (!approval || approval.status !== 'approved') {
          throw new Error('Kunden-Freigabe erforderlich vor Distribution-Phase');
        }
      }
      
      // Standard Update-Logik
      await this.update(projectId, {
        currentStage: newStage,
        updatedAt: Timestamp.now()
      }, context);
      
      // Falls Transition-Daten vorhanden, erweitere das Update
      if (transitionData && Object.keys(transitionData).length > 0) {
        await this.update(projectId, {
          ...transitionData,
          stageUpdatedAt: Timestamp.now(),
          stageUpdatedBy: context.userId
        }, context);
      }
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Pipeline-Status eines Projekts abfragen
   */
  async getProjectPipelineStatus(
    projectId: string,
    context: { organizationId: string }
  ): Promise<{
    currentStage: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
    canProgress: boolean;
    nextStage?: string;
    blockedReason?: string;
  }> {
    try {
      const project = await this.getById(projectId, context);
      
      if (!project) {
        return {
          currentStage: 'unknown',
          canProgress: false,
          blockedReason: 'Projekt nicht gefunden'
        };
      }
      
      // Bestimme nächste Stage
      const stageOrder: any[] = ['creation', 'review', 'approval', 'distribution', 'completed'];
      const currentIndex = stageOrder.indexOf(project.currentStage);
      const nextStage = currentIndex >= 0 && currentIndex < stageOrder.length - 1 
        ? stageOrder[currentIndex + 1] 
        : undefined;
      
      // Prüfe Approval-Status wenn in Approval-Phase
      let approvalStatus: any = null;
      let canProgress = true;
      let blockedReason: string | undefined;
      
      if (project.currentStage === 'approval' || nextStage === 'distribution') {
        try {
          const { approvalService } = await import('./approval-service');
          const approval = await approvalService.getByProjectId(projectId, context);
          
          if (approval) {
            approvalStatus = approval.status === 'approved' ? 'approved' :
                           approval.status === 'rejected' ? 'rejected' : 'pending';
                           
            if (nextStage === 'distribution' && approval.status !== 'approved') {
              canProgress = false;
              blockedReason = 'Kunden-Freigabe ausstehend';
            }
          } else if (nextStage === 'distribution') {
            canProgress = false;
            blockedReason = 'Keine Freigabe gefunden';
          }
        } catch (error) {
          console.error('Fehler beim Prüfen des Approval-Status:', error);
        }
      }
      
      return {
        currentStage: project.currentStage,
        approvalStatus,
        canProgress,
        nextStage,
        blockedReason
      };
    } catch (error) {
      return {
        currentStage: 'unknown',
        canProgress: false,
        blockedReason: 'Fehler beim Laden des Pipeline-Status'
      };
    }
  }
};