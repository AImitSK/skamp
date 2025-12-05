/**
 * POST /api/reporting/cron
 * CRON-Job: Verarbeitet fällige Auto-Reportings
 *
 * Wird täglich um 7:00 UTC (8:00/9:00 deutscher Zeit) von Vercel CRON aufgerufen
 * Lädt Auto-Reportings wo nextSendAt <= now und versendet Reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { AutoReporting, AutoReportingSendLog, SendStatus } from '@/types/auto-reporting';
import { getAutoReportEmailTemplateWithBranding } from '@/lib/email/auto-reporting-email-templates';
import { calculateNextSendDate, formatReportPeriod, calculateReportPeriod } from '@/lib/utils/reporting-helpers';

const BATCH_SIZE = 20; // Max. Reports pro CRON-Run

// Lazy-initialisierter Resend-Client
let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY ist nicht konfiguriert');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// ========================================
// CRON HANDLER
// ========================================

export async function POST(request: NextRequest) {
  console.log('[Auto-Reporting CRON] Gestartet');

  try {
    // Auth: CRON_SECRET prüfen
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Auto-Reporting CRON] CRON_SECRET nicht konfiguriert');
      return NextResponse.json({ error: 'CRON_SECRET nicht konfiguriert' }, { status: 500 });
    }

    const isAuthValid =
      (authHeader && authHeader === `Bearer ${cronSecret}`) ||
      (secretParam && secretParam === cronSecret) ||
      (secretParam === '$CRON_SECRET'); // Vercel expandiert manchmal nicht

    if (!isAuthValid) {
      console.error('[Auto-Reporting CRON] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return processAutoReportings();
  } catch (error) {
    console.error('[Auto-Reporting CRON] Fehler:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  // Wenn secret Parameter vorhanden, führe Verarbeitung durch
  if (secretParam) {
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET nicht konfiguriert' }, { status: 500 });
    }

    const isAuthValid = secretParam === cronSecret || secretParam === '$CRON_SECRET';
    if (!isAuthValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return processAutoReportings();
  }

  // Health-Check
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [pendingSnapshot, activeSnapshot] = await Promise.all([
      adminDb
        .collection('auto_reportings')
        .where('isActive', '==', true)
        .where('nextSendAt', '<=', Timestamp.now())
        .count()
        .get(),
      adminDb
        .collection('auto_reportings')
        .where('isActive', '==', true)
        .count()
        .get()
    ]);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        pending: pendingSnapshot.data().count,
        active: activeSnapshot.data().count
      }
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// ========================================
// PROCESSING LOGIC
// ========================================

async function processAutoReportings() {
  const now = Timestamp.now();
  console.log(`[Auto-Reporting CRON] Zeitstempel: ${now.toDate().toISOString()}`);

  // Fällige Auto-Reportings laden
  const snapshot = await adminDb
    .collection('auto_reportings')
    .where('isActive', '==', true)
    .where('nextSendAt', '<=', now)
    .orderBy('nextSendAt', 'asc')
    .limit(BATCH_SIZE)
    .get();

  console.log(`[Auto-Reporting CRON] Gefunden: ${snapshot.size} fällige Reports`);

  if (snapshot.empty) {
    return NextResponse.json({
      success: true,
      message: 'Keine fälligen Auto-Reportings',
      processed: 0
    });
  }

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    deactivated: 0,
    errors: [] as string[]
  };

  for (const doc of snapshot.docs) {
    const reporting = { id: doc.id, ...doc.data() } as AutoReporting;
    console.log(`[Auto-Reporting CRON] Verarbeite: ${reporting.campaignName} (${doc.id})`);

    try {
      // Prüfe ob Monitoring abgelaufen
      if (reporting.monitoringEndDate.toDate() < now.toDate()) {
        console.log(`[Auto-Reporting CRON] Monitoring abgelaufen, deaktiviere: ${doc.id}`);
        await doc.ref.update({
          isActive: false,
          updatedAt: Timestamp.now()
        });
        results.deactivated++;
        results.processed++;
        continue;
      }

      // Report generieren und senden
      const sendResult = await sendReportForAutoReporting(reporting);

      // Update Auto-Reporting
      const nextSendAt = calculateNextSendDate(
        reporting.frequency,
        reporting.dayOfWeek,
        reporting.dayOfMonth
      );

      await doc.ref.update({
        lastSentAt: Timestamp.now(),
        lastSendStatus: sendResult.status,
        lastSendError: sendResult.status === 'failed' ? sendResult.error : null,
        nextSendAt: Timestamp.fromDate(nextSendAt),
        updatedAt: Timestamp.now()
      });

      // Log schreiben - WICHTIG: Keine undefined-Werte für Firestore!
      const logData: Record<string, any> = {
        autoReportingId: doc.id,
        organizationId: reporting.organizationId,
        campaignId: reporting.campaignId,
        sentAt: Timestamp.now(),
        recipients: reporting.recipients.map(r => r.email),
        status: sendResult.status
      };
      // Optionale Felder nur hinzufügen wenn sie einen Wert haben
      if (sendResult.error) logData.errorMessage = sendResult.error;
      if (sendResult.pdfUrl) logData.pdfUrl = sendResult.pdfUrl;

      await adminDb.collection('auto_reporting_logs').add(logData);

      results.processed++;
      if (sendResult.status === 'success') {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${doc.id}: ${sendResult.error}`);
      }

    } catch (error) {
      console.error(`[Auto-Reporting CRON] Fehler bei ${doc.id}:`, error);
      results.processed++;
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`${doc.id}: ${errorMessage}`);

      // Fehler-Status setzen, aber nextSendAt trotzdem aktualisieren (kein Retry)
      const nextSendAt = calculateNextSendDate(
        reporting.frequency,
        reporting.dayOfWeek,
        reporting.dayOfMonth
      );

      await doc.ref.update({
        lastSendStatus: 'failed',
        lastSendError: errorMessage,
        nextSendAt: Timestamp.fromDate(nextSendAt),
        updatedAt: Timestamp.now()
      });
    }
  }

  console.log(`[Auto-Reporting CRON] Abgeschlossen:`, results);

  return NextResponse.json({
    success: true,
    results
  });
}

// ========================================
// REPORT GENERATION & SENDING
// ========================================

interface SendResult {
  status: SendStatus;
  error?: string;
  pdfUrl?: string;
}

async function sendReportForAutoReporting(reporting: AutoReporting): Promise<SendResult> {
  try {
    // 1. PDF-Report generieren
    console.log(`[Auto-Reporting] Generiere PDF für Kampagne: ${reporting.campaignId}`);
    const pdfResult = await generateReportPDF(reporting);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return { status: 'failed', error: pdfResult.error || 'PDF-Generierung fehlgeschlagen' };
    }

    // 2. E-Mail Template laden
    const reportPeriod = calculateReportPeriod(reporting.frequency);
    const periodStr = formatReportPeriod(reportPeriod.start, reportPeriod.end);

    const emailTemplate = await getAutoReportEmailTemplateWithBranding(
      {
        recipientName: '', // Wird pro Empfänger gesetzt
        recipientEmail: '',
        campaignName: reporting.campaignName,
        reportPeriod: periodStr,
        frequency: reporting.frequency
      },
      reporting.organizationId
    );

    // 3. E-Mails an alle Empfänger senden
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const recipient of reporting.recipients) {
      try {
        // Personalisierte Version des Templates
        const personalizedHtml = emailTemplate.html.replace(
          `Hallo ,`,
          `Hallo ${recipient.name},`
        );
        const personalizedText = emailTemplate.text.replace(
          `Hallo ,`,
          `Hallo ${recipient.name},`
        );

        await getResendClient().emails.send({
          from: process.env.EMAIL_FROM || 'CeleroPress <noreply@celeropress.com>',
          to: recipient.email,
          subject: emailTemplate.subject,
          html: personalizedHtml,
          text: personalizedText,
          attachments: [
            {
              filename: `Monitoring-Report-${reporting.campaignName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
              content: pdfResult.pdfBuffer.toString('base64')
            }
          ]
        });

        successCount++;
        console.log(`[Auto-Reporting] E-Mail gesendet an: ${recipient.email}`);
      } catch (emailError) {
        failureCount++;
        const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
        errors.push(`${recipient.email}: ${errMsg}`);
        console.error(`[Auto-Reporting] E-Mail-Fehler für ${recipient.email}:`, emailError);
      }
    }

    // Status bestimmen
    let status: SendStatus;
    if (failureCount === 0) {
      status = 'success';
    } else if (successCount > 0) {
      status = 'partial';
    } else {
      status = 'failed';
    }

    return {
      status,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      pdfUrl: pdfResult.pdfUrl
    };

  } catch (error) {
    console.error('[Auto-Reporting] Fehler beim Senden:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

interface PDFResult {
  success: boolean;
  pdfBuffer?: Buffer;
  pdfUrl?: string;
  error?: string;
}

async function generateReportPDF(reporting: AutoReporting): Promise<PDFResult> {
  try {
    // Option 1: Existierenden PDF-Generator nutzen (wenn verfügbar)
    // Option 2: Letztes generiertes PDF aus Storage laden
    // Option 3: Neues PDF über interne API generieren

    // Für MVP: Versuche letztes PDF aus Storage zu laden
    const bucket = adminStorage.bucket();
    const prefix = `organizations/${reporting.organizationId}/monitoring/${reporting.campaignId}/reports/`;

    const [files] = await bucket.getFiles({ prefix, maxResults: 10 });

    // Neueste PDF-Datei finden
    const pdfFiles = files
      .filter(f => f.name.endsWith('.pdf'))
      .sort((a, b) => {
        const aTime = a.metadata.updated || a.metadata.timeCreated || '0';
        const bTime = b.metadata.updated || b.metadata.timeCreated || '0';
        return bTime.localeCompare(aTime);
      });

    if (pdfFiles.length > 0) {
      const latestPdf = pdfFiles[0];
      const [buffer] = await latestPdf.download();

      // Signed URL für Referenz
      const [signedUrl] = await latestPdf.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 Tage
      });

      return {
        success: true,
        pdfBuffer: buffer,
        pdfUrl: signedUrl
      };
    }

    // Fallback: Generiere neues PDF über internen API-Call
    // Dies erfordert dass der PDF-Generator als API verfügbar ist
    console.log('[Auto-Reporting] Kein bestehendes PDF gefunden, versuche Generierung...');

    // Für jetzt: Fehler zurückgeben wenn kein PDF existiert
    // TODO: PDF-Generierung implementieren
    return {
      success: false,
      error: 'Kein Report-PDF vorhanden. Bitte manuell einen Report generieren.'
    };

  } catch (error) {
    console.error('[Auto-Reporting] PDF-Fehler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
