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
    // 1. Parse Request Body (SendGrid sendet als form-data oder JSON)
    const contentType = request.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // SendGrid sendet als form-data
      const formData = await request.formData();

      // Charsets parsen für korrekte Dekodierung
      let charsets: any = {};
      try {
        const charsetsStr = formData.get('charsets');
        if (charsetsStr && typeof charsetsStr === 'string') {
          charsets = JSON.parse(charsetsStr);
        }
      } catch (e) {
        console.error('Failed to parse charsets:', e);
      }

      // Funktion zum Dekodieren von Text basierend auf Charset
      const decodeText = (text: string | null, charset?: string): string | null => {
        if (!text) return text;

        // Wenn charset UTF-8 ist oder nicht angegeben, direkt zurückgeben
        if (!charset || charset.toLowerCase() === 'utf-8') {
          return text;
        }

        // Für andere Charsets: Text kommt als falscher UTF-8 String
        // Wir müssen ihn zurück in Bytes konvertieren und richtig dekodieren
        try {
          // Konvertiere String zurück in Bytes (Latin-1 codiert)
          const bytes = new Uint8Array(text.length);
          for (let i = 0; i < text.length; i++) {
            bytes[i] = text.charCodeAt(i) & 0xFF;
          }

          // Dekodiere mit richtigem Charset
          const decoder = new TextDecoder(charset);
          return decoder.decode(bytes);
        } catch (e) {
          console.warn(`Failed to decode with charset ${charset}, using original text`);
          return text;
        }
      };

      body = {
        to: formData.get('to'),
        from: formData.get('from'),
        subject: decodeText(formData.get('subject') as string, charsets.subject),
        text: decodeText(formData.get('text') as string, charsets.text),
        html: decodeText(formData.get('html') as string, charsets.html),
        headers: formData.get('headers'),
        envelope: formData.get('envelope'),
        attachments: formData.get('attachments'),
        attachmentInfo: formData.get('attachment-info'),
        formData: formData, // Für Attachment-Extraktion
        // SendGrid-spezifische Felder
        spam_score: formData.get('spam_score'),
        spam_report: formData.get('spam_report'),
        charsets: charsets,
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

    // 2. Reply-To parsen
    const parsedReplyTo = await replyToParserService.parse(body.to);
    // 3. Redirect-Handling (Archivierte Projekte)
    const threadParams = await redirectHandlerService.handleIncomingEmail(parsedReplyTo);
    // 4. Thread & Message erstellen
    const { inboundEmailProcessorService } = await import('@/lib/email/inbound-email-processor-service');

    // Parse Headers für Threading
    const headers = parseHeaders(body.headers);
    const messageId = headers['Message-ID'] || `inbound-${Date.now()}@inbox.sk-online-marketing.de`;
    const inReplyTo = headers['In-Reply-To'] || null;
    const references = headers['References'] || null;

    // Extrahiere organizationId und emailAccountId aus domainId
    const mailboxInfo = await getMailboxInfo(threadParams.domainId);

    if (!mailboxInfo) {
      console.error('[Inbound Webhook] Mailbox not found for domainId:', threadParams.domainId);
      return NextResponse.json({
        success: false,
        error: 'Mailbox configuration not found'
      }, { status: 200 });
    }

    const organizationId = mailboxInfo.organizationId;
    const emailAccountId = mailboxInfo.emailAccountId || 'system-inbox'; // Fallback
    const userId = (mailboxInfo as any).userId || ''; // userId ist optional und nur für Metadata

    // 4. Attachments verarbeiten (wenn vorhanden)
    let processedAttachments: any[] = [];
    let processedHtmlContent = body.html;

    if (body.attachmentInfo && body.formData) {
      try {
        const { extractAttachmentsFromFormData, replaceInlineImageCIDs } = await import('@/lib/email/email-attachments-service');

        // Extrahiere und uploade Attachments
        processedAttachments = await extractAttachmentsFromFormData(
          body.formData,
          organizationId,
          messageId
        );

        // Ersetze CID-Links in HTML mit echten URLs
        if (processedHtmlContent && processedAttachments.length > 0) {
          processedHtmlContent = replaceInlineImageCIDs(processedHtmlContent, processedAttachments);
        }

        console.log(`[Inbound Webhook] Processed ${processedAttachments.length} attachments`);
      } catch (attachmentError: any) {
        console.error('[Inbound Webhook] Attachment processing failed:', attachmentError);
        // Weiter ohne Attachments - Email soll trotzdem verarbeitet werden
      }
    }

    const result = await inboundEmailProcessorService.processIncomingEmail({
      messageId,
      from: body.from,
      to: body.to,
      subject: body.subject || '(Kein Betreff)',
      textContent: body.text,
      htmlContent: processedHtmlContent,
      headers,
      receivedAt: new Date(),
      inReplyTo,
      references,
      attachments: processedAttachments, // Array von EmailAttachment-Objekten
      // Inbox Context
      projectId: threadParams.projectId,
      domainId: threadParams.domainId,
      mailboxType: threadParams.mailboxType,
      labels: threadParams.labels,
      redirectMetadata: threadParams.redirectMetadata
    }, organizationId, emailAccountId, userId);

    if (!result.success) {
      console.error('[Inbound Webhook] Processing failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 200 });
    }

    // 5. Success Response für SendGrid
    return NextResponse.json({
      success: true,
      message: 'Email processed successfully',
      data: {
        threadId: result.threadId,
        messageId: result.messageId
      },
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

/**
 * Helper: Holt Mailbox-Informationen aus Firestore
 */
async function getMailboxInfo(domainId: string | null): Promise<{ organizationId: string; emailAccountId?: string } | null> {
  if (!domainId) return null;

  try {
    const { adminDb } = await import('@/lib/firebase/admin-init');

    // Suche Domain Mailbox
    const mailboxDoc = await adminDb
      .collection('inbox_domain_mailboxes')
      .doc(domainId)
      .get();

    if (!mailboxDoc.exists) {
      console.warn(`[getMailboxInfo] Domain mailbox not found: ${domainId}`);
      return null;
    }

    const mailbox = mailboxDoc.data();

    return {
      organizationId: mailbox?.organizationId,
      emailAccountId: mailbox?.emailAccountId
    };

  } catch (error) {
    console.error('[getMailboxInfo] Error loading mailbox:', error);
    return null;
  }
}
