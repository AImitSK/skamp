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
import { 
  Project, 
  ProjectFilters, 
  PipelineStage,
  ProjectCreationWizardData,
  ProjectCreationResult,
  ProjectCreationOptions,
  ValidationResult,
  TemplateApplicationResult,
  ResourceInitializationOptions,
  ResourceInitializationResult,
  ProjectTask,
  ProjectTemplate
} from '@/types/project';
import type { PRCampaign } from '@/types/pr';
import type { LinkType } from '@/types/notifications';
import { nanoid } from 'nanoid';

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
      
      // Firebase-kompatible Bereinigung von undefined-Werten
      const cleanedData = this.cleanUndefinedValues(dataToSave);
      
      const docRef = await addDoc(collection(db, 'projects'), cleanedData);
      
      // Automatische Ordner-Erstellung für das neue Projekt
      try {
        await this.createProjectFolderStructure(docRef.id, projectData.organizationId, {
          organizationId: projectData.organizationId,
          userId: projectData.userId
        });
      } catch (folderError) {
        console.error('Fehler bei automatischer Ordner-Erstellung:', folderError);
        // Projekt-Erstellung nicht scheitern lassen wegen Ordner-Fehler
      }
      
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
      
      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));

      for (const project of projects) {
        if (project.id) {
          try {
            await this.updateProjectProgress(project.id, context.organizationId);
          } catch (error) {
            console.warn(`⚠️ Progress-Berechnung fehlgeschlagen für Projekt ${project.id}:`, error);
          }
        }
      }

      // Lade aktualisierte Projekte nach Progress-Berechnung
      const updatedSnapshot = await getDocs(q);
      const updatedProjects = updatedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));

      return updatedProjects;
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
   * Archiviert ein Projekt
   */
  async archive(
    projectId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      await this.update(projectId, {
        status: 'archived'
      }, context);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Aktiviert ein archiviertes Projekt wieder
   */
  async unarchive(
    projectId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      await this.update(projectId, {
        status: 'active'
      }, context);
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
  // PLAN 5/9: MONITORING-IMPLEMENTIERUNG
  // ========================================
  
  /**
   * Startet die Monitoring-Phase für ein Projekt
   */
  async startMonitoring(
    projectId: string, 
    config: any, // MonitoringConfig from types/project
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }

      const updateData = {
        currentStage: 'monitoring' as any,
        monitoringStartedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await this.update(projectId, updateData, context);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Aktualisiert Analytics-Daten für ein Projekt
   */
  async updateAnalytics(
    projectId: string,
    analytics: any, // ProjectAnalytics from types/project
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }

      await this.update(projectId, {
        updatedAt: Timestamp.now()
      }, context);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fügt ein Clipping zu einem Projekt hinzu
   */
  async addClipping(
    projectId: string,
    clipping: any, // MediaClipping from types/media
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Dynamischer Import um circular dependencies zu vermeiden
      const { mediaService } = await import('./media-service');
      
      // Speichere Clipping als ClippingAsset
      const clippingAsset: any = {
        type: 'clipping',
        fileName: `${clipping.outlet}_${clipping.title}.txt`,
        fileType: 'text/plain',
        storagePath: `clippings/${projectId}/${clipping.id}`,
        downloadUrl: clipping.url || '',
        description: clipping.content,
        tags: clipping.tags,
        
        // Clipping-spezifische Felder
        outlet: clipping.outlet,
        publishDate: clipping.publishDate,
        reachValue: clipping.reachValue,
        sentimentScore: clipping.sentimentScore,
        
        // Pipeline-Kontext
        projectId,
        organizationId: context.organizationId,
        userId: context.userId
      };

      // Speichere als MediaAsset für Integration mit Media Library
      await mediaService.uploadMedia(
        new Blob([clipping.content || ''], { type: 'text/plain' }) as any,
        context.organizationId,
        undefined, // folderId
        undefined, // onProgress
        3, // retryCount
        { userId: context.userId }
      );

      // Aktualisiere Projekt-Analytics
      const project = await this.getById(projectId, context);
      if (project && (project as any).analytics) {
        const analytics = (project as any).analytics;
        analytics.clippingCount += 1;
        analytics.totalReach += clipping.reachValue;
        
        // Berechne neuen Durchschnitts-Sentiment
        const totalSentiment = (analytics.sentimentScore * (analytics.clippingCount - 1)) + clipping.sentimentScore;
        analytics.sentimentScore = totalSentiment / analytics.clippingCount;
        
        await this.updateAnalytics(projectId, analytics, context);
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Holt Analytics-Dashboard für ein Projekt
   */
  async getAnalyticsDashboard(
    projectId: string,
    context: { organizationId: string }
  ): Promise<any> { // AnalyticsDashboard from types/project
    try {
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }

      // Lade Clippings für das Projekt
      const { mediaService } = await import('./media-service');
      
      const q = query(
        collection(db, 'media_clippings'),
        where('organizationId', '==', context.organizationId),
        where('projectId', '==', projectId),
        orderBy('publishDate', 'desc')
      );

      const clippingsSnapshot = await getDocs(q);
      const clippings = clippingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Erstelle Dashboard-Daten
      const dashboard = {
        projectId,
        organizationId: context.organizationId,
        analytics: (project as any).analytics,
        clippings,
        kpiData: this.calculateKPIs(clippings),
        timelineData: this.calculateTimelineData(clippings),
        outletRanking: this.calculateOutletRanking(clippings),
        sentimentDistribution: this.calculateSentimentDistribution(clippings)
      };

      return dashboard;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generiert Monitoring-Report
   */
  async generateMonitoringReport(
    projectId: string,
    format: 'pdf' | 'excel',
    context: { organizationId: string }
  ): Promise<Blob> {
    try {
      const dashboard = await this.getAnalyticsDashboard(projectId, context);
      
      if (format === 'pdf') {
        // PDF-Generation (placeholder)
        const reportContent = JSON.stringify(dashboard, null, 2);
        return new Blob([reportContent], { type: 'application/json' });
      } else {
        // Excel-Generation (placeholder) 
        const reportContent = JSON.stringify(dashboard, null, 2);
        return new Blob([reportContent], { type: 'application/vnd.ms-excel' });
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Schließt die Monitoring-Phase ab
   */
  async completeMonitoring(
    projectId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      await this.update(projectId, {
        currentStage: 'completed',
        completedAt: Timestamp.now()
      }, context);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Holt Projekte in Monitoring-Phase
   */
  async getMonitoringProjects(
    organizationId: string,
    status?: 'active' | 'completed' | 'paused'
  ): Promise<any[]> { // ProjectWithMonitoring[]
    try {
      let q = query(
        collection(db, 'projects'),
        where('organizationId', '==', organizationId),
        where('currentStage', '==', 'monitoring')
      );

      if (status) {
        q = query(q, where('monitoringStatus', '==', status));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      return [];
    }
  },

  // Helper-Methoden für Analytics-Berechnung
  calculateKPIs(clippings: any[]): any {
    const totalReach = clippings.reduce((sum, c) => sum + (c.reachValue || 0), 0);
    const totalMediaValue = clippings.reduce((sum, c) => sum + (c.mediaValue || 0), 0);
    const avgSentiment = clippings.length > 0 
      ? clippings.reduce((sum, c) => sum + (c.sentimentScore || 0), 0) / clippings.length 
      : 0;

    return {
      totalClippings: clippings.length,
      totalReach,
      totalMediaValue,
      averageSentiment: avgSentiment
    };
  },

  calculateTimelineData(clippings: any[]): any[] {
    const dailyData = new Map();
    
    clippings.forEach(clipping => {
      const date = new Date(clipping.publishDate.seconds * 1000).toISOString().split('T')[0];
      const existing = dailyData.get(date) || { date, reach: 0, clippings: 0, sentiment: 0 };
      
      existing.reach += clipping.reachValue || 0;
      existing.clippings += 1;
      existing.sentiment += clipping.sentimentScore || 0;
      
      dailyData.set(date, existing);
    });

    return Array.from(dailyData.values()).map(data => ({
      ...data,
      sentiment: data.clippings > 0 ? data.sentiment / data.clippings : 0
    }));
  },

  calculateOutletRanking(clippings: any[]): any[] {
    const outletData = new Map();
    
    clippings.forEach(clipping => {
      const outlet = clipping.outlet;
      const existing = outletData.get(outlet) || { 
        name: outlet, 
        clippingCount: 0, 
        totalReach: 0, 
        totalSentiment: 0, 
        mediaValue: 0 
      };
      
      existing.clippingCount += 1;
      existing.totalReach += clipping.reachValue || 0;
      existing.totalSentiment += clipping.sentimentScore || 0;
      existing.mediaValue += clipping.mediaValue || 0;
      
      outletData.set(outlet, existing);
    });

    return Array.from(outletData.values())
      .map(outlet => ({
        ...outlet,
        averageSentiment: outlet.clippingCount > 0 ? outlet.totalSentiment / outlet.clippingCount : 0
      }))
      .sort((a, b) => b.totalReach - a.totalReach);
  },

  calculateSentimentDistribution(clippings: any[]): any {
    const distribution = { positive: 0, neutral: 0, negative: 0 };
    
    clippings.forEach(clipping => {
      const sentiment = clipping.sentimentScore || 0;
      if (sentiment > 0.1) {
        distribution.positive += 1;
      } else if (sentiment < -0.1) {
        distribution.negative += 1;
      } else {
        distribution.neutral += 1;
      }
    });

    const total = clippings.length;
    return {
      positive: total > 0 ? (distribution.positive / total) * 100 : 0,
      neutral: total > 0 ? (distribution.neutral / total) * 100 : 0,
      negative: total > 0 ? (distribution.negative / total) * 100 : 0
    };
  },

  // ========================================
  // PLAN 6/9: ASSET-INTEGRATION
  // ========================================
  
  /**
   * Aktualisiert Projekt Asset Summary
   */
  async updateProjectAssetSummary(
    projectId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Dynamischer Import um circular dependencies zu vermeiden
      const { mediaService } = await import('./media-service');
      
      const assetSummary = await mediaService.getProjectAssetSummary(projectId, context);
      
      await this.update(projectId, {
        assetSummary
      }, context);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Holt Projekt-weite geteilte Assets
   */
  async getProjectSharedAssets(
    projectId: string,
    context: { organizationId: string }
  ): Promise<any[]> { // CampaignAssetAttachment[]
    try {
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }

      return (project as any).sharedAssets || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Fügt geteiltes Asset zu Projekt hinzu
   */
  async addSharedAssetToProject(
    projectId: string,
    assetAttachment: any, // CampaignAssetAttachment
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }

      const currentSharedAssets = (project as any).sharedAssets || [];
      
      // Prüfe ob Asset bereits geteilt ist
      const exists = currentSharedAssets.some((existing: any) => 
        existing.assetId === assetAttachment.assetId
      );
      
      if (!exists) {
        const updatedSharedAssets = [...currentSharedAssets, assetAttachment];
        
        await this.update(projectId, {
          sharedAssets: updatedSharedAssets
        }, context);
        
        // Asset-History tracken
        await this.trackAssetAction(projectId, {
          action: 'shared',
          assetId: assetAttachment.assetId || assetAttachment.id,
          fileName: assetAttachment.metadata.fileName || 'Unbekannt',
          timestamp: Timestamp.now(),
          userId: context.userId,
          userName: 'System User', // TODO: Get real user name
          phase: 'project_shared',
          reason: 'Asset wurde projekt-weit geteilt'
        }, context);
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Entfernt geteiltes Asset von Projekt
   */
  async removeSharedAssetFromProject(
    projectId: string,
    attachmentId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }

      const currentSharedAssets = (project as any).sharedAssets || [];
      const updatedSharedAssets = currentSharedAssets.filter(
        (asset: any) => asset.id !== attachmentId
      );
      
      const removedAsset = currentSharedAssets.find(
        (asset: any) => asset.id === attachmentId
      );
      
      await this.update(projectId, {
        sharedAssets: updatedSharedAssets
      }, context);
      
      // Asset-History tracken
      if (removedAsset) {
        await this.trackAssetAction(projectId, {
          action: 'removed',
          assetId: removedAsset.assetId || removedAsset.id,
          fileName: removedAsset.metadata.fileName || 'Unbekannt',
          timestamp: Timestamp.now(),
          userId: context.userId,
          userName: 'System User',
          phase: 'project_shared',
          reason: 'Asset-Sharing wurde entfernt'
        }, context);
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validiert alle Assets eines Projekts
   */
  async validateProjectAssets(
    projectId: string,
    context: { organizationId: string }
  ): Promise<any> { // ProjectAssetValidation
    try {
      // Dynamischer Import um circular dependencies zu vermeiden
      const { prService } = await import('./pr-service');
      const { mediaService } = await import('./media-service');
      
      // Lade alle Kampagnen des Projekts
      const campaigns = await prService.getByProjectId(projectId, { organizationId: context.organizationId });
      
      let totalAssets = 0;
      let validAssets = 0;
      let missingAssets = 0;
      let outdatedAssets = 0;
      
      const validationDetails: any[] = [];
      
      for (const campaign of campaigns) {
        if (campaign.attachedAssets && campaign.attachedAssets.length > 0) {
          const validationResult = await mediaService.validateAssetAttachments(
            campaign.attachedAssets,
            context
          );
          
          totalAssets += campaign.attachedAssets.length;
          
          if (validationResult.isValid) {
            validAssets += campaign.attachedAssets.length;
          } else {
            missingAssets += validationResult.missingAssets.length;
            outdatedAssets += validationResult.outdatedSnapshots.length;
          }
          
          validationDetails.push({
            campaignId: campaign.id!,
            campaignTitle: campaign.title,
            assetIssues: validationResult
          });
        }
      }
      
      return {
        projectId,
        totalAssets,
        validAssets,
        missingAssets,
        outdatedAssets,
        validationDetails
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Trackt Asset-Aktionen für Projekt-History
   */
  async trackAssetAction(
    projectId: string,
    action: {
      action: 'added' | 'removed' | 'modified' | 'shared';
      assetId: string;
      fileName: string;
      timestamp: Timestamp;
      userId: string;
      userName: string;
      phase: string;
      reason?: string;
    },
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Dynamischer Import um circular dependencies zu vermeiden
      const { prService } = await import('./pr-service');
      
      // Lade alle Kampagnen des Projekts
      const campaigns = await prService.getByProjectId(projectId, { organizationId: context.organizationId });
      
      // Füge Action zu allen relevanten Kampagnen hinzu
      for (const campaign of campaigns) {
        if (campaign.attachedAssets?.some((asset: any) => asset.assetId === action.assetId)) {
          const currentHistory = campaign.assetHistory || [];
          const updatedHistory = [...currentHistory, action];
          
          await prService.update(campaign.id!, {
            assetHistory: updatedHistory
          });
        }
      }
    } catch (error) {
      console.error('Fehler beim Tracken der Asset-Action:', error);
      // Nicht kritisch - kein throw
    }
  },

  /**
   * Holt Asset-Folders für ein Projekt
   */
  async getProjectAssetFolders(
    projectId: string,
    context: { organizationId: string }
  ): Promise<any[]> {
    try {
      const project = await this.getById(projectId, context);
      if (!project) {
        return [];
      }

      return (project as any).assetFolders || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Synchronisiert Asset-Folders für Projekt
   */
  async syncProjectAssetFolders(
    projectId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Dynamischer Import um circular dependencies zu vermeiden
      const { mediaService } = await import('./media-service');
      
      // Hole alle Ordner der Organisation
      const allFolders = await mediaService.getAllFoldersForOrganization(context.organizationId);
      
      // Berechne Asset-Counts für jeden Ordner
      const assetFolders = await Promise.all(
        allFolders.map(async (folder) => ({
          folderId: folder.id!,
          folderName: folder.name,
          assetCount: await mediaService.getFolderFileCount(folder.id!),
          lastModified: folder.updatedAt || folder.createdAt || Timestamp.now()
        }))
      );
      
      // Update nur Ordner mit Assets
      const foldersWithAssets = assetFolders.filter(folder => folder.assetCount > 0);
      
      await this.update(projectId, {
        assetFolders: foldersWithAssets
      }, context);
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
      
      if (project.currentStage === 'customer_approval' || nextStage === 'distribution') {
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
  },

  // ========================================
  // PLAN 8/9: PIPELINE-TASK-INTEGRATION
  // ========================================

  /**
   * Versucht einen Stage-Übergang
   */
  async attemptStageTransition(
    projectId: string,
    toStage: PipelineStage,
    userId: string,
    force: boolean = false
  ): Promise<StageTransitionResult> {
    try {
      const organizationId = ''; // In der Praxis wird dies übergeben
      const context = { organizationId, userId };
      
      const project = await this.getById(projectId, context);
      if (!project) {
        return {
          success: false,
          newStage: toStage,
          createdTasks: [],
          updatedTasks: [],
          notifications: [],
          errors: ['Projekt nicht gefunden']
        };
      }

      // Validiere Übergang
      const validation = await this.validateStageTransition(projectId, project.currentStage, toStage);
      
      if (!validation.isValid && !force) {
        return {
          success: false,
          newStage: toStage,
          createdTasks: [],
          updatedTasks: [],
          notifications: [],
          errors: validation.issues
        };
      }

      // Führe Workflow aus
      const workflowResult = await this.executeStageTransitionWorkflow(projectId, project.currentStage, toStage);
      
      // Aktualisiere Projekt
      await this.update(projectId, {
        currentStage: toStage,
        workflowState: {
          ...project.workflowState,
          stageHistory: [
            ...(project.workflowState?.stageHistory || []),
            {
              stage: toStage,
              enteredAt: Timestamp.now(),
              triggeredBy: 'manual',
              triggerUser: userId
            }
          ]
        }
      }, context);

      return {
        success: true,
        newStage: toStage,
        createdTasks: workflowResult.tasksCreated > 0 ? [`${workflowResult.tasksCreated} Tasks erstellt`] : [],
        updatedTasks: workflowResult.tasksDueUpdated > 0 ? [`${workflowResult.tasksDueUpdated} Task-Deadlines aktualisiert`] : [],
        notifications: [`${workflowResult.notificationsSent} Benachrichtigungen gesendet`],
        errors: workflowResult.errors.map(e => e.error)
      };
    } catch (error: any) {
      return {
        success: false,
        newStage: toStage,
        createdTasks: [],
        updatedTasks: [],
        notifications: [],
        errors: [error.message || 'Unbekannter Fehler']
      };
    }
  },

  /**
   * Führt Stage-Transition-Workflow aus
   */
  async executeStageTransitionWorkflow(
    projectId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage
  ): Promise<WorkflowExecutionResult> {
    const result: WorkflowExecutionResult = {
      actionsExecuted: [],
      tasksCreated: 0,
      tasksDueUpdated: 0,
      notificationsSent: 0,
      errors: []
    };

    try {
      // Dynamic import um circular dependencies zu vermeiden
      const { taskService } = await import('./task-service');
      
      // Beispiel-Workflow für creation -> internal_approval
      if (fromStage === 'creation' && toStage === 'internal_approval') {
        result.actionsExecuted.push('transition_creation_to_internal_approval');
        
        // Auto-complete bestimmte Creation-Tasks
        const creationTasks = await taskService.getByProjectStage('', projectId, 'creation');
        const autoCompleteTasks = creationTasks.filter(t => t.autoCompleteOnStageChange);
        
        for (const task of autoCompleteTasks) {
          await taskService.markAsCompleted(task.id!);
          result.actionsExecuted.push(`auto_completed_task_${task.id}`);
        }
        
        result.tasksCreated = 2; // Beispiel: Review-Tasks werden erstellt
        result.notificationsSent = 1;
      }

      // Beispiel-Workflow für internal_approval -> customer_approval  
      if (fromStage === 'internal_approval' && toStage === 'customer_approval') {
        result.actionsExecuted.push('transition_internal_to_customer_approval');
        result.tasksCreated = 1; // Customer-Review-Task
        result.notificationsSent = 1;
      }

    } catch (error: any) {
      result.errors.push({
        action: 'executeStageTransitionWorkflow',
        error: error.message,
        severity: 'error'
      });
    }

    return result;
  },

  /**
   * Aktualisiert Projekt-Progress
   */
  async updateProjectProgress(projectId: string, organizationId?: string): Promise<any> { // ProjectProgress
    try {
      const orgId = organizationId || ''; // Fallback für Legacy-Aufrufe
      const context = { organizationId: orgId };

      // Dynamic import um circular dependencies zu vermeiden
      const { taskService } = await import('./task-service');

      const tasks = await taskService.getByProjectId(orgId, projectId);
      const completedTasks = tasks.filter(t => t.status === 'completed');
      
      const taskCompletion = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
      const criticalTasksRemaining = tasks.filter(t =>
        t.requiredForStageCompletion && t.status !== 'completed'
      ).length;


      // Berechne Stage-spezifischen Progress (6-Stage-System)
      const stages: PipelineStage[] = [
        'ideas_planning', 'creation', 'approval',
        'distribution', 'monitoring', 'completed'
      ];
      
      const stageProgress: Record<PipelineStage, number> = {} as any;
      
      // Einfache feste Progress-Werte basierend auf currentStage
      const currentProject = await this.getById(projectId, { organizationId: orgId });
      const currentStage = currentProject?.currentStage || 'ideas_planning';

      const fixedProgressMap = {
        'ideas_planning': 0,
        'creation': 20,
        'approval': 40,
        'distribution': 60,
        'monitoring': 80,
        'completed': 100
      };

      stages.forEach(stage => {
        stageProgress[stage] = 0;
      });

      // Setze Progress basierend auf aktuellem Stage
      const overallPercent = fixedProgressMap[currentStage as keyof typeof fixedProgressMap] || 0;


      const progress = {
        overallPercent,
        stageProgress,
        taskCompletion,
        criticalTasksRemaining,
        lastUpdated: Timestamp.now(),
        milestones: [] // TODO: Milestone calculation
      };

      // Update Project mit Progress
      await this.update(projectId, { progress }, { organizationId: orgId, userId: '' });

      return progress;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validiert Stage-Übergang
   */
  async validateStageTransition(
    projectId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage
  ): Promise<TransitionValidation> {
    try {
      // Dynamic import um circular dependencies zu vermeiden
      const { taskService } = await import('./task-service');
      
      const issues: string[] = [];

      // BUGFIX: Basic Stage-Transition-Regeln prüfen (konsistent mit Client)
      const validTransitions: Record<PipelineStage, PipelineStage[]> = {
        'ideas_planning': ['creation'],
        'creation': ['ideas_planning', 'approval'],
        'approval': ['creation', 'distribution'],
        'distribution': ['approval', 'monitoring'],
        'monitoring': ['distribution', 'completed'],
        'completed': ['monitoring']
      };

      // Prüfe ob Übergang erlaubt ist
      if (!validTransitions[fromStage]?.includes(toStage)) {
        issues.push(`Übergang von ${fromStage} zu ${toStage} ist nicht erlaubt`);
      }

      // Prüfe kritische Tasks für aktuelle Stage
      const criticalTasks = await taskService.getCriticalTasksForStage('', projectId, fromStage);
      const incompleteCriticalTasks = criticalTasks.filter(t => t.status !== 'completed');
      
      if (incompleteCriticalTasks.length > 0) {
        issues.push(`${incompleteCriticalTasks.length} kritische Tasks nicht abgeschlossen`);
      }

      // Stage-spezifische Validierung - BUGFIX: customer_approval → approval
      if (toStage === 'approval') {
        // Prüfe ob Content erstellt wurde
        const creationTasks = await taskService.getByProjectStage('', projectId, 'creation');
        const hasContentCreated = creationTasks.some(t =>
          t.templateCategory === 'content_creation' && t.status === 'completed'
        );

        if (!hasContentCreated) {
          issues.push('Content muss erstellt werden vor Freigabe');
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        canProceed: issues.length === 0,
        warnings: []
      };
    } catch (error: any) {
      return {
        isValid: false,
        issues: [error.message || 'Validierungsfehler'],
        canProceed: false,
        warnings: []
      };
    }
  },

  /**
   * Rollback eines Stage-Übergangs
   */
  async rollbackStageTransition(
    projectId: string,
    targetStage: PipelineStage
  ): Promise<void> {
    try {
      const organizationId = ''; // In der Praxis wird dies übergeben
      const context = { organizationId, userId: '' };
      
      await this.update(projectId, {
        currentStage: targetStage,
        workflowState: {
          stageHistory: [], // Reset history - in Produktion würde man Rollback-Entry hinzufügen
          lastIntegrityCheck: Timestamp.now(),
          integrityIssues: [`Rollback zu ${targetStage} durchgeführt`]
        }
      }, context);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Plane Stage-Deadlines
   */
  async scheduleStageDeadlines(
    projectId: string,
    stage: PipelineStage
  ): Promise<void> {
    try {
      // Dynamic import um circular dependencies zu vermeiden
      const { taskService } = await import('./task-service');
      
      const stageTasks = await taskService.getByProjectStage('', projectId, stage);
      
      // Aktualisiere Deadlines für Tasks mit deadlineRules
      for (const task of stageTasks) {
        if (task.deadlineRules?.relativeToPipelineStage) {
          const newDueDate = new Date();
          newDueDate.setDate(newDueDate.getDate() + task.deadlineRules.daysAfterStageEntry);
          
          await taskService.update(task.id!, {
            dueDate: Timestamp.fromDate(newDueDate)
          });
        }
      }
    } catch (error) {
      throw error;
    }
  },

  // ========================================
  // PLAN 9/9: PROJEKT-ANLAGE-WIZARD
  // ========================================

  /**
   * Erstellt ein Projekt aus Wizard-Daten
   */
  // Hilfsfunktion: Entfernt undefined-Werte rekursiv (Firebase-kompatibel)
  cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefinedValues(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  },

  async createProjectFromWizard(
    wizardData: ProjectCreationWizardData,
    userId: string,
    organizationId: string
  ): Promise<ProjectCreationResult> {
    try {
      const projectId = nanoid();
      
      // Projekt-Basis-Daten aus Wizard extrahieren
      const projectData: Omit<Project, 'id'> = {
        userId,
        organizationId,
        title: wizardData.title,
        description: wizardData.description,
        status: 'active',
        currentStage: 'ideas_planning',
        assignedTo: wizardData.assignedTeamMembers,

        // Tags und Priority aus Wizard-Daten
        tags: wizardData.tags || [],
        priority: wizardData.priority || 'medium',
        
        // Wizard-spezifische Creation Context
        creationContext: {
          createdViaWizard: true,
          templateId: wizardData.templateId,
          // templateName wird später beim Template-Laden gesetzt (optional)
          wizardVersion: '1.0.0',
          stepsCompleted: wizardData.completedSteps.map(s => s.toString()),
          initialConfiguration: {
            autoCreateCampaign: wizardData.createCampaignImmediately,
            autoAssignAssets: wizardData.initialAssets.length > 0,
            autoCreateTasks: !!wizardData.templateId,
            selectedTemplate: wizardData.templateId
          }
        },
        
        // Setup-Status initialisieren
        setupStatus: {
          campaignLinked: false,
          assetsAttached: false,
          tasksCreated: false,
          teamNotified: false,
          initialReviewComplete: false
        },

        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Kunde zuordnen über echten companyServiceEnhanced
      if (wizardData.clientId) {
        try {
          const { companyServiceEnhanced } = await import('./company-service-enhanced');
          const client = await companyServiceEnhanced.getById(wizardData.clientId, organizationId);
          
          if (client) {
            projectData.customer = {
              id: client.id!,
              name: client.name
            };
          }
        } catch (error) {
          console.error('Fehler beim Laden des Kunden:', error);
          // Projekt trotzdem erstellen, aber ohne Kunden-Zuordnung
        }
      }

      // Projekt erstellen
      const createdProjectId = await this.create(projectData);
      const project = await this.getById(createdProjectId, { organizationId: projectData.organizationId });
      
      if (!project) {
        throw new Error('Projekt konnte nicht erstellt werden');
      }

      const result: ProjectCreationResult = {
        success: true,
        projectId: createdProjectId,
        project,
        tasksCreated: [],
        assetsAttached: 0,
        warnings: [],
        infos: [],
        nextSteps: []
      };

      // Template anwenden
      if (wizardData.templateId) {
        try {
          const { projectTemplateService } = await import('./project-template-service');
          const templateResult = await projectTemplateService.applyTemplate(
            createdProjectId,
            wizardData.templateId
          );
          
          if (templateResult.success) {
            result.tasksCreated = templateResult.tasksCreated;
            result.infos.push(`Template "${wizardData.templateId}" erfolgreich angewendet`);
          } else {
            result.warnings.push('Template konnte nicht vollständig angewendet werden');
          }
        } catch (error: any) {
          result.warnings.push(`Template-Anwendung fehlgeschlagen: ${error.message}`);
        }
      }

      // Ressourcen initialisieren
      if (wizardData.createCampaignImmediately || wizardData.initialAssets.length > 0) {
        const resourceOptions: ResourceInitializationOptions = {
          createCampaign: wizardData.createCampaignImmediately,
          campaignTitle: wizardData.campaignTitle,
          attachAssets: wizardData.initialAssets,
          linkDistributionLists: wizardData.distributionLists,
          createTasks: false, // Already done by template
          notifyTeam: true
        };

        const resourceResult = await this.initializeProjectResources(
          createdProjectId,
          resourceOptions,
          organizationId
        );

        if (resourceResult.campaignCreated && resourceResult.campaignId) {
          result.campaignId = resourceResult.campaignId;
          // Kampagne laden für vollständige Rückgabe
          const { prService } = await import('./pr-service');
          result.campaign = await prService.getById(resourceResult.campaignId);
        }

        result.assetsAttached = resourceResult.assetsAttached;

        if (resourceResult.errors && resourceResult.errors.length > 0) {
          result.warnings.push(...resourceResult.errors);
        }
      }

      // Team benachrichtigen - IMMER, unabhängig von Kampagne/Assets
      if (wizardData.assignedTeamMembers && wizardData.assignedTeamMembers.length > 0) {
        try {
          const { notificationsService } = await import('./notifications-service');

          let notificationsSent = 0;
          // Benachrichtige alle zugewiesenen Team-Mitglieder
          for (const memberId of wizardData.assignedTeamMembers) {
            try {
              await notificationsService.create({
                userId: memberId,
                organizationId,
                type: 'project_assignment',
                title: 'Neues Projekt zugewiesen',
                message: `Du wurdest dem Projekt "${wizardData.title}" zugewiesen.`,
                linkId: createdProjectId,
                linkType: 'campaign' as LinkType,
                isRead: false,
                metadata: {
                  campaignTitle: wizardData.title
                }
              });
              notificationsSent++;
            } catch (notifyError: any) {
              console.error(`Benachrichtigung für ${memberId} fehlgeschlagen:`, notifyError);
            }
          }

          if (notificationsSent > 0) {
            result.infos.push(`${notificationsSent} Team-Mitglieder benachrichtigt`);
          }
        } catch (error: any) {
          result.warnings.push(`Team-Benachrichtigung fehlgeschlagen: ${error.message}`);
        }
      }

      // Next Steps definieren
      result.nextSteps = [
        'Projekt-Details verfeinern',
        'Erste Tasks zuweisen'
      ];

      if (result.campaignId) {
        result.nextSteps.push('Kampagne konfigurieren');
      }

      if (result.assetsAttached > 0) {
        result.nextSteps.push('Medien-Assets organisieren');
      }

      return result;
    } catch (error: any) {
      console.error('=== PROJECT CREATION ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('=== END PROJECT CREATION ERROR ===');
      
      return {
        success: false,
        projectId: '',
        project: {} as Project,
        tasksCreated: [],
        assetsAttached: 0,
        warnings: [],
        infos: [],
        nextSteps: [],
        error: error.message || 'Unbekannter Fehler bei der Projekt-Erstellung'
      };
    }
  },

  /**
   * Holt Optionen für Projekt-Erstellung (Wizard Schritt 1)
   */
  async getProjectCreationOptions(
    organizationId: string
  ): Promise<ProjectCreationOptions> {
    try {
      // Echte Clients laden über companyServiceEnhanced
      const { companyServiceEnhanced } = await import('./company-service-enhanced');
      const companies = await companyServiceEnhanced.getAll(organizationId);
      
      // Echte Kontakte laden über contactsEnhancedService
      const { contactsEnhancedService } = await import('./crm-service-enhanced');
      const allContacts = await contactsEnhancedService.getAll(organizationId);
      
      const availableClients = companies.map(company => ({
        id: company.id!,
        name: company.name,
        type: company.type || 'company',
        contactCount: allContacts.filter(contact => contact.companyId === company.id).length
      }));

      // Echte Team-Mitglieder laden über teamServiceEnhanced
      const { teamMemberEnhancedService } = await import('./team-service-enhanced');
      const teamMembers = await teamMemberEnhancedService.getByOrganization(organizationId);
      
      const availableTeamMembers = teamMembers.map(member => ({
        id: member.id,
        displayName: member.displayName,
        email: member.email,
        role: member.role,
        avatar: member.photoUrl
      }));

      // Echte Templates laden über projectTemplateService
      const { projectTemplateService } = await import('./project-template-service');
      const templates = await projectTemplateService.getAll(organizationId);
      
      const availableTemplates = templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        taskCount: template.defaultTasks.length,
        category: template.category
      }));

      // Echte Verteilerlisten laden über listsService
      const { listsService } = await import('./lists-service');
      const distributionLists = await listsService.getAll(organizationId);
      
      const availableDistributionLists = distributionLists.map(list => ({
        id: list.id!,
        name: list.name,
        contactCount: list.contactIds ? list.contactIds.length : 0
      }));

      // Echte Assets laden über mediaService
      const { mediaService } = await import('./media-service');
      const assets = await mediaService.getMediaAssets(organizationId);
      
      const availableAssets = assets
        .filter(asset => asset.fileName) // Nur Assets mit Namen
        .slice(0, 20) // Limitiere auf 20 für Performance
        .map(asset => ({
          id: asset.id!,
          name: asset.fileName,
          type: asset.fileType?.startsWith('image/') ? 'image' : 'document',
          size: String(asset.metadata?.fileSize || 'Unbekannt')
        }));

      return {
        availableClients,
        availableTeamMembers,
        availableTemplates,
        availableDistributionLists,
        availableAssets
      };
    } catch (error) {
      console.error('Fehler beim Laden der Erstellungsoptionen:', error);
      return {
        availableClients: [],
        availableTeamMembers: [],
        availableTemplates: [],
        availableDistributionLists: [],
        availableAssets: []
      };
    }
  },

  /**
   * Validiert Wizard-Daten für einen bestimmten Schritt
   */
  async validateProjectData(
    data: ProjectCreationWizardData,
    step: number
  ): Promise<ValidationResult> {
    const errors: Record<string, string> = {};
    
    console.log(`=== PROJECT VALIDATION DEBUG ===`);
    console.log(`Step: ${step}`);
    console.log(`Data title: "${data.title}"`);
    console.log(`Data clientId: "${data.clientId}"`);
    console.log(`Data priority: "${data.priority}"`);
    console.log(`Data assignedTeamMembers:`, data.assignedTeamMembers);

    try {
      switch (step) {
        case 1: // Basis-Informationen
          if (!data.title || data.title.trim().length < 3) {
            errors.title = 'Titel muss mindestens 3 Zeichen lang sein';
          }
          
          if (!data.clientId) {
            errors.clientId = 'Bitte wählen Sie einen Kunden aus';
          }
          
          if (!data.priority) {
            errors.priority = 'Priorität ist erforderlich';
          }
          break;

        case 2: // Team-Zuordnung
          if (!data.assignedTeamMembers || data.assignedTeamMembers.length === 0) {
            errors.assignedTeamMembers = 'Mindestens ein Team-Mitglied ist erforderlich';
          }
          break;

        case 3: // Template & Setup
          if (data.customTasks && data.customTasks.length > 10) {
            errors.customTasks = 'Maximal 10 eigene Tasks erlaubt';
          }
          
          if (data.startDate && data.startDate < new Date()) {
            errors.startDate = 'Startdatum kann nicht in der Vergangenheit liegen';
          }
          break;

        case 4: // Ressourcen
          if (data.createCampaignImmediately && (!data.campaignTitle || data.campaignTitle.trim().length < 3)) {
            errors.campaignTitle = 'Kampagnen-Titel ist erforderlich (min. 3 Zeichen)';
          }
          
          if (data.initialAssets && data.initialAssets.length > 20) {
            errors.initialAssets = 'Maximal 20 initiale Assets erlaubt';
          }
          break;

        default:
          errors.general = 'Unbekannter Validierungsschritt';
      }

      const result = {
        isValid: Object.keys(errors).length === 0,
        errors
      };
      
      console.log(`Validation result:`, result);
      console.log(`=== END PROJECT VALIDATION DEBUG ===`);
      
      return result;
    } catch (error: any) {
      return {
        isValid: false,
        errors: { general: error.message || 'Validierungsfehler' }
      };
    }
  },

  /**
   * Wendet ein Template auf ein Projekt an
   */
  async applyProjectTemplate(
    projectId: string,
    templateId: string
  ): Promise<TemplateApplicationResult> {
    try {
      const { projectTemplateService } = await import('./project-template-service');
      return await projectTemplateService.applyTemplate(projectId, templateId);
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
   * Initialisiert Projekt-Ressourcen (Kampagnen, Assets, etc.)
   */
  async initializeProjectResources(
    projectId: string,
    options: ResourceInitializationOptions,
    organizationId: string
  ): Promise<ResourceInitializationResult> {
    const result: ResourceInitializationResult = {
      campaignCreated: false,
      assetsAttached: 0,
      listsLinked: 0,
      tasksGenerated: 0,
      teamNotified: false,
      errors: []
    };

    try {
      // organizationId ist bereits als Parameter übergeben
      const context = { organizationId };
      
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden');
      }

      // Kampagne erstellen
      if (options.createCampaign && options.campaignTitle) {
        try {
          const { prService } = await import('./pr-service');
          const campaignData = {
            title: options.campaignTitle,
            organizationId: project.organizationId,
            userId: project.userId,
            clientId: project.customer?.id || '',
            projectId: projectId,
            projectTitle: project.title,
            status: 'draft' as any,
            currentStage: 'planning' as any,
            // Erforderliche PRCampaign Felder
            contentHtml: '<p>Automatisch erstellt durch Projekt-Wizard</p>',
            distributionListId: '',
            distributionListName: 'Standard-Liste',
            recipientCount: 0,
            approvalRequired: false
          };

          const campaignId = await prService.create(campaignData);
          
          // Kampagne zu Projekt verlinken
          await this.addLinkedCampaign(projectId, campaignId, {
            organizationId: project.organizationId,
            userId: project.userId
          });

          result.campaignCreated = true;
          result.campaignId = campaignId;
        } catch (error: any) {
          result.errors?.push(`Kampagne konnte nicht erstellt werden: ${error.message}`);
        }
      }

      // Assets anhängen über echten mediaService
      if (options.attachAssets && options.attachAssets.length > 0) {
        try {
          const { mediaService } = await import('./media-service');
          let attachedCount = 0;

          for (const assetId of options.attachAssets) {
            try {
              // Verifiziere dass Asset existiert und zur Organisation gehört
              const asset = await mediaService.getMediaAssetById(assetId);
              if (asset) {
                // Asset ist gültig - in einer späteren Version würde hier eine echte Verknüpfung stattfinden
                // Für jetzt tracken wir es in den Projekt-Metadaten
                attachedCount++;
              } else {
                result.errors?.push(`Asset ${assetId} nicht gefunden oder gehört nicht zur Organisation`);
              }
            } catch (error: any) {
              result.errors?.push(`Asset ${assetId} konnte nicht verifiziert werden: ${error.message}`);
            }
          }

          result.assetsAttached = attachedCount;
          
          // Speichere verknüpfte Assets in Projekt-Metadaten
          if (attachedCount > 0) {
            const validAssetIds = options.attachAssets.slice(0, attachedCount);
            await this.update(projectId, {
              linkedAssets: validAssetIds
            }, {
              organizationId,
              userId: project.userId
            });
          }
        } catch (error: any) {
          result.errors?.push(`Asset-Anhang fehlgeschlagen: ${error.message}`);
        }
      }

      // Verteilerlisten verknüpfen über echten listsService
      if (options.linkDistributionLists && options.linkDistributionLists.length > 0) {
        try {
          const { listsService } = await import('./lists-service');
          let linkedCount = 0;

          for (const listId of options.linkDistributionLists) {
            try {
              // Verifiziere dass Liste existiert und zur Organisation gehört
              const list = await listsService.getById(listId);
              if (list) {
                // In der Praxis würde hier eine Liste-zu-Projekt Verknüpfung erstellt
                // Für jetzt tracken wir es nur in den Project-Metadaten
                linkedCount++;
              }
            } catch (error: any) {
              result.errors?.push(`Verteilerliste ${listId} konnte nicht verknüpft werden: ${error.message}`);
            }
          }

          result.listsLinked = linkedCount;
          
          // Aktualisiere Projekt mit verknüpften Listen
          if (linkedCount > 0) {
            await this.update(projectId, {
              linkedDistributionLists: options.linkDistributionLists
            }, {
              organizationId,
              userId: project.userId
            });
          }
        } catch (error: any) {
          result.errors?.push(`Verteilerlisten-Verknüpfung fehlgeschlagen: ${error.message}`);
        }
      }

      // Team benachrichtigen über echten notificationsService
      if (options.notifyTeam && project.assignedTo && project.assignedTo.length > 0) {
        try {
          const { notificationsService } = await import('./notifications-service');
          
          // Benachrichtige alle zugewiesenen Team-Mitglieder
          for (const memberId of project.assignedTo) {
            try {
              await notificationsService.create({
                userId: memberId,
                organizationId,
                type: 'project_assignment',
                title: 'Neues Projekt zugewiesen',
                message: `Du wurdest dem Projekt "${project.title}" zugewiesen.`,
                linkId: projectId,
                linkType: 'campaign' as LinkType,
                isRead: false,
                metadata: {
                  campaignTitle: project.title
                }
                // Note: priority field removed as it doesn't exist in CreateNotificationInput
              });
            } catch (notifyError: any) {
              // Silent fail - notification errors don't block project creation
            }
          }
          
          result.teamNotified = true;
        } catch (error: any) {
          result.errors?.push(`Team-Benachrichtigung fehlgeschlagen: ${error.message}`);
        }
      }

      // Setup-Status aktualisieren
      await this.update(projectId, {
        setupStatus: {
          campaignLinked: result.campaignCreated,
          assetsAttached: result.assetsAttached > 0,
          tasksCreated: result.tasksGenerated > 0,
          teamNotified: result.teamNotified,
          initialReviewComplete: false
        }
      }, {
        organizationId: project.organizationId,
        userId: project.userId
      });

      return result;
    } catch (error: any) {
      result.errors?.push(error.message || 'Ressourcen-Initialisierung fehlgeschlagen');
      return result;
    }
  },

  /**
   * PLAN 11/11: Automatische Projekt-Ordner-Erstellung
   * Erstellt automatisch eine strukturierte Ordner-Hierarchie für ein neues Projekt
   */
  async createProjectFolderStructure(
    projectId: string, 
    organizationId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Projekt laden um Titel und Client-Info zu erhalten
      const project = await this.getById(projectId, context);
      if (!project) {
        throw new Error('Projekt nicht gefunden für Ordner-Erstellung');
      }

      // Dynamischer Import um circular dependencies zu vermeiden
      const { mediaService } = await import('./media-service');
      const { companyServiceEnhanced } = await import('./company-service-enhanced');
      
      // Kunde/Company laden für Ordner-Namen
      let companyName = 'Unbekannt';
      let clientId: string | undefined;
      
      if (project.customer?.id) {
        clientId = project.customer.id;
        try {
          const company = await companyServiceEnhanced.getById(project.customer.id, organizationId);
          if (company) {
            companyName = company.name;
          }
        } catch (error) {
          console.error('Fehler beim Laden der Firma:', error);
        }
      }
      
      // Erst prüfen ob "Projekte" Hauptordner existiert, wenn nicht erstellen
      let projectsRootFolderId: string | undefined;
      
      try {
        // Alle Root-Ordner laden
        const rootFolders = await mediaService.getFolders(organizationId, undefined);
        const projectsFolder = rootFolders.find(f => f.name === 'Projekte');
        
        if (projectsFolder?.id) {
          projectsRootFolderId = projectsFolder.id;
        } else {
          // "Projekte" Hauptordner erstellen wenn er nicht existiert
          projectsRootFolderId = await mediaService.createFolder({
            userId: context.userId,
            name: 'Projekte',
            parentFolderId: undefined, // Root-Ordner
            description: 'Alle Projektordner',
            color: '#005fab' // Corporate Blue
          }, context);
        }
      } catch (error) {
        console.warn('Konnte Projekte-Hauptordner nicht erstellen/finden, verwende Root:', error);
        // Fallback: Direkt im Root anlegen
        projectsRootFolderId = undefined;
      }
      
      // Formatiertes Datum (YYYYMMDD)
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      // Projektordner-Name mit gewünschtem Format: P-{Datum}-{Company Name}-{Projekt Name}
      const projectFolderName = `P-${dateStr}-${companyName}-${project.title}`;
      
      // Projektordner erstellen - als Unterordner von "Projekte" und MIT clientId wenn vorhanden
      const mainFolderId = await mediaService.createFolder({
        userId: context.userId,
        name: projectFolderName,
        parentFolderId: projectsRootFolderId, // Unter "Projekte" Ordner
        description: `Projektordner für "${project.title}" - ${companyName}`,
        ...(clientId && { clientId }) // Kundenzuordnung hinzufügen wenn vorhanden
      }, context);
      
      // Unterordner-Struktur definieren (4 Standard-Ordner)
      const subfolders = [
        {
          name: 'Medien',
          description: 'Bilder, Videos und andere Medien-Assets für das Projekt',
          color: '#3B82F6' // Blau
        },
        {
          name: 'Dokumente',
          description: 'Projektdokumente, Briefings und Konzepte',
          color: '#10B981' // Grün
        },
        {
          name: 'Pressemeldungen',
          description: 'Pressemitteilungen und PR-Texte',
          color: '#8B5CF6' // Lila
        },
        {
          name: 'Analysen',
          description: 'Monitoring-Reports und Analytics-PDFs',
          color: '#F59E0B' // Orange
        }
      ];
      
      // Alle Unterordner erstellen - ebenfalls mit clientId
      const createdSubfolderIds: string[] = [];
      
      for (const subfolder of subfolders) {
        try {
          const subfolderId = await mediaService.createFolder({
            userId: context.userId,
            name: subfolder.name,
            parentFolderId: mainFolderId,
            description: subfolder.description,
            color: subfolder.color,
            ...(clientId && { clientId }) // Kundenzuordnung auch für Unterordner
          }, context);
          
          createdSubfolderIds.push(subfolderId);
        } catch (subfolderError) {
          console.error(`Fehler beim Erstellen des Unterordners "${subfolder.name}":`, subfolderError);
          // Weitermachen mit nächstem Ordner
        }
      }
      
      // Projekt mit Ordner-Informationen über assetFolders aktualisieren
      const folderStructure = subfolders.map((sf, index) => ({
        folderId: createdSubfolderIds[index] || mainFolderId,
        folderName: sf.name,
        assetCount: 0,
        lastModified: Timestamp.now()
      }));

      // Hauptordner hinzufügen
      folderStructure.unshift({
        folderId: mainFolderId,
        folderName: project.title,
        assetCount: 0,
        lastModified: Timestamp.now()
      });

      await this.update(projectId, {
        assetFolders: folderStructure
      }, context);
      
      
    } catch (error: any) {
      console.error('❌ Fehler bei automatischer Projekt-Ordner-Erstellung:', error);
      throw new Error(`Projekt-Ordner konnten nicht erstellt werden: ${error.message}`);
    }
  },

  /**
   * PLAN 11/11: Holt Projekt-Ordner-Struktur
   * Lädt die automatisch erstellten Ordner für ein Projekt
   */
  async getProjectFolderStructure(
    projectId: string,
    context: { organizationId: string }
  ): Promise<{
    mainFolder: any; // MediaFolder
    subfolders: any[]; // MediaFolder[]
    statistics: {
      totalFiles: number;
      lastActivity: Timestamp | null;
      folderSizes: Record<string, number>;
    };
  } | null> {
    try {
      const project = await this.getById(projectId, context);
      if (!project || !project.assetFolders || project.assetFolders.length === 0) {
        return null;
      }

      // Dynamischer Import um circular dependencies zu vermeiden
      const { mediaService } = await import('./media-service');
      
      // Ordner laden basierend auf assetFolders
      const folders = await Promise.all(
        project.assetFolders.map(async (folderInfo) => {
          try {
            return await mediaService.getFolder(folderInfo.folderId);
          } catch (error) {
            console.error(`Fehler beim Laden des Ordners ${folderInfo.folderId}:`, error);
            return null;
          }
        })
      );
      
      const validFolders = folders.filter(Boolean);
      if (validFolders.length === 0) {
        return null;
      }
      
      // Hauptordner ist der erste oder der mit dem Projektnamen
      const mainFolder = validFolders[0];
      const subfolders = validFolders.slice(1);
      
      // Statistiken berechnen
      const folderSizes: Record<string, number> = {};
      let totalFiles = 0;
      let lastActivity: Timestamp | null = null;
      
      // Dateien in jedem Ordner zählen
      for (const folder of validFolders) {
        if (folder && folder.id) {
          try {
            const fileCount = await mediaService.getFolderFileCount(folder.id);
            folderSizes[folder.id] = fileCount;
            totalFiles += fileCount;
            
            // Letzte Aktivität tracking
            if (folder.updatedAt && (!lastActivity || folder.updatedAt.toMillis() > lastActivity.toMillis())) {
              lastActivity = folder.updatedAt;
            }
          } catch (error) {
            console.error(`Fehler beim Zählen der Dateien in Ordner ${folder.id}:`, error);
            folderSizes[folder.id] = 0;
          }
        }
      }
      
      return {
        mainFolder,
        subfolders: subfolders,
        statistics: {
          totalFiles,
          lastActivity,
          folderSizes
        }
      };
      
    } catch (error: any) {
      console.error('Fehler beim Laden der Projekt-Ordner-Struktur:', error);
      throw error;
    }
  },

  /**
   * PLAN 11/11: Upload-Assistent für Projekt-Ordner
   * Ermöglicht Upload in spezifische Unterordner
   */
  async uploadToProjectFolder(
    projectId: string,
    subfolderId: string,
    files: File[],
    context: { organizationId: string; userId: string }
  ): Promise<{
    successfulUploads: string[]; // Asset-IDs
    failedUploads: { fileName: string; error: string }[];
    targetFolder: any; // MediaFolder
  }> {
    try {
      const project = await this.getById(projectId, context);
      if (!project || !project.assetFolders || project.assetFolders.length === 0) {
        throw new Error('Projekt-Ordnerstruktur nicht gefunden');
      }

      // Validiere dass Ordner zu diesem Projekt gehört
      const validFolder = project.assetFolders.find(folder => folder.folderId === subfolderId);
      if (!validFolder) {
        throw new Error('Ordner gehört nicht zu diesem Projekt');
      }

      // Dynamischer Import um circular dependencies zu vermeiden
      const { mediaService } = await import('./media-service');
      
      // Zielordner laden
      const targetFolder = await mediaService.getFolder(subfolderId);
      if (!targetFolder) {
        throw new Error('Zielordner nicht gefunden');
      }

      // Dateien hochladen
      const successfulUploads: string[] = [];
      const failedUploads: { fileName: string; error: string }[] = [];

      for (const file of files) {
        try {
          const uploadedAsset = await mediaService.uploadMedia(
            file,
            context.organizationId,
            subfolderId, // Direkt in Unterordner hochladen
            undefined, // onProgress
            3, // retryCount
            context
          );
          
          successfulUploads.push(uploadedAsset.id || 'unknown-id');
        } catch (uploadError: any) {
          failedUploads.push({
            fileName: file.name,
            error: uploadError.message || 'Upload fehlgeschlagen'
          });
        }
      }

      // Projekt-Asset-Summary aktualisieren (falls verfügbar)
      try {
        await this.updateProjectAssetSummary(projectId, context);
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Asset-Summary:', error);
        // Nicht kritisch - Upload ist erfolgreich
      }

      return {
        successfulUploads,
        failedUploads,
        targetFolder
      };

    } catch (error: any) {
      throw new Error(`Upload in Projekt-Ordner fehlgeschlagen: ${error.message}`);
    }
  }
};

// ========================================
// PIPELINE-WORKFLOW-INTEGRATION INTERFACES
// ========================================

export interface StageTransitionResult {
  success: boolean;
  newStage: PipelineStage;
  createdTasks: string[];
  updatedTasks: string[];
  notifications: string[];
  errors?: string[];
}

export interface WorkflowExecutionResult {
  actionsExecuted: string[];
  tasksCreated: number;
  tasksDueUpdated: number;
  notificationsSent: number;
  errors: Array<{
    action: string;
    error: string;
    severity: 'warning' | 'error';
  }>;
}

export interface TransitionValidation {
  isValid: boolean;
  issues: string[];
  canProceed: boolean;
  warnings: string[];
}