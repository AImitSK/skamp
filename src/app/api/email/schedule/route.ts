// src/app/api/email/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { emailSchedulerService } from '@/lib/firebase/email-scheduler-service';
import { db } from '@/lib/firebase/client-init';
import { doc, getDoc } from 'firebase/firestore';
import { PRCampaign } from '@/types/pr';

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

export async function POST(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data: ScheduleEmailRequest = await request.json();
    
    console.log('📅 Scheduling email for campaign:', data.campaignId);

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

    // Kampagne laden
    const campaignDoc = await getDoc(doc(db, 'pr_campaigns', data.campaignId));
    
    if (!campaignDoc.exists()) {
      return NextResponse.json(
        { error: 'Kampagne nicht gefunden' },
        { status: 404 }
      );
    }

    const campaign = {
      ...campaignDoc.data(),
      id: campaignDoc.id
    } as PRCampaign;

    // Berechtigungsprüfung
    if (campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'Keine Berechtigung für diese Kampagne' },
        { status: 403 }
      );
    }

    // Email planen
    const result = await emailSchedulerService.scheduleEmailCampaign(
      campaign,
      data.emailContent,
      data.senderInfo,
      data.recipients,
      scheduledDate,
      data.timezone || 'Europe/Berlin'
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Planung fehlgeschlagen' },
        { status: 500 }
      );
    }

    console.log('✅ Email scheduled successfully:', result.jobId);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      scheduledFor: result.scheduledFor,
      calendarEventId: result.calendarEventId
    });

  } catch (error: any) {
    console.error('❌ Schedule email error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Email-Planung fehlgeschlagen' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Geplanten Versand stornieren
export async function DELETE(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Job ID aus Query-Parametern
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID fehlt' },
        { status: 400 }
      );
    }

    console.log('🚫 Cancelling scheduled email:', jobId);

    // Versand stornieren
    const success = await emailSchedulerService.cancelScheduledEmail(jobId);

    if (!success) {
      return NextResponse.json(
        { error: 'Stornierung fehlgeschlagen. Email wurde möglicherweise bereits versendet.' },
        { status: 404 }
      );
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
}

// GET - Geplante Emails abrufen
export async function GET(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Status-Filter aus Query-Parametern
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;

    console.log('📋 Loading scheduled emails for user:', userId);

    // Geplante Emails laden
    const scheduledEmails = await emailSchedulerService.getScheduledEmails(
      userId,
      status
    );

    // Statistiken berechnen
    const stats = await emailSchedulerService.getSchedulingStats(userId);

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
}