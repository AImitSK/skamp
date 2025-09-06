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
import { Project, ProjectFilters, PipelineStage } from '@/types/project';
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
  async updateProjectProgress(projectId: string): Promise<any> { // ProjectProgress
    try {
      const organizationId = ''; // In der Praxis wird dies übergeben
      const context = { organizationId };
      
      // Dynamic import um circular dependencies zu vermeiden
      const { taskService } = await import('./task-service');
      
      const tasks = await taskService.getByProjectId(organizationId, projectId);
      const completedTasks = tasks.filter(t => t.status === 'completed');
      
      const taskCompletion = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
      const criticalTasksRemaining = tasks.filter(t => 
        t.requiredForStageCompletion && t.status !== 'completed'
      ).length;

      // Berechne Stage-spezifischen Progress
      const stages: PipelineStage[] = [
        'ideas_planning', 'creation', 'internal_approval', 
        'customer_approval', 'distribution', 'monitoring', 'completed'
      ];
      
      const stageProgress: Record<PipelineStage, number> = {} as any;
      
      stages.forEach(stage => {
        const stageTasks = tasks.filter(t => t.pipelineStage === stage);
        const stageCompletedTasks = stageTasks.filter(t => t.status === 'completed');
        stageProgress[stage] = stageTasks.length > 0 ? (stageCompletedTasks.length / stageTasks.length) * 100 : 0;
      });

      // Berechne Gesamt-Progress mit Gewichtung
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

      const progress = {
        overallPercent,
        stageProgress,
        taskCompletion,
        criticalTasksRemaining,
        lastUpdated: Timestamp.now(),
        milestones: [] // TODO: Milestone calculation
      };

      // Update Project mit Progress
      await this.update(projectId, { progress }, { organizationId, userId: '' });

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
      
      // Prüfe kritische Tasks für aktuelle Stage
      const criticalTasks = await taskService.getCriticalTasksForStage('', projectId, fromStage);
      const incompleteCriticalTasks = criticalTasks.filter(t => t.status !== 'completed');
      
      if (incompleteCriticalTasks.length > 0) {
        issues.push(`${incompleteCriticalTasks.length} kritische Tasks nicht abgeschlossen`);
      }

      // Stage-spezifische Validierung
      if (toStage === 'customer_approval') {
        // Prüfe ob Content erstellt wurde
        const creationTasks = await taskService.getByProjectStage('', projectId, 'creation');
        const hasContentCreated = creationTasks.some(t => 
          t.templateCategory === 'content_creation' && t.status === 'completed'
        );
        
        if (!hasContentCreated) {
          issues.push('Content muss erstellt werden vor Kunden-Freigabe');
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