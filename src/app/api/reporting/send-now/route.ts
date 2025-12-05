/**
 * POST /api/reporting/send-now
 * Manueller Report-Versand
 *
 * Ermöglicht das sofortige Senden eines Reports ohne den regulären CRON-Rhythmus zu ändern.
 * PDF wird automatisch generiert, nicht von vorhandenem PDF abhängig.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { Timestamp } from 'firebase-admin/firestore';
import sgMail from '@sendgrid/mail';
import { AutoReporting, SendStatus } from '@/types/auto-reporting';
import { getAutoReportEmailTemplateWithBranding } from '@/lib/email/auto-reporting-email-templates';
import { formatReportPeriod, calculateReportPeriod } from '@/lib/utils/reporting-helpers';
import { getAuth } from 'firebase-admin/auth';
import { generateReportHTML } from '@/lib/monitoring-report/templates/report-template';
import type { MonitoringReportData, EmailStats, ClippingStats, TimelineData } from '@/lib/monitoring-report/types';
import type { MediaClipping } from '@/types/monitoring';
import type { EmailCampaignSend } from '@/types/email';
import type { BrandingSettings } from '@/types/branding';

// SendGrid initialisieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

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

    // Log schreiben - WICHTIG: Keine undefined-Werte für Firestore!
    const logData: Record<string, any> = {
      autoReportingId: docSnap.id,
      organizationId: reporting.organizationId,
      campaignId: reporting.campaignId,
      sentAt: Timestamp.now(),
      recipients: reporting.recipients.map(r => r.email),
      status: sendResult.status
    };
    // Optionale Felder nur hinzufügen wenn sie einen Wert haben
    if (sendResult.error) logData.errorMessage = sendResult.error;

    await adminDb.collection('auto_reporting_logs').add(logData);

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
// SEND LOGIC
// ========================================

interface SendResult {
  status: SendStatus;
  error?: string;
}

async function sendReportNow(reporting: AutoReporting): Promise<SendResult> {
  try {
    // 1. PDF-Report generieren (NICHT laden!)
    console.log(`[Send-Now] Generiere PDF für Kampagne: ${reporting.campaignId}`);
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
      error: errors.length > 0 ? errors.join('; ') : undefined
    };

  } catch (error) {
    console.error('[Send-Now] Fehler beim Senden:', error);
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
        userId: 'auto-reporting-system',
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
    console.error('[Send-Now] PDF-Generierung fehlgeschlagen:', error);
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
