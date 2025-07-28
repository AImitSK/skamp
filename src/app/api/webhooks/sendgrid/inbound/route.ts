interface IncomingEmailData {
  messageId: string;
  from: EmailAddressInfo;
  to: EmailAddressInfo[];
  subject: string;
  textContent: string;
  htmlContent?: string;
  attachments?: EmailAttachment[];
  inReplyTo?: string | null;
  references?: string[];
  headers: Record<string, string>;
  spamScore?: number;
  spamReport?: string;
  envelope?: {
    to: string[];
    from: string;
  };
}// src/app/api/webhooks/sendgrid/inbound/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { emailMessageService } from '@/lib/email/email-message-service';
import { emailProcessor } from '@/lib/email/email-processor';
import { EmailAddressInfo, EmailAttachment } from '@/types/email-enhanced';

// SendGrid Inbound Parse Data Structure
interface ParsedEmail {
  headers: string;
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
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

    // Extract email addresses
    const fromAddress = parseEmailAddress(parsedEmail.from);
    const toAddresses = parseToAddresses(parsedEmail);
    
    // Parse envelope for accurate recipient info
    const envelope = parsedEmail.envelope ? JSON.parse(parsedEmail.envelope) as ParsedEnvelope : null;
    
    // Create email message data
    const emailData: IncomingEmailData = {
      // Headers
      messageId: extractMessageId(parsedEmail.headers),
      inReplyTo: extractHeader(parsedEmail.headers, 'In-Reply-To'),
      references: extractHeader(parsedEmail.headers, 'References')?.split(/\s+/) || [],
      
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
      
      // Raw headers for debugging
      headers: parseHeaders(parsedEmail.headers),
      
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

    // Process the email through our pipeline
    const result = await emailProcessor.processIncomingEmail(emailData);
    
    if (result.success) {
      console.log('✅ Email processed successfully:', result.messageId);
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId,
        threadId: result.threadId 
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
 * Parse email address from string
 */
function parseEmailAddress(addressString: string): EmailAddressInfo {
  // Match patterns like "Name <email@domain.com>" or just "email@domain.com"
  const match = addressString.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  
  if (match) {
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
      if (!seen.has(addr.email)) {
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
 * Extract Message-ID from headers
 */
function extractMessageId(headers: string): string {
  const messageId = extractHeader(headers, 'Message-ID');
  if (messageId) {
    return messageId.replace(/^<|>$/g, '');
  }
  
  // Generate a unique ID if none found
  return `sendgrid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@inbound.celeropress.de`;
}

/**
 * Extract specific header value
 */
function extractHeader(headers: string, headerName: string): string | null {
  const regex = new RegExp(`^${headerName}:\\s*(.*)$`, 'mi');
  const match = headers.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Parse all headers into key-value pairs
 */
function parseHeaders(headersString: string): Record<string, string> {
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
      spamFiltering: true
    }
  });
}