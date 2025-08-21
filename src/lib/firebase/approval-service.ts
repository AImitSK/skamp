// src/lib/firebase/approval-service.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit,
  updateDoc,
  increment,
  arrayUnion,
  addDoc
} from 'firebase/firestore';
import { db } from './client-init';
import { BaseService, QueryOptions, FilterOptions } from './service-base';
import {
  ApprovalEnhanced,
  ApprovalStatus,
  ApprovalWorkflow,
  ApprovalRecipient,
  ApprovalHistoryEntry,
  ApprovalAction,
  ApprovalFilters,
  ApprovalStatistics,
  ApprovalListView,
  LegacyApprovalData,
  DEFAULT_REMINDER_INTERVALS
} from '@/types/approvals';
import { PRCampaign } from '@/types/pr';
import { teamMemberService } from './organization-service';
import { nanoid } from 'nanoid';

// ========================================
// Approval Service mit Multi-Tenancy
// ========================================

class ApprovalService extends BaseService<ApprovalEnhanced> {
  constructor() {
    super('approvals');
  }

  // Helper method to remove undefined values recursively
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item))
        .filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          const cleanedValue = this.removeUndefinedValues(value);
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Erstellt eine neue Freigabe-Anfrage
   */
  async create(
    data: Omit<ApprovalEnhanced, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'shareId' | 'history' | 'analytics' | 'notifications' | 'version'>,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // Generiere eindeutige Share ID
      const shareId = this.generateShareId();
      
      // Initialisiere Empfänger-Status
      const recipients = data.recipients.map((r, index) => ({
        ...r,
        id: nanoid(10),
        status: 'pending' as const,
        notificationsSent: 0,
        order: r.order || index
      }));

      // Approval-Daten vorbereiten - mit leerem history Array
      const approvalData = {
        ...data,
        organizationId: context.organizationId,
        createdBy: context.userId,
        shareId,
        recipients,
        status: 'draft',
        history: [], // Leeres Array statt serverTimestamp
        analytics: {
          totalViews: 0,
          uniqueViews: 0
        },
        notifications: {
          requested: {
            sent: false,
            method: 'email'
          }
        },
        version: 1
      };

      // Entferne undefined Felder
      Object.keys(approvalData).forEach(key => {
        if ((approvalData as any)[key] === undefined) {
          delete (approvalData as any)[key];
        }
      });

      // Erstelle das Dokument direkt ohne BaseService
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...approvalData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requestedAt: serverTimestamp()
      });
      
      const approvalId = docRef.id;
      
      // Füge initiale Historie nach der Erstellung hinzu
      // Verwende ein zweistufiges Update um serverTimestamp zu vermeiden
      const historyEntry = {
        id: nanoid(),
        timestamp: new Date(), // Temporärer Timestamp
        action: 'created',
        userId: context.userId,
        actorName: 'System',
        details: {
          newStatus: 'draft'
        }
      };
      
      // Erst die Historie mit normalem Date hinzufügen
      await updateDoc(doc(db, this.collectionName, approvalId), {
        history: [historyEntry]
      });
      
      // Dann den Timestamp updaten
      await updateDoc(doc(db, this.collectionName, approvalId), {
        'history.0.timestamp': serverTimestamp()
      });
      
      return approvalId;
    } catch (error) {
      console.error('Error creating approval:', error);
      throw new Error('Fehler beim Erstellen der Freigabe');
    }
  }

  /**
   * Vereinfachte Customer-Only Approval Erstellung
   * Ersetzt das komplexe Team-Approval System
   */
  async createCustomerApproval(
    campaignId: string,
    organizationId: string,
    customerContact?: any,
    customerMessage?: string
  ): Promise<string> {
    try {

      // Lade Campaign-Daten für Title und Client-Info
      const { prService } = await import('./pr-service');
      const campaign = await prService.getById(campaignId);
      
      
      // Wenn customerContact nur eine ID ist, lade die Kontakt-Daten
      let contactData = customerContact;
      if (typeof customerContact === 'string' && campaign?.clientId) {
        try {
          const { contactsEnhancedService } = await import('./crm-service-enhanced');
          const contacts = await contactsEnhancedService.searchEnhanced(organizationId, {
            companyIds: [campaign.clientId]
          });
          
          // Finde den Kontakt mit der passenden ID
          const contact = contacts.find(c => c.id === customerContact);
          if (contact) {
            const firstName = contact.name?.firstName || '';
            const lastName = contact.name?.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const primaryEmail = contact.emails?.find(e => e.isPrimary)?.email || 
                                contact.emails?.[0]?.email || '';
            
            contactData = {
              contactId: contact.id,
              name: fullName || primaryEmail || 'Unbekannter Kontakt',
              email: primaryEmail,
              role: contact.position || undefined
            };
            
          }
        } catch (error) {
          console.error('Fehler beim Laden des Kontakts:', error);
        }
      }
      
      const shareId = this.generateShareId();
      
      // Vereinfachte Customer-Only Datenstruktur
      const approvalData = {
        campaignId,
        organizationId,
        title: campaign?.title || 'Unbekannte Kampagne',
        campaignTitle: campaign?.title || 'Unbekannte Kampagne',
        clientId: campaign?.clientId,
        clientName: campaign?.clientName || 'Unbekannter Kunde',
        clientEmail: campaign?.clientEmail || contactData?.email,
        type: 'customer_only' as const,
        status: 'pending' as const,
        shareId,
        recipients: contactData ? [{
          id: nanoid(10),
          type: 'customer' as const,
          contactId: contactData.contactId || contactData.id || 'unknown',
          name: contactData.name || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || 'Unknown Customer',
          email: contactData.email || contactData.primaryEmail || 'no-email@example.com',
          status: 'pending' as const,
          notificationsSent: 0,
          order: 0
        }] : [],
        requestMessage: customerMessage || '',
        workflow: {
          currentStage: 'customer',
          stages: ['customer'],
          isMultiStage: false
        },
        history: customerMessage ? [{
          id: nanoid(),
          timestamp: Timestamp.now(),
          action: 'created',
          actorName: 'System',
          actorEmail: 'system@celeropress.com',
          details: {
            comment: customerMessage
          }
        }] : [],
        analytics: {
          totalViews: 0,
          uniqueViews: 0
        },
        notifications: {
          emailSent: false,
          remindersSent: 0
        },
        version: 1,
        createdAt: Timestamp.now(), // Verwende Timestamp.now() für sofortige Anzeige
        updatedAt: Timestamp.now(),
        createdBy: 'system' // Simplified for customer-only
      };


      // Entferne undefined Werte bevor Firestore-Speicherung
      const cleanApprovalData = this.removeUndefinedValues(approvalData);
      const docRef = await addDoc(collection(db, 'approvals'), cleanApprovalData);
      
      return docRef.id;
    } catch (error) {
      console.error('Fehler beim Erstellen der Customer-Approval:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Entitäten einer Organisation (überschrieben für Array-Sicherheit)
   */
  async getAll(
    organizationId: string,
    options: QueryOptions = {}
  ): Promise<ApprovalEnhanced[]> {
    try {
      // Füge Sortierung nach createdAt hinzu (neueste zuerst)
      const sortedOptions = {
        ...options,
        orderBy: { field: 'createdAt', direction: 'desc' as const }
      };
      
      const approvals = await super.getAll(organizationId, sortedOptions);
      
      // Stelle sicher, dass alle Arrays wirklich Arrays sind
      return approvals.map(approval => {
        if (!Array.isArray(approval.recipients)) {
          approval.recipients = [];
        }
        if (!Array.isArray(approval.history)) {
          approval.history = [];
        }
        if (approval.attachedAssets && !Array.isArray(approval.attachedAssets)) {
          approval.attachedAssets = [];
        }
        return approval;
      });
    } catch (error) {
      console.error('Error loading approvals:', error);
      return [];
    }
  }

  /**
   * Sendet Freigabe-Anfrage an Empfänger
   */
  async sendForApproval(
    approvalId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval) {
        throw new Error('Freigabe nicht gefunden');
      }

      // Erlaube Resubmit für changes_requested und rejected Status
      if (!['draft', 'changes_requested', 'rejected'].includes(approval.status)) {
        throw new Error('Freigabe kann in diesem Status nicht (erneut) gesendet werden');
      }

      // Update Status und Historie
      const historyEntry = {
        id: nanoid(),
        timestamp: new Date(),
        action: 'sent_for_approval',
        userId: context.userId,
        actorName: 'System',
        details: {
          previousStatus: approval.status,
          newStatus: 'pending'
        }
      };

      // Füge den neuen History-Eintrag zum bestehenden Array hinzu
      const updatedHistory = [...(approval.history || []), historyEntry];

      await this.update(approvalId, {
        status: 'pending',
        requestedAt: serverTimestamp() as Timestamp,
        history: updatedHistory as any,
        notifications: {
          ...approval.notifications,
          requested: {
            sent: true,
            sentAt: serverTimestamp() as Timestamp,
            method: 'email'
          }
        }
      }, context);

      // TODO: E-Mail-Benachrichtigungen senden
      await this.sendNotifications(approval, 'request');
    } catch (error) {
      console.error('Error sending for approval:', error);
      throw error;
    }
  }

  /**
   * Lädt Freigabe by Share ID (für öffentlichen Zugriff)
   */
  async getByShareId(shareId: string): Promise<ApprovalEnhanced | null> {
    try {
      
      const q = query(
        collection(db, this.collectionName),
        where('shareId', '==', shareId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      // Stelle sicher, dass history ein Array ist
      if (data.history && !Array.isArray(data.history)) {
        data.history = [];
      }
      
      // Stelle sicher, dass recipients ein Array ist
      if (data.recipients && !Array.isArray(data.recipients)) {
        data.recipients = [];
      }
      
      // Stelle sicher, dass attachedAssets ein Array ist
      if (data.attachedAssets && !Array.isArray(data.attachedAssets)) {
        data.attachedAssets = [];
      }
      
      return { id: doc.id, ...data } as ApprovalEnhanced;
    } catch (error) {
      console.error('Error fetching by share ID:', error);
      return null;
    }
  }

  /**
   * Lädt Freigabe by ID mit Organisation Check
   */
  async getById(id: string, organizationId: string): Promise<ApprovalEnhanced | null> {
    try {
      const doc = await super.getById(id, organizationId);
      if (!doc) return null;
      
      // Stelle sicher, dass Arrays wirklich Arrays sind
      if (doc.history && !Array.isArray(doc.history)) {
        doc.history = [];
      }
      
      if (doc.recipients && !Array.isArray(doc.recipients)) {
        doc.recipients = [];
      }
      
      if (doc.attachedAssets && !Array.isArray(doc.attachedAssets)) {
        doc.attachedAssets = [];
      }
      
      return doc;
    } catch (error) {
      console.error('Error getting approval by ID:', error);
      return null;
    }
  }

  /**
   * Markiert Freigabe als angesehen
   */
  async markAsViewed(
    shareId: string,
    recipientEmail?: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const approval = await this.getByShareId(shareId);
      if (!approval || !approval.id) return;

      // Update Analytics
      const updates: any = {
        'analytics.lastViewedAt': serverTimestamp(),
        'analytics.totalViews': increment(1)
      };

      // Wenn erstmalig angesehen
      if (!approval.analytics.firstViewedAt) {
        updates['analytics.firstViewedAt'] = serverTimestamp();
        updates['analytics.uniqueViews'] = increment(1);
      }

      // Update Empfänger-Status wenn E-Mail bekannt
      if (recipientEmail && approval.recipients) {
        const recipientIndex = approval.recipients.findIndex(r => r.email === recipientEmail);
        if (recipientIndex >= 0 && approval.recipients[recipientIndex].status === 'pending') {
          const recipient = approval.recipients[recipientIndex];
          recipient.status = 'viewed';
          recipient.viewedAt = serverTimestamp() as Timestamp;
          
          updates[`recipients.${recipientIndex}`] = recipient;
          
          // Wenn alle angesehen haben, Status updaten
          const allViewed = approval.recipients.every((r, i) => 
            i === recipientIndex ? true : r.status !== 'pending'
          );
          
          if (allViewed && approval.status === 'pending') {
            updates.status = 'in_review';
          }
        }
      }

      // Historie-Eintrag - serverTimestamp kann nicht in arrayUnion verwendet werden
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(), // Verwende Timestamp.now() statt serverTimestamp()
        action: 'viewed',
        actorName: recipientEmail || 'Anonym',
        actorEmail: recipientEmail || undefined, // Stelle sicher, dass es undefined ist, nicht null
        details: metadata || {}
      };

      // Entferne undefined Felder aus dem historyEntry
      Object.keys(historyEntry).forEach(key => {
        if ((historyEntry as any)[key] === undefined) {
          delete (historyEntry as any)[key];
        }
      });

      updates.history = arrayUnion(historyEntry);

      await updateDoc(doc(db, this.collectionName, approval.id), updates);
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  }

  /**
   * Genehmigt oder lehnt Freigabe ab
   */
  async submitDecision(
    shareId: string,
    recipientEmail: string,
    decision: 'approved' | 'rejected',
    comment?: string,
    inlineComments?: any[]
  ): Promise<void> {
    try {
      const approval = await this.getByShareId(shareId);
      if (!approval || !approval.id) {
        throw new Error('Freigabe nicht gefunden');
      }

      // Finde Empfänger
      const recipientIndex = approval.recipients.findIndex(r => r.email === recipientEmail);
      if (recipientIndex < 0) {
        throw new Error('Sie sind nicht berechtigt, diese Freigabe zu bearbeiten');
      }

      const recipient = approval.recipients[recipientIndex];
      
      // Update Empfänger
      recipient.status = decision;
      recipient.decidedAt = serverTimestamp() as Timestamp;
      recipient.decision = decision;
      if (comment) recipient.comment = comment;

      const updates: any = {
        [`recipients.${recipientIndex}`]: recipient,
        updatedAt: serverTimestamp()
      };

      // Bestimme neuen Gesamt-Status basierend auf Workflow
      const newStatus = this.calculateApprovalStatus(approval, recipientIndex, decision);
      if (newStatus !== approval.status) {
        updates.status = newStatus;
        
        if (newStatus === 'approved') {
          updates.approvedAt = serverTimestamp();
        } else if (newStatus === 'rejected') {
          updates.rejectedAt = serverTimestamp();
        }
      }

      // Historie-Eintrag - serverTimestamp kann nicht in arrayUnion verwendet werden
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(), // Verwende Timestamp.now() statt serverTimestamp()
        action: decision,
        recipientId: recipient.id,
        actorName: recipient.name,
        actorEmail: recipient.email,
        details: {
          previousStatus: approval.status,
          newStatus,
          comment,
          ...(inlineComments && { changes: { inlineComments } })
        },
        ...(inlineComments && { inlineComments })
      };

      updates.history = arrayUnion(historyEntry);

      await updateDoc(doc(db, this.collectionName, approval.id), updates);

      // Benachrichtigungen senden
      if (newStatus !== approval.status) {
        await this.sendStatusChangeNotification(approval, newStatus);
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      throw error;
    }
  }

  /**
   * Genehmigt oder lehnt Freigabe ab - Public Access Version
   */
  async submitDecisionPublic(
    shareId: string,
    decision: 'approved' | 'rejected',
    comment?: string,
    authorName?: string,
    inlineComments?: any[]
  ): Promise<void> {
    try {
      
      const approval = await this.getByShareId(shareId);
      if (!approval || !approval.id) {
        throw new Error('Freigabe nicht gefunden');
      }
      

      // Für öffentlichen Zugriff: Update ohne Empfänger-Validierung
      const updates: any = {
        updatedAt: serverTimestamp()
      };

      // Bestimme neuen Status
      const newStatus = decision === 'approved' ? 'approved' : 'rejected';
      updates.status = newStatus;
      
      
      if (newStatus === 'approved') {
        updates.approvedAt = serverTimestamp();
      } else if (newStatus === 'rejected') {
        updates.rejectedAt = serverTimestamp();
      }

      // Historie-Eintrag
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(),
        action: decision,
        actorName: authorName || 'Kunde',
        actorEmail: 'public-access@freigabe.system',
        details: {
          previousStatus: approval.status,
          newStatus,
          comment,
          changes: inlineComments ? { inlineComments, publicAccess: true } : { publicAccess: true }
        }
      };

      // Entferne undefined Felder rekursiv
      const cleanHistoryEntry = this.removeUndefinedValues(historyEntry);

      updates.history = arrayUnion(cleanHistoryEntry);
      

      await updateDoc(doc(db, this.collectionName, approval.id), updates);
      

      // Benachrichtigungen senden
      if (newStatus !== approval.status) {
        await this.sendStatusChangeNotification(approval, newStatus);
      }
    } catch (error) {
      console.error('Error submitting decision (public):', error);
      throw error;
    }
  }

  /**
   * Fordert Änderungen an
   */
  async requestChanges(
    shareId: string,
    recipientEmail: string,
    comment: string,
    inlineComments?: any[]
  ): Promise<void> {
    try {
      const approval = await this.getByShareId(shareId);
      if (!approval || !approval.id) {
        throw new Error('Freigabe nicht gefunden');
      }

      const recipientIndex = approval.recipients.findIndex(r => r.email === recipientEmail);
      if (recipientIndex < 0) {
        throw new Error('Nicht berechtigt');
      }

      const recipient = approval.recipients[recipientIndex];
      recipient.status = 'commented';
      recipient.comment = comment;

      const updates: any = {
        [`recipients.${recipientIndex}`]: recipient,
        status: 'changes_requested',
        updatedAt: serverTimestamp()
      };

      // Historie - serverTimestamp kann nicht in arrayUnion verwendet werden
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(), // Verwende Timestamp.now() statt serverTimestamp()
        action: 'changes_requested',
        recipientId: recipient.id,
        actorName: recipient.name,
        actorEmail: recipient.email,
        details: {
          comment,
          previousStatus: approval.status,
          newStatus: 'changes_requested',
          ...(inlineComments && { changes: { inlineComments } })
        },
        ...(inlineComments && { inlineComments })
      };

      updates.history = arrayUnion(historyEntry);

      await updateDoc(doc(db, this.collectionName, approval.id), updates);
      
      // Benachrichtigung senden
      await this.sendStatusChangeNotification(approval, 'changes_requested');
    } catch (error) {
      console.error('Error requesting changes:', error);
      throw error;
    }
  }

  /**
   * Fordert Änderungen an - Public Access Version (ohne E-Mail-Validierung)
   */
  async requestChangesPublic(
    shareId: string,
    recipientEmail: string,
    comment: string,
    authorName?: string,
    inlineComments?: any[]
  ): Promise<void> {
    try {
      const approval = await this.getByShareId(shareId);
      if (!approval || !approval.id) {
        throw new Error('Freigabe nicht gefunden');
      }

      // Für öffentlichen Zugriff: Update ohne Empfänger-Validierung
      const updates: any = {
        status: 'changes_requested',
        updatedAt: serverTimestamp()
      };

      // Historie - serverTimestamp kann nicht in arrayUnion verwendet werden
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(),
        action: 'changes_requested',
        actorName: authorName || 'Kunde',
        actorEmail: recipientEmail || 'public-access@freigabe.system',
        details: {
          comment,
          previousStatus: approval.status,
          newStatus: 'changes_requested',
          ...(inlineComments && { changes: { inlineComments, publicAccess: true } }),
          ...(!inlineComments && { changes: { publicAccess: true } })
        },
        ...(inlineComments && { inlineComments })
      };

      updates.history = arrayUnion(historyEntry);

      await updateDoc(doc(db, this.collectionName, approval.id), updates);
      
      // Benachrichtigung senden
      await this.sendStatusChangeNotification(approval, 'changes_requested');
    } catch (error) {
      console.error('Error requesting changes (public):', error);
      throw error;
    }
  }

  /**
   * Lädt Freigaben mit erweiterten Filtern
   */
  async searchEnhanced(
    organizationId: string,
    filters: ApprovalFilters,
    options: QueryOptions = {}
  ): Promise<ApprovalListView[]> {
    try {
      
      let approvals = await this.getAll(organizationId, options);
      

      // Client-seitige Filterung
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        approvals = approvals.filter(approval =>
          approval.title.toLowerCase().includes(searchLower) ||
          approval.clientName.toLowerCase().includes(searchLower) ||
          approval.campaignTitle.toLowerCase().includes(searchLower)
        );
      }

      if (filters.status?.length) {
        approvals = approvals.filter(a => filters.status!.includes(a.status));
      }

      if (filters.clientIds?.length) {
        approvals = approvals.filter(a => a.clientId && filters.clientIds!.includes(a.clientId));
      }

      if (filters.priority?.length) {
        approvals = approvals.filter(a => a.priority && filters.priority!.includes(a.priority));
      }

      if (filters.workflow?.length) {
        approvals = approvals.filter(a => filters.workflow!.includes(a.workflow));
      }

      if (filters.hasAttachments !== undefined) {
        approvals = approvals.filter(a => 
          filters.hasAttachments ? (a.attachedAssets && a.attachedAssets.length > 0) : (!a.attachedAssets || a.attachedAssets.length === 0)
        );
      }

      // Datum-Filter
      if (filters.dateRange) {
        const fromDate = Timestamp.fromDate(filters.dateRange.from);
        const toDate = Timestamp.fromDate(filters.dateRange.to);
        
        approvals = approvals.filter(a => {
          const requestedAt = a.requestedAt as Timestamp;
          return requestedAt >= fromDate && requestedAt <= toDate;
        });
      }

      // Erweitere mit berechneten Feldern
      const enhancedApprovals = approvals.map(approval => {
        // Stelle sicher, dass recipients ein Array ist
        const recipients = Array.isArray(approval.recipients) ? approval.recipients : [];
        
        const pendingCount = recipients.filter(r => r.status === 'pending').length;
        const approvedCount = recipients.filter(r => r.status === 'approved').length;
        const totalRequired = recipients.filter(r => r.isRequired).length || recipients.length;
        
        const progressPercentage = totalRequired > 0 ? Math.round((approvedCount / totalRequired) * 100) : 0;
        
        const isOverdue = approval.options?.expiresAt && 
          approval.status === 'pending' && 
          approval.options.expiresAt.toDate() < new Date();

        return {
          ...approval,
          recipients, // Stelle sicher, dass recipients immer ein Array ist
          pendingCount,
          approvedCount,
          progressPercentage,
          isOverdue: !!isOverdue
        } as ApprovalListView;
      });

      // Filter überfällige
      if (filters.isOverdue !== undefined) {
        return enhancedApprovals.filter(a => a.isOverdue === filters.isOverdue);
      }

      return enhancedApprovals;
    } catch (error) {
      console.error('Error in enhanced approval search:', error);
      return [];
    }
  }

  /**
   * Erstellt Freigabe aus PR-Kampagne (Migration/Integration)
   */
  async createFromCampaign(
    campaign: PRCampaign,
    recipients: Omit<ApprovalRecipient, 'id' | 'status' | 'notificationsSent'>[],
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // PRCampaign hat kein content oder subject Feld, nur contentHtml
      const plainTextContent = this.stripHtml(campaign.contentHtml).substring(0, 500);
      
      const approvalData: Omit<ApprovalEnhanced, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'shareId' | 'history' | 'analytics' | 'notifications' | 'version'> = {
        title: campaign.title,
        description: plainTextContent.substring(0, 200), // Erste 200 Zeichen als Beschreibung
        campaignId: campaign.id!,
        campaignTitle: campaign.title,
        clientId: campaign.clientId,
        clientName: campaign.clientName || 'Unbekannt',
        // clientEmail ist optional, also nur setzen wenn vorhanden
        ...(campaign.clientId ? {} : {}), // Placeholder für zukünftige clientEmail
        recipients: recipients.map((r, index) => ({
          ...r,
          id: nanoid(10),
          status: 'pending' as const,
          notificationsSent: 0
        })),
        content: {
          html: campaign.contentHtml,
          plainText: plainTextContent,
          subject: campaign.title // Verwende Titel als Subject
        },
        attachedAssets: campaign.attachedAssets?.map(asset => ({
          assetId: asset.assetId || asset.folderId || '',
          type: asset.type as 'file' | 'folder',
          name: asset.metadata?.fileName || asset.metadata?.folderName || 'Unbekannt',
          metadata: asset.metadata
        })),
        status: 'draft' as ApprovalStatus,
        workflow: 'simple' as ApprovalWorkflow,
        options: {
          requireAllApprovals: false,
          allowPartialApproval: true,
          autoSendAfterApproval: false,
          allowComments: true,
          allowInlineComments: false
        },
        shareSettings: {
          requirePassword: false,
          requireEmailVerification: false,
          accessLog: true
        },
        requestedAt: serverTimestamp() as Timestamp,
        organizationId: context.organizationId
      };

      const approvalId = await this.create(approvalData, context);
      return approvalId;
    } catch (error) {
      console.error('Error creating approval from campaign:', error);
      throw error;
    }
  }

  /**
   * Einfacher HTML-Stripper
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Lädt Statistiken
   */
  async getStatistics(organizationId: string): Promise<ApprovalStatistics> {
    try {
      const approvals = await this.getAll(organizationId);
      
      // Status-Verteilung
      const byStatus: Record<ApprovalStatus, number> = {
        draft: 0,
        pending: 0,
        in_review: 0,
        partially_approved: 0,
        approved: 0,
        rejected: 0,
        changes_requested: 0,
        expired: 0,
        cancelled: 0,
        completed: 0
      };

      approvals.forEach(a => {
        byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      });

      // Durchschnittliche Freigabe-Zeit
      const approvedApprovals = approvals.filter(a => a.approvedAt);
      const avgApprovalTime = approvedApprovals.length > 0
        ? approvedApprovals.reduce((sum, a) => {
            const requestedAt = (a.requestedAt as Timestamp).toMillis();
            const approvedAt = (a.approvedAt as Timestamp).toMillis();
            return sum + (approvedAt - requestedAt) / (1000 * 60 * 60); // Stunden
          }, 0) / approvedApprovals.length
        : 0;

      // Weitere Statistiken
      const overdueCount = approvals.filter(a => {
        return a.options.expiresAt && 
               a.status === 'pending' && 
               a.options.expiresAt.toDate() < new Date();
      }).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const expiringToday = approvals.filter(a => {
        if (!a.options.expiresAt || a.status !== 'pending') return false;
        const expiresAt = a.options.expiresAt.toDate();
        return expiresAt >= today && expiresAt < tomorrow;
      }).length;

      // Freigabe-Rate
      const totalDecided = approvals.filter(a => ['approved', 'rejected', 'completed'].includes(a.status)).length;
      const totalApproved = approvals.filter(a => ['approved', 'completed'].includes(a.status)).length;
      const approvalRate = totalDecided > 0 ? (totalApproved / totalDecided) * 100 : 0;

      return {
        total: approvals.length,
        byStatus,
        avgApprovalTime,
        avgViewsBeforeDecision: 0, // TODO: Implementieren
        approvalRate,
        overdueCount,
        expiringToday,
        byClient: [], // TODO: Implementieren
        byMonth: [] // TODO: Implementieren
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Sendet Erinnerung
   */
  async sendReminder(
    approvalId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval) throw new Error('Freigabe nicht gefunden');

      if (approval.status !== 'pending' && approval.status !== 'in_review') {
        throw new Error('Erinnerungen können nur für ausstehende Freigaben gesendet werden');
      }

      // Sende Benachrichtigungen
      await this.sendNotifications(approval, 'reminder');

      // Historie-Eintrag - serverTimestamp kann nicht in arrayUnion verwendet werden
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(), // Verwende Timestamp.now() statt serverTimestamp()
        action: 'reminder_sent',
        userId: context.userId,
        actorName: 'System',
        details: {}
      };

      await this.update(approvalId, {
        history: arrayUnion(historyEntry) as any
      }, context);
    } catch (error) {
      console.error('Error sending reminder:', error);
      throw error;
    }
  }

  /**
   * Migriert alte Freigabe-Daten
   */
  async migrateFromLegacy(
    campaign: PRCampaign,
    legacyData: LegacyApprovalData,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    try {
      // Erstelle Empfänger aus Legacy-Daten
      const recipients: Omit<ApprovalRecipient, 'id' | 'status' | 'notificationsSent'>[] = [{
        email: campaign.approvalData?.shareId ? 'unknown@example.com' : 'unknown@example.com', // TODO: Client E-Mail fehlt in PRCampaign
        name: campaign.clientName || 'Unbekannt',
        role: 'approver',
        isRequired: true
      }];

      // Erstelle neue Freigabe
      const approvalId = await this.createFromCampaign(campaign, recipients, context);
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval) throw new Error('Migration fehlgeschlagen');

      // Migriere Historie
      const migrationHistory: ApprovalHistoryEntry[] = [];
      
      // Legacy-Status migrieren
      let migratedStatus: ApprovalStatus = 'pending';
      if (legacyData.status === 'approved') {
        migratedStatus = 'approved';
      } else if (legacyData.status === 'commented') {
        migratedStatus = 'changes_requested';
      } else if (legacyData.status === 'viewed') {
        migratedStatus = 'in_review';
      }

      // Feedback-Historie migrieren
      if (legacyData.feedbackHistory) {
        legacyData.feedbackHistory.forEach(feedback => {
          migrationHistory.push({
            id: nanoid(),
            timestamp: feedback.requestedAt,
            action: feedback.comment ? 'commented' : 'viewed',
            actorName: feedback.author || 'Kunde',
            details: {
              comment: feedback.comment
            }
          });
        });
      }

      // Update mit migrierten Daten
      const updates: any = {
        shareId: legacyData.shareId,
        status: migratedStatus,
        requestedAt: legacyData.requestedAt,
        approvedAt: legacyData.approvedAt,
        history: migrationHistory as any
      };

      // Update ersten Empfänger-Status
      if (approval.recipients && approval.recipients.length > 0) {
        const updatedRecipients = [...approval.recipients];
        updatedRecipients[0] = {
          ...updatedRecipients[0],
          status: migratedStatus === 'approved' ? 'approved' : 
                  migratedStatus === 'changes_requested' ? 'commented' : 
                  migratedStatus === 'in_review' ? 'viewed' : 'pending'
        };
        updates.recipients = updatedRecipients;
      }

      await this.update(approvalId, updates, context);

      return approvalId;
    } catch (error) {
      console.error('Error migrating legacy approval:', error);
      throw error;
    }
  }

  // ========================================
  // Private Hilfsmethoden
  // ========================================

  /**
   * Generiert eindeutige Share ID
   */
  private generateShareId(): string {
    return nanoid(20);
  }

  /**
   * Berechnet Gesamt-Status basierend auf Workflow
   */
  private calculateApprovalStatus(
    approval: ApprovalEnhanced,
    changedRecipientIndex: number,
    decision: 'approved' | 'rejected'
  ): ApprovalStatus {
    const recipients = [...approval.recipients];
    recipients[changedRecipientIndex].status = decision;

    // Bei Ablehnung direkt rejected
    if (decision === 'rejected' && approval.workflow !== 'majority') {
      return 'rejected';
    }

    const required = recipients.filter(r => r.isRequired);
    const allRecipients = required.length > 0 ? required : recipients;
    
    const approvedCount = allRecipients.filter(r => r.status === 'approved').length;
    const rejectedCount = allRecipients.filter(r => r.status === 'rejected').length;
    const totalCount = allRecipients.length;

    switch (approval.workflow) {
      case 'simple':
        // Erste Entscheidung zählt
        return decision === 'approved' ? 'approved' : 'rejected';
        
      case 'unanimous':
        // Alle müssen zustimmen
        if (rejectedCount > 0) return 'rejected';
        if (approvedCount === totalCount) return 'approved';
        return approvedCount > 0 ? 'partially_approved' : approval.status;
        
      case 'majority':
        // Mehrheit entscheidet
        const majorityNeeded = Math.floor(totalCount / 2) + 1;
        if (approvedCount >= majorityNeeded) return 'approved';
        if (rejectedCount >= majorityNeeded) return 'rejected';
        return approvedCount > 0 ? 'partially_approved' : approval.status;
        
      case 'sequential':
        // Der Reihe nach - aktuelle Implementation wie unanimous
        if (rejectedCount > 0) return 'rejected';
        if (approvedCount === totalCount) return 'approved';
        return 'in_review';
        
      case 'hierarchical':
        // Hierarchisch - TODO: Implementierung mit Rollen
        return decision === 'approved' ? 'approved' : 'rejected';
        
      default:
        return approval.status;
    }
  }

  /**
   * Sendet Benachrichtigungen (Stub)
   */
  private async sendNotifications(
    approval: ApprovalEnhanced,
    type: 'request' | 'reminder' | 'status_change'
  ): Promise<void> {
    // TODO: Integration mit E-Mail-Service
    
    // Simuliere E-Mail-Versand
    for (const recipient of approval.recipients) {
      if (recipient.status === 'pending') {
      }
    }
  }

  /**
   * Sendet Status-Änderungs-Benachrichtigung
   */
  private async sendStatusChangeNotification(
    approval: ApprovalEnhanced,
    newStatus: ApprovalStatus
  ): Promise<void> {
    // TODO: Integration mit E-Mail-Service
    await this.sendNotifications(approval, 'status_change');
  }

  /**
   * Plant automatische Erinnerungen
   */
  async scheduleReminders(
    approvalId: string,
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval || !approval.options.reminderSchedule?.enabled) return;

      const schedule = approval.options.reminderSchedule;
      const now = new Date();
      const requestedAt = (approval.requestedAt as Timestamp).toDate();
      
      // Berechne nächste Erinnerung
      for (const intervalHours of schedule.intervals) {
        const reminderTime = new Date(requestedAt.getTime() + intervalHours * 60 * 60 * 1000);
        
        if (reminderTime > now && (!schedule.lastSentAt || reminderTime > schedule.lastSentAt.toDate())) {
          // TODO: Integration mit Cloud Functions für geplante Aufgaben
          break;
        }
      }
    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  }
}

// Export Singleton Instance
export const approvalService = new ApprovalService();

// Export für Tests
export { ApprovalService };