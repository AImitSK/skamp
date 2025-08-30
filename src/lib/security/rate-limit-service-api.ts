// src/lib/security/rate-limit-service-api.ts
// Version für API Routes - nutzt Firestore REST API statt direkten Client

export interface RateLimitConfig {
  testEmailsPerHour: number;
  campaignsPerDay: number;
  recipientsPerCampaign: number;
  recipientsPerDay: number;
}

export interface RateLimitEntry {
  userId: string;
  type: 'test' | 'campaign' | 'recipients' | 'approval';
  count: number;
  windowStart: Date;
  windowEnd: Date;
  metadata?: {
    campaignId?: string;
    recipientCount?: number;
  };
}

export interface EmailActivityLog {
  id?: string;
  userId: string;
  organizationId: string;
  type: 'test' | 'campaign' | 'scheduled' | 'approval';
  campaignId?: string;
  campaignTitle?: string;
  recipientCount: number;
  recipientEmails?: string[]; // Nur für Test-Emails
  status: 'success' | 'failed' | 'rate_limited';
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

// Standard-Limits (können über Umgebungsvariablen überschrieben werden)
export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  testEmailsPerHour: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_TEST_EMAILS || '10'),
  campaignsPerDay: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_CAMPAIGNS || '50'),
  recipientsPerCampaign: parseInt(process.env.NEXT_PUBLIC_MAX_RECIPIENTS_PER_CAMPAIGN || '500'),
  recipientsPerDay: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_RECIPIENTS_PER_DAY || '5000')
};

// Approval-spezifische Rate Limits
export const APPROVAL_RATE_LIMITS = {
  approvalsPerHour: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_APPROVALS || '20'),
  approvalEmailsPerHour: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_APPROVAL_EMAILS || '30')
};

// Firestore REST API Helper
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function firestoreRequest(
  path: string,
  method: string = 'GET',
  body?: any,
  token?: string
) {
  const url = `${FIRESTORE_BASE_URL}/${path}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firestore request failed: ${error}`);
  }
  
  return response.json();
}

// Firestore Query Helper
async function firestoreQuery(body: any, token?: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firestore query failed: ${error}`);
  }
  
  return response.json();
}

// Convert to Firestore format
function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: value.toString() };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(v => toFirestoreValue(v))
      }
    };
  }
  if (typeof value === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

// Convert from Firestore format
function fromFirestoreValue(value: any): any {
  if (value.nullValue !== undefined) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.arrayValue !== undefined) {
    return value.arrayValue.values?.map((v: any) => fromFirestoreValue(v)) || [];
  }
  if (value.mapValue !== undefined) {
    const result: any = {};
    if (value.mapValue.fields) {
      for (const [k, v] of Object.entries(value.mapValue.fields)) {
        result[k] = fromFirestoreValue(v);
      }
    }
    return result;
  }
  return null;
}

export const rateLimitServiceAPI = {
  /**
   * Prüft Rate Limit für eine bestimmte Aktion
   */
  async checkRateLimit(
    userId: string,
    type: 'test' | 'campaign' | 'approval',
    additionalCount: number = 1,
    token?: string
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
    } else if (type === 'approval') {
      // 1-Stunden-Fenster für Approval-Emails
      windowStart = new Date(now.getTime() - 60 * 60 * 1000);
      windowEnd = new Date(now.getTime() + 60 * 60 * 1000);
      limit = APPROVAL_RATE_LIMITS.approvalEmailsPerHour;
    } else {
      // 24-Stunden-Fenster für Kampagnen
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);
      windowStart = dayStart;
      windowEnd = dayEnd;
      limit = DEFAULT_RATE_LIMITS.campaignsPerDay;
    }

    try {
      // Query für Rate Limit Einträge
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'rate_limits' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'EQUAL',
                    value: { stringValue: userId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'type' },
                    op: 'EQUAL',
                    value: { stringValue: type }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'windowStart' },
                    op: 'GREATER_THAN_OR_EQUAL',
                    value: { timestampValue: windowStart.toISOString() }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'windowStart' },
                    op: 'LESS_THAN_OR_EQUAL',
                    value: { timestampValue: now.toISOString() }
                  }
                }
              ]
            }
          }
        }
      };

      const response = await firestoreQuery(queryBody, token);
      
      let currentCount = 0;
      if (response && Array.isArray(response)) {
        response.forEach((result: any) => {
          if (result.document?.fields?.count) {
            currentCount += fromFirestoreValue(result.document.fields.count);
          }
        });
      }

      const wouldExceed = (currentCount + additionalCount) > limit;
      const remaining = Math.max(0, limit - currentCount);

      return {
        allowed: !wouldExceed,
        remaining: wouldExceed ? 0 : remaining - additionalCount,
        resetAt: windowEnd,
        reason: wouldExceed ? `Limit von ${limit} ${type === 'test' ? 'Test-E-Mails pro Stunde' : type === 'approval' ? 'Freigabe-E-Mails pro Stunde' : 'Kampagnen pro Tag'} überschritten` : undefined
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
    type: 'test' | 'campaign' | 'approval',
    count: number = 1,
    metadata?: any,
    token?: string
  ): Promise<void> {
    try {
      const now = new Date();
      const entryId = `${userId}_${type}_${now.getTime()}`;
      
      const entry: RateLimitEntry = {
        userId,
        type,
        count,
        windowStart: now,
        windowEnd: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        metadata
      };

      const document = {
        fields: {
          userId: toFirestoreValue(userId),
          type: toFirestoreValue(type),
          count: toFirestoreValue(count),
          windowStart: toFirestoreValue(entry.windowStart),
          windowEnd: toFirestoreValue(entry.windowEnd),
          metadata: metadata ? toFirestoreValue(metadata) : { nullValue: null }
        }
      };

      await firestoreRequest(`rate_limits/${entryId}`, 'PATCH', document, token);
      
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
    additionalRecipients: number,
    token?: string
  ): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
    
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    try {
      // Query für heutige E-Mail-Aktivitäten
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'email_activity_logs' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'EQUAL',
                    value: { stringValue: userId }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'timestamp' },
                    op: 'GREATER_THAN_OR_EQUAL',
                    value: { timestampValue: dayStart.toISOString() }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'timestamp' },
                    op: 'LESS_THAN_OR_EQUAL',
                    value: { timestampValue: now.toISOString() }
                  }
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'status' },
                    op: 'EQUAL',
                    value: { stringValue: 'success' }
                  }
                }
              ]
            }
          }
        }
      };

      const response = await firestoreQuery(queryBody, token);
      
      let todaysRecipientCount = 0;
      if (response && Array.isArray(response)) {
        response.forEach((result: any) => {
          if (result.document?.fields?.recipientCount) {
            todaysRecipientCount += fromFirestoreValue(result.document.fields.recipientCount);
          }
        });
      }

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
    activity: Omit<EmailActivityLog, 'id' | 'timestamp'>,
    token?: string
  ): Promise<void> {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date();
      
      const document = {
        fields: {
          userId: toFirestoreValue(activity.userId),
          organizationId: toFirestoreValue(activity.organizationId),
          type: toFirestoreValue(activity.type),
          campaignId: activity.campaignId ? toFirestoreValue(activity.campaignId) : { nullValue: null },
          campaignTitle: activity.campaignTitle ? toFirestoreValue(activity.campaignTitle) : { nullValue: null },
          recipientCount: toFirestoreValue(activity.recipientCount),
          recipientEmails: activity.recipientEmails ? toFirestoreValue(activity.recipientEmails) : { nullValue: null },
          status: toFirestoreValue(activity.status),
          errorMessage: activity.errorMessage ? toFirestoreValue(activity.errorMessage) : { nullValue: null },
          ip: activity.ip ? toFirestoreValue(activity.ip) : { nullValue: null },
          userAgent: activity.userAgent ? toFirestoreValue(activity.userAgent) : { nullValue: null },
          timestamp: toFirestoreValue(timestamp)
        }
      };

      await firestoreRequest(`email_activity_logs/${logId}`, 'PATCH', document, token);
      
      console.log('📝 Email activity logged:', {
        type: activity.type,
        recipientCount: activity.recipientCount,
        status: activity.status
      });

    } catch (error) {
      console.error('❌ Failed to log email activity:', error);
    }
  }
};