/**
 * POST /api/reporting/cron
 * CRON-Job: Verarbeitet fällige Auto-Reportings
 *
 * Wird täglich um 7:00 UTC (8:00/9:00 deutscher Zeit) von Vercel CRON aufgerufen
 * Lädt Auto-Reportings wo nextSendAt <= now und versendet Reports
 * PDF wird automatisch generiert, nicht von vorhandenem PDF abhängig.
 *
 * E-Mail-Versand erfolgt über SendGrid (SENDGRID_API_KEY erforderlich)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';
import sgMail from '@sendgrid/mail';
import { AutoReporting, SendStatus } from '@/types/auto-reporting';
import { getAutoReportEmailTemplateWithBranding } from '@/lib/email/auto-reporting-email-templates';
import { calculateNextSendDate, formatReportPeriod, calculateReportPeriod } from '@/lib/utils/reporting-helpers';
import { generateReportHTML } from '@/lib/monitoring-report/templates/report-template';
import type { MonitoringReportData, EmailStats, ClippingStats, TimelineData } from '@/lib/monitoring-report/types';
import type { MediaClipping } from '@/types/monitoring';
import type { EmailCampaignSend } from '@/types/email';
import type { BrandingSettings } from '@/types/branding';

const BATCH_SIZE = 20; // Max. Reports pro CRON-Run

// SendGrid initialisieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

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
}

async function sendReportForAutoReporting(reporting: AutoReporting): Promise<SendResult> {
  try {
    // 1. PDF-Report generieren (NICHT laden!)
    console.log(`[Auto-Reporting CRON] Generiere PDF für Kampagne: ${reporting.campaignId}`);
    const pdfResult = await generateReportPDF(reporting);

    if (!pdfResult.success || !pdfResult.pdfBase64) {
      return { status: 'failed', error: pdfResult.error || 'PDF-Generierung fehlgeschlagen' };
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

        const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@celeropress.com';
        const fromName = process.env.SENDGRID_FROM_NAME || 'CeleroPress';

        await sgMail.send({
          to: recipient.email,
          from: {
            email: fromEmail,
            name: fromName
          },
          subject: emailTemplate.subject,
          html: personalizedHtml,
          text: personalizedText,
          attachments: [
            {
              filename: `Monitoring-Report-${reporting.campaignName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
              content: pdfResult.pdfBase64,
              type: 'application/pdf',
              disposition: 'attachment'
            }
          ]
        });

        successCount++;
        console.log(`[Auto-Reporting CRON] E-Mail gesendet an: ${recipient.email}`);
      } catch (emailError) {
        failureCount++;
        const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
        errors.push(`${recipient.email}: ${errMsg}`);
        console.error(`[Auto-Reporting CRON] E-Mail-Fehler für ${recipient.email}:`, emailError);
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
      error: errors.length > 0 ? errors.join('; ') : undefined
    };

  } catch (error) {
    console.error('[Auto-Reporting CRON] Fehler beim Senden:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========================================
// PDF GENERATION (mit Admin SDK)
// ========================================

interface PDFResult {
  success: boolean;
  pdfBase64?: string;
  error?: string;
}

async function generateReportPDF(reporting: AutoReporting): Promise<PDFResult> {
  try {
    // 1. Report-Daten mit Admin SDK sammeln
    const reportData = await collectReportDataWithAdminSDK(
      reporting.campaignId,
      reporting.organizationId
    );

    // 2. HTML generieren
    const reportHtml = generateReportHTML(reportData);

    // 3. PDF via API generieren
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const pdfResponse = await fetch(`${baseUrl}/api/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: reporting.campaignId,
        organizationId: reporting.organizationId,
        html: reportHtml,
        title: `Monitoring Report: ${reporting.campaignName}`,
        fileName: `Monitoring_Report_${reporting.campaignId}_${Date.now()}.pdf`,
        mainContent: reportHtml,
        clientName: reporting.campaignName,
        userId: 'auto-reporting-cron',
        options: {
          format: 'A4',
          orientation: 'portrait',
          printBackground: true,
          waitUntil: 'networkidle0'
        }
      })
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      throw new Error(`PDF-API Fehler: ${errorText}`);
    }

    const pdfResult = await pdfResponse.json();

    if (!pdfResult.pdfBase64) {
      throw new Error('PDF-API hat kein pdfBase64 zurückgegeben');
    }

    return {
      success: true,
      pdfBase64: pdfResult.pdfBase64
    };

  } catch (error) {
    console.error('[Auto-Reporting CRON] PDF-Generierung fehlgeschlagen:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========================================
// DATA COLLECTION (mit Admin SDK)
// ========================================

async function collectReportDataWithAdminSDK(
  campaignId: string,
  organizationId: string
): Promise<MonitoringReportData> {
  // 1. Campaign laden
  const campaignDoc = await adminDb.collection('pr_campaigns').doc(campaignId).get();
  if (!campaignDoc.exists) {
    throw new Error('Kampagne nicht gefunden');
  }
  const campaign = campaignDoc.data()!;

  // 2. Email Sends laden
  const sendsSnapshot = await adminDb.collection('email_campaign_sends')
    .where('campaignId', '==', campaignId)
    .get();
  const sends: EmailCampaignSend[] = sendsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as EmailCampaignSend[];

  // 3. Media Clippings laden
  const clippingsSnapshot = await adminDb.collection('media_clippings')
    .where('campaignId', '==', campaignId)
    .get();
  const clippings: MediaClipping[] = clippingsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as MediaClipping[];

  // 4. Branding laden
  let branding: BrandingSettings | null = null;
  try {
    const brandingDoc = await adminDb.collection('branding_settings').doc(organizationId).get();
    if (brandingDoc.exists) {
      branding = brandingDoc.data() as BrandingSettings;
    }
  } catch {
    // Kein Branding vorhanden ist OK
  }

  // 5. Statistiken berechnen
  const emailStats = calculateEmailStats(sends, clippings);
  const clippingStats = calculateClippingStats(clippings);
  const timeline = buildTimeline(clippings);

  // 6. Report-Daten zusammenführen
  const sentAt = campaign.sentAt?.toDate?.() || new Date();

  return {
    campaignId,
    organizationId,
    reportTitle: campaign.title || 'Monitoring Report',
    reportPeriod: {
      start: sentAt,
      end: new Date()
    },
    branding,
    emailStats,
    clippingStats,
    timeline,
    clippings,
    sends
  };
}

function calculateEmailStats(sends: EmailCampaignSend[], clippings: MediaClipping[]): EmailStats {
  const totalSent = sends.length;
  const delivered = sends.filter(s => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length;
  const opened = sends.filter(s => s.status === 'opened' || s.status === 'clicked').length;
  const clicked = sends.filter(s => s.status === 'clicked').length;
  const bounced = sends.filter(s => s.status === 'bounced').length;

  return {
    totalSent,
    delivered,
    opened,
    clicked,
    bounced,
    openRate: totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0,
    clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
    ctr: totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0,
    conversionRate: opened > 0 ? Math.round((clippings.length / opened) * 100) : 0
  };
}

function calculateClippingStats(clippings: MediaClipping[]): ClippingStats {
  const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
  const totalAVE = clippings.reduce((sum, c) => sum + (c.ave || 0), 0);

  // Sentiment Distribution
  const sentimentDistribution = {
    positive: clippings.filter(c => c.sentiment === 'positive').length,
    neutral: clippings.filter(c => c.sentiment === 'neutral').length,
    negative: clippings.filter(c => c.sentiment === 'negative').length
  };

  // Top Outlets
  const outletMap = new Map<string, { reach: number; count: number }>();
  clippings.forEach(c => {
    const name = c.outletName || 'Unbekannt';
    const existing = outletMap.get(name) || { reach: 0, count: 0 };
    outletMap.set(name, {
      reach: existing.reach + (c.reach || 0),
      count: existing.count + 1
    });
  });

  const topOutlets = Array.from(outletMap.entries())
    .map(([name, data]) => ({ name, reach: data.reach, clippingsCount: data.count }))
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 5);

  // Outlet Type Distribution
  const typeMap = new Map<string, { count: number; reach: number }>();
  clippings.forEach(c => {
    const type = c.outletType || 'online';
    const existing = typeMap.get(type) || { count: 0, reach: 0 };
    typeMap.set(type, {
      count: existing.count + 1,
      reach: existing.reach + (c.reach || 0)
    });
  });

  const totalCount = clippings.length;
  const outletTypeDistribution = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    reach: data.reach,
    percentage: totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0
  }));

  return {
    totalClippings: clippings.length,
    totalReach,
    totalAVE,
    avgReach: clippings.length > 0 ? Math.round(totalReach / clippings.length) : 0,
    sentimentDistribution,
    topOutlets,
    outletTypeDistribution
  };
}

function buildTimeline(clippings: MediaClipping[]): TimelineData[] {
  const dateMap = new Map<string, { clippings: number; reach: number }>();

  clippings.forEach(c => {
    const date = c.publishedAt?.toDate?.()?.toISOString().split('T')[0] ||
                 new Date().toISOString().split('T')[0];
    const existing = dateMap.get(date) || { clippings: 0, reach: 0 };
    dateMap.set(date, {
      clippings: existing.clippings + 1,
      reach: existing.reach + (c.reach || 0)
    });
  });

  return Array.from(dateMap.entries())
    .map(([date, data]) => ({ date, clippings: data.clippings, reach: data.reach }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
