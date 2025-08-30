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
import { PRCampaignStatus } from '@/types/pr';
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
// PERFORMANCE-OPTIMIERTER Approval Service mit Multi-Tenancy
// ========================================

class ApprovalService extends BaseService<ApprovalEnhanced> {
  // PERFORMANCE: Query-Cache für bessere Performance
  private queryCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 Minuten Cache
  
  constructor() {
    super('approvals');
  }

  // PERFORMANCE: Cache-Management
  private getCachedQuery(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }
  
  private setCachedQuery(key: string, data: any): void {
    this.queryCache.set(key, { data, timestamp: Date.now() });
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
        clientEmail: (campaign as any)?.clientEmail || contactData?.email,
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
          action: 'commented',  // Ändere zu 'commented' damit es als Feedback erkannt wird
          actorName: 'Ihre Nachricht',
          actorEmail: 'agentur@celeropress.com',
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
      throw error;
    }
  }

  /**
   * Lädt Freigabe by Campaign ID
   */
  async getApprovalByCampaignId(
    campaignId: string,
    organizationId: string
  ): Promise<ApprovalEnhanced | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('campaignId', '==', campaignId),
        where('organizationId', '==', organizationId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      // Stelle sicher, dass history ein Array ist
      if (data.history && !Array.isArray(data.history)) {
        data.history = [];
      }
      
      return {
        ...data,
        id: doc.id
      } as ApprovalEnhanced;
    } catch (error) {
      return null;
    }
  }

  /**
   * Aktualisiert bestehende Freigabe mit neuer PDF-Version
   */
  async updateApprovalForNewVersion(
    approvalId: string,
    updates: {
      status: ApprovalStatus;
      pdfVersionId: string;
      updatedAt: any;
    },
    context: { organizationId: string; userId: string }
  ): Promise<void> {
    try {
      // Historie-Eintrag für neue Version
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(),
        action: 'resubmitted',
        actorName: 'System',
        actorEmail: 'system@celeropress.com',
        details: {
          comment: 'Neue Version nach Änderungsanforderung erstellt',
          // pdfVersionId: updates.pdfVersionId // Removed - not in type
        }
      };

      // Hole aktuelle Freigabe um Empfänger zu resetten
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval) throw new Error('Freigabe nicht gefunden');
      
      // Reset Empfänger-Status für neue Runde
      const resetRecipients = approval.recipients.map(r => ({
        ...r,
        status: 'pending' as const,
        decidedAt: undefined,
        comment: undefined
      }));

      // Update Freigabe
      await updateDoc(doc(db, this.collectionName, approvalId), {
        ...updates,
        history: arrayUnion(historyEntry),
        recipients: resetRecipients
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * PERFORMANCE-OPTIMIERT: Lädt Freigabe by Share ID mit Caching
   */
  async getByShareId(shareId: string): Promise<ApprovalEnhanced | null> {
    try {
      // PERFORMANCE: Prüfe Cache zuerst
      const cacheKey = `shareId-${shareId}`;
      const cached = this.getCachedQuery(cacheKey);
      if (cached) {
        return cached;
      }
      
      // OPTIMIERUNG: Nutze Index für shareId-Queries
      const q = query(
        collection(db, this.collectionName),
        where('shareId', '==', shareId),
        limit(1) // Performance-Optimierung
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      // Daten-Normalisierung
      if (data.history && !Array.isArray(data.history)) {
        data.history = [];
      }
      if (data.recipients && !Array.isArray(data.recipients)) {
        data.recipients = [];
      }
      if (data.attachedAssets && !Array.isArray(data.attachedAssets)) {
        data.attachedAssets = [];
      }
      
      const result = {
        ...data,
        id: doc.id
      } as ApprovalEnhanced;
      
      // PERFORMANCE: Cache das Ergebnis
      this.setCachedQuery(cacheKey, result);
      
      return result;
    } catch (error) {
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

      // Benachrichtigungen senden (non-blocking)
      if (newStatus !== approval.status) {
        try {
          await this.sendStatusChangeNotification(approval, newStatus);
        } catch (emailError) {
          console.error('Email notifications failed, but approval status updated successfully:', emailError);
          // Don't throw - approval was successful even if emails fail
        }
      }
    } catch (error) {
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
      

      // Benachrichtigungen senden (non-blocking)
      if (newStatus !== approval.status) {
        try {
          await this.sendStatusChangeNotification(approval, newStatus);
        } catch (emailError) {
          console.error('Email notifications failed, but approval status updated successfully:', emailError);
          // Don't throw - approval was successful even if emails fail
        }
      }
    } catch (error) {
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
   * Sendet Benachrichtigungen mit E-Mail & Notification Integration
   */
  private async sendNotifications(
    approval: ApprovalEnhanced,
    type: 'request' | 'reminder' | 'status_change'
  ): Promise<void> {
    try {
      // ========== PROFESSIONELLE APPROVAL-EMAIL API ==========
      // Nutze die neue spezialisierte Approval-Email Route
      const { apiClient } = await import('@/lib/api/api-client');

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.celeropress.com';
      const approvalUrl = `${baseUrl}/freigabe/${approval.shareId}`;

      // Sende E-Mails an ausstehende Empfänger
      for (const recipient of approval.recipients) {
        if (recipient.status === 'pending') {
          // Bestimme Approval-Type basierend auf dem type Parameter
          let approvalType: 'request' | 'reminder' | 'status_update';
          
          if (type === 'request') {
            approvalType = 'request';
          } else if (type === 'reminder') {
            approvalType = 'reminder';  
          } else {
            approvalType = 'status_update';
          }

          // E-Mail über die professionelle Approval-Email Route versenden
          try {
            await apiClient.post('/api/sendgrid/send-approval-email', {
              to: recipient.email,
              subject: `${approvalType === 'request' ? 'Freigabe-Anfrage' : approvalType === 'reminder' ? 'Erinnerung' : 'Status-Update'}: ${approval.campaignTitle || approval.title}`,
              approvalType: approvalType,
              approvalData: {
                campaignTitle: approval.campaignTitle || approval.title,
                clientName: approval.clientName,
                approvalUrl: approvalUrl,
                recipientName: recipient.name,
                message: (approval as any).requestMessage || undefined
              }
            });

            console.log(`✅ Approval email sent to ${recipient.email} (${approvalType})`);

            // Update Benachrichtigung-Counter
            recipient.notificationsSent = (recipient.notificationsSent || 0) + 1;
          } catch (emailError) {
            console.error('Approval-E-Mail-Versand fehlgeschlagen:', emailError);
            // Logge Fehler aber blockiere nicht den Hauptprozess
          }
        }
      }

      // ========== INBOX-SERVICE INTEGRATION ==========
      if (type === 'request' && approval.id) {
        try {
          const { inboxService } = await import('./inbox-service');
          
          // Erstelle Inbox-Thread für diese Freigabe falls noch nicht vorhanden
          const existingThread = await inboxService.getApprovalThread(approval.id, approval.organizationId);
          
          if (!existingThread) {
            await inboxService.createApprovalThread({
              organizationId: approval.organizationId,
              approvalId: approval.id,
              campaignTitle: approval.campaignTitle || approval.title,
              clientName: approval.clientName,
              customerEmail: approval.recipients[0]?.email,
              customerName: approval.recipients[0]?.name,
              createdBy: {
                userId: approval.createdBy || 'system',
                name: 'System',
                email: 'system@celeropress.com'
              },
              initialMessage: (approval as any).requestMessage
            });
          }
        } catch (inboxError) {
          console.error('Inbox-Thread-Erstellung fehlgeschlagen:', inboxError);
        }
      }

      // ========== NOTIFICATIONS-SERVICE INTEGRATION ==========
      // Interne Benachrichtigungen an Team-Mitglieder
      if (type === 'request' || type === 'status_change') {
        try {
          const { notificationsService } = await import('./notifications-service');
          
          // Benachrichtige Ersteller und andere Team-Mitglieder
          const notificationRecipients = [approval.createdBy];
          // TODO: Weitere Team-Mitglieder basierend auf Organization laden
          
          for (const userId of notificationRecipients.filter(Boolean)) {
            if (type === 'request') {
              await (notificationsService as any).create({
                userId,
                organizationId: approval.organizationId,
                type: 'APPROVAL_GRANTED', // Verwende bestehende Typen
                title: 'Freigabe-Anfrage gesendet',
                message: `Die Freigabe für "${approval.campaignTitle || approval.title}" wurde an den Kunden gesendet.`,
                linkUrl: `/dashboard/pr-tools/approvals/${approval.shareId}`,
                linkType: 'approval',
                linkId: approval.id,
                metadata: {
                  campaignId: approval.campaignId,
                  campaignTitle: approval.campaignTitle || approval.title,
                  clientName: approval.clientName,
                  // approvalId: approval.id // Removed - not in NotificationMetadata type
                }
              });
            }
          }
        } catch (notificationError) {
          console.error('Notification-Erstellung fehlgeschlagen:', notificationError);
        }
      }

    } catch (error) {
      console.error('Fehler beim Senden von Benachrichtigungen:', error);
      // Fehler sollten den Hauptprozess nicht stoppen
    }
  }

  /**
   * Sendet Status-Änderungs-Benachrichtigung und verwaltet Campaign-Lock
   */
  private async sendStatusChangeNotification(
    approval: ApprovalEnhanced,
    newStatus: ApprovalStatus
  ): Promise<void> {
    try {
      // ========== E-MAIL NOTIFICATIONS FÜR STATUS-ÄNDERUNGEN ==========
      const { apiClient } = await import('@/lib/api/api-client');

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.celeropress.com';
      const approvalUrl = `${baseUrl}/freigabe/${approval.shareId}`;
      const dashboardUrl = `${baseUrl}/dashboard/pr-tools/approvals/${approval.shareId}`;

      // E-Mails an interne Team-Mitglieder (Status-Update)
      const internalRecipients = [approval.createdBy]; // TODO: Erweitern mit Team-Mitgliedern
      for (const userId of internalRecipients.filter(Boolean)) {
        if (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'changes_requested') {
          const lastHistoryEntry = approval.history?.[approval.history.length - 1];
          const changedBy = lastHistoryEntry?.actorName || 'Kunde';

          const statusUpdateData: any & { 
            previousStatus: string; 
            newStatus: string; 
            changedBy: string;
            dashboardUrl: string;
          } = {
            recipientName: 'Team', // TODO: User-Name laden
            recipientEmail: 'team@celeropress.com', // TODO: User-E-Mail laden
            campaignTitle: approval.campaignTitle || approval.title,
            clientName: approval.clientName,
            approvalUrl,
            previousStatus: approval.status,
            newStatus,
            changedBy,
            dashboardUrl
          };

          try {
            // Nutze die professionelle Approval-Email Route für Status-Updates
            await apiClient.post('/api/sendgrid/send-approval-email', {
              to: 'team@celeropress.com', // TODO: User-E-Mail laden
              subject: `Status-Update: ${approval.campaignTitle || approval.title}`,
              approvalType: 'status_update',
              approvalData: {
                campaignTitle: approval.campaignTitle || approval.title,
                clientName: approval.clientName,
                approvalUrl: dashboardUrl,
                recipientName: 'Team',
                changedBy: changedBy
              }
            });
          } catch (emailError) {
            console.error('Status-Update E-Mail fehlgeschlagen:', emailError);
          }
        }
      }

      // Spezielle E-Mails für verschiedene Status-Änderungen
      if (newStatus === 'approved') {
        // E-Mail an Ersteller: Freigabe erhalten
        const lastEntry = approval.history?.[approval.history.length - 1];
        const approverName = lastEntry?.actorName || 'Kunde';

        try {
          const approvalGrantedData: any & { approverName: string } = {
            recipientName: 'Team', // TODO: User-Name laden
            recipientEmail: 'team@celeropress.com', // TODO: User-E-Mail laden
            campaignTitle: approval.campaignTitle || approval.title,
            clientName: approval.clientName,
            approvalUrl: dashboardUrl,
            approverName
          };

          // Nutze die professionelle Approval-Email Route für Approval-Granted
          await apiClient.post('/api/sendgrid/send-approval-email', {
            to: 'team@celeropress.com', // TODO: User-E-Mail laden
            subject: `✅ Freigabe erhalten: ${approval.campaignTitle || approval.title}`,
            approvalType: 'approved',
            approvalData: {
              campaignTitle: approval.campaignTitle || approval.title,
              clientName: approval.clientName,
              approvalUrl: dashboardUrl,
              recipientName: 'Team',
              changedBy: approverName
            }
          });
        } catch (emailError) {
          console.error('Approval-Granted E-Mail fehlgeschlagen:', emailError);
        }

      } else if (newStatus === 'changes_requested') {
        // E-Mail an Ersteller: Änderungen angefordert
        const lastEntry = approval.history?.[approval.history.length - 1];
        const reviewerName = lastEntry?.actorName || 'Kunde';
        const feedback = lastEntry?.details?.comment || 'Keine spezifischen Kommentare';
        const inlineComments = lastEntry?.inlineComments || [];

        try {
          const changesRequestedData: any & { 
            feedback: string; 
            reviewerName: string;
            inlineComments?: any[];
          } = {
            recipientName: 'Team', // TODO: User-Name laden
            recipientEmail: 'team@celeropress.com', // TODO: User-E-Mail laden
            campaignTitle: approval.campaignTitle || approval.title,
            clientName: approval.clientName,
            approvalUrl: dashboardUrl,
            feedback,
            reviewerName,
            inlineComments
          };

          // Nutze die professionelle Approval-Email Route für Changes-Requested
          await apiClient.post('/api/sendgrid/send-approval-email', {
            to: 'team@celeropress.com', // TODO: User-E-Mail laden
            subject: `🔄 Änderungen angefordert: ${approval.campaignTitle || approval.title}`,
            approvalType: 'changes_requested',
            approvalData: {
              campaignTitle: approval.campaignTitle || approval.title,
              clientName: approval.clientName,
              approvalUrl: dashboardUrl,
              recipientName: 'Team',
              changedBy: reviewerName,
              feedback: feedback
            }
          });
        } catch (emailError) {
          console.error('Changes-Requested E-Mail fehlgeschlagen:', emailError);
        }
      }

      // ========== INBOX-SERVICE INTEGRATION ==========
      if (approval.id) {
        try {
          const { inboxService } = await import('./inbox-service');
          const lastEntry = approval.history?.[approval.history.length - 1];
          
          if (lastEntry && (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'changes_requested')) {
            // Finde existierenden Thread
            const thread = await inboxService.getApprovalThread(approval.id, approval.organizationId);
            
            if (thread) {
              // Füge Approval-Decision-Message hinzu
              await inboxService.addApprovalDecisionMessage({
                threadId: thread.id,
                organizationId: approval.organizationId,
                approvalId: approval.id,
                decision: newStatus === 'approved' ? 'approved' : 
                         newStatus === 'rejected' ? 'rejected' : 'changes_requested',
                comment: lastEntry.details?.comment,
                inlineComments: (lastEntry as any).inlineComments,
                decidedBy: {
                  userId: lastEntry.actorEmail?.includes('public-access@') ? 'customer' : 'internal',
                  name: lastEntry.actorName || 'Unbekannt',
                  email: lastEntry.actorEmail || '',
                  type: lastEntry.actorEmail?.includes('public-access@') ? 'customer' : 'internal'
                }
              });
            }
          }
        } catch (inboxError) {
          console.error('Inbox-Message-Hinzufügung fehlgeschlagen:', inboxError);
        }
      }

      // ========== NOTIFICATIONS-SERVICE INTEGRATION ==========
      try {
        const { notificationsService } = await import('./notifications-service');
        
        // Interne Benachrichtigungen für Status-Änderungen
        const lastEntry = approval.history?.[approval.history.length - 1];
        const changedBy = lastEntry?.actorName || 'Kunde';
        
        if (newStatus === 'approved') {
          await (notificationsService as any).create({
            userId: approval.createdBy || 'system',
            organizationId: approval.organizationId,
            type: 'APPROVAL_GRANTED',
            title: '✅ Freigabe erhalten',
            message: `${changedBy} hat "${approval.campaignTitle || approval.title}" freigegeben.`,
            linkUrl: `/dashboard/pr-tools/approvals/${approval.shareId}`,
            linkType: 'approval',
            linkId: approval.id,
            metadata: {
              campaignId: approval.campaignId,
              // approvalId: approval.id, // Removed - not in NotificationMetadata type
              senderName: changedBy
            }
          });
        } else if (newStatus === 'changes_requested') {
          await (notificationsService as any).create({
            userId: approval.createdBy || 'system',
            organizationId: approval.organizationId,
            type: 'CHANGES_REQUESTED',
            title: '🔄 Änderungen angefordert',
            message: `${changedBy} hat Änderungen zu "${approval.campaignTitle || approval.title}" angefordert.`,
            linkUrl: `/dashboard/pr-tools/approvals/${approval.shareId}`,
            linkType: 'approval',
            linkId: approval.id,
            metadata: {
              campaignId: approval.campaignId,
              // approvalId: approval.id, // Removed - not in NotificationMetadata type
              senderName: changedBy
            }
          });
        }
      } catch (notificationError) {
        console.error('Status-Change Notification fehlgeschlagen:', notificationError);
      }

    } catch (error) {
      console.error('Fehler bei Status-Change-Notification:', error);
    }

    // Allgemeine Notifications senden (für Backward-Compatibility)
    await this.sendNotifications(approval, 'status_change');
    
    // 🔓 KAMPAGNEN-LOCK MANAGEMENT
    if (approval.campaignId) {
      await this.updateCampaignLockStatus(approval.campaignId, newStatus);
    }
  }

  /**
   * Aktualisiert den Lock-Status der verknüpften Kampagne basierend auf Approval-Status
   */
  private async updateCampaignLockStatus(
    campaignId: string,
    approvalStatus: ApprovalStatus
  ): Promise<void> {
    try {
      const { prService } = await import('./pr-service');
      
      // Map Approval-Status zu Campaign-Status
      let campaignStatus: PRCampaignStatus | undefined;
      
      if (approvalStatus === 'changes_requested') {
        campaignStatus = 'changes_requested';
        // Lock lösen (Kampagne wird bearbeitbar)
        await prService.update(campaignId, {
          status: campaignStatus,
          editLocked: false,
          editLockedReason: undefined,
          lockedBy: undefined,
          unlockedAt: serverTimestamp() as Timestamp,
          lastUnlockedBy: {
            userId: 'system',
            displayName: 'Freigabe-System',
            reason: 'Änderung angefordert'
          }
        });
      } else if (approvalStatus === 'approved') {
        campaignStatus = 'approved';
        await prService.update(campaignId, {
          status: campaignStatus
        });
      } else if (approvalStatus === 'in_review') {
        campaignStatus = 'in_review';
        await prService.update(campaignId, {
          status: campaignStatus
        });
      } else if (approvalStatus === 'pending') {
        campaignStatus = 'in_review'; // Pending wird als "in_review" dargestellt
        await prService.update(campaignId, {
          status: campaignStatus
        });
      }
      
      console.log(`✅ Campaign-Status synchronisiert: ${approvalStatus} → ${campaignStatus}`);
      
    } catch (error) {
      console.error('❌ Fehler beim Campaign-Status-Update:', error);
      // Fehler beim Lock-Update sollte den Hauptprozess nicht stoppen
    }
  }

  /**
   * Reaktiviert eine Freigabe nach Änderungen (Re-Request)
   * Wird aufgerufen wenn Admin Änderungen gemacht hat und erneute Freigabe anfordert
   */
  async reactivateApprovalAfterChanges(
    approvalId: string,
    context: { organizationId: string; userId: string },
    adminMessage?: string
  ): Promise<void> {
    try {
      const approval = await this.getById(approvalId, context.organizationId);
      if (!approval) {
        throw new Error('Freigabe nicht gefunden');
      }

      if (approval.status !== 'changes_requested') {
        throw new Error('Freigabe kann nur nach Änderungsanforderungen reaktiviert werden');
      }

      // Reset zu pending Status und setze alle Recipients zurück
      const updates: any = {
        status: 'pending',
        updatedAt: serverTimestamp()
      };

      // Recipients zurücksetzen
      const resetRecipients = approval.recipients.map(recipient => ({
        ...recipient,
        status: 'pending' as const,
        respondedAt: null
      }));
      updates.recipients = resetRecipients;

      // Historie-Eintrag
      const historyEntry: ApprovalHistoryEntry = {
        id: nanoid(),
        timestamp: Timestamp.now(),
        action: 'resubmitted',
        actorName: 'Admin',
        actorEmail: 'admin@system',
        details: {
          previousStatus: approval.status,
          newStatus: 'pending',
          comment: adminMessage || 'Änderungen wurden vorgenommen - erneute Freigabe erforderlich'
        }
      };

      updates.history = arrayUnion(historyEntry);

      // Update Approval
      if (!approval.id) {
        throw new Error('Approval ID ist erforderlich');
      }
      await updateDoc(doc(db, this.collectionName, approval.id), updates);

      // Campaign Status zurück auf in_review setzen
      if (approval.campaignId) {
        const { prService } = await import('./pr-service');
        await prService.update(approval.campaignId, {
          status: 'in_review'
        });
      }

      // E-Mail-Benachrichtigung an Kunden senden (Re-Request)
      const updatedApproval = { ...approval, ...updates, recipients: resetRecipients };
      await this.sendNotifications(updatedApproval, 'request');

      console.log(`✅ Approval ${approvalId} reaktiviert und Re-Request E-Mail gesendet`);

    } catch (error) {
      console.error('❌ Fehler bei Approval-Reaktivierung:', error);
      throw error;
    }
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
    }
  }
}

// Export Singleton Instance
export const approvalService = new ApprovalService();

// Export für Tests
export { ApprovalService };