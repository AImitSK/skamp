// src/app/api/webhooks/sendgrid/inbound/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { flexibleEmailProcessor, IncomingEmailData } from '@/lib/email/email-processor-flexible';
import { EmailAddressInfo, EmailAttachment } from '@/types/email-enhanced';

// SendGrid Inbound Parse Data Structure
interface ParsedEmail {
  headers?: string;
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  email?: string; // NEU: Das komplette E-Mail im RFC822 Format
  attachments?: number;
  'attachment-info'?: string;
  envelope?: string;
  charsets?: string;
  SPF?: string;
  'spam_score'?: string;
  'spam_report'?: string;
  dkim?: string;
  'content-ids'?: string;
}

interface ParsedEnvelope {
  to: string[];
  from: string;
}

interface ParsedAttachmentInfo {
  [key: string]: {
    filename: string;
    name: string;
    type: string;
    'content-id'?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 SendGrid Inbound Parse Webhook received');
    
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.SENDGRID_INBOUND_SECRET;
    if (webhookSecret) {
      const isValid = await verifyWebhookSignature(request, webhookSecret);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse multipart form data
    const formData = await request.formData();
    const parsedEmail = parseFormData(formData);
    
    if (!parsedEmail) {
      console.error('❌ Failed to parse email data');
      return NextResponse.json({ error: 'Invalid email data' }, { status: 400 });
    }

    console.log('📧 Processing email:', {
      from: parsedEmail.from,
      to: parsedEmail.to,
      subject: parsedEmail.subject
    });

    // Debug log headers
    console.log('📋 Headers present:', !!parsedEmail.headers);
    
    // Extract email addresses
    const fromAddress = parseEmailAddress(parsedEmail.from);
    const toAddresses = parseToAddresses(parsedEmail);
    
    // Parse envelope for accurate recipient info
    const envelope = parsedEmail.envelope ? JSON.parse(parsedEmail.envelope) as ParsedEnvelope : null;
    
    // Create email message data
    const emailData: IncomingEmailData = {
      // Headers - mit Fallback wenn headers undefined
      messageId: parsedEmail.headers ? extractMessageId(parsedEmail.headers) : generateMessageId(),
      inReplyTo: parsedEmail.headers ? extractHeader(parsedEmail.headers, 'In-Reply-To') || undefined : undefined,
      references: parsedEmail.headers ? (extractHeader(parsedEmail.headers, 'References')?.split(/\s+/) || []) : [],
      
      // Addresses
      from: fromAddress,
      to: toAddresses,
      
      // Content
      subject: parsedEmail.subject || '(Kein Betreff)',
      textContent: parsedEmail.text || '',
      htmlContent: parsedEmail.html || '',
      
      // Metadata
      spamScore: parsedEmail.spam_score ? parseFloat(parsedEmail.spam_score) : undefined,
      spamReport: parsedEmail.spam_report,
      
      // Raw headers for debugging - mit Fallback
      headers: parsedEmail.headers ? parseHeaders(parsedEmail.headers) : {},
      
      // Envelope data for accurate routing - nur wenn vorhanden
      envelope: envelope || undefined,
      
      // Attachments wird später hinzugefügt
      attachments: []
    };

    // Process attachments if present
    const attachments = await processAttachments(formData, parsedEmail);
    if (attachments.length > 0) {
      emailData.attachments = attachments;
    }

    // Process the email through our flexible pipeline
    const result = await flexibleEmailProcessor(emailData);
    
    // ========== ERWEITERTE DEBUG LOGS ==========
    console.log('📨 Webhook processing result:', {
      success: result.success,
      emailId: result.emailId,
      threadId: result.threadId,
      organizationId: result.organizationId,
      routingDecision: result.routingDecision,
      error: result.error
    });

    // Speziell für Admin-E-Mails:
    if (parsedEmail.to?.includes('s.kuehne@sk-online-marketing.de')) {
      console.log('🚨 ADMIN EMAIL DETECTED:', {
        from: parsedEmail.from,
        to: parsedEmail.to,
        subject: parsedEmail.subject,
        hasReplyTo: !!(parsedEmail.headers as any)?.['reply-to']
      });
    }
    
    if (result.success) {
      console.log('✅ Email processed successfully:', {
        emailId: result.emailId,
        threadId: result.threadId,
        routingDecision: result.routingDecision
      });
      return NextResponse.json({ 
        success: true, 
        emailId: result.emailId,
        threadId: result.threadId,
        routingDecision: result.routingDecision
      });
    } else {
      console.error('❌ Email processing failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Processing failed' }, 
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message }, 
      { status: 500 }
    );
  }
}

/**
 * Parse FormData from SendGrid
 */
function parseFormData(formData: FormData): ParsedEmail | null {
  try {
    const email: any = {};
    
    // Iterate through all form fields
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        email[key] = value;
      }
    }
    
    // Debug log all fields
    console.log('📝 Form fields:', Object.keys(email));
    
    // Debug log content BEFORE MIME processing
    console.log('📄 Email content BEFORE MIME processing:', {
      hasText: !!email.text,
      textLength: email.text?.length || 0,
      hasHtml: !!email.html,
      htmlLength: email.html?.length || 0,
      textPreview: email.text?.substring(0, 200) || 'NO TEXT CONTENT',
      htmlPreview: email.html?.substring(0, 200) || 'NO HTML CONTENT',
      textHasMIME: email.text?.includes('Content-Type:') || false,
      htmlHasMIME: email.html?.includes('Content-Type:') || false,
      textHasBoundary: email.text?.includes('boundary=') || false,
      htmlHasBoundary: email.html?.includes('boundary=') || false
    });
    
    // WICHTIG: SendGrid sendet den E-Mail-Inhalt manchmal im 'email' Feld
    // als komplette RFC822 E-Mail. Wir müssen das parsen.
    if (email.email && !email.text && !email.html) {
      console.log('📧 Parsing email content from RFC822 format...');
      const parsedContent = parseRFC822Email(email.email);
      if (parsedContent) {
        email.text = parsedContent.text;
        email.html = parsedContent.html;
        // Headers könnten auch hier sein
        if (!email.headers && parsedContent.headers) {
          email.headers = parsedContent.headers;
        }
      }
    }
    
    // NEU: Prüfe ob text oder html bereits MIME-Multipart Format enthalten
    // Dies passiert wenn SendGrid den Content direkt als multipart sendet
    if (email.text && email.text.includes('Content-Type:') && email.text.includes('boundary=')) {
      console.log('📧 Detected MIME multipart in text field, parsing...');
      const parsedContent = parseRFC822Email(email.text);
      if (parsedContent) {
        email.text = parsedContent.text || email.text;
        email.html = parsedContent.html || email.html;
        console.log('📧 After parsing text field:', {
          textLength: email.text?.length || 0,
          htmlLength: email.html?.length || 0
        });
      }
    } else if (email.html && email.html.includes('Content-Type:') && email.html.includes('boundary=')) {
      console.log('📧 Detected MIME multipart in html field, parsing...');
      const parsedContent = parseRFC822Email(email.html);
      if (parsedContent) {
        email.text = parsedContent.text || email.text;
        email.html = parsedContent.html || email.html;
        console.log('📧 After parsing html field:', {
          textLength: email.text?.length || 0,
          htmlLength: email.html?.length || 0
        });
      }
    }
    
    // Debug log content AFTER MIME processing
    console.log('📄 Email content AFTER MIME processing:', {
      hasText: !!email.text,
      textLength: email.text?.length || 0,
      hasHtml: !!email.html,
      htmlLength: email.html?.length || 0,
      textPreview: email.text?.substring(0, 200) || 'NO TEXT CONTENT',
      htmlPreview: email.html?.substring(0, 200) || 'NO HTML CONTENT'
    });
    
    // Validate required fields
    if (!email.from || !email.to) {
      console.error('Missing required fields: from or to');
      return null;
    }
    
    return email as ParsedEmail;
  } catch (error) {
    console.error('Error parsing form data:', error);
    return null;
  }
}

/**
 * Parse RFC822 formatted email to extract text and HTML content
 */
function parseRFC822Email(emailData: string): { text?: string; html?: string; headers?: string } | null {
  try {
    // Prüfe ob es bereits MIME-Multipart Content ist (beginnt mit boundary)
    const isDirectMultipart = emailData.match(/^--([a-zA-Z0-9]+)/);
    
    let headers = '';
    let body = emailData;
    
    if (!isDirectMultipart) {
      // Standard RFC822 Format - teile Header und Body
      const parts = emailData.split(/\r?\n\r?\n/);
      if (parts.length < 2) {
        console.log('⚠️ No body found in email data');
        return null;
      }
      headers = parts[0];
      body = parts.slice(1).join('\n\n');
    } else {
      // Direkt multipart content - extrahiere boundary aus erstem Teil
      console.log('📧 Direct multipart content detected');
    }
    
    // Prüfe ob es eine multipart E-Mail ist
    let boundaryMatch;
    if (headers) {
      const contentTypeMatch = headers.match(/Content-Type:\s*([^;\s]+)/i);
      const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase() : 'text/plain';
      console.log('📋 Content-Type:', contentType);
      
      if (!contentType.includes('multipart')) {
        // Nicht multipart - gib einfachen Text zurück
        return { text: body, headers };
      }
      
      boundaryMatch = headers.match(/boundary=["']?([^"'\s]+)["']?/i);
    } else {
      // Extrahiere Boundary direkt aus dem Content
      boundaryMatch = body.match(/--([a-f0-9]+)/);
    }
    
    if (!boundaryMatch) {
      console.log('⚠️ No boundary found in multipart email');
      return { text: body, headers };
    }
    
    const boundary = boundaryMatch[1];
    console.log('🔍 Using boundary:', boundary);
    
    // Splitte Parts mit korrekter Boundary-Erkennung
    const parts = body.split(new RegExp(`--${boundary}(?:--)?`, 'g'));
    
    let textContent = '';
    let htmlContent = '';
    
    // Durchsuche alle Parts
    for (const part of parts) {
      if (!part.trim()) continue;
      
      // Finde Content-Type in diesem Part
      const partContentTypeMatch = part.match(/Content-Type:\s*([^;\s\r\n]+)/i);
      if (!partContentTypeMatch) continue;
      
      const partType = partContentTypeMatch[1].toLowerCase();
      
      // Extrahiere Body nach doppelten Zeilenumbrüchen
      const partBodyMatch = part.match(/\r?\n\r?\n([\s\S]*)/);
      const partBody = partBodyMatch ? partBodyMatch[1].trim() : '';
      
      if (partType === 'text/plain' && !textContent && partBody) {
        // Entferne quoted-printable Encoding
        textContent = decodeQuotedPrintable(partBody);
      } else if (partType === 'text/html' && !htmlContent && partBody) {
        // Entferne quoted-printable Encoding
        htmlContent = decodeQuotedPrintable(partBody);
      }
    }
    
    console.log('✅ Extracted from multipart:', {
        textLength: textContent.length,
        htmlLength: htmlContent.length
      });
      
      return {
        text: textContent || undefined,
        html: htmlContent || undefined,
        headers
      };
    
    // Nicht-multipart Inhalte
    if (headers) {
      const contentTypeMatch = headers.match(/Content-Type:\s*([^;\s]+)/i);
      const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase() : 'text/plain';
      
      if (contentType === 'text/html') {
        // Nur HTML
        return {
          html: body,
          text: body.replace(/<[^>]*>/g, ''), // Simple HTML strip
          headers
        };
      }
    }
    
    // Plain text oder unbekannt
    return {
      text: body,
      headers
    };
  } catch (error) {
    console.error('Error parsing RFC822 email:', error);
    return null;
  }
}

/**
 * Decode quoted-printable encoding commonly used in MIME emails
 */
function decodeQuotedPrintable(input: string): string {
  if (!input) return input;
  
  try {
    return input
      // Decode =XX hex sequences
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Remove soft line breaks (= at end of line)
      .replace(/=\r?\n/g, '')
      // Clean up any remaining encoded chars
      .replace(/=3D/g, '=');
  } catch (error) {
    console.warn('Failed to decode quoted-printable:', error);
    return input;
  }
}

/**
 * Parse email address from string
 */
function parseEmailAddress(addressString: string | undefined): EmailAddressInfo {
  // Null/undefined check
  if (!addressString) {
    console.warn('⚠️ Empty address string provided');
    return { email: 'unknown@unknown.com' };
  }
  
  // Match patterns like "Name <email@domain.com>" or just "email@domain.com"
  const match = addressString.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  
  if (match && match[2]) {
    return {
      name: match[1]?.trim() || undefined,
      email: match[2].trim().toLowerCase()
    };
  }
  
  // Fallback to treating the whole string as email
  return {
    email: addressString.trim().toLowerCase()
  };
}

/**
 * Parse all TO addresses including those in envelope
 */
function parseToAddresses(parsedEmail: ParsedEmail): EmailAddressInfo[] {
  const addresses: EmailAddressInfo[] = [];
  const seen = new Set<string>();
  
  // Parse primary TO field
  if (parsedEmail.to) {
    const toAddresses = parsedEmail.to.split(',').map(addr => parseEmailAddress(addr.trim()));
    toAddresses.forEach(addr => {
      if (addr.email && !seen.has(addr.email)) {
        addresses.push(addr);
        seen.add(addr.email);
      }
    });
  }
  
  // Parse envelope TO addresses for catch-all support
  if (parsedEmail.envelope) {
    try {
      const envelope = JSON.parse(parsedEmail.envelope) as ParsedEnvelope;
      envelope.to.forEach(email => {
        if (!seen.has(email.toLowerCase())) {
          addresses.push({ email: email.toLowerCase() });
          seen.add(email.toLowerCase());
        }
      });
    } catch (error) {
      console.error('Error parsing envelope:', error);
    }
  }
  
  return addresses;
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `sendgrid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@inbound.celeropress.de`;
}

/**
 * Extract Message-ID from headers
 */
function extractMessageId(headers: string): string {
  const messageId = extractHeader(headers, 'Message-ID');
  if (messageId) {
    return messageId.replace(/^<|>$/g, '');
  }
  
  // Generate a unique ID if none found
  return generateMessageId();
}

/**
 * Extract specific header value
 */
function extractHeader(headers: string | undefined, headerName: string): string | null {
  if (!headers) return null;
  
  const regex = new RegExp(`^${headerName}:\\s*(.*)$`, 'mi');
  const match = headers.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Parse all headers into key-value pairs
 */
function parseHeaders(headersString: string | undefined): Record<string, string> {
  if (!headersString) return {};
  
  const headers: Record<string, string> = {};
  const lines = headersString.split('\n');
  
  let currentHeader = '';
  let currentValue = '';
  
  for (const line of lines) {
    if (line.match(/^\S+:/)) {
      // New header
      if (currentHeader) {
        headers[currentHeader] = currentValue.trim();
      }
      const [header, ...valueParts] = line.split(':');
      currentHeader = header.trim();
      currentValue = valueParts.join(':').trim();
    } else if (line.match(/^\s+/)) {
      // Continuation of previous header
      currentValue += ' ' + line.trim();
    }
  }
  
  // Don't forget the last header
  if (currentHeader) {
    headers[currentHeader] = currentValue.trim();
  }
  
  return headers;
}

/**
 * Process attachments from form data
 */
async function processAttachments(formData: FormData, parsedEmail: ParsedEmail): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = [];
  
  if (!parsedEmail.attachments || parseInt(parsedEmail.attachments.toString()) === 0) {
    return attachments;
  }
  
  // Parse attachment info
  let attachmentInfo: ParsedAttachmentInfo = {};
  if (parsedEmail['attachment-info']) {
    try {
      attachmentInfo = JSON.parse(parsedEmail['attachment-info']);
    } catch (error) {
      console.error('Error parsing attachment info:', error);
    }
  }
  
  // Process each attachment
  const attachmentCount = parseInt(parsedEmail.attachments.toString());
  for (let i = 1; i <= attachmentCount; i++) {
    const attachmentKey = `attachment${i}`;
    const file = formData.get(attachmentKey);
    
    if (file && file instanceof File) {
      const info = attachmentInfo[attachmentKey] || {};
      
      // For now, we'll store basic info. In production, upload to Firebase Storage
      attachments.push({
        id: `${Date.now()}-${i}`,
        filename: info.filename || file.name,
        contentType: info.type || file.type,
        size: file.size,
        contentId: info['content-id']
        // url: würde nach Firebase Storage Upload gesetzt
      });
      
      // TODO: Upload to Firebase Storage
      // const url = await uploadToStorage(file, info.filename);
    }
  }
  
  return attachments;
}

/**
 * Verify SendGrid webhook signature
 */
async function verifyWebhookSignature(request: NextRequest, secret: string): Promise<boolean> {
  try {
    const signature = request.headers.get('x-twilio-email-event-webhook-signature');
    const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp');
    
    if (!signature || !timestamp) {
      console.log('Missing signature headers');
      return false;
    }
    
    // Clone request to read body
    const body = await request.text();
    
    // Create the signed content
    const signedContent = timestamp + body;
    
    // Generate signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('base64');
    
    // Verify
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * GET handler for webhook status
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'SendGrid Inbound Parse Webhook Active',
    endpoint: '/api/webhooks/sendgrid/inbound',
    timestamp: new Date().toISOString(),
    configuration: {
      signatureVerification: !!process.env.SENDGRID_INBOUND_SECRET,
      attachmentHandling: true,
      spamFiltering: true,
      threadMatching: 'deferred'
    }
  });
}