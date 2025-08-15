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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      if (campaignData.scheduledAt) {
        dataToSave.scheduledAt = campaignData.scheduledAt;
      }
      if (campaignData.sentAt) {
        dataToSave.sentAt = campaignData.sentAt;
      }
      if (campaignData.aiGenerated === true) {
        dataToSave.aiGenerated = true;
        if (campaignData.aiMetadata) {
          dataToSave.aiMetadata = removeUndefinedValues(campaignData.aiMetadata);
        }
      }

      // Finale Bereinigung: Entferne alle undefined Werte
      const finalData = removeUndefinedValues(dataToSave);

      console.log('Creating campaign with cleaned data:', finalData);
      
      const docRef = await addDoc(collection(db, 'pr_campaigns'), finalData);
      return docRef.id;
    } catch (error) {
      console.error('Error in prService.create:', error);
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

  // ERWEITERT: Unterstützt jetzt organizationId ODER userId
  async getAll(userOrOrgId: string, useOrganizationId: boolean = false): Promise<PRCampaign[]> {
    try {
      const fieldName = useOrganizationId ? 'organizationId' : 'userId';
      
      // Versuche zuerst ohne orderBy (braucht keinen Index)
      const q = query(
        collection(db, 'pr_campaigns'),
        where(fieldName, '==', userOrOrgId)
      );
      
      const snapshot = await getDocs(q);
      const campaigns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PRCampaign));
      
      // Client-seitige Sortierung nach createdAt (neueste zuerst)
      return campaigns.sort((a, b) => {
        // Konvertiere createdAt zu Millisekunden, egal ob Timestamp, Date oder undefined
        let aTime: number;
        let bTime: number;
        
        if (a.createdAt) {
          if (typeof a.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            aTime = a.createdAt.toMillis();
          } else if (a.createdAt instanceof Date) {
            // JavaScript Date
            aTime = a.createdAt.getTime();
          } else if (typeof a.createdAt === 'number') {
            // Bereits Millisekunden
            aTime = a.createdAt;
          } else {
            // Fallback
            aTime = Date.now();
          }
        } else {
          aTime = Date.now();
        }
        
        if (b.createdAt) {
          if (typeof b.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            bTime = b.createdAt.toMillis();
          } else if (b.createdAt instanceof Date) {
            // JavaScript Date
            bTime = b.createdAt.getTime();
          } else if (typeof b.createdAt === 'number') {
            // Bereits Millisekunden
            bTime = b.createdAt;
          } else {
            // Fallback
            bTime = Date.now();
          }
        } else {
          bTime = Date.now();
        }
        
        return bTime - aTime; // Descending order (neueste zuerst)
      });
    } catch (error) {
      console.error('Fehler beim Laden der Kampagnen:', error);
      throw error;
    }
  },

  // NEU: Spezialisierte Methode für Organization-basierte Abfragen
  async getAllByOrganization(organizationId: string): Promise<PRCampaign[]> {
    return this.getAll(organizationId, true);
  },

  // ERWEITERT: Unterstützt jetzt organizationId ODER userId
  async getByStatus(userOrOrgId: string, status: string, useOrganizationId: boolean = false): Promise<PRCampaign[]> {
    const fieldName = useOrganizationId ? 'organizationId' : 'userId';
    const q = query(
      collection(db, 'pr_campaigns'),
      where(fieldName, '==', userOrOrgId),
      where('status', '==', status)
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
      updatedAt: serverTimestamp(),
    });
    
    console.log('Updating campaign:', campaignId, 'with cleaned data:', cleanedData);
    
    await updateDoc(docRef, cleanedData);
  },

  async delete(campaignId: string): Promise<void> {
    // NEU: Lösche auch den Share-Link wenn vorhanden
    const campaign = await this.getById(campaignId);
    if (campaign?.assetShareLinkId) {
      try {
        await mediaService.deleteShareLink(campaign.assetShareLinkId);
      } catch (error) {
        console.warn('Fehler beim Löschen des Share-Links:', error);
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
        console.warn('Fehler beim Löschen der Enhanced Approval:', error);
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
        console.warn('Fehler beim Löschen des Legacy Approval Shares:', error);
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
        console.warn('Fehler beim Löschen des Share-Links:', error);
      }
    }
    
    // NEU: Lösche Enhanced Approvals
    for (const approval of enhancedApprovalsToDelete) {
      try {
        await approvalService.hardDelete(approval.id, approval.organizationId);
      } catch (error) {
        console.warn('Fehler beim Löschen der Enhanced Approval:', error);
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
        console.warn('Fehler beim Löschen des Legacy Approval Shares:', error);
      }
    }
  },

  async updateStatus(campaignId: string, status: string): Promise<void> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === 'sent') {
      updateData.sentAt = serverTimestamp();
    }

    await updateDoc(docRef, updateData);
  },

  // ERWEITERT: Unterstützt jetzt organizationId ODER userId
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
    const campaigns = useOrganizationId 
      ? await this.getAllByOrganization(userOrOrgId)
      : await this.getAll(userOrOrgId);
    
    return campaigns.reduce((acc, campaign) => {
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
  },

  // ERWEITERT: Unterstützt jetzt organizationId ODER userId
  async search(userOrOrgId: string, searchTerm: string, useOrganizationId: boolean = false): Promise<PRCampaign[]> {
    const allCampaigns = useOrganizationId 
      ? await this.getAllByOrganization(userOrOrgId)
      : await this.getAll(userOrOrgId);
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
    console.log('🔵 requestApproval called for campaign:', campaignId);
    
    const campaign = await this.getById(campaignId);
    if (!campaign) {
      throw new Error('Kampagne nicht gefunden');
    }

    // Prüfe ob organizationId vorhanden ist
    const organizationId = campaign.organizationId || campaign.userId;
    const context = { organizationId, userId: campaign.userId };

    console.log('🔵 Context:', context);

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

      console.log('🔵 Created Enhanced Approval with ID:', approvalId);

      // Hole die erstellte Approval für die shareId
      const approval = await approvalService.getById(approvalId, organizationId);
      if (!approval) {
        throw new Error('Fehler beim Erstellen der Freigabe');
      }

      console.log('🔵 Approval shareId:', approval.shareId);

      // Sende zur Freigabe - setze Status auf pending
      await approvalService.update(approvalId, {
        status: 'pending',
        requestedAt: serverTimestamp() as Timestamp
      }, context);
      
      console.log('⚠️ Freigabe erstellt, E-Mail-Versand folgt später');

      // ========== NOTIFICATION INTEGRATION ==========
      try {
        await notificationsService.notifyChangesRequested(
          campaign,
          'System', // Oder campaign.clientName || 'Kunde'
          campaign.userId,
          campaign.organizationId
        );
        console.log('📬 Benachrichtigung gesendet: Freigabe angefordert');
      } catch (notificationError) {
        console.error('❌ Fehler beim Senden der Benachrichtigung:', notificationError);
        // Nicht den ganzen Prozess stoppen wenn Notification fehlschlägt
      }

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

      console.log('🔵 Updated campaign with approval data');

      // Erstelle auch Legacy Share für Rückwärtskompatibilität
      await this.createLegacyApprovalShare(campaign, approval.shareId);

      console.log('🔵 Created legacy approval share');

      return approval.shareId;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Freigabe:', error);
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
    console.log('🔍 getCampaignByShareId called with shareId:', shareId);
    
    // Versuche zuerst Enhanced Approval zu finden
    const approval = await approvalService.getByShareId(shareId);
    console.log('🔍 Enhanced Approval found:', !!approval);
    
    if (approval) {
      // Lade die zugehörige Kampagne
      const campaign = await this.getById(approval.campaignId);
      console.log('🔍 Campaign found:', !!campaign);
      
      if (campaign) {
        // Stelle sicher, dass history ein Array ist
        const history = Array.isArray(approval.history) ? approval.history : [];
        
        // Aktualisiere Approval-Daten aus Enhanced Approval
        campaign.approvalData = {
          shareId: approval.shareId,
          status: this.mapEnhancedToLegacyStatus(approval.status),
          feedbackHistory: history
            .filter(h => h.action === 'commented' || h.action === 'changes_requested')
            .map(h => ({
              comment: h.details?.comment || '',
              requestedAt: h.timestamp,
              author: h.actorName
            })),
          approvedAt: approval.approvedAt
        };
        return campaign;
      }
    }

    console.log('🔍 Falling back to legacy method');
    
    // Fallback zu Legacy-Methode
    const q = query(
      collection(db, 'pr_approval_shares'),
      where('shareId', '==', shareId),
      where('isActive', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log('No approval share found for shareId:', shareId);
      return null;
    }
    
    const shareDoc = snapshot.docs[0];
    const shareData = shareDoc.data();
    
    console.log('Found legacy approval share:', shareData);
    
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
    console.error('Fehler beim Laden der Freigabe:', error);
    return null;
  }
},

  /**
   * Sendet eine überarbeitete Kampagne erneut zur Freigabe
   */
  async resubmitForApproval(campaignId: string): Promise<void> {
    console.log('Resubmitting campaign for approval:', campaignId);
    
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
    
    console.log('Campaign resubmitted for approval');
  },

  /**
   * Speichert Kunden-Feedback und aktualisiert den Status
   */
  async submitFeedback(shareId: string, feedback: string, author: string = 'Kunde'): Promise<void> {
    console.log('🔍 submitFeedback called with:', { shareId, feedback, author });
    
    // Versuche Enhanced Approval zu verwenden
    const approval = await approvalService.getByShareId(shareId);
    if (approval) {
      console.log('🔍 Enhanced Approval recipients:', approval.recipients);
      
      // Für Legacy/Public Access: Verwende den ersten Empfänger oder erstelle einen temporären
      let recipientEmail = approval.recipients[0]?.email;
      
      // Wenn keine E-Mail gefunden wird oder es eine generierte E-Mail ist,
      // verwende eine Public-Access E-Mail
      if (!recipientEmail || recipientEmail.includes('kunde-')) {
        recipientEmail = 'public-access@freigabe.system';
        console.log('🔍 Using public access email:', recipientEmail);
      } else {
        console.log('🔍 Using recipient email:', recipientEmail);
      }
      
      // Verwende requestChanges mit öffentlichem Zugriff
      try {
        await approvalService.requestChangesPublic(shareId, recipientEmail, feedback, author);
      } catch (error) {
        console.error('🔍 Error with requestChangesPublic, trying direct update:', error);
        
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
            updatedAt: serverTimestamp(),
            history: arrayUnion(historyEntry)
          });
          
          console.log('🔍 Updated via direct method');
        }
      }
    }
    
    // Update auch Legacy Share
    const q = query(
      collection(db, 'pr_approval_shares'),
      where('shareId', '==', shareId),
      where('isActive', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error('Freigabe nicht gefunden');
    
    const docRef = snapshot.docs[0].ref;
    const currentData = snapshot.docs[0].data();
    
    console.log('🔍 Current approval share data:', currentData);
    
    // Füge neues Feedback zur Historie hinzu
    const newFeedback = {
      comment: feedback,
      requestedAt: Timestamp.now(),
      author
    };

    const updatedFeedbackHistory = [...(currentData.feedbackHistory || []), newFeedback];

    // Update pr_approval_shares
    await updateDoc(docRef, {
      status: 'commented',
      feedbackHistory: updatedFeedbackHistory,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Updated pr_approval_shares with status: commented');
    
    // Update auch die Kampagne mit den gleichen Daten
    if (currentData.campaignId) {
      // WICHTIG: Erstelle ein komplett neues approvalData Objekt
      const updatedApprovalData: ApprovalData = {
        shareId: shareId,
        status: 'commented', // WICHTIG: Dieser Status muss gesetzt werden!
        feedbackHistory: updatedFeedbackHistory
      };

      console.log('🔍 Updating campaign with:', {
        campaignId: currentData.campaignId,
        status: 'changes_requested',
        approvalData: updatedApprovalData
      });

      // Update mit dem kompletten neuen Objekt
      await this.update(currentData.campaignId, {
        status: 'changes_requested',
        approvalData: updatedApprovalData // Komplettes Objekt überschreiben
      });
      
      console.log('✅ Updated campaign with:', {
        campaignId: currentData.campaignId,
        status: 'changes_requested',
        approvalDataStatus: 'commented'
      });
      
      // ========== NOTIFICATION INTEGRATION ==========
      try {
        const campaign = await this.getById(currentData.campaignId);
        if (campaign) {
          await notificationsService.notifyChangesRequested(
            campaign,
            author || 'Kunde',
            campaign.userId,
            campaign.organizationId || undefined  // Explizit undefined wenn nicht vorhanden
          );
          console.log('📬 Benachrichtigung gesendet: Änderungen erbeten');
        }
      } catch (notificationError) {
        console.error('Fehler beim Senden der Benachrichtigung:', notificationError);
        // Fehler bei Benachrichtigung sollte den Hauptprozess nicht stoppen
      }
    }
  },

  /**
   * Genehmigt eine Kampagne
   */
  async approveCampaign(shareId: string): Promise<void> {
    console.log('approveCampaign called with shareId:', shareId);
    
    // Versuche Enhanced Approval zu verwenden
    const approval = await approvalService.getByShareId(shareId);
    if (approval) {
      console.log('🔍 Using Enhanced Approval for approval');
      
      // Für öffentlichen Zugriff: Verwende submitDecisionPublic
      try {
        await approvalService.submitDecisionPublic(shareId, 'approved', undefined, 'Kunde');
        console.log('🔍 Approved via public method');
      } catch (error) {
        console.error('🔍 Error with public approval:', error);
        
        // Fallback: Versuche mit dem ersten Empfänger
        if (approval.recipients && approval.recipients.length > 0) {
          const recipientEmail = approval.recipients[0].email;
          await approvalService.submitDecision(shareId, recipientEmail, 'approved');
          console.log('🔍 Approved via recipient method');
        }
      }
    }
    
    // Update auch Legacy Share
    const q = query(
      collection(db, 'pr_approval_shares'),
      where('shareId', '==', shareId),
      where('isActive', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error('Freigabe nicht gefunden');
    
    const docRef = snapshot.docs[0].ref;
    const currentData = snapshot.docs[0].data();
    const approvedAt = Timestamp.now();
    
    // Update pr_approval_shares
    await updateDoc(docRef, {
      status: 'approved',
      approvedAt: approvedAt,
      updatedAt: serverTimestamp()
    });
    
    console.log('Updated pr_approval_shares with status: approved');
    
    // Update auch die Kampagne mit den gleichen Daten
    if (currentData.campaignId) {
      // WICHTIG: Erstelle ein komplett neues approvalData Objekt
      const updatedApprovalData: ApprovalData = {
        shareId: shareId,
        status: 'approved', // WICHTIG: Dieser Status muss gesetzt werden!
        feedbackHistory: currentData.feedbackHistory || [],
        approvedAt: approvedAt
      };

      await this.update(currentData.campaignId, {
        status: 'approved',
        approvalData: updatedApprovalData // Komplettes Objekt überschreiben
      });
      
      console.log('Updated campaign with:', {
        campaignId: currentData.campaignId,
        status: 'approved',
        approvalDataStatus: 'approved'
      });
      
      // ========== NOTIFICATION INTEGRATION ==========
      try {
        const campaign = await this.getById(currentData.campaignId);
        if (campaign) {
          // Hole den Namen des Genehmigers aus der letzten Feedback-Historie
          // oder verwende 'Kunde' als Standard
          const approverName = currentData.feedbackHistory?.length > 0 
            ? currentData.feedbackHistory[currentData.feedbackHistory.length - 1].author || 'Kunde'
            : 'Kunde';
            
          await notificationsService.notifyApprovalGranted(
            campaign,
            approverName,
            campaign.userId
          );
          console.log('📬 Benachrichtigung gesendet: Freigabe erteilt');
        }
      } catch (notificationError) {
        console.error('Fehler beim Senden der Benachrichtigung:', notificationError);
        // Fehler bei Benachrichtigung sollte den Hauptprozess nicht stoppen
      }
    }
  },

  /**
   * Markiert eine Freigabe-Seite als angesehen
   */
  async markApprovalAsViewed(shareId: string): Promise<void> {
    console.log('markApprovalAsViewed called with shareId:', shareId);
    
    // Versuche Enhanced Approval zu verwenden
    const approval = await approvalService.getByShareId(shareId);
    if (approval) {
      const recipientEmail = approval.recipients[0]?.email;
      await approvalService.markAsViewed(shareId, recipientEmail);
    }
    
    // Update auch Legacy Share
    const q = query(
      collection(db, 'pr_approval_shares'),
      where('shareId', '==', shareId),
      where('isActive', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    
    const docRef = snapshot.docs[0].ref;
    const currentData = snapshot.docs[0].data();
    
    // Nur aktualisieren, wenn noch im 'pending' Status
    if (currentData.status === 'pending') {
      // Update pr_approval_shares
      await updateDoc(docRef, {
        status: 'viewed',
        viewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('Updated pr_approval_shares with status: viewed');
      
      // Update auch die Kampagne
      if (currentData.campaignId) {
        // WICHTIG: Erstelle ein komplett neues approvalData Objekt
        const updatedApprovalData: ApprovalData = {
          shareId: shareId,
          status: 'viewed', // WICHTIG: Dieser Status muss gesetzt werden!
          feedbackHistory: currentData.feedbackHistory || []
        };

        await this.update(currentData.campaignId, {
          approvalData: updatedApprovalData // Komplettes Objekt überschreiben
        });
        
        console.log('Updated campaign with approvalDataStatus: viewed');
      }
    }
  },

  /**
   * Holt alle Kampagnen, die eine Freigabe benötigen
   * ERWEITERT: Unterstützt jetzt organizationId ODER userId
   */
  async getApprovalCampaigns(userOrOrgId: string, useOrganizationId: boolean = false): Promise<PRCampaign[]> {
    try {
      const fieldName = useOrganizationId ? 'organizationId' : 'userId';
      const q = query(
        collection(db, 'pr_campaigns'),
        where(fieldName, '==', userOrOrgId),
        where('approvalRequired', '==', true)
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
      console.error('Fehler beim Laden der Freigabe-Kampagnen:', error);
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
  }
};