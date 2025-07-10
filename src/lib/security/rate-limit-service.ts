// src/lib/security/rate-limit-service.ts
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

export interface RateLimitConfig {
  testEmailsPerHour: number;
  campaignsPerDay: number;
  recipientsPerCampaign: number;
  recipientsPerDay: number;
}

export interface RateLimitEntry {
  userId: string;
  type: 'test' | 'campaign' | 'recipients';
  count: number;
  windowStart: Timestamp;
  windowEnd: Timestamp;
  metadata?: {
    campaignId?: string;
    recipientCount?: number;
  };
}

export interface EmailActivityLog {
  id?: string;
  userId: string;
  organizationId: string;
  type: 'test' | 'campaign' | 'scheduled';
  campaignId?: string;
  campaignTitle?: string;
  recipientCount: number;
  recipientEmails?: string[]; // Nur für Test-Emails
  status: 'success' | 'failed' | 'rate_limited';
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

// Standard-Limits (können über Umgebungsvariablen überschrieben werden)
export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  testEmailsPerHour: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_TEST_EMAILS || '10'),
  campaignsPerDay: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_CAMPAIGNS || '50'),
  recipientsPerCampaign: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_RECIPIENTS_PER_CAMPAIGN || '500'),
  recipientsPerDay: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_RECIPIENTS_PER_DAY || '5000')
};

export const rateLimitService = {
  /**
   * Prüft Rate Limit für eine bestimmte Aktion
   */
  async checkRateLimit(
    userId: string,
    type: 'test' | 'campaign',
    additionalCount: number = 1
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date; reason?: string }> {
    
    const now = new Date();
    let windowStart: Date;
    let windowEnd: Date;
    let limit: number;

    // Bestimme Zeitfenster und Limit basierend auf Typ
    if (type === 'test') {
      // 1-Stunden-Fenster für Test-Emails
      windowStart = new Date(now.getTime() - 60 * 60 * 1000);
      windowEnd = new Date(now.getTime() + 60 * 60 * 1000);
      limit = DEFAULT_RATE_LIMITS.testEmailsPerHour;
    } else {
      // 24-Stunden-Fenster für Kampagnen
      windowStart = new Date(now.setHours(0, 0, 0, 0));
      windowEnd = new Date(now.setHours(23, 59, 59, 999));
      limit = DEFAULT_RATE_LIMITS.campaignsPerDay;
    }

    try {
      // Zähle bisherige Aktionen im Zeitfenster
      const rateLimitRef = collection(db, 'rate_limits');
      const q = query(
        rateLimitRef,
        where('userId', '==', userId),
        where('type', '==', type),
        where('windowStart', '>=', Timestamp.fromDate(windowStart)),
        where('windowStart', '<=', Timestamp.fromDate(now))
      );

      const snapshot = await getDocs(q);
      let currentCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data() as RateLimitEntry;
        currentCount += data.count;
      });

      const wouldExceed = (currentCount + additionalCount) > limit;
      const remaining = Math.max(0, limit - currentCount);

      return {
        allowed: !wouldExceed,
        remaining: wouldExceed ? 0 : remaining - additionalCount,
        resetAt: windowEnd,
        reason: wouldExceed ? `Limit von ${limit} ${type === 'test' ? 'Test-E-Mails pro Stunde' : 'Kampagnen pro Tag'} überschritten` : undefined
      };

    } catch (error) {
      console.error('❌ Rate limit check failed:', error);
      // Im Fehlerfall erlauben wir die Aktion (fail-open)
      return { allowed: true, remaining: 0, resetAt: windowEnd };
    }
  },

  /**
   * Protokolliert eine durchgeführte Aktion für Rate Limiting
   */
  async recordAction(
    userId: string,
    type: 'test' | 'campaign',
    count: number = 1,
    metadata?: any
  ): Promise<void> {
    try {
      const now = new Date();
      const entryId = `${userId}_${type}_${now.getTime()}`;
      
      const entry: RateLimitEntry = {
        userId,
        type,
        count,
        windowStart: Timestamp.fromDate(now),
        windowEnd: Timestamp.fromDate(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
        metadata
      };

      await setDoc(doc(db, 'rate_limits', entryId), entry);
      
    } catch (error) {
      console.error('❌ Failed to record rate limit action:', error);
    }
  },

  /**
   * Prüft ob die Empfängeranzahl erlaubt ist
   */
  validateRecipientCount(
    recipientCount: number,
    type: 'campaign' | 'test' = 'campaign'
  ): { valid: boolean; maxAllowed: number; reason?: string } {
    
    if (type === 'test') {
      // Test-Emails sollten nur an wenige Empfänger gehen
      const maxTestRecipients = 5;
      return {
        valid: recipientCount <= maxTestRecipients,
        maxAllowed: maxTestRecipients,
        reason: recipientCount > maxTestRecipients ? `Test-E-Mails können nur an maximal ${maxTestRecipients} Empfänger gesendet werden` : undefined
      };
    }

    const maxAllowed = DEFAULT_RATE_LIMITS.recipientsPerCampaign;
    return {
      valid: recipientCount <= maxAllowed,
      maxAllowed,
      reason: recipientCount > maxAllowed ? `Maximal ${maxAllowed} Empfänger pro Kampagne erlaubt` : undefined
    };
  },

  /**
   * Prüft tägliches Empfänger-Limit
   */
  async checkDailyRecipientLimit(
    userId: string,
    additionalRecipients: number
  ): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
    
    const now = new Date();
    const dayStart = new Date(now.setHours(0, 0, 0, 0));
    const dayEnd = new Date(now.setHours(23, 59, 59, 999));

    try {
      // Zähle alle heute versendeten E-Mails
      const logsRef = collection(db, 'email_activity_logs');
      const q = query(
        logsRef,
        where('userId', '==', userId),
        where('timestamp', '>=', Timestamp.fromDate(dayStart)),
        where('timestamp', '<=', Timestamp.fromDate(now)),
        where('status', '==', 'success')
      );

      const snapshot = await getDocs(q);
      let todaysRecipientCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data() as EmailActivityLog;
        todaysRecipientCount += data.recipientCount;
      });

      const limit = DEFAULT_RATE_LIMITS.recipientsPerDay;
      const wouldExceed = (todaysRecipientCount + additionalRecipients) > limit;
      const remaining = Math.max(0, limit - todaysRecipientCount);

      return {
        allowed: !wouldExceed,
        remaining: wouldExceed ? 0 : remaining - additionalRecipients,
        reason: wouldExceed ? `Tägliches Limit von ${limit} Empfängern erreicht` : undefined
      };

    } catch (error) {
      console.error('❌ Daily recipient limit check failed:', error);
      return { allowed: true, remaining: 0 };
    }
  },

  /**
   * Protokolliert E-Mail-Aktivität für Auditing
   */
  async logEmailActivity(
    activity: Omit<EmailActivityLog, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const logEntry: EmailActivityLog = {
        ...activity,
        timestamp: Timestamp.now()
      };

      const logRef = doc(collection(db, 'email_activity_logs'));
      await setDoc(logRef, logEntry);
      
      console.log('📝 Email activity logged:', {
        type: activity.type,
        recipientCount: activity.recipientCount,
        status: activity.status
      });

    } catch (error) {
      console.error('❌ Failed to log email activity:', error);
    }
  },

  /**
   * Bereinigt alte Rate Limit Einträge (sollte regelmäßig laufen)
   */
  async cleanupOldEntries(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 Tage alte Einträge löschen

      const batch = writeBatch(db);
      let deletedCount = 0;

      // Rate Limits bereinigen
      const rateLimitQuery = query(
        collection(db, 'rate_limits'),
        where('windowEnd', '<', Timestamp.fromDate(cutoffDate))
      );
      
      const rateLimitSnapshot = await getDocs(rateLimitQuery);
      rateLimitSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Alte Logs bereinigen (30 Tage aufbewahren)
      const logCutoff = new Date();
      logCutoff.setDate(logCutoff.getDate() - 30);
      
      const logsQuery = query(
        collection(db, 'email_activity_logs'),
        where('timestamp', '<', Timestamp.fromDate(logCutoff))
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      logsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      await batch.commit();
      
      console.log(`🧹 Cleaned up ${deletedCount} old entries`);
      return deletedCount;

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return 0;
    }
  },

  /**
   * Holt Aktivitäts-Statistiken für einen Benutzer
   */
  async getUserActivityStats(
    userId: string,
    days: number = 7
  ): Promise<{
    totalEmails: number;
    totalRecipients: number;
    testEmails: number;
    campaigns: number;
    failedAttempts: number;
    rateLimitHits: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const q = query(
        collection(db, 'email_activity_logs'),
        where('userId', '==', userId),
        where('timestamp', '>=', Timestamp.fromDate(startDate))
      );

      const snapshot = await getDocs(q);
      
      const stats = {
        totalEmails: 0,
        totalRecipients: 0,
        testEmails: 0,
        campaigns: 0,
        failedAttempts: 0,
        rateLimitHits: 0
      };

      snapshot.forEach(doc => {
        const data = doc.data() as EmailActivityLog;
        stats.totalEmails++;
        
        if (data.status === 'success') {
          stats.totalRecipients += data.recipientCount;
          
          if (data.type === 'test') {
            stats.testEmails++;
          } else if (data.type === 'campaign') {
            stats.campaigns++;
          }
        } else if (data.status === 'failed') {
          stats.failedAttempts++;
        } else if (data.status === 'rate_limited') {
          stats.rateLimitHits++;
        }
      });

      return stats;

    } catch (error) {
      console.error('❌ Failed to get user stats:', error);
      return {
        totalEmails: 0,
        totalRecipients: 0,
        testEmails: 0,
        campaigns: 0,
        failedAttempts: 0,
        rateLimitHits: 0
      };
    }
  }
};