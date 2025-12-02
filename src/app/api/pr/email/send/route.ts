/**
 * POST /api/pr/email/send
 * Email sofort versenden ODER fuer spaeteren Versand einplanen
 *
 * Verwendet den neuen emailSenderService (mit Admin SDK)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';
import { emailSenderService } from '@/lib/email/email-sender-service';
import { SendEmailRequest, SendEmailResponse, ScheduledEmail } from '@/types/scheduled-email';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth pruefen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // 2. Request-Body parsen
    const body: SendEmailRequest = await request.json();
    const { campaignId, organizationId, draft, sendImmediately, scheduledDate } = body;

    // 3. Validierung
    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaignId ist erforderlich' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId ist erforderlich' },
        { status: 400 }
      );
    }

    if (!draft || !draft.recipients || !draft.emailAddressId || !draft.metadata) {
      return NextResponse.json(
        { success: false, error: 'Unvollstaendiger Email-Entwurf' },
        { status: 400 }
      );
    }

    if (!sendImmediately && !scheduledDate) {
      return NextResponse.json(
        { success: false, error: 'scheduledDate ist erforderlich wenn nicht sofort gesendet wird' },
        { status: 400 }
      );
    }

    // 4a. SOFORT VERSENDEN
    if (sendImmediately) {
      // Email-Daten vorbereiten
      const preparedData = await emailSenderService.prepareEmailData(
        campaignId,
        organizationId,
        draft.content.signatureId,
        userId
      );

      // Emails versenden
      const result = await emailSenderService.sendToRecipients(
        draft.recipients,
        preparedData,
        draft.emailAddressId,
        draft.metadata,
        draft.content.body // Email-Body aus Draft (nicht Campaign!)
      );

      // 5. MONITORING: Erstelle Campaign-Monitoring-Tracker (IMMER für Projekt-Kampagnen)
      try {
        const campaign = preparedData.campaign;

        // Prüfe ob Kampagne zu einem Projekt gehört ODER Monitoring explizit aktiviert
        const shouldCreateTracker =
          campaign.projectId ||                          // Projekt-Kampagne → immer monitoren
          campaign.monitoringConfig?.isEnabled === true; // Oder explizit aktiviert

        if (shouldCreateTracker) {
          const { campaignMonitoringService } = await import('@/lib/firebase/campaign-monitoring-service');

          // Setze monitoringConfig falls nicht vorhanden (für Projekt-Kampagnen)
          // Direkt mit adminDb statt prService (Client-SDK vermeiden!)
          if (!campaign.monitoringConfig?.isEnabled && campaign.projectId) {
            await adminDb.collection('pr_campaigns').doc(campaignId).update({
              monitoringConfig: {
                isEnabled: true,
                monitoringPeriod: 30,
                keywords: [],  // Werden aus Company extrahiert
                sources: { googleNews: true, rssFeeds: [] },
                minMatchScore: 70
              },
              updatedAt: Timestamp.now()
            });
            console.log(`📝 MonitoringConfig automatisch gesetzt für Projekt-Kampagne ${campaignId}`);
          }

          const trackerId = await campaignMonitoringService.createTrackerForCampaign(
            campaignId,
            organizationId
          );
          console.log(`✅ Monitoring Tracker created: ${trackerId}`);
        }
      } catch (monitoringError) {
        console.error('⚠️ Fehler beim Erstellen des Monitoring Trackers:', monitoringError);
        // Nicht blockierend - Email wurde bereits erfolgreich versendet
      }

      const response: SendEmailResponse = {
        success: result.failureCount === 0,
        result: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors
        }
      };

      return NextResponse.json(response, { status: 200 });
    }

    // 4b. FUER SPAETER EINPLANEN
    if (scheduledDate) {
      const sendAt = new Date(scheduledDate);

      // Validierung: Datum muss in der Zukunft liegen
      if (sendAt <= new Date()) {
        return NextResponse.json(
          { success: false, error: 'Geplantes Datum muss in der Zukunft liegen' },
          { status: 400 }
        );
      }

      // In Firestore speichern
      const scheduledEmail: Omit<ScheduledEmail, 'id'> = {
        organizationId,
        userId,
        campaignId,
        draft,
        sendAt: Timestamp.fromDate(sendAt) as any, // Type-Cast: firebase-admin Timestamp zu client Timestamp
        timezone: draft.scheduling?.timezone || 'Europe/Berlin',
        status: 'pending',
        attempts: 0,
        createdAt: Timestamp.now() as any, // Type-Cast: firebase-admin Timestamp zu client Timestamp
        updatedAt: Timestamp.now() as any // Type-Cast: firebase-admin Timestamp zu client Timestamp
      };

      const docRef = await adminDb.collection('scheduled_emails').add(scheduledEmail);

      const response: SendEmailResponse = {
        success: true,
        scheduledEmailId: docRef.id,
        scheduledFor: sendAt.toISOString()
      };

      return NextResponse.json(response, { status: 201 });
    }

    // Fallback: Sollte nie erreicht werden
    return NextResponse.json(
      { success: false, error: 'Ungueltige Anfrage' },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
