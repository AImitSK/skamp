// src/lib/firebase/pr-service.ts - FINALE, VOLLSTÄNDIGE VERSION mit Multi-Tenancy und Enhanced Approval Integration
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
  writeBatch,
  Timestamp,
  limit,
  arrayUnion
} from 'firebase/firestore';
import { db } from './client-init';
import { PRCampaign, CampaignAssetAttachment, ApprovalData } from '@/types/pr';
import { mediaService } from './media-service';
import { ShareLink } from '@/types/media'; 
import { nanoid } from 'nanoid';
import { notificationsService } from './notifications-service';
import { approvalService } from './approval-service';
import { ApprovalRecipient } from '@/types/approvals';

// ✅ ZENTRALER ORT FÜR DIE BASIS-URL MIT FALLBACK
const getBaseUrl = () => {
  // Diese Funktion liest die Variable aus. Wenn sie nicht da ist, wird ein Standardwert verwendet.
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

// Helper function to remove undefined values from objects
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date || obj instanceof Timestamp) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item))
      .filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = removeUndefinedValues(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
}

// Cache für Performance-Optimierungen
const statsCache: Map<string, { stats: any; timestamp: number }> = new Map();
const searchCache: Map<string, { campaigns: PRCampaign[]; timestamp: number }> = new Map();
const CACHE_TTL: number = 5 * 60 * 1000; // 5 Minuten

export const prService = {
  
  // ERWEITERT mit organizationId Support
  async create(campaignData: Omit<PRCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Deep clean der boilerplateSections
      const cleanedBoilerplateSections = (campaignData.boilerplateSections || []).map((section: any) => {
        const cleanSection: any = {
          id: section.id || `section-${Date.now()}-${Math.random()}`,
          type: section.type || 'boilerplate',
          order: typeof section.order === 'number' ? section.order : 0,
          isLocked: section.isLocked === true,
          isCollapsed: section.isCollapsed === true
        };
        
        // Nur definierte und nicht-leere Werte hinzufügen
        if (section.boilerplateId && section.boilerplateId !== '') {
          cleanSection.boilerplateId = section.boilerplateId;
        }
        if (section.content && section.content !== '') {
          cleanSection.content = section.content;
        }
        if (section.metadata && Object.keys(section.metadata).length > 0) {
          // Bereinige auch metadata
          const cleanedMetadata = removeUndefinedValues(section.metadata);
          if (Object.keys(cleanedMetadata).length > 0) {
            cleanSection.metadata = cleanedMetadata;
          }
        }
        if (section.customTitle && section.customTitle !== '') {
          cleanSection.customTitle = section.customTitle;
        }
        
        // Legacy position entfernen falls vorhanden
        if ('position' in section) {
          delete section.position;
        }
        
        return cleanSection;
      });

      // Bereite attachedAssets vor
      const cleanedAttachedAssets = (campaignData.attachedAssets || []).map((asset: any) => {
        const cleanAsset = removeUndefinedValues({
          ...asset,
          attachedAt: asset.attachedAt || serverTimestamp()
        });
        return cleanAsset;
      });


      // Erstelle die zu speichernden Daten
      const dataToSave: any = {
        userId: campaignData.userId,
        organizationId: campaignData.organizationId || campaignData.userId,
        title: campaignData.title || '',
        contentHtml: campaignData.contentHtml || '',
        boilerplateSections: cleanedBoilerplateSections,
        status: campaignData.status || 'draft',
        distributionListId: campaignData.distributionListId || '',
        distributionListName: campaignData.distributionListName || '',
        recipientCount: campaignData.recipientCount || 0,
        approvalRequired: campaignData.approvalRequired === true,
        createdAt: Timestamp.now(), // FIX: Verwende Timestamp.now() statt serverTimestamp()
        updatedAt: Timestamp.now()  // FIX: Verwende Timestamp.now() statt serverTimestamp()
      };

      // Optionale Felder nur hinzufügen wenn sie einen Wert haben
      if (campaignData.clientId && campaignData.clientId !== '') {
        dataToSave.clientId = campaignData.clientId;
      }
      if (campaignData.clientName && campaignData.clientName !== '') {
        dataToSave.clientName = campaignData.clientName;
      }
      if (cleanedAttachedAssets.length > 0) {
        dataToSave.attachedAssets = cleanedAttachedAssets;
      }
      if (campaignData.mainContent && campaignData.mainContent !== '') {
        dataToSave.mainContent = campaignData.mainContent;
      }
      if (campaignData.keywords && Array.isArray(campaignData.keywords) && campaignData.keywords.length > 0) {
        dataToSave.keywords = campaignData.keywords;
      }
      if (campaignData.distributionListIds && campaignData.distributionListIds.length > 0) {
        dataToSave.distributionListIds = campaignData.distributionListIds;
      }
      if (campaignData.distributionListNames && campaignData.distributionListNames.length > 0) {
        dataToSave.distributionListNames = campaignData.distributionListNames;
      }
      if (campaignData.assetShareLinkId) {
        dataToSave.assetShareLinkId = campaignData.assetShareLinkId;
      }
      if (campaignData.assetShareUrl) {
        dataToSave.assetShareUrl = campaignData.assetShareUrl;
      }
      if (campaignData.assetSettings) {
        dataToSave.assetSettings = removeUndefinedValues(campaignData.assetSettings);
      }
      if (campaignData.approvalData) {
        dataToSave.approvalData = removeUndefinedValues(campaignData.approvalData);
      }
      if (campaignData.keyVisual) {
        dataToSave.keyVisual = removeUndefinedValues(campaignData.keyVisual);
      }
      if (campaignData.scheduledAt) {
        dataToSave.scheduledAt = campaignData.scheduledAt;
      }
      // sentAt sollte NIEMALS beim Erstellen gesetzt werden - nur beim tatsächlichen Versand
      // if (campaignData.sentAt) {
      //   dataToSave.sentAt = campaignData.sentAt;
      // }
      if (campaignData.aiGenerated === true) {
        dataToSave.aiGenerated = true;
        if (campaignData.aiMetadata) {
          dataToSave.aiMetadata = removeUndefinedValues(campaignData.aiMetadata);
        }
      }

      // Finale Bereinigung: Entferne alle undefined Werte
      const finalData = removeUndefinedValues(dataToSave);

      
      const docRef = await addDoc(collection(db, 'pr_campaigns'), finalData);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  },

  async getById(campaignId: string): Promise<PRCampaign | null> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PRCampaign;
    }
    return null;
  },

  // PERFORMANCE-OPTIMIERT: Mit Index-basierten Queries und Caching
  async getAll(userOrOrgId: string, useOrganizationId: boolean = false): Promise<PRCampaign[]> {
    try {
      const fieldName = useOrganizationId ? 'organizationId' : 'userId';
      
      // OPTIMIERUNG: Mit limit für bessere Performance
      // TODO: Implementiere Pagination für große Datenmengen
      const q = query(
        collection(db, 'pr_campaigns'),
        where(fieldName, '==', userOrOrgId),
        limit(100) // Begrenze Ergebnisse für bessere Performance
      );
      
      const snapshot = await getDocs(q);
      
      const campaigns = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        const campaign = {
          id: doc.id,
          ...data
        } as PRCampaign;
        
        
        return campaign;
      });
      
      // CLIENT-SEITIGE Sortierung: Behandle serverTimestamp() Platzhalter und echte Timestamps
      const sortedCampaigns = campaigns.sort((a, b) => {
        // Hilfsfunktion um Timestamp zu extrahieren
        const getTimestamp = (campaign: PRCampaign): number => {
          if (!campaign.createdAt) {
            // Fallback: Verwende Dokument-ID für chronologische Sortierung
            return campaign.id ? parseInt(campaign.id.slice(-8), 36) : 0;
          }
          
          // Prüfe ob es ein serverTimestamp() Platzhalter ist
          if (typeof campaign.createdAt === 'object' && 
              '_methodName' in campaign.createdAt &&
              campaign.createdAt._methodName === 'serverTimestamp') {
            // Es ist ein serverTimestamp() Platzhalter - verwende Dokument-ID
            return campaign.id ? parseInt(campaign.id.slice(-8), 36) : 0;
          }
          
          // Es ist ein echter Timestamp
          if (campaign.createdAt.toDate) {
            return campaign.createdAt.toDate().getTime();
          }
          
          // Fallback für andere Timestamp-Formate
          try {
            return new Date(campaign.createdAt as any).getTime();
          } catch {
            return campaign.id ? parseInt(campaign.id.slice(-8), 36) : 0;
          }
        };
        
        const aTime = getTimestamp(a);
        const bTime = getTimestamp(b);
        
        return bTime - aTime; // DESC - neueste zuerst
      });
      
      
      return sortedCampaigns;
    } catch (error) {
      throw error;
    }
  },

  // NEU: Spezialisierte Methode für Organization-basierte Abfragen
  async getAllByOrganization(organizationId: string): Promise<PRCampaign[]> {
    return this.getAll(organizationId, true);
  },

  // PERFORMANCE-OPTIMIERT: Mit Compound Index für bessere Performance
  async getByStatus(userOrOrgId: string, status: string, useOrganizationId: boolean = false): Promise<PRCampaign[]> {
    const fieldName = useOrganizationId ? 'organizationId' : 'userId';
    
    // OPTIMIERUNG: Nutze Compound Index (organizationId/userId + status)
    const q = query(
      collection(db, 'pr_campaigns'),
      where(fieldName, '==', userOrOrgId),
      where('status', '==', status),
      limit(50) // Performance-Limit
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PRCampaign));
  },

  async update(campaignId: string, data: Partial<Omit<PRCampaign, 'id'| 'userId'>>): Promise<void> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    
    
    // Bereinige die Update-Daten
    const cleanedData = removeUndefinedValues({
      ...data,
      updatedAt: Timestamp.now(), // FIX: Verwende Timestamp.now() statt serverTimestamp()
    });
    
    
    await updateDoc(docRef, cleanedData);
  },

  async delete(campaignId: string): Promise<void> {
    // NEU: Lösche auch den Share-Link wenn vorhanden
    const campaign = await this.getById(campaignId);
    if (campaign?.assetShareLinkId) {
      try {
        await mediaService.deleteShareLink(campaign.assetShareLinkId);
      } catch (error) {
      }
    }
    
    // NEU: Lösche auch Enhanced Approval wenn vorhanden
    if (campaign?.approvalData?.shareId && campaign.organizationId) {
      try {
        // Finde die Enhanced Approval
        const approval = await approvalService.getByShareId(campaign.approvalData.shareId);
        if (approval?.id) {
          await approvalService.hardDelete(approval.id, campaign.organizationId);
        }
      } catch (error) {
      }
    }
    
    // Lösche auch den Legacy Approval Share wenn vorhanden
    if (campaign?.approvalData?.shareId) {
      try {
        const q = query(
          collection(db, 'pr_approval_shares'),
          where('shareId', '==', campaign.approvalData.shareId),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await deleteDoc(snapshot.docs[0].ref);
        }
      } catch (error) {
      }
    }
    
    await deleteDoc(doc(db, 'pr_campaigns', campaignId));
  },

  async deleteMany(campaignIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    
    // NEU: Sammle Share-Links zum Löschen
    const shareLinksToDelete: string[] = [];
    const approvalSharesToDelete: string[] = [];
    const enhancedApprovalsToDelete: { id: string; organizationId: string }[] = [];
    
    for (const id of campaignIds) {
      const campaign = await this.getById(id);
      if (campaign?.assetShareLinkId) {
        shareLinksToDelete.push(campaign.assetShareLinkId);
      }
      if (campaign?.approvalData?.shareId) {
        approvalSharesToDelete.push(campaign.approvalData.shareId);
        
        // NEU: Sammle Enhanced Approvals
        if (campaign.organizationId) {
          const approval = await approvalService.getByShareId(campaign.approvalData.shareId);
          if (approval?.id) {
            enhancedApprovalsToDelete.push({ 
              id: approval.id, 
              organizationId: campaign.organizationId 
            });
          }
        }
      }
      
      const docRef = doc(db, 'pr_campaigns', id);
      batch.delete(docRef);
    }
    
    await batch.commit();
    
    // NEU: Lösche Share-Links nach dem Batch
    for (const shareLinkId of shareLinksToDelete) {
      try {
        await mediaService.deleteShareLink(shareLinkId);
      } catch (error) {
      }
    }
    
    // NEU: Lösche Enhanced Approvals
    for (const approval of enhancedApprovalsToDelete) {
      try {
        await approvalService.hardDelete(approval.id, approval.organizationId);
      } catch (error) {
      }
    }
    
    // Lösche Legacy Approval Shares
    for (const shareId of approvalSharesToDelete) {
      try {
        const q = query(
          collection(db, 'pr_approval_shares'),
          where('shareId', '==', shareId),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await deleteDoc(snapshot.docs[0].ref);
        }
      } catch (error) {
      }
    }
  },

  async updateStatus(campaignId: string, status: string): Promise<void> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    const updateData: any = {
      status,
      updatedAt: Timestamp.now(), // FIX: Verwende Timestamp.now() statt serverTimestamp()
    };

    if (status === 'sent') {
      updateData.sentAt = Timestamp.now(); // FIX: Verwende Timestamp.now() statt serverTimestamp()
    }

    await updateDoc(docRef, updateData);
  },

  // PERFORMANCE-OPTIMIERT: Stats mit Aggregation und Caching
  
  async getStats(userOrOrgId: string, useOrganizationId: boolean = false): Promise<{
    total: number;
    drafts: number;
    scheduled: number;
    sent: number;
    archived: number;
    in_review: number;
    changes_requested: number;
    approved: number;
    totalRecipients: number;
    totalAssetsShared: number;
  }> {
    const cacheKey = `stats-${userOrOrgId}-${useOrganizationId}`;
    const cached = statsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.stats;
    }
    
    const campaigns = useOrganizationId 
      ? await this.getAllByOrganization(userOrOrgId)
      : await this.getAll(userOrOrgId);
    
    const stats = campaigns.reduce((acc, campaign) => {
      acc.total++;
      // Sicherstellen, dass alle Status-Typen behandelt werden
      const status = campaign.status as keyof typeof acc;
      if (status in acc && typeof acc[status] === 'number') {
        (acc[status] as number)++;
      }
      acc.totalRecipients += campaign.recipientCount || 0;
      acc.totalAssetsShared += campaign.attachedAssets?.length || 0;
      return acc;
    }, {
      total: 0,
      drafts: 0,
      scheduled: 0,
      sent: 0,
      archived: 0,
      in_review: 0,
      changes_requested: 0,
      approved: 0,
      totalRecipients: 0,
      totalAssetsShared: 0
    });
    
    // Cache für zukünftige Anfragen
    statsCache.set(cacheKey, { stats, timestamp: Date.now() });
    return stats;
  },

  // PERFORMANCE-OPTIMIERT: Mit Client-Side-Caching für Suche
  
  async search(userOrOrgId: string, searchTerm: string, useOrganizationId: boolean = false): Promise<PRCampaign[]> {
    const cacheKey = `${userOrOrgId}-${useOrganizationId}`;
    const cached = searchCache.get(cacheKey);
    
    // OPTIMIERUNG: Verwende gecachte Daten wenn verfügbar
    let allCampaigns: PRCampaign[];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      allCampaigns = cached.campaigns;
    } else {
      allCampaigns = useOrganizationId 
        ? await this.getAllByOrganization(userOrOrgId)
        : await this.getAll(userOrOrgId);
      
      // Cache aktualisieren
      searchCache.set(cacheKey, { campaigns: allCampaigns, timestamp: Date.now() });
    }
    const term = searchTerm.toLowerCase();
    
    return allCampaigns.filter(campaign => 
      campaign.title.toLowerCase().includes(term) ||
      campaign.distributionListName.toLowerCase().includes(term) ||
      campaign.contentHtml.toLowerCase().includes(term) ||
      campaign.clientName?.toLowerCase().includes(term) // NEU: Auch nach Kunde suchen
    );
  },

  // === ASSET-MANAGEMENT FUNKTIONEN ===

  /**
   * Fügt Assets zu einer Kampagne hinzu
   */
  async attachAssets(
    campaignId: string, 
    assets: CampaignAssetAttachment[]
  ): Promise<void> {
    const campaign = await this.getById(campaignId);
    if (!campaign) {
      throw new Error('Kampagne nicht gefunden');
    }

    // Merge mit bestehenden Assets
    const existingAssets = campaign.attachedAssets || [];
    const newAssetIds = new Set(assets.map(a => a.assetId || a.folderId));
    
    // Entferne Duplikate
    const filteredExisting = existingAssets.filter(
      a => !newAssetIds.has(a.assetId || a.folderId)
    );

    const updatedAssets = [...filteredExisting, ...assets];

    await this.update(campaignId, {
      attachedAssets: updatedAssets
    });
  },

  /**
   * Entfernt Assets von einer Kampagne
   */
  async removeAssets(
    campaignId: string,
    assetIds: string[]
  ): Promise<void> {
    const campaign = await this.getById(campaignId);
    if (!campaign) {
      throw new Error('Kampagne nicht gefunden');
    }

    const assetIdSet = new Set(assetIds);
    const updatedAssets = (campaign.attachedAssets || []).filter(
      attachment => !assetIdSet.has(attachment.assetId || attachment.folderId || '')
    );

    await this.update(campaignId, {
      attachedAssets: updatedAssets
    });
  },

  /**
   * Erstellt einen Share-Link für alle Kampagnen-Assets
   */
  async createCampaignShareLink(
    campaign: PRCampaign,
    settings?: {
      allowDownload?: boolean;
      passwordProtected?: boolean;
      password?: string;
      expiresInDays?: number;
      watermark?: boolean;
    }
  ): Promise<ShareLink> {
    if (!campaign.attachedAssets || campaign.attachedAssets.length === 0) {
      throw new Error('Keine Assets zum Teilen vorhanden');
    }

    // Sammle alle Asset- und Folder-IDs
    const assetIds: string[] = [];
    const folderIds: string[] = [];

    campaign.attachedAssets.forEach(attachment => {
      if (attachment.type === 'asset' && attachment.assetId) {
        assetIds.push(attachment.assetId);
      } else if (attachment.type === 'folder' && attachment.folderId) {
        folderIds.push(attachment.folderId);
      }
    });
    
    // Erstelle Share-Link Daten - FIXED für Multi-Tenancy
    const shareData = {
      organizationId: campaign.organizationId || campaign.userId, // Use organizationId if available
      createdBy: campaign.userId, // Track who created it
      type: 'campaign' as const, // Eindeutig als Kampagne definieren
      targetId: campaign.id!, // Die Kampagnen-ID ist das Hauptziel
      title: `Pressematerial: ${campaign.title}`,
      description: campaign.clientName 
        ? `Medienmaterial für die Pressemitteilung von ${campaign.clientName}`
        : 'Medienmaterial für die Pressemitteilung',
      
      // NEU & KORRIGIERT: assetIds und folderIds direkt übergeben
      assetIds: assetIds,
      folderIds: folderIds,
      
      settings: {
        downloadAllowed: settings?.allowDownload !== false,
        passwordRequired: settings?.password || null,
        watermarkEnabled: settings?.watermark || false,
        expiresAt: settings?.expiresInDays 
          ? new Date(Date.now() + settings.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      }
    };

    const shareLink = await mediaService.createShareLink(shareData);

    // ✅ KORRIGIERTE STELLE
    const baseUrl = getBaseUrl();
    await this.update(campaign.id!, {
      assetShareLinkId: shareLink.id,
      assetShareUrl: `${baseUrl}/share/${shareLink.shareId}`
    });

    return shareLink;
  },

  /**
   * Holt alle Assets einer Kampagne mit aktuellen Metadaten
   */
  async getCampaignAssets(
    campaignId: string
  ): Promise<{
    assets: any[];
    folders: any[];
    metadata: Map<string, any>;
  }> {
    const campaign = await this.getById(campaignId);
    if (!campaign || !campaign.attachedAssets) {
      return { assets: [], folders: [], metadata: new Map() };
    }

    const assetIds = campaign.attachedAssets
      .filter(a => a.type === 'asset' && a.assetId)
      .map(a => a.assetId!);
    
    const folderIds = campaign.attachedAssets
      .filter(a => a.type === 'folder' && a.folderId)
      .map(a => a.folderId!);

    // Lade Assets und Folders parallel
    const [assets, folders] = await Promise.all([
      Promise.all(assetIds.map(id => mediaService.getMediaAssetById(id))),
      Promise.all(folderIds.map(id => mediaService.getFolder(id)))
    ]);

    // Erstelle Metadata-Map mit historischen Daten
    const metadata = new Map<string, any>();
    campaign.attachedAssets.forEach(attachment => {
      const key = attachment.assetId || attachment.folderId || '';
      metadata.set(key, attachment.metadata);
    });

    return {
      assets: assets.filter(Boolean),
      folders: folders.filter(Boolean),
      metadata
    };
  },

  /**
   * Aktualisiert die Asset-Einstellungen einer Kampagne
   */
  async updateAssetSettings(
    campaignId: string,
    settings: PRCampaign['assetSettings']
  ): Promise<void> {
    await this.update(campaignId, {
      assetSettings: settings
    });

    // Wenn ein Share-Link existiert, aktualisiere auch dessen Einstellungen
    const campaign = await this.getById(campaignId);
    if (campaign?.assetShareLinkId) {
      const shareLinkRef = doc(db, 'media_shares', campaign.assetShareLinkId);
      await updateDoc(shareLinkRef, {
        'settings.downloadAllowed': settings?.allowDownload,
        'settings.passwordRequired': settings?.password || null,
        'settings.watermarkEnabled': settings?.watermark,
        'settings.expiresAt': settings?.expiresAt || null, 
        updatedAt: serverTimestamp()
      });
    }
  },

  /**
   * Einfacher HTML-Stripper (Helper-Funktion)
   */
  stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  },
  hasAssets(campaign: PRCampaign): boolean {
    return (campaign.attachedAssets?.length || 0) > 0;
  },

  /**
   * Zählt die Assets einer Kampagne
   */
  getAssetCount(campaign: PRCampaign): { assets: number; folders: number; total: number } {
    const attachments = campaign.attachedAssets || [];
    const assets = attachments.filter(a => a.type === 'asset').length;
    const folders = attachments.filter(a => a.type === 'folder').length;
    
    return { assets, folders, total: assets + folders };
  },

// === NEUE ENHANCED APPROVAL FUNKTIONEN ===

  /**
   * Startet den Freigabeprozess mit dem Enhanced Approval Service
   */
  async requestApproval(campaignId: string): Promise<string> {
    
    const campaign = await this.getById(campaignId);
    if (!campaign) {
      throw new Error('Kampagne nicht gefunden');
    }

    // Prüfe ob organizationId vorhanden ist
    const organizationId = campaign.organizationId || campaign.userId;
    const context = { organizationId, userId: campaign.userId };


    // Erstelle Empfänger aus Campaign-Daten
    // TODO: Später könnten hier echte Kundencontacts geladen werden
    const recipients: Omit<ApprovalRecipient, 'id' | 'status' | 'notificationsSent'>[] = [{
      email: `kunde-${campaign.clientId}@example.com`, // Temporäre E-Mail bis echte Kontakte verknüpft sind
      name: campaign.clientName || 'Kunde',
      role: 'approver',
      isRequired: true
    }];

    try {
      // Erstelle Enhanced Approval
      const approvalId = await approvalService.createFromCampaign(
        campaign,
        recipients,
        context
      );


      // Hole die erstellte Approval für die shareId
      const approval = await approvalService.getById(approvalId, organizationId);
      if (!approval) {
        throw new Error('Fehler beim Erstellen der Freigabe');
      }


      // Sende zur Freigabe - setze Status auf pending
      await approvalService.update(approvalId, {
        status: 'pending',
        requestedAt: serverTimestamp() as Timestamp
      }, context);
      

      // Update Kampagne mit Approval-Daten
      const approvalData: ApprovalData = {
        shareId: approval.shareId,
        status: 'pending',
        feedbackHistory: []
      };

      await this.update(campaignId, {
        status: 'in_review',
        approvalRequired: true,
        approvalData
      });


      // Erstelle auch Legacy Share für Rückwärtskompatibilität
      await this.createLegacyApprovalShare(campaign, approval.shareId);


      return approval.shareId;
    } catch (error) {
      // Werfe den Fehler nicht weiter, damit die Kampagne trotzdem gespeichert wird
      // Die Kampagne bleibt im Draft-Status
      return '';
    }
  },

  /**
   * Erstellt Legacy Approval Share für Rückwärtskompatibilität
   */
  async createLegacyApprovalShare(campaign: PRCampaign, shareId: string): Promise<void> {
    const approvalShareData: any = {
      shareId,
      campaignId: campaign.id,
      userId: campaign.userId,
      organizationId: campaign.organizationId || campaign.userId,
      campaignTitle: campaign.title,
      campaignContent: campaign.contentHtml,
      clientName: campaign.clientName,
      clientId: campaign.clientId,
      attachedAssets: campaign.attachedAssets || [],
      status: 'pending',
      feedbackHistory: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true
    };

    // Bereinige auch hier undefined Werte
    const cleanedData = removeUndefinedValues(approvalShareData);
    await addDoc(collection(db, 'pr_approval_shares'), cleanedData);
  },

// Ersetze die getCampaignByShareId Methode in pr-service.ts mit dieser korrigierten Version:

/**
 * Findet eine Kampagne anhand der Share-ID (mit Enhanced Approval)
 */
async getCampaignByShareId(shareId: string): Promise<PRCampaign | null> {
  try {
    
    // 🔧 FIX: Versuche zuerst Enhanced Approval zu finden
    const approval = await approvalService.getByShareId(shareId);
    
    if (approval) {
      // Lade die zugehörige Kampagne
      const campaign = await this.getById(approval.campaignId);
      
      if (campaign) {
        // Stelle sicher, dass history ein Array ist
        const history = Array.isArray(approval.history) ? approval.history : [];
        
        // Debug: Zeige alle History-Einträge im Detail (Code entfernt für Production)
        
        // Aktualisiere Approval-Daten aus Enhanced Approval
        // WICHTIG: Inkludiere ALLE Nachrichten mit Kommentaren, nicht nur bestimmte Actions
        const historyFeedback = history
          .filter(h => h.details?.comment) // Alle Einträge mit Kommentaren
          .map(h => ({
            comment: h.details?.comment || '',
            requestedAt: h.timestamp,
            author: h.actorName || 'Kunde' // Behalte den originalen actorName bei
          }));
        
        // Wenn approval.feedbackHistory existiert, verwende diese zuerst
        const combinedFeedback = [
          ...(approval.feedbackHistory || []),
          ...historyFeedback.map(f => ({
            comment: f.comment || '',
            requestedAt: f.requestedAt,
            author: f.author || 'Unbekannt'
          }))
        ];
        
        campaign.approvalData = {
          shareId: approval.shareId,
          status: this.mapEnhancedToLegacyStatus(approval.status),
          feedbackHistory: combinedFeedback as any,
          approvedAt: approval.approvedAt
        };
        return campaign;
      }
    }

    
    // Fallback zu Legacy-Methode
    const q = query(
      collection(db, 'pr_approval_shares'),
      where('shareId', '==', shareId),
      where('isActive', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    
    const shareDoc = snapshot.docs[0];
    const shareData = shareDoc.data();
    
    
    // Konstruiere Kampagnen-Objekt aus Share-Daten
    return {
      id: shareData.campaignId,
      userId: shareData.userId,
      organizationId: shareData.organizationId,
      title: shareData.campaignTitle,
      contentHtml: shareData.campaignContent,
      clientName: shareData.clientName,
      clientId: shareData.clientId,
      attachedAssets: shareData.attachedAssets || [],
      status: shareData.status === 'approved' ? 'approved' : 
              shareData.status === 'commented' ? 'changes_requested' : 
              'in_review',
      approvalRequired: true,
      approvalData: {
        shareId: shareData.shareId,
        status: shareData.status,
        feedbackHistory: shareData.feedbackHistory || [],
        approvedAt: shareData.approvedAt
      },
      // Minimal-Daten für Type-Kompatibilität
      distributionListId: '',
      distributionListName: '',
      recipientCount: 0,
      createdAt: shareData.createdAt,
      updatedAt: shareData.updatedAt
    } as PRCampaign;
  } catch (error) {
    return null;
  }
},

  /**
   * Sendet eine überarbeitete Kampagne erneut zur Freigabe
   */
  async resubmitForApproval(campaignId: string): Promise<void> {
    
    const campaign = await this.getById(campaignId);
    if (!campaign || !campaign.approvalData?.shareId) {
      throw new Error('Kampagne oder Freigabe-Daten nicht gefunden');
    }

    const organizationId = campaign.organizationId || campaign.userId;
    const context = { organizationId, userId: campaign.userId };

    // Prüfe ob Enhanced Approval existiert
    const approval = await approvalService.getByShareId(campaign.approvalData.shareId);
    if (approval && approval.id) {
      // Update Enhanced Approval - setze Status zurück auf draft, dann auf pending
      await approvalService.update(approval.id, {
        status: 'draft', // Erst auf draft zurücksetzen
        content: {
          html: campaign.contentHtml,
          plainText: this.stripHtml(campaign.contentHtml),
          subject: campaign.title
        },
        attachedAssets: campaign.attachedAssets?.map(asset => ({
          assetId: asset.assetId || asset.folderId || '',
          type: asset.type as 'file' | 'folder',
          name: asset.metadata?.fileName || asset.metadata?.folderName || 'Unbekannt',
          metadata: asset.metadata
        }))
      }, context);

      // Jetzt können wir es erneut senden
      await approvalService.sendForApproval(approval.id, context);
      
      // Füge Historie-Eintrag hinzu
      const historyEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(),
        action: 'resubmitted',
        userId: context.userId,
        actorName: 'System',
        details: {
          comment: 'Kampagne wurde überarbeitet und erneut zur Freigabe eingereicht'
        }
      };
      
      await updateDoc(doc(db, 'approvals', approval.id), {
        history: arrayUnion(historyEntry)
      });
    }

    // Update auch Legacy Share
    const q = query(
      collection(db, 'pr_approval_shares'),
      where('shareId', '==', campaign.approvalData.shareId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        status: 'pending',
        campaignTitle: campaign.title,
        campaignContent: campaign.contentHtml,
        attachedAssets: campaign.attachedAssets || [],
        updatedAt: serverTimestamp(),
        feedbackHistory: [...(campaign.approvalData.feedbackHistory || []), {
          comment: '--- Kampagne wurde überarbeitet und erneut zur Freigabe eingereicht ---',
          requestedAt: Timestamp.now(),
          author: 'System'
        }]
      });
    }
    
    // Update die Kampagne
    const updatedApprovalData: ApprovalData = {
      ...campaign.approvalData,
      status: 'pending',
      feedbackHistory: [...(campaign.approvalData.feedbackHistory || []), {
        comment: '--- Kampagne wurde überarbeitet und erneut zur Freigabe eingereicht ---',
        requestedAt: Timestamp.now(),
        author: 'System'
      }]
    };
    
    await this.update(campaignId, {
      status: 'in_review',
      approvalData: updatedApprovalData
    });
    
  },

  /**
   * Speichert Kunden-Feedback und aktualisiert den Status
   */
  async submitFeedback(shareId: string, feedback: string, author: string = 'Kunde'): Promise<void> {
    
    // Nur noch Enhanced Approval System verwenden
    const approval = await approvalService.getByShareId(shareId);
    if (!approval) {
      throw new Error('Freigabe nicht gefunden');
    }
    
    // Für Public Access: Verwende den ersten Empfänger oder eine Public-Access E-Mail
    let recipientEmail = approval.recipients[0]?.email;
    
    // Wenn keine E-Mail gefunden wird oder es eine generierte E-Mail ist,
    // verwende eine Public-Access E-Mail
    if (!recipientEmail || recipientEmail.includes('kunde-')) {
      recipientEmail = 'public-access@freigabe.system';
    }
    
    // Verwende requestChanges mit öffentlichem Zugriff
    try {
      await approvalService.requestChangesPublic(shareId, recipientEmail, feedback, author);
    } catch (error) {
      
      // Fallback: Direkte Aktualisierung ohne Empfänger-Validierung
      if (approval.id && approval.organizationId) {
        const historyEntry = {
          id: nanoid(),
          timestamp: Timestamp.now(),
          action: 'changes_requested' as const,
          actorName: author,
          actorEmail: 'public-access@freigabe.system',
          details: {
            comment: feedback,
            previousStatus: approval.status,
            newStatus: 'changes_requested' as const
          }
        };
        
        await updateDoc(doc(db, 'approvals', approval.id), {
          status: 'changes_requested',
          updatedAt: Timestamp.now(),
          history: arrayUnion(historyEntry)
        });
      }
    }
    
    // 🔄 WICHTIG: Campaign-Status auch auf changes_requested setzen und Lock lösen
    if (approval.campaignId) {
      await this.update(approval.campaignId, {
        status: 'changes_requested',
        editLocked: false,
        editLockedReason: undefined,
        lockedBy: undefined,
        unlockedAt: serverTimestamp() as Timestamp,
        lastUnlockedBy: {
          userId: 'system',
          displayName: 'Freigabe-System',
          reason: 'Änderung angefordert durch ' + author
        }
      });
    }
  },

  /**
   * Genehmigt eine Kampagne
   */
  async approveCampaign(shareId: string): Promise<void> {
    
    // Nur noch Enhanced Approval System verwenden
    const approval = await approvalService.getByShareId(shareId);
    if (!approval) {
      throw new Error('Freigabe nicht gefunden');
    }
    
    // Für öffentlichen Zugriff: Verwende submitDecisionPublic
    try {
      await approvalService.submitDecisionPublic(shareId, 'approved', undefined, 'Kunde');
    } catch (error) {
      
      // Fallback: Versuche mit dem ersten Empfänger
      if (approval.recipients && approval.recipients.length > 0) {
        const recipientEmail = approval.recipients[0].email;
        await approvalService.submitDecision(shareId, recipientEmail, 'approved');
      }
    }
    
    // 🔄 WICHTIG: Campaign-Status auch auf approved setzen
    if (approval.campaignId) {
      await this.update(approval.campaignId, {
        status: 'approved'
      });
    }
  },

  /**
   * Markiert eine Freigabe-Seite als angesehen
   */
  async markApprovalAsViewed(shareId: string): Promise<void> {
    
    // Nur noch Enhanced Approval System verwenden
    const approval = await approvalService.getByShareId(shareId);
    if (approval) {
      const recipientEmail = approval.recipients[0]?.email;
      await approvalService.markAsViewed(shareId, recipientEmail);
    }
  },

  /**
   * PERFORMANCE-OPTIMIERT: Holt Freigabe-Kampagnen mit Index-Optimierung
   */
  async getApprovalCampaigns(userOrOrgId: string, useOrganizationId: boolean = false): Promise<PRCampaign[]> {
    try {
      const fieldName = useOrganizationId ? 'organizationId' : 'userId';
      
      // OPTIMIERUNG: Nutze Compound Index (organizationId + approvalRequired + status)
      const q = query(
        collection(db, 'pr_campaigns'),
        where(fieldName, '==', userOrOrgId),
        where('approvalRequired', '==', true),
        limit(25) // Performance-Limit für Freigabe-Listen
      );
      
      const snapshot = await getDocs(q);
      const campaigns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PRCampaign));

      // Client-seitige Sortierung nach Status und Datum
      return campaigns.sort((a, b) => {
        // Priorisiere nach Status
        const statusOrder: { [key: string]: number } = {
          'changes_requested': 0,
          'in_review': 1,
          'approved': 2
        };

        const aOrder = statusOrder[a.status] ?? 3;
        const bOrder = statusOrder[b.status] ?? 3;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        // Dann nach Datum
        if (!a.updatedAt || !b.updatedAt) return 0;
        return b.updatedAt.toMillis() - a.updatedAt.toMillis();
      });
    } catch (error) {
      return [];
    }
  },

  /**
   * Generiert die vollständige Freigabe-URL
   */
  getApprovalUrl(shareId: string): string {
    // ✅ KORRIGIERTE STELLE
    const baseUrl = getBaseUrl();
    return `${baseUrl}/freigabe/${shareId}`;
  },

  /**
   * Prüft, ob eine Kampagne versendet werden kann
   */
  canSendCampaign(campaign: PRCampaign): { canSend: boolean; reason?: string } {
    if (campaign.approvalRequired && campaign.status !== 'approved') {
      return {
        canSend: false,
        reason: 'Diese Kampagne muss erst vom Kunden freigegeben werden.'
      };
    }

    if (!campaign.distributionListId || campaign.recipientCount === 0) {
      return {
        canSend: false,
        reason: 'Keine Empfänger ausgewählt.'
      };
    }

    return { canSend: true };
  },

  /**
   * Hilfsfunktion: Mappt Enhanced Status zu Legacy Status
   */
  mapEnhancedToLegacyStatus(enhancedStatus: string): 'pending' | 'viewed' | 'commented' | 'approved' {
    switch (enhancedStatus) {
      case 'pending':
        return 'pending';
      case 'in_review':
      case 'viewed':
        return 'viewed';
      case 'changes_requested':
      case 'commented':
        return 'commented';
      case 'approved':
      case 'completed':
        return 'approved';
      default:
        return 'pending';
    }
  },

  /**
   * UPDATE CAMPAIGN MIT NEUEM APPROVAL WORKFLOW
   * 
   * Aktualisiert eine bestehende Kampagne und startet bei Bedarf
   * einen neuen Freigabe-Workflow mit PDF-Generierung
   */
  async updateCampaignWithNewApproval(
    campaignId: string,
    campaignData: Partial<PRCampaign>,
    customerApprovalData: {
      customerApprovalRequired: boolean;
      customerContact?: any; 
      customerApprovalMessage?: string;
    },
    context: {
      userId: string;
      organizationId: string;
    }
  ): Promise<{
    campaignId: string;
    workflowId?: string;
    pdfVersionId?: string;
    customerShareLink?: string;
  }> {
    try {
      
      // 1. Update Campaign
      await this.update(campaignId, {
        ...campaignData,
        approvalRequired: customerApprovalData.customerApprovalRequired,
        approvalData: customerApprovalData.customerApprovalRequired ? {
          ...customerApprovalData,
          teamApprovalRequired: false,
          teamApprovers: [],
          currentStage: 'customer',
          workflowStartedAt: Timestamp.now(),
          status: 'pending',
          feedbackHistory: [],
          shareId: '',
          workflowId: ''
        } : undefined,
        status: customerApprovalData.customerApprovalRequired ? 'in_review' : 'draft',
        updatedAt: Timestamp.now()
      });
      
      // 2. Wenn Customer-Approval aktiviert, update oder erstelle Workflow
      if (customerApprovalData.customerApprovalRequired) {
        // Generiere neue PDF-Version
        const { pdfVersionsService } = await import('./pdf-versions-service');
        const pdfVersionId = await pdfVersionsService.createPDFVersion(
          campaignId,
          context.organizationId,
          {
            title: campaignData.title || '',
            mainContent: campaignData.mainContent || '',
            boilerplateSections: campaignData.boilerplateSections || [],
            keyVisual: campaignData.keyVisual,
            clientName: campaignData.clientName
          },
          {
            userId: context.userId,
            status: 'pending_customer'
          }
        );
        
        const { approvalService } = await import('./approval-service');
        
        // Prüfe ob bereits eine Freigabe für diese Kampagne existiert
        console.log('🔍 DEBUG: Suche existierende Approval für Campaign:', campaignId);
        const existingApproval = await approvalService.getApprovalByCampaignId(
          campaignId,
          context.organizationId
        );
        console.log('🔍 DEBUG: Gefundene existierende Approval:', existingApproval ? 'JA' : 'NEIN', existingApproval?.id);
        
        let workflowId: string;
        let shareId: string;
        
        if (existingApproval) {
          // UPDATE bestehende Freigabe mit neuer PDF-Version
          
          // Füge neue Nachricht zur History hinzu, wenn vorhanden
          const historyEntry = customerApprovalData.customerApprovalMessage ? {
            id: nanoid(),
            timestamp: Timestamp.now(),
            action: 'commented' as const,
            actorName: 'Ihre Nachricht',
            actorEmail: 'agentur@celeropress.com',
            details: {
              comment: customerApprovalData.customerApprovalMessage
            }
          } : {
            id: nanoid(),
            timestamp: Timestamp.now(),
            action: 'resubmitted' as const,
            actorName: 'System',
            actorEmail: 'system@celeropress.com',
            details: {
              comment: 'Neue Version nach Änderungsanforderung erstellt'
            }
          };
          
          // DIREKTES UPDATE statt updateApprovalForNewVersion verwenden
          // weil wir eigene History-Einträge hinzufügen wollen
          // Recipients auch auf pending zurücksetzen für Re-Request E-Mail
          const resetRecipients = (existingApproval.recipients || []).map(recipient => ({
            ...recipient,
            status: 'pending' as const,
            respondedAt: null
          }));
          
          await updateDoc(doc(db, 'approvals', existingApproval.id!), {
            status: 'pending',
            recipients: resetRecipients,
            pdfVersionId,
            updatedAt: Timestamp.now(),
            history: arrayUnion(historyEntry)
          });
          
          // 🚀 WICHTIG: Re-Request E-Mail senden nach Admin-Änderungen
          // Da wir den Status bereits auf 'pending' gesetzt haben, müssen wir die Approval neu laden
          const updatedApproval = await approvalService.getById(existingApproval.id!, context.organizationId);
          if (updatedApproval) {
            const adminMessage = customerApprovalData.customerApprovalMessage || 'Die Pressemeldung wurde überarbeitet und wartet erneut auf Ihre Freigabe.';
            const approvalWithMessage = { 
              ...updatedApproval, 
              adminMessage,
              adminName: 'Admin'
            };
            await approvalService.sendNotifications(approvalWithMessage, 're-request' as any);
          }
          
          workflowId = existingApproval.id!;
          shareId = existingApproval.shareId;
          
        } else {
          // ERSTELLE neue Customer-Approval (nur beim ersten Mal)
          
          workflowId = await approvalService.createCustomerApproval(
            campaignId,
            context.organizationId,
            customerApprovalData.customerContact,
            customerApprovalData.customerApprovalMessage
          );
          
          // Hole ShareId der neu erstellten Freigabe
          const newApproval = await approvalService.getById(workflowId, context.organizationId);
          shareId = typeof newApproval === 'object' && newApproval?.shareId ? newApproval.shareId : workflowId;
        }
        
        // Setze Edit-Lock und speichere shareId
        await this.update(campaignId, {
          editLocked: true,
          editLockedReason: 'pending_customer_approval',
          lockedBy: {
            userId: 'system',
            displayName: 'System',
            action: 'customer_approval_lock'
          },
          lockedAt: Timestamp.now(),
          // WICHTIG: ShareId in approvalData speichern!
          approvalData: {
            ...customerApprovalData,
            teamApprovalRequired: false,
            teamApprovers: [],
            currentStage: 'customer' as const,
            workflowStartedAt: Timestamp.now(),
            status: 'pending' as const,
            feedbackHistory: [],
            shareId: shareId,
            workflowId: workflowId
          }
        });
        
        return {
          campaignId,
          workflowId,
          pdfVersionId,
          customerShareLink: `/freigabe/${shareId}`
        };
      }
      
      // 3. Ohne Approval - nur Update
      return { campaignId };
      
    } catch (error) {
      throw error;
    }
  },

  /**
   * VEREINFACHTER CUSTOMER-ONLY APPROVAL WORKFLOW
   * 
   * Ersetzt das komplexe 2-stufige System (Team + Customer) 
   * durch einfachen 1-stufigen Customer-Approval-Prozess
   */
  async saveCampaignWithCustomerApproval(
    campaignData: Partial<PRCampaign>,
    customerApprovalData: {
      customerApprovalRequired: boolean;
      customerContact?: any; // CustomerContact type
      customerApprovalMessage?: string;
    },
    context: {
      userId: string;
      organizationId: string;
      isNewCampaign: boolean;
    }
  ): Promise<{
    campaignId: string;
    workflowId?: string;
    pdfVersionId?: string; // IMMER vorhanden wenn Customer-Approval aktiviert
    customerShareLink?: string;
  }> {
    try {
      
      // 1. Speichere Campaign (vereinfacht)
      let campaignId: string;
      
      if (context.isNewCampaign) {
        campaignId = await this.create({
          ...campaignData,
          userId: context.userId,
          organizationId: context.organizationId,
          status: 'draft',
          approvalRequired: customerApprovalData.customerApprovalRequired,
          approvalData: customerApprovalData.customerApprovalRequired ? {
            customerApprovalRequired: true,
            customerContact: customerApprovalData.customerContact,
            customerApprovalMessage: customerApprovalData.customerApprovalMessage,
            // Für Kompatibilität - wird bei nächster DB-Migration entfernt:
            teamApprovalRequired: false,
            teamApprovers: [],
            workflowStartedAt: Timestamp.now(),
            status: 'pending' as const,
            feedbackHistory: [],
            shareId: '',
            workflowId: '',
            currentStage: 'customer',
          } : undefined,
          createdAt: serverTimestamp(),
          updatedAt: Timestamp.now()
        } as PRCampaign);
      } else {
        await this.update(campaignData.id!, {
          ...campaignData,
          approvalRequired: customerApprovalData.customerApprovalRequired,
          approvalData: customerApprovalData.customerApprovalRequired ? {
            customerApprovalRequired: true,
            customerContact: customerApprovalData.customerContact,
            customerApprovalMessage: customerApprovalData.customerApprovalMessage,
            // Für Kompatibilität:
            teamApprovalRequired: false,
            teamApprovers: [],
            workflowStartedAt: Timestamp.now(),
            status: 'pending' as const,
            feedbackHistory: [],
            shareId: '',
            workflowId: '',
            currentStage: 'customer',
          } : undefined,
          updatedAt: Timestamp.now()
        });
        campaignId = campaignData.id!;
      }

      // 2. CUSTOMER-ONLY WORKFLOW:
      if (customerApprovalData.customerApprovalRequired) {
        
        // Dynamic import um circular dependencies zu vermeiden
        const { approvalService } = await import('./approval-service');
        const { pdfVersionsService } = await import('./pdf-versions-service');
        
        // 2a. Erstelle vereinfachten Customer-Workflow
        const workflowId = await approvalService.createCustomerApproval(
          campaignId,
          context.organizationId,
          customerApprovalData.customerContact,
          customerApprovalData.customerApprovalMessage || ''
        );

        // 2b. Hole die shareId für den Customer-Link
        const approval = await approvalService.getById(workflowId, context.organizationId);
        if (!approval) {
          throw new Error('Approval konnte nicht gefunden werden');
        }

        // 2c. Erstelle PDF für Kundenfreigabe
        const pdfVersion = await pdfVersionsService.createPDFVersion(
          campaignId,
          context.organizationId,
          {
            title: campaignData.title || 'Pressemitteilung',
            mainContent: campaignData.mainContent || campaignData.contentHtml || '',
            boilerplateSections: campaignData.boilerplateSections || [],
            keyVisual: campaignData.keyVisual,
            clientName: campaignData.clientName
          },
          {
            userId: context.userId,
            status: 'pending_customer',
            workflowId,
            isApprovalPDF: true
          }
        );

        if (!pdfVersion) {
          throw new Error('PDF-Version konnte nicht erstellt werden - Kundenfreigabe abgebrochen');
        }

        // 2d. Generiere Customer-Link mit shareId
        const customerShareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/freigabe/${approval.shareId}`;

        // 2e. Update Campaign Status UND ShareId
        await this.update(campaignId, {
          status: 'in_review', // Direkt in Review
          updatedAt: Timestamp.now(),
          // WICHTIG: ShareId und WorkflowId in approvalData speichern!
          approvalData: {
            ...customerApprovalData,
            teamApprovalRequired: false,
            teamApprovers: [],
            currentStage: 'customer' as const,
            workflowStartedAt: Timestamp.now(),
            status: 'pending' as const,
            feedbackHistory: [],
            shareId: approval.shareId,
            workflowId: workflowId
          }
        });


        return {
          campaignId,
          workflowId,
          pdfVersionId: pdfVersion,
          customerShareLink
        };
      }

      return { campaignId };

    } catch (error) {
      throw error;
    }
  }
};