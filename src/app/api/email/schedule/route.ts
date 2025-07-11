// src/app/api/email/schedule/route.ts - COMPLETE VERSION
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { PRCampaign } from '@/types/pr';
import { nanoid } from 'nanoid';

interface ScheduleEmailRequest {
  campaignId: string;
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
  scheduledDate: string; // ISO date string
  timezone?: string;
}

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
  
  console.log(`🔍 Firestore ${method} request to:`, url);
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Firestore request failed:`, error);
    throw new Error(`Firestore request failed: ${error}`);
  }
  
  return response.json();
}

// Separate function for Firestore queries
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

// Convert Firestore document to JS object
function convertFirestoreDocument(doc: any): any {
  if (!doc.fields) return null;
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = convertFirestoreValue(value);
  }
  
  return result;
}

function convertFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.arrayValue !== undefined) {
    return value.arrayValue.values?.map((v: any) => convertFirestoreValue(v)) || [];
  }
  if (value.mapValue !== undefined) {
    const result: any = {};
    if (value.mapValue.fields) {
      for (const [k, v] of Object.entries(value.mapValue.fields)) {
        result[k] = convertFirestoreValue(v);
      }
    }
    return result;
  }
  return null;
}

// Convert JS object to Firestore document
function convertToFirestoreDocument(data: any): any {
  const fields: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    fields[key] = convertToFirestoreValue(value);
  }
  
  return { fields };
}

function convertToFirestoreValue(value: any): any {
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
  // WICHTIG: Firestore Timestamp Objekte
  if (value && typeof value.toDate === 'function') {
    return { timestampValue: value.toDate().toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(v => convertToFirestoreValue(v))
      }
    };
  }
  if (typeof value === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = convertToFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

// Inline implementation of scheduleEmailCampaign
async function scheduleEmailCampaign(
  campaign: PRCampaign,
  emailContent: any,
  senderInfo: any,
  recipients: any,
  scheduledDate: Date,
  timezone: string,
  organizationId: string,
  userId: string, // NEU: userId als Parameter
  token?: string  // Token als Parameter hinzugefügt
): Promise<{ success: boolean; jobId?: string; scheduledFor?: Date; calendarEventId?: string; error?: string }> {
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
    const jobId = `job_${Date.now()}_${nanoid(9)}`;
    const docId = `scheduled_${Date.now()}_${nanoid(9)}`;

    // Erstelle Scheduled Email Dokument
    const scheduledEmail = {
      jobId,
      campaignId: campaign.id!,
      campaignTitle: campaign.title,
      userId: campaign.userId,
      organizationId: organizationId || campaign.organizationId || campaign.userId,
      scheduledAt: scheduledDate,
      timezone,
      status: 'pending',
      emailContent,
      senderInfo,
      recipients,
      mediaShareUrl: campaign.assetShareUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📝 Saving scheduled email to Firestore...');
    
    // Speichere in Firestore über REST API
    await firestoreRequest(
      `scheduled_emails?documentId=${docId}`,
      'POST',
      convertToFirestoreDocument(scheduledEmail),
      token
    );
    
    console.log('✅ Scheduled email saved successfully');

    // Erstelle Kalender-Eintrag
    console.log('📆 Attempting to create calendar entry...');
    let calendarEventId: string | null = null;
    
    try {
      calendarEventId = `cal_${Date.now()}_${nanoid(9)}`;
      
      const calendarEvent = {
        title: `📧 E-Mail-Versand: ${campaign.title}`,
        description: `Geplanter E-Mail-Versand für PR-Kampagne "${campaign.title}" an ${recipients.totalCount} Empfänger.`,
        startTime: scheduledDate,
        endTime: new Date(scheduledDate.getTime() + 30 * 60 * 1000), // +30 Minuten
        type: 'email_campaign',
        metadata: {
          campaignId: campaign.id!,
          scheduledEmailId: docId,
          recipientCount: recipients.totalCount,
          jobId: jobId
        },
        userId: userId, // Verwende den übergebenen userId
        organizationId: organizationId || userId, // Fallback auf userId
        createdAt: new Date()
      };

      console.log('📝 Creating calendar event with ID:', calendarEventId);
      
      // Erstelle Kalender-Eintrag über REST API
      await firestoreRequest(
        `calendar_events?documentId=${calendarEventId}`,
        'POST',
        convertToFirestoreDocument(calendarEvent),
        token
      );

      console.log('✅ Calendar entry created:', calendarEventId);
      
      // Update mit Calendar Event ID
      await firestoreRequest(
        `scheduled_emails/${docId}`,
        'PATCH',
        convertToFirestoreDocument({
          calendarEventId,
          updatedAt: new Date()
        }),
        token
      );
      
    } catch (error) {
      console.error('❌ Error creating calendar entry:', error);
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
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      console.log('📅 POST /api/email/schedule - Start');
      console.log('📋 Auth context:', {
        userId: auth.userId,
        organizationId: auth.organizationId,
        hasToken: !!req.headers.get('authorization')
      });
      
      const data: ScheduleEmailRequest = await req.json();
      
      console.log('📅 Scheduling email for campaign:', data.campaignId);

      // Get user token for Firestore requests
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];
      
      if (!token) {
        console.error('❌ No auth token found');
        return NextResponse.json(
          { error: 'Authentifizierung erforderlich' },
          { status: 401 }
        );
      }

      // Validierung
      if (!data.campaignId) {
        return NextResponse.json(
          { error: 'Campaign ID fehlt' },
          { status: 400 }
        );
      }

      if (!data.scheduledDate) {
        return NextResponse.json(
          { error: 'Versanddatum fehlt' },
          { status: 400 }
        );
      }

      const scheduledDate = new Date(data.scheduledDate);
      
      // Validiere Datum
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Ungültiges Datum' },
          { status: 400 }
        );
      }

      // Mindestzeit prüfen (15 Minuten)
      const now = new Date();
      const minScheduleTime = new Date(now.getTime() + 15 * 60 * 1000);
      
      if (scheduledDate < minScheduleTime) {
        return NextResponse.json(
          { 
            error: 'Der Versand muss mindestens 15 Minuten in der Zukunft liegen',
            minTime: minScheduleTime.toISOString()
          },
          { status: 400 }
        );
      }

      // Kampagne laden - nur mit REST API
      console.log('📄 Loading campaign:', data.campaignId);
      let campaign: PRCampaign;
      
      const campaignDoc = await firestoreRequest(
        `pr_campaigns/${data.campaignId}`,
        'GET',
        undefined,
        token
      );
      
      if (!campaignDoc.fields) {
        return NextResponse.json(
          { error: 'Kampagne nicht gefunden' },
          { status: 404 }
        );
      }
      
      campaign = {
        ...convertFirestoreDocument(campaignDoc),
        id: data.campaignId
      };

      console.log('✅ Campaign loaded:', campaign.title);

      // Berechtigungsprüfung (mit Multi-Tenancy Support)
      const campaignOrgId = campaign.organizationId || campaign.userId;
      if (campaign.userId !== auth.userId && campaignOrgId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Email planen mit inline Funktion
      console.log('📧 Calling scheduleEmailCampaign...');
      const result = await scheduleEmailCampaign(
        campaign,
        data.emailContent,
        data.senderInfo,
        data.recipients,
        scheduledDate,
        data.timezone || 'Europe/Berlin',
        auth.organizationId,
        auth.userId,  // NEU: userId übergeben
        token  // Token übergeben
      );

      if (!result.success) {
        console.error('❌ Scheduling failed:', result.error);
        return NextResponse.json(
          { error: result.error || 'Planung fehlgeschlagen' },
          { status: 500 }
        );
      }

      console.log('✅ Email scheduled successfully:', result.jobId);
      console.log('📅 Final calendar event ID:', result.calendarEventId);

      return NextResponse.json({
        success: true,
        jobId: result.jobId,
        scheduledFor: result.scheduledFor,
        calendarEventId: result.calendarEventId
      });

    } catch (error: any) {
      console.error('❌ Schedule email error:', error);
      console.error('Error stack:', error.stack);
      
      return NextResponse.json(
        { 
          error: error.message || 'Email-Planung fehlgeschlagen' 
        },
        { status: 500 }
      );
    }
  });
}

// DELETE - Geplanten Versand stornieren
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Job ID aus Query-Parametern
      const { searchParams } = new URL(req.url);
      const jobId = searchParams.get('jobId');

      if (!jobId) {
        return NextResponse.json(
          { error: 'Job ID fehlt' },
          { status: 400 }
        );
      }

      console.log('🚫 Cancelling scheduled email:', jobId);

      // Get user token for Firestore requests
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];

      // Finde das Dokument mit der Job-ID und prüfe Berechtigung - über REST API
      const queryResponse = await firestoreQuery(
        {
          structuredQuery: {
            from: [{ collectionId: 'scheduled_emails' }],
            where: {
              compositeFilter: {
                op: 'AND',
                filters: [
                  {
                    fieldFilter: {
                      field: { fieldPath: 'jobId' },
                      op: 'EQUAL',
                      value: { stringValue: jobId }
                    }
                  },
                  {
                    fieldFilter: {
                      field: { fieldPath: 'organizationId' },
                      op: 'EQUAL',
                      value: { stringValue: auth.organizationId }
                    }
                  },
                  {
                    fieldFilter: {
                      field: { fieldPath: 'status' },
                      op: 'EQUAL',
                      value: { stringValue: 'pending' }
                    }
                  }
                ]
              }
            },
            limit: 1
          }
        },
        token
      );

      if (!queryResponse[0]?.document) {
        return NextResponse.json(
          { error: 'Geplante E-Mail nicht gefunden oder bereits versendet' },
          { status: 404 }
        );
      }

      // Update über REST API
      const docPath = queryResponse[0].document.name.split('/documents/')[1];
      const scheduledEmail = convertFirestoreDocument(queryResponse[0].document);
      
      // Update Status auf 'cancelled'
      await firestoreRequest(
        docPath,
        'PATCH',
        convertToFirestoreDocument({
          status: 'cancelled',
          updatedAt: new Date()
        }),
        token
      );

      // Lösche Kalender-Eintrag wenn vorhanden
      if (scheduledEmail.calendarEventId) {
        try {
          await firestoreRequest(
            `calendar_events/${scheduledEmail.calendarEventId}`,
            'DELETE',
            undefined,
            token
          );
          console.log('✅ Calendar entry deleted');
        } catch (error) {
          console.error('⚠️ Could not delete calendar entry:', error);
        }
      }

      console.log('✅ Scheduled email cancelled successfully');

      return NextResponse.json({
        success: true,
        message: 'Geplanter Versand wurde storniert'
      });

    } catch (error: any) {
      console.error('❌ Cancel scheduled email error:', error);
      
      return NextResponse.json(
        { 
          error: error.message || 'Stornierung fehlgeschlagen' 
        },
        { status: 500 }
      );
    }
  });
}

// GET - Geplante Emails abrufen
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      console.log('📋 GET /api/email/schedule - Start');
      console.log('📋 Auth context:', {
        userId: auth.userId,
        organizationId: auth.organizationId,
        hasToken: !!req.headers.get('authorization')
      });
      
      // Status-Filter aus Query-Parametern
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status') as any;

      console.log('📋 Loading scheduled emails for org:', auth.organizationId);

      // Get user token for Firestore requests
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];
      
      if (!token) {
        console.error('❌ No auth token found');
        return NextResponse.json(
          { error: 'Authentifizierung erforderlich' },
          { status: 401 }
        );
      }

      // Nutze nur REST API
      let queryBody: any = {
        structuredQuery: {
          from: [{ collectionId: 'scheduled_emails' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'organizationId' },
              op: 'EQUAL',
              value: { stringValue: auth.organizationId }
            }
          }
          // TEMPORÄR: orderBy entfernt bis Index erstellt ist
          // orderBy: [{
          //   field: { fieldPath: 'scheduledAt' },
          //   direction: 'DESCENDING'
          // }]
        }
      };

      if (status) {
        queryBody.structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters: [
              queryBody.structuredQuery.where,
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'EQUAL',
                  value: { stringValue: status }
                }
              }
            ]
          }
        };
      }

      const queryResponse = await firestoreQuery(queryBody, token);
      
      const scheduledEmails = queryResponse
        .filter((result: any) => result.document)
        .map((result: any) => ({
          id: result.document.name.split('/').pop(),
          ...convertFirestoreDocument(result.document)
        }));

      // Statistiken berechnen
      const stats = {
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        processing: 0,
        nextScheduled: undefined as Date | undefined
      };

      const now = new Date();

      scheduledEmails.forEach((email: any) => {
        if (email.status && email.status in stats && email.status !== 'processing') {
          (stats as any)[email.status]++;
        }
        
        if (email.status === 'pending' && email.scheduledAt) {
          const scheduledDate = new Date(email.scheduledAt);
          if (scheduledDate > now && (!stats.nextScheduled || scheduledDate < stats.nextScheduled)) {
            stats.nextScheduled = scheduledDate;
          }
        }
      });

      return NextResponse.json({
        success: true,
        emails: scheduledEmails,
        stats,
        count: scheduledEmails.length
      });

    } catch (error: any) {
      console.error('❌ Get scheduled emails error:', error);
      
      return NextResponse.json(
        { 
          error: error.message || 'Abruf fehlgeschlagen' 
        },
        { status: 500 }
      );
    }
  });
}