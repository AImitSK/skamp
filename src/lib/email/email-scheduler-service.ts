// src/lib/firebase/email-scheduler-service.ts - UPDATED WITH MULTI-TENANCY
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/client-init';
import { PRCampaign } from '@/types/pr';
import { ScheduleEmailResponse } from '@/types/email-composer';
import { nanoid } from 'nanoid';

export interface ScheduledEmail {
  id?: string;
  jobId: string;
  campaignId: string;
  campaignTitle: string;
  userId: string;
  organizationId: string; // NEU: Für Multi-Tenancy
  
  // Scheduling Details
  scheduledAt: Timestamp;
  timezone: string;
  status: 'pending' | 'processing' | 'sent' | 'cancelled' | 'failed';
  
  // Email Details (gespeichert für späteren Versand)
  emailContent: {
    subject: string;
    greeting: string;
    introduction: string;
    pressReleaseHtml: string;
    closing: string;
    signature: string;
  };
  
  senderInfo: {
    name: string;
    title: string;
    company: string;
    phone?: string;
    email?: string;
  };
  
  recipients: {
    listIds: string[];
    listNames: string[];
    manualRecipients: Array<{
      firstName: string;
      lastName: string;
      email: string;
      companyName?: string;
    }>;
    totalCount: number;
  };
  
  // Media Assets
  mediaShareUrl?: string;
  
  // Calendar Integration
  calendarEventId?: string;
  
  // Execution Details
  executedAt?: Timestamp;
  errorMessage?: string;
  retryCount?: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  type: 'email_campaign';
  metadata: {
    campaignId: string;
    scheduledEmailId: string;
    recipientCount: number;
  };
  userId: string;
  organizationId: string; // NEU: Für Multi-Tenancy
  createdAt: Timestamp;
}

export const emailSchedulerService = {
  /**
   * Email-Kampagne planen
   */
  async scheduleEmailCampaign(
    campaign: PRCampaign,
    emailContent: any,
    senderInfo: any,
    recipients: any,
    scheduledDate: Date,
    timezone: string = 'Europe/Berlin',
    organizationId?: string // Für Multi-Tenancy
  ): Promise<ScheduleEmailResponse> {
    try {
      console.log('📅 Scheduling email campaign:', campaign.title, 'for', scheduledDate);

      // Validiere Scheduling-Zeit
      const now = new Date();
      const minScheduleTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 Minuten
      
      if (scheduledDate < minScheduleTime) {
        return {
          success: false,
          error: 'Der Versand muss mindestens 15 Minuten in der Zukunft liegen'
        };
      }

      // Generiere eindeutige Job-ID
      const jobId = `job_${nanoid(12)}`;
      const docId = doc(collection(db, 'scheduled_emails')).id;

      // Erstelle Scheduled Email Dokument
      const scheduledEmail: ScheduledEmail = {
        jobId,
        campaignId: campaign.id!,
        campaignTitle: campaign.title,
        userId: campaign.userId,
        organizationId: organizationId || campaign.organizationId || campaign.userId, // Multi-Tenancy Support
        scheduledAt: Timestamp.fromDate(scheduledDate),
        timezone,
        status: 'pending',
        emailContent,
        senderInfo,
        recipients,
        mediaShareUrl: campaign.assetShareUrl,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Speichere in Firestore
      await setDoc(doc(db, 'scheduled_emails', docId), scheduledEmail);

      // Erstelle Kalender-Eintrag
      const calendarEventId = await this.createCalendarEntry(
        campaign,
        scheduledDate,
        recipients.totalCount,
        docId,
        organizationId || campaign.userId
      );

      // Update mit Calendar Event ID
      if (calendarEventId) {
        await updateDoc(doc(db, 'scheduled_emails', docId), {
          calendarEventId,
          updatedAt: serverTimestamp()
        });
      }

      console.log('✅ Email campaign scheduled successfully:', jobId);

      return {
        success: true,
        jobId,
        scheduledFor: scheduledDate,
        calendarEventId: calendarEventId || undefined
      };

    } catch (error) {
      console.error('❌ Error scheduling email campaign:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Planung fehlgeschlagen'
      };
    }
  },

  /**
   * Geplanten Email-Versand stornieren
   */
  async cancelScheduledEmail(
    jobId: string,
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      console.log('🚫 Cancelling scheduled email:', jobId);

      // Finde das Dokument mit der Job-ID und prüfe Berechtigung
      const q = query(
        collection(db, 'scheduled_emails'),
        where('jobId', '==', jobId),
        where('organizationId', '==', organizationId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.warn('⚠️ Scheduled email not found or already processed:', jobId);
        return false;
      }

      const doc = querySnapshot.docs[0];
      const scheduledEmail = doc.data() as ScheduledEmail;

      // Update Status auf 'cancelled'
      await updateDoc(doc.ref, {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });

      // Lösche Kalender-Eintrag wenn vorhanden
      if (scheduledEmail.calendarEventId) {
        await this.deleteCalendarEntry(scheduledEmail.calendarEventId);
      }

      console.log('✅ Scheduled email cancelled successfully');
      return true;

    } catch (error) {
      console.error('❌ Error cancelling scheduled email:', error);
      return false;
    }
  },

  /**
   * Alle geplanten Emails für eine Organization abrufen
   */
  async getScheduledEmails(
    organizationId: string,
    status?: 'pending' | 'sent' | 'cancelled' | 'failed'
  ): Promise<ScheduledEmail[]> {
    try {
      console.log('📋 Loading scheduled emails for organization:', organizationId);

      let q;
      if (status) {
        q = query(
          collection(db, 'scheduled_emails'),
          where('organizationId', '==', organizationId),
          where('status', '==', status),
          orderBy('scheduledAt', 'asc')
        );
      } else {
        q = query(
          collection(db, 'scheduled_emails'),
          where('organizationId', '==', organizationId),
          orderBy('scheduledAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      
      const scheduledEmails = querySnapshot.docs.map(doc => ({
        ...doc.data() as ScheduledEmail,
        id: doc.id
      }));

      console.log(`✅ Found ${scheduledEmails.length} scheduled emails`);
      return scheduledEmails;

    } catch (error) {
      console.error('❌ Error loading scheduled emails:', error);
      return [];
    }
  },

  /**
   * Kalender-Eintrag erstellen
   */
  async createCalendarEntry(
    campaign: PRCampaign,
    scheduledDate: Date,
    recipientCount: number,
    scheduledEmailId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      console.log('📆 Creating calendar entry for scheduled email');

      const calendarEvent: CalendarEvent = {
        title: `📧 E-Mail-Versand: ${campaign.title}`,
        description: `Geplanter E-Mail-Versand für PR-Kampagne "${campaign.title}" an ${recipientCount} Empfänger.`,
        startTime: scheduledDate,
        endTime: new Date(scheduledDate.getTime() + 30 * 60 * 1000), // +30 Minuten
        type: 'email_campaign',
        metadata: {
          campaignId: campaign.id!,
          scheduledEmailId,
          recipientCount
        },
        userId: campaign.userId,
        organizationId,
        createdAt: Timestamp.now()
      };

      const docRef = doc(collection(db, 'calendar_events'));
      await setDoc(docRef, calendarEvent);

      console.log('✅ Calendar entry created:', docRef.id);
      return docRef.id;

    } catch (error) {
      console.error('❌ Error creating calendar entry:', error);
      return null;
    }
  },

  /**
   * Kalender-Eintrag löschen
   */
  async deleteCalendarEntry(calendarEventId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'calendar_events', calendarEventId));
      console.log('✅ Calendar entry deleted:', calendarEventId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting calendar entry:', error);
      return false;
    }
  },

  /**
   * Anstehende Emails für Ausführung abrufen (für Backend-Job)
   */
  async getPendingEmails(organizationId?: string): Promise<ScheduledEmail[]> {
    try {
      const now = Timestamp.now();
      
      let q;
      if (organizationId) {
        // Für spezifische Organization
        q = query(
          collection(db, 'scheduled_emails'),
          where('organizationId', '==', organizationId),
          where('status', '==', 'pending'),
          where('scheduledAt', '<=', now),
          orderBy('scheduledAt', 'asc')
        );
      } else {
        // Alle pending emails (für Admin/System)
        q = query(
          collection(db, 'scheduled_emails'),
          where('status', '==', 'pending'),
          where('scheduledAt', '<=', now),
          orderBy('scheduledAt', 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data() as ScheduledEmail,
        id: doc.id
      }));

    } catch (error) {
      console.error('❌ Error loading pending emails:', error);
      return [];
    }
  },

  /**
   * Email als versendet markieren
   */
  async markEmailAsSent(
    scheduledEmailId: string,
    results?: { success: number; failed: number }
  ): Promise<void> {
    try {
      const updates: any = {
        status: 'sent',
        executedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (results) {
        updates.executionResults = results;
      }

      await updateDoc(doc(db, 'scheduled_emails', scheduledEmailId), updates);
      
      console.log('✅ Marked email as sent:', scheduledEmailId);

    } catch (error) {
      console.error('❌ Error marking email as sent:', error);
    }
  },

  /**
   * Email als fehlgeschlagen markieren
   */
  async markEmailAsFailed(
    scheduledEmailId: string,
    errorMessage: string,
    shouldRetry: boolean = false
  ): Promise<void> {
    try {
      const docRef = doc(db, 'scheduled_emails', scheduledEmailId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return;

      const currentRetryCount = docSnap.data().retryCount || 0;
      
      const updates: any = {
        errorMessage,
        updatedAt: serverTimestamp(),
        retryCount: currentRetryCount + 1
      };

      // Wenn Retry möglich und unter Max-Retries
      if (shouldRetry && currentRetryCount < 3) {
        // Verschiebe um 15 Minuten
        const newScheduledAt = new Date();
        newScheduledAt.setMinutes(newScheduledAt.getMinutes() + 15);
        
        updates.scheduledAt = Timestamp.fromDate(newScheduledAt);
        updates.status = 'pending';
      } else {
        updates.status = 'failed';
      }

      await updateDoc(docRef, updates);
      
      console.log('✅ Marked email as failed:', scheduledEmailId);

    } catch (error) {
      console.error('❌ Error marking email as failed:', error);
    }
  },

  /**
   * Statistiken für geplante Emails
   */
  async getSchedulingStats(organizationId: string): Promise<{
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    processing: number;
    nextScheduled?: Date;
  }> {
    try {
      const emails = await this.getScheduledEmails(organizationId);
      
      const stats = {
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        processing: 0,
        nextScheduled: undefined as Date | undefined
      };

      const now = new Date();

      emails.forEach(email => {
        // Prüfe ob Status in stats existiert
        if (email.status in stats && email.status !== 'processing') {
          stats[email.status]++;
        } else if (email.status === 'processing') {
          stats.processing++;
        }
        
        // Finde nächste geplante Email
        if (email.status === 'pending') {
          const scheduledDate = email.scheduledAt.toDate();
          if (scheduledDate > now && (!stats.nextScheduled || scheduledDate < stats.nextScheduled)) {
            stats.nextScheduled = scheduledDate;
          }
        }
      });

      return stats;

    } catch (error) {
      console.error('❌ Error calculating scheduling stats:', error);
      return {
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        processing: 0
      };
    }
  }
};