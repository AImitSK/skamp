// src/app/api/email/inbound/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { replyToParserService } from '@/lib/email/reply-to-parser-service';
import { redirectHandlerService } from '@/lib/email/redirect-handler-service';

/**
 * SendGrid Inbound Parse Webhook
 *
 * Empfängt eingehende E-Mails von SendGrid und verarbeitet sie.
 *
 * WICHTIG: Diese Route wird von SendGrid automatisch aufgerufen
 * wenn eine E-Mail an @inbox.sk-online-marketing.de eintrifft.
 *
 * Konfiguration in SendGrid:
 * - Inbound Parse: https://your-domain.com/api/email/inbound
 * - Domain: inbox.sk-online-marketing.de
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Inbound Webhook] Received email from SendGrid');

    // 1. Parse Request Body (SendGrid sendet als form-data oder JSON)
    const contentType = request.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // SendGrid sendet als form-data
      const formData = await request.formData();
      body = {
        to: formData.get('to'),
        from: formData.get('from'),
        subject: formData.get('subject'),
        text: formData.get('text'),
        html: formData.get('html'),
        headers: formData.get('headers'),
        envelope: formData.get('envelope'),
        attachments: formData.get('attachments'),
        // SendGrid-spezifische Felder
        spam_score: formData.get('spam_score'),
        spam_report: formData.get('spam_report'),
        charsets: formData.get('charsets'),
        SPF: formData.get('SPF'),
        DKIM: formData.get('DKIM')
      };
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Validierung
    if (!body.to) {
      return NextResponse.json(
        { error: 'Missing required field: to' },
        { status: 400 }
      );
    }

    console.log(`[Inbound Webhook] Email to: ${body.to}`);
    console.log(`[Inbound Webhook] Email from: ${body.from}`);
    console.log(`[Inbound Webhook] Subject: ${body.subject}`);

    // 2. Reply-To parsen
    const parsedReplyTo = await replyToParserService.parse(body.to);
    console.log(`[Inbound Webhook] Parsed type: ${parsedReplyTo.type}`);

    // 3. Redirect-Handling (Archivierte Projekte)
    const threadParams = await redirectHandlerService.handleIncomingEmail(parsedReplyTo);
    console.log(`[Inbound Webhook] Thread params:`, threadParams);

    // 4. Thread & Message erstellen
    // HINWEIS: Diese Logic wird später vom thread-matcher-service übernommen
    // Für jetzt loggen wir nur was passieren würde

    console.log('[Inbound Webhook] Would create thread with params:', {
      projectId: threadParams.projectId,
      domainId: threadParams.domainId,
      mailboxType: threadParams.mailboxType,
      labels: threadParams.labels,
      redirectMetadata: threadParams.redirectMetadata
    });

    console.log('[Inbound Webhook] Would create message:', {
      from: body.from,
      to: body.to,
      subject: body.subject,
      textContent: body.text?.substring(0, 100) + '...',
      hasHtml: !!body.html,
      hasAttachments: !!body.attachments
    });

    // TODO: Integration mit thread-matcher-service
    // const thread = await threadMatcherService.findOrCreateThread({
    //   messageId: body.headers?.['Message-ID'],
    //   subject: body.subject,
    //   from: body.from,
    //   to: body.to,
    //   inReplyTo: body.headers?.['In-Reply-To'],
    //   references: body.headers?.['References'],
    //   ...threadParams
    // });

    // TODO: Integration mit email-message-service
    // const message = await emailMessageService.create({
    //   threadId: thread.id,
    //   from: parseEmailAddress(body.from),
    //   to: [parseEmailAddress(body.to)],
    //   subject: body.subject,
    //   textContent: body.text,
    //   htmlContent: body.html,
    //   headers: parseHeaders(body.headers),
    //   receivedAt: new Date(),
    //   folder: 'inbox',
    //   isRead: false,
    //   ...threadParams
    // });

    // 5. Success Response für SendGrid
    return NextResponse.json({
      success: true,
      message: 'Email processed successfully',
      debug: {
        parsedType: parsedReplyTo.type,
        mailboxType: threadParams.mailboxType,
        projectId: threadParams.projectId,
        domainId: threadParams.domainId,
        redirected: !!threadParams.redirectMetadata
      }
    });

  } catch (error: any) {
    console.error('[Inbound Webhook] Error processing email:', error);

    // Fehler-Response
    // WICHTIG: SendGrid erwartet 200 OK auch bei Fehlern
    // sonst versucht SendGrid die Email erneut zuzustellen
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }, {
      status: 200 // Wichtig: 200 statt 500!
    });
  }
}

/**
 * Health-Check Endpoint
 *
 * Prüft ob der Webhook erreichbar ist
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'SendGrid Inbound Parse Webhook',
    timestamp: new Date().toISOString(),
    info: {
      acceptedDomain: 'inbox.sk-online-marketing.de',
      parsesTypes: ['domain', 'project'],
      supportsRedirects: true
    }
  });
}

/**
 * Helper: Parse E-Mail-Adresse in { email, name } Format
 */
function parseEmailAddress(emailString: string): { email: string; name?: string } {
  // Format: "Name <email@example.com>" oder "email@example.com"
  const match = emailString.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);

  if (match) {
    return {
      email: match[2].trim(),
      name: match[1]?.trim() || undefined
    };
  }

  return { email: emailString.trim() };
}

/**
 * Helper: Parse Email Headers
 */
function parseHeaders(headersString: string | null): Record<string, string> {
  if (!headersString) return {};

  try {
    // SendGrid sendet Headers als JSON-String
    if (headersString.startsWith('{')) {
      return JSON.parse(headersString);
    }

    // Oder als String mit Zeilenumbrüchen
    const headers: Record<string, string> = {};
    const lines = headersString.split('\n');

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    }

    return headers;
  } catch (error) {
    console.error('[Inbound Webhook] Error parsing headers:', error);
    return {};
  }
}
