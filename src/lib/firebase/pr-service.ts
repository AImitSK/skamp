// src/lib/firebase/pr-service.ts - ERWEITERT mit Asset-Integration und Freigabe-Workflow
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
} from 'firebase/firestore';
import { db } from './client-init';
import { PRCampaign, CampaignAssetAttachment, ApprovalData } from '@/types/pr';
import { mediaService } from './media-service';
import { ShareLink } from '@/types/media';
import { nanoid } from 'nanoid';

export const prService = {
  
  async create(campaignData: Omit<PRCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'pr_campaigns'), {
      ...campaignData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getById(campaignId: string): Promise<PRCampaign | null> {
    const docRef = doc(db, 'pr_campaigns', campaignId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PRCampaign;
    }
    return null;
  },

  async getAll(userId: string): Promise<PRCampaign[]> {
    try {
      // Mit orderBy für chronologische Sortierung
      const q = query(
        collection(db, 'pr_campaigns'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PRCampaign));
    } catch (error: any) {
      // Fallback ohne orderBy falls Index fehlt
      if (error.code === 'failed-precondition') {
        console.warn('Firestore Index fehlt, verwende Fallback ohne orderBy');
        const q = query(
          collection(db, 'pr_campaigns'),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const campaigns = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PRCampaign));
        
        // Client-seitige Sortierung
        return campaigns.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
      }
      throw error;
    }
  },

  async getByStatus(userId: string, status: string): Promise<PRCampaign[]> {
    const q = query(
      collection(db, 'pr_campaigns'),
      where('userId', '==', userId),
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
    
    // Log für Debugging
    console.log('Updating campaign:', campaignId, 'with data:', data);
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
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
    
    // Lösche auch den Approval Share wenn vorhanden
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
        console.warn('Fehler beim Löschen des Approval Shares:', error);
      }
    }
    
    await deleteDoc(doc(db, 'pr_campaigns', campaignId));
  },

  async deleteMany(campaignIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    
    // NEU: Sammle Share-Links zum Löschen
    const shareLinksToDelete: string[] = [];
    const approvalSharesToDelete: string[] = [];
    
    for (const id of campaignIds) {
      const campaign = await this.getById(id);
      if (campaign?.assetShareLinkId) {
        shareLinksToDelete.push(campaign.assetShareLinkId);
      }
      if (campaign?.approvalData?.shareId) {
        approvalSharesToDelete.push(campaign.approvalData.shareId);
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
    
    // Lösche Approval Shares
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
        console.warn('Fehler beim Löschen des Approval Shares:', error);
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

  async getStats(userId: string): Promise<{
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
    const campaigns = await this.getAll(userId);
    
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

  async search(userId: string, searchTerm: string): Promise<PRCampaign[]> {
    const allCampaigns = await this.getAll(userId);
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

    // Bestimme Share-Type
    let shareType: 'file' | 'folder' | 'collection' = 'collection';
    let primaryTargetId = '';

    if (assetIds.length === 1 && folderIds.length === 0) {
      shareType = 'file';
      primaryTargetId = assetIds[0];
    } else if (folderIds.length === 1 && assetIds.length === 0) {
      shareType = 'folder';
      primaryTargetId = folderIds[0];
    } else {
      // Collection: Verwende die Kampagnen-ID als Target
      primaryTargetId = campaign.id!;
    }

    // Erstelle Share-Link
    const shareData: Omit<ShareLink, 'id' | 'shareId' | 'accessCount' | 'createdAt' | 'lastAccessedAt'> = {
      userId: campaign.userId,
      type: shareType,
      targetId: primaryTargetId,
      targetIds: [...assetIds, ...folderIds],
      assetCount: assetIds.length + folderIds.length,
      title: `Pressematerial: ${campaign.title}`,
      description: campaign.clientName 
        ? `Medienmaterial für die Pressemitteilung von ${campaign.clientName}`
        : 'Medienmaterial für die Pressemitteilung',
      isActive: true,
      
      // Kampagnen-Kontext
      context: {
        type: 'pr_campaign',
        campaignId: campaign.id!,
        campaignTitle: campaign.title,
        senderCompany: campaign.clientName
      },
      
      settings: {
        downloadAllowed: settings?.allowDownload !== false,
        showFileList: true,
        passwordRequired: settings?.password,
        expiresAt: settings?.expiresInDays 
          ? Timestamp.fromDate(new Date(Date.now() + settings.expiresInDays * 24 * 60 * 60 * 1000))
          : undefined,
        watermarkEnabled: settings?.watermark,
        trackingEnabled: true
      }
    };

    const shareLink = await mediaService.createShareLink(shareData);

    // Update Kampagne mit Share-Link
    await this.update(campaign.id!, {
      assetShareLinkId: shareLink.id,
      assetShareUrl: `${window.location.origin}/share/${shareLink.shareId}`
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
        'settings.passwordRequired': settings?.password,
        'settings.watermarkEnabled': settings?.watermark,
        'settings.expiresAt': settings?.expiresAt,
        updatedAt: serverTimestamp()
      });
    }
  },

  /**
   * Prüft ob eine Kampagne Assets hat
   */
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

  // === NEUE FREIGABE-WORKFLOW FUNKTIONEN (mit media_shares Pattern) ===

// Erweiterte Funktionen für pr-service.ts - Asset-Integration in Freigabe

/**
 * Startet den Freigabeprozess für eine Kampagne (ERWEITERT)
 */
async requestApproval(campaignId: string): Promise<string> {
  const campaign = await this.getById(campaignId);
  if (!campaign) {
    throw new Error('Kampagne nicht gefunden');
  }

  // Generiere eine eindeutige, URL-sichere Share-ID
  const shareId = nanoid(10);
  
  // Erstelle separaten Share-Link Eintrag mit ALLEN Kampagnen-Daten
  const approvalShareData: any = {
    shareId,
    campaignId,
    userId: campaign.userId,
    campaignTitle: campaign.title,
    campaignContent: campaign.contentHtml,
    clientName: campaign.clientName,
    clientId: campaign.clientId,
    
    // NEU: Speichere auch die angehängten Assets
    attachedAssets: campaign.attachedAssets || [],
    
    status: 'pending',
    feedbackHistory: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true
  };

  console.log('Creating approval share with data:', approvalShareData);
  
  const docRef = await addDoc(collection(db, 'pr_approval_shares'), approvalShareData);
  console.log('Created approval share with ID:', docRef.id);

  // Update Kampagne mit Status und approvalData
  const approvalData: ApprovalData = {
    shareId,
    status: 'pending',
    feedbackHistory: [],
  };

  await this.update(campaignId, {
    status: 'in_review',
    approvalRequired: true,
    approvalData
  });

  return shareId;
},

/**
 * Findet eine Kampagne anhand der Share-ID (ERWEITERT mit Assets)
 */
async getCampaignByShareId(shareId: string): Promise<PRCampaign | null> {
  try {
    // Hole Share-Link Dokument direkt
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
    
    console.log('Found approval share:', shareData);
    
    // Konstruiere Kampagnen-Objekt aus Share-Daten
    return {
      id: shareData.campaignId,
      userId: shareData.userId,
      title: shareData.campaignTitle,
      contentHtml: shareData.campaignContent,
      clientName: shareData.clientName,
      clientId: shareData.clientId,
      
      // NEU: Inkludiere die angehängten Assets
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
 * Sendet eine überarbeitete Kampagne erneut zur Freigabe (ERWEITERT)
 */
async resubmitForApproval(campaignId: string): Promise<void> {
  console.log('Resubmitting campaign for approval:', campaignId);
  
  const campaign = await this.getById(campaignId);
  if (!campaign || !campaign.approvalData?.shareId) {
    throw new Error('Kampagne oder Freigabe-Daten nicht gefunden');
  }

  // Update pr_approval_shares mit aktuellen Kampagnen-Daten
  const q = query(
    collection(db, 'pr_approval_shares'),
    where('shareId', '==', campaign.approvalData.shareId),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error('Freigabe-Share nicht gefunden');
  }
  
  const docRef = snapshot.docs[0].ref;
  
  // Reset auf pending, aber behalte die Feedback-Historie
  // UND aktualisiere die Kampagnen-Inhalte (falls geändert)
  await updateDoc(docRef, {
    status: 'pending',
    
    // NEU: Aktualisiere auch die Kampagnen-Daten
    campaignTitle: campaign.title,
    campaignContent: campaign.contentHtml,
    attachedAssets: campaign.attachedAssets || [],
    
    updatedAt: serverTimestamp(),
    // Optional: Füge eine Notiz zur Historie hinzu
    feedbackHistory: [...(campaign.approvalData.feedbackHistory || []), {
      comment: '--- Kampagne wurde überarbeitet und erneut zur Freigabe eingereicht ---',
      requestedAt: Timestamp.now(),
      author: 'System'
    }]
  });
  
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
    
    // Update im pr_approval_shares Dokument
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
    }
  },

  /**
   * Genehmigt eine Kampagne
   */
  async approveCampaign(shareId: string): Promise<void> {
    console.log('approveCampaign called with shareId:', shareId);
    
    // Update im pr_approval_shares Dokument
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
    }
  },

  /**
   * Markiert eine Freigabe-Seite als angesehen
   */
  async markApprovalAsViewed(shareId: string): Promise<void> {
    console.log('markApprovalAsViewed called with shareId:', shareId);
    
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
   */
  async getApprovalCampaigns(userId: string): Promise<PRCampaign[]> {
    try {
      const q = query(
        collection(db, 'pr_campaigns'),
        where('userId', '==', userId),
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
        const statusOrder = {
          'changes_requested': 0,
          'in_review': 1,
          'approved': 2
        };

        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3;

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
    return `${window.location.origin}/freigabe/${shareId}`;
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
  }
};