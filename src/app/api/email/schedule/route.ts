// src/app/api/email/schedule/route.ts - FIXED VERSION WITH URL ENCODING
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

// Firestore REST API Helper - URL ENCODING FIX
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/%28default%29/documents`;

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
  if (body && method !== 'GET') {
    console.log('📝 Request body:', JSON.stringify(body, null, 2));
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`❌ Firestore request failed:`, responseText);
    throw new Error(`Firestore request failed: ${responseText}`);
  }
  
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error('❌ Failed to parse response:', responseText);
    throw new Error('Invalid JSON response from Firestore');
  }
}

// Separate function for Firestore queries - URL ENCODING FIX
async function firestoreQuery(body: any, token?: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/%28default%29/documents:runQuery`;
  
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
  // Handle Firestore Timestamp objects
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
  userId: string,
  token?: string
): Promise<{ success: boolean; jobId?: string; scheduledFor?: Date; calendarEventId?: string; error?: string }> {
  try {
    console.log('📅 Scheduling email campaign:', campaign.title, 'for', scheduledDate);
    console.log('📧 Email content:', emailContent);
    console.log('👤 Sender info:', senderInfo);
    console.log('👥 Recipients:', recipients);

    // Validate scheduling time
    const now = new Date();
    const minScheduleTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    
    if (scheduledDate < minScheduleTime) {
      return {
        success: false,
        error: 'Der Versand muss mindestens 15 Minuten in der Zukunft liegen'
      };
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${nanoid(9)}`;
    const docId = `scheduled_${Date.now()}_${nanoid(9)}`;

    // Create scheduled email document with ALL required fields
    const scheduledEmail = {
      jobId,
      campaignId: campaign.id!,
      campaignTitle: campaign.title,
      userId: campaign.userId,
      organizationId: organizationId || campaign.organizationId || campaign.userId,
      scheduledAt: scheduledDate,
      timezone,
      status: 'pending',
      emailContent: {
        subject: emailContent.subject || '',
        greeting: emailContent.greeting || '',
        introduction: emailContent.introduction || '',
        pressReleaseHtml: emailContent.pressReleaseHtml || '',
        closing: emailContent.closing || '',
        signature: emailContent.signature || ''
      },
      senderInfo: {
        name: senderInfo.name || '',
        title: senderInfo.title || '',
        company: senderInfo.company || '',
        phone: senderInfo.phone || '',
        email: senderInfo.email || ''
      },
      recipients: {
        listIds: recipients.listIds || [],
        listNames: recipients.listNames || [],
        manualRecipients: recipients.manualRecipients || [],
        totalCount: recipients.totalCount || 0
      },
      mediaShareUrl: campaign.assetShareUrl || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📝 Saving scheduled email to Firestore...');
    console.log('📄 Document to save:', JSON.stringify(scheduledEmail, null, 2));
    
    // Save to Firestore via REST API - USING PATCH WITH DIRECT PATH
    const firestoreDoc = convertToFirestoreDocument(scheduledEmail);
    console.log('🔄 Converted Firestore document:', JSON.stringify(firestoreDoc, null, 2));
    
    // Verwende PATCH mit expliziten Feldpfaden
    const createUrl = `scheduled_emails/${docId}`;
    const fieldPaths = [
      'jobId', 'campaignId', 'campaignTitle', 'userId', 'organizationId',
      'scheduledAt', 'timezone', 'status', 'emailContent', 'senderInfo',
      'recipients', 'mediaShareUrl', 'createdAt', 'updatedAt'
    ];
    const updateMask = fieldPaths.map(field => `updateMask.fieldPaths=${field}`).join('&');
    const patchUrl = `${FIRESTORE_BASE_URL}/${createUrl}?${updateMask}`;
    
    const patchResponse = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(firestoreDoc)
    });
    
    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      console.error('❌ Failed to create scheduled email:', errorText);
      throw new Error(`Failed to create scheduled email: ${errorText}`);
    }
    
    console.log('✅ Scheduled email created successfully');
    
    console.log('✅ Scheduled email saved successfully');

    // Create calendar entry
    console.log('📆 Attempting to create calendar entry...');
    let calendarEventId: string | null = null;
    
    try {
      calendarEventId = `cal_${Date.now()}_${nanoid(9)}`;
      
      const calendarEvent = {
        title: `📧 E-Mail-Versand: ${campaign.title}`,
        description: `Geplanter E-Mail-Versand für PR-Kampagne "${campaign.title}" an ${recipients.totalCount} Empfänger.`,
        startTime: scheduledDate,
        endTime: new Date(scheduledDate.getTime() + 30 * 60 * 1000), // +30 minutes
        type: 'email_campaign',
        metadata: {
          campaignId: campaign.id!,
          scheduledEmailId: docId,
          recipientCount: recipients.totalCount,
          jobId: jobId
        },
        userId: userId,
        organizationId: organizationId || userId,
        createdAt: new Date()
      };

      console.log('📝 Creating calendar event with ID:', calendarEventId);
      
      // Create calendar entry via REST API - USING POST with documentId
      await firestoreRequest(
        `calendar_events?documentId=${calendarEventId}`,
        'POST',
        convertToFirestoreDocument(calendarEvent),
        token
      );

      console.log('✅ Calendar entry created:', calendarEventId);
      
      // Update with calendar event ID - USING PATCH WITH UPDATE MASK
      const updateFields = ['calendarEventId', 'updatedAt'];
      const updateMaskQuery = updateFields.map(field => `updateMask.fieldPaths=${field}`).join('&');
      const updateUrl = `scheduled_emails/${docId}?${updateMaskQuery}`;
      
      await firestoreRequest(
        updateUrl,
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
      console.log('📧 Request data:', JSON.stringify(data, null, 2));

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

      // Validation
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
      
      // Validate date
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Ungültiges Datum' },
          { status: 400 }
        );
      }

      // Check minimum time (15 minutes)
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

      // Load campaign
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

      // Authorization check (with multi-tenancy support)
      const campaignOrgId = campaign.organizationId || campaign.userId;
      if (campaign.userId !== auth.userId && campaignOrgId !== auth.organizationId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Kampagne' },
          { status: 403 }
        );
      }

      // Schedule email with inline function
      console.log('📧 Calling scheduleEmailCampaign...');
      const result = await scheduleEmailCampaign(
        campaign,
        data.emailContent,
        data.senderInfo,
        data.recipients,
        scheduledDate,
        data.timezone || 'Europe/Berlin',
        auth.organizationId,
        auth.userId,
        token
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

// DELETE - Cancel scheduled send
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Get job ID from query parameters
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

      // Find document with job ID and check authorization
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

      // Update via REST API
      const docPath = queryResponse[0].document.name.split('/documents/')[1];
      const scheduledEmail = convertFirestoreDocument(queryResponse[0].document);
      
      // Update status to 'cancelled' - WITH UPDATE MASK
      const updateFields = ['status', 'updatedAt'];
      const updateMaskQuery = updateFields.map(field => `updateMask.fieldPaths=${field}`).join('&');
      
      await firestoreRequest(
        `${docPath}?${updateMaskQuery}`,
        'PATCH',
        convertToFirestoreDocument({
          status: 'cancelled',
          updatedAt: new Date()
        }),
        token
      );

      // Delete calendar entry if present
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

// GET - Retrieve scheduled emails
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      console.log('📋 GET /api/email/schedule - Start');
      console.log('📋 Auth context:', {
        userId: auth.userId,
        organizationId: auth.organizationId,
        hasToken: !!req.headers.get('authorization')
      });
      
      // Status filter from query parameters
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

      // Use REST API only
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

      console.log('📧 Found scheduled emails:', scheduledEmails.length);
      scheduledEmails.forEach((email: any) => {
        console.log('📧 Email:', {
          id: email.id,
          jobId: email.jobId,
          campaignTitle: email.campaignTitle,
          status: email.status,
          hasEmailContent: !!email.emailContent,
          hasSenderInfo: !!email.senderInfo,
          hasRecipients: !!email.recipients
        });
      });

      // Calculate statistics
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