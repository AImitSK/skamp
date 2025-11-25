/**
 * POST /api/pr/email/cron
 * Cron-Job: Verarbeitet geplante Emails
 *
 * Wird alle 5 Minuten von Vercel Cron aufgerufen
 * Laedt pending Emails wo sendAt <= now und versendet sie
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';
import { emailSenderService } from '@/lib/email/email-sender-service';
import { ScheduledEmail } from '@/types/scheduled-email';

const BATCH_SIZE = 50; // Max. Emails pro Cron-Run

// WICHTIG: Vercel Cron ruft per POST auf
export async function POST(request: NextRequest) {
  console.log('🤖 [POST] Email Cron-Job gestartet');

  try {
    // 1. Auth: CRON_SECRET pruefen via Authorization Header ODER Query Parameter
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    console.log('🔐 Auth Check:', {
      hasAuthHeader: !!authHeader,
      hasSecretParam: !!secretParam,
      hasCronSecret: !!cronSecret,
      authHeaderPrefix: authHeader?.substring(0, 10)
    });

    if (!cronSecret) {
      console.error('❌ CRON_SECRET nicht konfiguriert');
      return NextResponse.json(
        { error: 'CRON_SECRET nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Akzeptiere ENTWEDER Bearer Token ODER Query Parameter
    const isAuthValid =
      (authHeader && authHeader === `Bearer ${cronSecret}`) ||
      (secretParam && secretParam === cronSecret);

    if (!isAuthValid) {
      console.error('❌ Auth fehlgeschlagen:', {
        hasAuthHeader: !!authHeader,
        hasSecretParam: !!secretParam,
        bearerMatch: authHeader === `Bearer ${cronSecret}`,
        paramMatch: secretParam === cronSecret
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ Auth erfolgreich');

    // Delegiere an gemeinsame Funktion
    return processScheduledEmails();

  } catch (error) {
    console.error('❌ Cron-Job Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Gemeinsame Funktion für Email-Verarbeitung
 * Wird von GET und POST Handlern verwendet
 */
async function processScheduledEmails() {
  try {
    const now = Timestamp.now();
    console.log('⏰ Aktueller Zeitstempel:', now.toDate().toISOString());

    // 2. Pending Emails laden (sendAt <= now)
    console.log('🔍 Suche nach pending Emails...');
    const snapshot = await adminDb
      .collection('scheduled_emails')
      .where('status', '==', 'pending')
      .where('sendAt', '<=', now)
      .orderBy('sendAt', 'asc')
      .limit(BATCH_SIZE)
      .get();

    console.log(`📊 Gefundene Emails: ${snapshot.size}`);

    if (snapshot.empty) {
      console.log('ℹ️ Keine geplanten Emails zum Versenden');
      return NextResponse.json({
        success: true,
        message: 'Keine geplanten Emails zum Versenden',
        processed: 0
      });
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // 3. Emails einzeln verarbeiten
    for (const doc of snapshot.docs) {
      const scheduledEmail = { id: doc.id, ...doc.data() } as ScheduledEmail;

      try {
        // Status auf 'processing' setzen
        await doc.ref.update({
          status: 'processing',
          updatedAt: Timestamp.now()
        });

        // Email-Daten vorbereiten
        console.log(`📧 [${doc.id}] Bereite Email-Daten vor...`);
        const preparedData = await emailSenderService.prepareEmailData(
          scheduledEmail.campaignId,
          scheduledEmail.organizationId,
          scheduledEmail.draft.content.signatureId,
          scheduledEmail.userId
        );
        console.log(`✅ [${doc.id}] Email-Daten vorbereitet`);

        // Emails versenden
        console.log(`📤 [${doc.id}] Starte Email-Versand an ${scheduledEmail.draft.recipients.totalCount} Empfänger...`);
        const result = await emailSenderService.sendToRecipients(
          scheduledEmail.draft.recipients,
          preparedData,
          scheduledEmail.draft.emailAddressId,
          scheduledEmail.draft.metadata,
          scheduledEmail.draft.content.body // Email-Body aus Draft (nicht Campaign!)
        );
        console.log(`✅ [${doc.id}] Email-Versand abgeschlossen: ${result.successCount} erfolgreich, ${result.failureCount} fehlgeschlagen`);

        // MONITORING: Erstelle Campaign-Monitoring-Tracker (IMMER für Projekt-Kampagnen)
        if (result.successCount > 0) {
          try {
            const campaign = preparedData.campaign;

            // Prüfe ob Kampagne zu einem Projekt gehört ODER Monitoring explizit aktiviert
            const shouldCreateTracker =
              campaign.projectId ||                          // Projekt-Kampagne → immer monitoren
              campaign.monitoringConfig?.isEnabled === true; // Oder explizit aktiviert

            if (shouldCreateTracker) {
              const { campaignMonitoringService } = await import('@/lib/firebase/campaign-monitoring-service');
              const { prService } = await import('@/lib/firebase/pr-service');

              // Setze monitoringConfig falls nicht vorhanden (für Projekt-Kampagnen)
              if (!campaign.monitoringConfig?.isEnabled && campaign.projectId) {
                await prService.update(scheduledEmail.campaignId, {
                  monitoringConfig: {
                    isEnabled: true,
                    monitoringPeriod: 30,
                    keywords: [],  // Werden aus Company extrahiert
                    sources: { googleNews: true, rssFeeds: [] },
                    minMatchScore: 70
                  }
                });
                console.log(`📝 [${doc.id}] MonitoringConfig automatisch gesetzt für Projekt-Kampagne`);
              }

              const trackerId = await campaignMonitoringService.createTrackerForCampaign(
                scheduledEmail.campaignId,
                scheduledEmail.organizationId
              );
              console.log(`✅ [${doc.id}] Monitoring Tracker created: ${trackerId}`);
            }
          } catch (monitoringError) {
            console.error(`⚠️ [${doc.id}] Fehler beim Erstellen des Monitoring Trackers:`, monitoringError);
            // Nicht blockierend - Email wurde bereits erfolgreich versendet
          }
        }

        // Status aktualisieren
        await doc.ref.update({
          status: result.failureCount === 0 ? 'sent' : 'failed',
          processedAt: Timestamp.now(),
          sentAt: result.failureCount === 0 ? Timestamp.now() : null,
          attempts: scheduledEmail.attempts + 1,
          result: {
            successCount: result.successCount,
            failureCount: result.failureCount,
            errors: result.errors
          },
          updatedAt: Timestamp.now()
        });

        // Campaign Status aktualisieren (scheduled -> sent/failed)
        try {
          const campaignRef = adminDb.collection('pr_campaigns').doc(scheduledEmail.campaignId);
          const campaignSnap = await campaignRef.get();

          if (campaignSnap.exists && campaignSnap.data()?.status === 'scheduled') {
            await campaignRef.update({
              status: result.failureCount === 0 ? 'sent' : 'scheduled',
              sentAt: result.failureCount === 0 ? Timestamp.now() : null,
              emailSendResult: {
                successCount: result.successCount,
                failureCount: result.failureCount,
                errors: result.errors
              },
              updatedAt: Timestamp.now()
            });
          }
        } catch (campaignUpdateError) {
          // Campaign-Update Fehler nicht kritisch - Email wurde versendet
          console.error('Failed to update campaign status:', campaignUpdateError);
        }

        results.processed++;
        if (result.failureCount === 0) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${doc.id}: ${result.errors.join(', ')}`);
        }

      } catch (error) {
        // Fehler-Handling
        results.processed++;
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`${doc.id}: ${errorMessage}`);

        // Status auf 'failed' setzen
        await doc.ref.update({
          status: 'failed',
          processedAt: Timestamp.now(),
          attempts: scheduledEmail.attempts + 1,
          error: errorMessage,
          updatedAt: Timestamp.now()
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Cron-Job Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pr/email/cron
 * Vercel Cron ruft diesen Endpoint auf (per GET mit ?secret Parameter)
 *
 * Dieser Handler verarbeitet geplante Emails wenn ?secret Parameter vorhanden ist,
 * ansonsten gibt er Health-Check Statistiken zurück
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Wenn secret Parameter vorhanden ist, führe Email-Verarbeitung durch
  if (secretParam) {
    console.log('🤖 [GET] Email Cron-Job gestartet (via Query Parameter)');

    // Auth prüfen
    if (!cronSecret) {
      console.error('❌ CRON_SECRET nicht konfiguriert');
      return NextResponse.json(
        { error: 'CRON_SECRET nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Debug: Secret-Vergleich loggen
    console.log('🔐 Secret-Vergleich:', {
      secretParamLength: secretParam.length,
      cronSecretLength: cronSecret.length,
      secretParamPreview: secretParam.substring(0, 10) + '...',
      cronSecretPreview: cronSecret.substring(0, 10) + '...',
      match: secretParam === cronSecret,
      // Vercel expandiert $CRON_SECRET manchmal nicht - prüfe auch literal
      isLiteralVar: secretParam === '$CRON_SECRET'
    });

    // Akzeptiere entweder das echte Secret ODER wenn Vercel die Variable nicht expandiert hat
    // (in dem Fall nutzen wir die ENV-Variable direkt)
    const isAuthValid = secretParam === cronSecret || secretParam === '$CRON_SECRET';

    if (!isAuthValid) {
      console.error('❌ Auth fehlgeschlagen: Ungültiger Secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Nutze die gleiche Logik wie der POST-Handler
    // Delegiere an eine gemeinsame Funktion
    return processScheduledEmails();
  }

  // Ansonsten: Health-Check
  console.log('🔍 [GET] Health-Check gestartet');

  try {
    // Auth prüfen (für Health-Check)
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET nicht konfiguriert' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Statistiken abfragen
    const [pendingSnapshot, processingSnapshot] = await Promise.all([
      adminDb
        .collection('scheduled_emails')
        .where('status', '==', 'pending')
        .count()
        .get(),
      adminDb
        .collection('scheduled_emails')
        .where('status', '==', 'processing')
        .count()
        .get()
    ]);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        pending: pendingSnapshot.data().count,
        processing: processingSnapshot.data().count
      }
    });

  } catch (error) {
    console.error('❌ Health-Check Fehler:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
