/**
 * POST /api/reporting/send-now
 * Manueller Report-Versand
 *
 * Ermöglicht das sofortige Senden eines Reports ohne den regulären CRON-Rhythmus zu ändern.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { AutoReporting, AutoReportingSendLog, SendStatus } from '@/types/auto-reporting';
import { getAutoReportEmailTemplateWithBranding } from '@/lib/email/auto-reporting-email-templates';
import { formatReportPeriod, calculateReportPeriod } from '@/lib/utils/reporting-helpers';
import { getAuth } from 'firebase-admin/auth';

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

export async function POST(request: NextRequest) {
  console.log('[Send-Now] Request erhalten');

  try {
    // Auth prüfen: Bearer Token ODER Session Cookie
    const authHeader = request.headers.get('authorization');
    const auth = getAuth();

    if (authHeader?.startsWith('Bearer ')) {
      // Verifiziere Firebase ID Token
      const token = authHeader.split('Bearer ')[1];
      try {
        await auth.verifyIdToken(token);
      } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      // Fallback: Session Cookie prüfen (für direkte Client-Calls)
      const sessionCookie = request.cookies.get('session')?.value;
      if (!sessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Verifiziere Session Cookie
      try {
        await auth.verifySessionCookie(sessionCookie);
      } catch {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
      }
    }

    // Body parsen
    const body = await request.json();
    const { autoReportingId } = body;

    if (!autoReportingId) {
      return NextResponse.json({ error: 'autoReportingId erforderlich' }, { status: 400 });
    }

    // Auto-Reporting laden
    const docRef = adminDb.collection('auto_reportings').doc(autoReportingId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Auto-Reporting nicht gefunden' }, { status: 404 });
    }

    const reporting = { id: docSnap.id, ...docSnap.data() } as AutoReporting;

    // Report senden
    const sendResult = await sendReportNow(reporting);

    // Status aktualisieren (aber NICHT nextSendAt ändern!)
    await docRef.update({
      lastSentAt: Timestamp.now(),
      lastSendStatus: sendResult.status,
      lastSendError: sendResult.status === 'failed' ? sendResult.error : null,
      updatedAt: Timestamp.now()
    });

    // Log schreiben
    await adminDb.collection('auto_reporting_logs').add({
      autoReportingId: docSnap.id,
      organizationId: reporting.organizationId,
      campaignId: reporting.campaignId,
      sentAt: Timestamp.now(),
      recipients: reporting.recipients.map(r => r.email),
      status: sendResult.status,
      errorMessage: sendResult.error,
      pdfUrl: sendResult.pdfUrl
    } as Omit<AutoReportingSendLog, 'id'>);

    if (sendResult.status === 'failed') {
      return NextResponse.json({
        success: false,
        error: sendResult.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: sendResult.status,
      recipients: reporting.recipients.length
    });

  } catch (error) {
    console.error('[Send-Now] Fehler:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// ========================================
// SEND LOGIC (ähnlich wie CRON)
// ========================================

interface SendResult {
  status: SendStatus;
  error?: string;
  pdfUrl?: string;
}

async function sendReportNow(reporting: AutoReporting): Promise<SendResult> {
  try {
    // 1. PDF-Report laden
    console.log(`[Send-Now] Lade PDF für Kampagne: ${reporting.campaignId}`);
    const pdfResult = await loadReportPDF(reporting);

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      return { status: 'failed', error: pdfResult.error || 'PDF nicht verfügbar' };
    }

    // 2. E-Mail Template laden
    const reportPeriod = calculateReportPeriod(reporting.frequency);
    const periodStr = formatReportPeriod(reportPeriod.start, reportPeriod.end);

    const emailTemplate = await getAutoReportEmailTemplateWithBranding(
      {
        recipientName: '',
        recipientEmail: '',
        campaignName: reporting.campaignName,
        reportPeriod: periodStr,
        frequency: reporting.frequency
      },
      reporting.organizationId
    );

    // 3. E-Mails senden
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const recipient of reporting.recipients) {
      try {
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
        console.log(`[Send-Now] E-Mail gesendet an: ${recipient.email}`);
      } catch (emailError) {
        failureCount++;
        const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
        errors.push(`${recipient.email}: ${errMsg}`);
        console.error(`[Send-Now] E-Mail-Fehler für ${recipient.email}:`, emailError);
      }
    }

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
    console.error('[Send-Now] Fehler beim Senden:', error);
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

async function loadReportPDF(reporting: AutoReporting): Promise<PDFResult> {
  try {
    const bucket = adminStorage.bucket();
    const prefix = `organizations/${reporting.organizationId}/monitoring/${reporting.campaignId}/reports/`;

    const [files] = await bucket.getFiles({ prefix, maxResults: 10 });

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

      const [signedUrl] = await latestPdf.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000
      });

      return {
        success: true,
        pdfBuffer: buffer,
        pdfUrl: signedUrl
      };
    }

    return {
      success: false,
      error: 'Kein Report-PDF vorhanden. Bitte zuerst manuell einen PDF-Report generieren.'
    };

  } catch (error) {
    console.error('[Send-Now] PDF-Fehler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
