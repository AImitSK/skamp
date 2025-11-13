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
          scheduledEmail.draft.metadata
        );
        console.log(`✅ [${doc.id}] Email-Versand abgeschlossen: ${result.successCount} erfolgreich, ${result.failureCount} fehlgeschlagen`);

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
 * Health-Check Endpoint: Gibt Status und Statistiken zurück
 */
export async function GET(request: NextRequest) {
  console.log('🔍 [GET] Health-Check gestartet');

  try {
    // 1. Auth: CRON_SECRET pruefen via Authorization Header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

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

    // 2. Statistiken abfragen
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
