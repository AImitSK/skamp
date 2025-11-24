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
  cc?: string;
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
      subject: parsedEmail.subject,
      subjectPreview: parsedEmail.subject?.substring(0, 50)
    });
    
    // Extract email addresses
    const fromAddress = parseEmailAddress(parsedEmail.from);
    const toAddresses = parseToAddresses(parsedEmail);
    const ccAddresses = parseCcAddresses(parsedEmail);
    
    // Parse envelope for accurate recipient info
    const envelope = parsedEmail.envelope ? JSON.parse(parsedEmail.envelope) as ParsedEnvelope : null;
    
    // Truncate Content wenn zu groß (Firestore Limit: 1MB pro Feld)
    const MAX_CONTENT_SIZE = 900000; // 900KB (Puffer für Metadaten)

    const truncateContent = (content: string | undefined, maxSize: number): string => {
      if (!content) return '';
      if (content.length <= maxSize) return content;

      const truncated = content.substring(0, maxSize);
      return truncated + '\n\n[... Inhalt gekürzt - zu groß für Speicherung ...]';
    };

    // Create email message data
    const emailData: IncomingEmailData = {
      // Headers - mit Fallback wenn headers undefined
      messageId: parsedEmail.headers ? extractMessageId(parsedEmail.headers) : generateMessageId(),
      inReplyTo: parsedEmail.headers ? extractHeader(parsedEmail.headers, 'In-Reply-To') || undefined : undefined,
      references: parsedEmail.headers ? (extractHeader(parsedEmail.headers, 'References')?.split(/\s+/) || []) : [],

      // Addresses
      from: fromAddress,
      to: toAddresses,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,

      // Content (truncated)
      subject: parsedEmail.subject || '(Kein Betreff)',
      textContent: truncateContent(parsedEmail.text, MAX_CONTENT_SIZE),
      htmlContent: truncateContent(parsedEmail.html, MAX_CONTENT_SIZE),
      
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

    // Process attachments if present (mit Storage-Upload)
    let processedAttachments: EmailAttachment[] = [];

    console.log('🔍 Attachment check:', {
      hasAttachmentInfo: !!parsedEmail['attachment-info'],
      attachmentCount: parsedEmail.attachments,
      formDataKeys: Array.from(formData.keys())
    });

    if (parsedEmail['attachment-info']) {
      try {
        // Bestimme organizationId aus to-Adresse (für Storage-Path)
        // Für jetzt: Extrahiere aus erster to-Adresse oder nutze Default
        const orgId = toAddresses[0]?.email.split('@')[0] || 'default';

        const { extractAttachmentsFromFormData } = await import('@/lib/email/email-attachments-service');
        processedAttachments = await extractAttachmentsFromFormData(
          formData,
          orgId, // Wird später durch richtige orgId ersetzt
          emailData.messageId
        );

        console.log(`📎 Processed ${processedAttachments.length} attachments`);
      } catch (attachmentError) {
        console.error('❌ Attachment processing failed:', attachmentError);
        // Fallback zu alter Methode ohne Upload
        processedAttachments = await processAttachments(formData, parsedEmail);
      }
    } else {
      processedAttachments = await processAttachments(formData, parsedEmail);
    }

    if (processedAttachments.length > 0) {
      emailData.attachments = processedAttachments;

      // Ersetze CID-Links in HTML mit echten URLs
      if (emailData.htmlContent && processedAttachments.some(a => a.inline && a.contentId)) {
        const { replaceInlineImageCIDs } = await import('@/lib/email/email-attachments-service');
        emailData.htmlContent = replaceInlineImageCIDs(emailData.htmlContent, processedAttachments);
      }
    }

    // Process the email through our flexible pipeline
    const result = await flexibleEmailProcessor(emailData);

    // ✅ FIX: Konsolidiere Email-Anhänge in einen einzigen korrekten Ordner
    if (result.success && result.organizationId && processedAttachments.length > 0) {
      try {
        const { adminDb } = await import('@/lib/firebase/admin-init');

        // 1. Finde oder erstelle den KORREKTEN Email-Anhänge Ordner
        const foldersRef = adminDb.collection('media_folders');
        const correctFolderQuery = foldersRef
          .where('organizationId', '==', result.organizationId)
          .where('name', '==', 'Email-Anhänge')
          .limit(1);

        const folderSnap = await correctFolderQuery.get();
        let correctFolderId: string;

        if (!folderSnap.empty) {
          correctFolderId = folderSnap.docs[0].id;
          console.log(`✅ Using existing Email-Anhänge folder: ${correctFolderId}`);
        } else {
          // Erstelle korrekten Ordner falls nicht vorhanden
          const { FieldValue } = await import('firebase-admin/firestore');
          const newFolderRef = await foldersRef.add({
            organizationId: result.organizationId,
            name: 'Email-Anhänge',
            description: 'Automatisch gespeicherte Email-Anhänge',
            createdBy: result.organizationId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            color: '#005fab',
          });
          correctFolderId = newFolderRef.id;
          console.log(`✅ Created new Email-Anhänge folder: ${correctFolderId}`);
        }

        // 2. Sammle falsche Ordner IDs
        const wrongFolderIds = new Set<string>();

        // 3. Update alle Assets: organizationId + verschiebe zu korrektem Ordner
        for (const attachment of processedAttachments) {
          const mediaAssetId = (attachment as any).mediaAssetId;
          if (mediaAssetId) {
            // Hole Asset um alte folderId zu bekommen
            const assetDoc = await adminDb.collection('media_assets').doc(mediaAssetId).get();
            const assetData = assetDoc.data();

            if (assetData?.folderId && assetData.folderId !== correctFolderId) {
              wrongFolderIds.add(assetData.folderId);
            }

            // Update Asset: organizationId UND folderId
            await adminDb.collection('media_assets').doc(mediaAssetId).update({
              organizationId: result.organizationId,
              folderId: correctFolderId
            });
            console.log(`✅ Updated media_asset ${mediaAssetId}: orgId=${result.organizationId}, folderId=${correctFolderId}`);
          }
        }

        // 4. Lösche falsche Ordner (nur wenn leer)
        for (const wrongFolderId of wrongFolderIds) {
          try {
            // Prüfe ob Ordner noch Assets hat
            const assetsInFolder = await adminDb.collection('media_assets')
              .where('folderId', '==', wrongFolderId)
              .limit(1)
              .get();

            if (assetsInFolder.empty) {
              await adminDb.collection('media_folders').doc(wrongFolderId).delete();
              console.log(`✅ Deleted empty wrong folder: ${wrongFolderId}`);
            } else {
              console.log(`⚠️ Cannot delete folder ${wrongFolderId} - still has assets`);
            }
          } catch (deleteError: any) {
            console.error(`❌ Failed to delete folder ${wrongFolderId}:`, deleteError);
          }
        }
      } catch (updateError: any) {
        console.error('❌ Failed to consolidate email attachments:', updateError);
        // Nicht werfen - Email wurde erfolgreich verarbeitet
      }
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
 * Windows-1252 Decoder (häufig bei Outlook)
 */
function decodeWindows1252(bytes: Uint8Array): string {
  // Windows-1252 Mapping für Bytes 0x80-0x9F
  const win1252Map: { [key: number]: string } = {
    0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021',
    0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039', 0x8C: '\u0152', 0x8E: '\u017D',
    0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
    0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153', 0x9E: '\u017E', 0x9F: '\u0178'
  };

  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte >= 0x80 && byte <= 0x9F && win1252Map[byte]) {
      result += win1252Map[byte];
    } else {
      result += String.fromCharCode(byte);
    }
  }
  return result;
}

/**
 * Zählt deutsche Sonderzeichen (für Encoding-Erkennung)
 */
function countGermanChars(text: string): number {
  const matches = text.match(/[äöüßÄÖÜ]/g);
  return matches ? matches.length : 0;
}

/**
 * Extrahiere Charset aus HTML meta-Tag
 */
function extractCharsetFromHtml(html: string): string | null {
  if (!html) return null;

  // Suche nach <meta charset="...">
  const charsetMatch = html.match(/<meta\s+charset=["']?([^"'\s>]+)/i);
  if (charsetMatch) {
    return charsetMatch[1];
  }

  // Suche nach <meta http-equiv="Content-Type" content="text/html; charset=...">
  const contentTypeMatch = html.match(/<meta\s+http-equiv=["']?Content-Type["']?\s+content=["']?[^"']*charset=([^"'\s;>]+)/i);
  if (contentTypeMatch) {
    return contentTypeMatch[1];
  }

  return null;
}

/**
 * Parse FormData from SendGrid
 */
function parseFormData(formData: FormData): ParsedEmail | null {
  try {
    // Parse charsets first (for proper text decoding)
    let charsets: any = {};
    try {
      const charsetsStr = formData.get('charsets');
      if (charsetsStr && typeof charsetsStr === 'string') {
        charsets = JSON.parse(charsetsStr);
        console.log('📝 SendGrid charsets:', charsets);
      }
    } catch (e) {
      console.error('Failed to parse charsets:', e);
    }

    // Helper function to decode text with proper charset handling
    const decodeText = (text: string | null, charset?: string): string | null => {
      if (!text) return text;

      try {
        let decoded = text;

        // Prüfe ob Text defekte UTF-8 Sequenzen enthält (�)
        // Wenn ja, versuche andere Charsets, auch wenn keins angegeben ist
        const hasReplacementChar = text.includes('\uFFFD') || text.includes('�');
        const hasLikelyMojibake = text.includes('Ã¼') || text.includes('Ã¤') || text.includes('Ã¶');

        if ((hasReplacementChar || hasLikelyMojibake) && !charset) {
          console.log('⚠️ Defekte UTF-8 Sequenzen erkannt - versuche alternative Decodierung');
          charset = 'iso-8859-1'; // Fallback für defekte Sequenzen
        }

        // 1. Handle ISO-8859-1/Latin-1/Windows-1252 charset explicitly
        // Outlook sendet oft Windows-1252 als ISO-8859-1 deklariert
        if (charset && (
          charset.toLowerCase() === 'iso-8859-1' ||
          charset.toLowerCase() === 'latin1' ||
          charset.toLowerCase() === 'windows-1252' ||
          charset.toLowerCase() === 'cp1252'
        )) {
          try {
            // Konvertiere String zu Byte-Array (jedes Zeichen = 1 Byte)
            const bytes = new Uint8Array(text.length);
            for (let i = 0; i < text.length; i++) {
              bytes[i] = text.charCodeAt(i) & 0xFF;
            }

            // Versuche verschiedene Decodierungen
            let bestDecoded = text;
            let bestScore = 0;

            // Versuch 1: UTF-8 (falls fälschlicherweise als ISO-8859-1 markiert)
            try {
              const utf8Decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
              const score = countGermanChars(utf8Decoded);
              if (score > bestScore || (score === bestScore && !utf8Decoded.includes('�'))) {
                bestDecoded = utf8Decoded;
                bestScore = score;
              }
            } catch (e) {
              // UTF-8 decode failed, continue
            }

            // Versuch 2: Windows-1252 (sehr häufig bei Outlook)
            try {
              const win1252Decoded = decodeWindows1252(bytes);
              const score = countGermanChars(win1252Decoded);
              if (score > bestScore) {
                bestDecoded = win1252Decoded;
                bestScore = score;
              }
            } catch (e) {
              // Windows-1252 decode failed
            }

            // Versuch 3: ISO-8859-1 (echtes Latin-1)
            try {
              const latin1Decoded = new TextDecoder('iso-8859-1').decode(bytes);
              const score = countGermanChars(latin1Decoded);
              if (score > bestScore) {
                bestDecoded = latin1Decoded;
                bestScore = score;
              }
            } catch (e) {
              // ISO-8859-1 decode failed
            }

            decoded = bestDecoded;
          } catch (e) {
            console.warn('Failed to decode ISO-8859-1:', e);
          }
        }

        // 2. Decode MIME Encoded-Words (=?charset?encoding?text?=)
        decoded = decoded.replace(
          /=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g,
          (match, mimeCharset, encoding, encodedText) => {
            try {
              if (encoding.toUpperCase() === 'B') {
                // Base64 encoding
                return Buffer.from(encodedText, 'base64').toString('utf8');
              } else if (encoding.toUpperCase() === 'Q') {
                // Quoted-Printable encoding
                const qpDecoded = encodedText
                  .replace(/_/g, ' ')
                  .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
                    String.fromCharCode(parseInt(hex, 16))
                  );
                return qpDecoded;
              }
            } catch (e) {
              console.warn('Failed to decode MIME word:', e);
            }
            return match;
          }
        );

        // 3. Decode Quoted-Printable sequences
        decoded = decoded.replace(
          /=([0-9A-Fa-f]{2})/g,
          (_, hex) => String.fromCharCode(parseInt(hex, 16))
        );

        // 4. Fix double-encoding issue (UTF-8 bytes interpreted as Latin-1)
        // Check if text contains replacement characters or mojibake patterns
        if (decoded.includes('ï¿½') || decoded.includes('Ã¼') || decoded.includes('Ã¤') || decoded.includes('Ã¶')) {
          try {
            // Try to fix by encoding as Latin-1 and decoding as UTF-8
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
              bytes[i] = decoded.charCodeAt(i) & 0xFF;
            }
            const fixed = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            if (!fixed.includes('�')) {
              decoded = fixed;
            }
          } catch (e) {
            console.warn('Failed to fix double-encoding:', e);
          }
        }

        console.log('🔤 Decoded text:', {
          original: text.substring(0, 50),
          decoded: decoded.substring(0, 50),
          charset,
          hasUmlauts: decoded.includes('ü') || decoded.includes('ä') || decoded.includes('ö') || decoded.includes('ß')
        });
        return decoded;

      } catch (e) {
        console.warn(`Failed to decode text with charset ${charset}:`, e);
        return text;
      }
    };

    const email: any = {};

    // Iterate through all form fields
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        // Decode text fields with proper charset
        if (key === 'subject') {
          email[key] = decodeText(value, charsets.subject);
        } else if (key === 'text') {
          email[key] = decodeText(value, charsets.text);
        } else if (key === 'html') {
          // Für HTML: Erst dekodieren, dann auch meta-Tag prüfen
          let htmlCharset = charsets.html;
          if (!htmlCharset && value) {
            htmlCharset = extractCharsetFromHtml(value);
            if (htmlCharset) {
              console.log('📝 Charset aus HTML meta-Tag extrahiert:', htmlCharset);
            }
          }
          email[key] = decodeText(value, htmlCharset);
        } else if (key === 'from') {
          email[key] = decodeText(value, charsets.from);
        } else if (key === 'to') {
          email[key] = decodeText(value, charsets.to);
        } else if (key === 'cc') {
          email[key] = decodeText(value, charsets.cc);
        } else {
          email[key] = value;
        }
      }
    }
    
    
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
      const parsedContent = parseRFC822Email(email.text);
      if (parsedContent) {
        email.text = parsedContent.text || email.text;
        email.html = parsedContent.html || email.html;
      }
    } else if (email.html && email.html.includes('Content-Type:') && email.html.includes('boundary=')) {
      const parsedContent = parseRFC822Email(email.html);
      if (parsedContent) {
        email.text = parsedContent.text || email.text;
        email.html = parsedContent.html || email.html;
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
 * Parse RFC822 formatted email to extract text and HTML content
 */
function parseRFC822Email(emailData: string): { text?: string; html?: string; headers?: string } | null {
  try {
    // Standard RFC822 Format - teile Header und Body
    const headerBodySplit = emailData.split(/\r?\n\r?\n/);
    if (headerBodySplit.length < 2) {
      return { text: emailData };
    }
    
    const headers = headerBodySplit[0];
    const body = headerBodySplit.slice(1).join('\n\n');
    
    // Prüfe zuerst, ob Body mit einer Boundary beginnt (SendGrid multipart)
    const bodyStartsWithBoundary = body.match(/^--([a-f0-9]{10,})/);
    
    if (bodyStartsWithBoundary) {
      const boundary = bodyStartsWithBoundary[1];
      
      // Parse als multipart ohne Header-Check
      const boundaryRegex = new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?`, 'g');
      const parts = body.split(boundaryRegex);
      
      let textContent = '';
      let htmlContent = '';
      
      // Durchsuche alle Parts
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part.trim()) continue;
        
        // Finde Content-Type in diesem Part
        const partContentTypeMatch = part.match(/Content-Type:\s*([^;\s\r\n]+)/i);
        if (!partContentTypeMatch) {
          continue;
        }
        
        const partType = partContentTypeMatch[1].toLowerCase();
        
        // Extrahiere Body nach Header-Ende (doppelte Zeilenumbrüche)
        const partBodyMatch = part.match(/\r?\n\r?\n([\s\S]*)/);
        const partBody = partBodyMatch ? partBodyMatch[1].trim() : '';
        
        if (!partBody) {
          continue;
        }
        
        if (partType === 'text/plain' && !textContent) {
          textContent = decodeQuotedPrintable(partBody);
        } else if (partType === 'text/html' && !htmlContent) {
          htmlContent = decodeQuotedPrintable(partBody);
        }
      }
      
      return {
        text: textContent || undefined,
        html: htmlContent || undefined,
        headers
      };
    }
    
    // Fallback: Suche nach Content-Type in den äußeren Headers
    const contentTypeMatch = headers.match(/Content-Type:\s*([^;\s]+)/i);
    const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase().trim() : 'text/plain';
    
    if (!contentType.includes('multipart')) {
      return { text: body, headers };
    }
    
    // Fallback: Standard multipart processing
    return { text: body, headers };
    
  } catch (error) {
    console.error('❌ Error parsing RFC822 email:', error);
    return { text: emailData };
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
 * Parse all CC addresses
 */
function parseCcAddresses(parsedEmail: ParsedEmail): EmailAddressInfo[] {
  const addresses: EmailAddressInfo[] = [];
  const seen = new Set<string>();

  // Parse CC field
  if (parsedEmail.cc) {
    const ccAddresses = parsedEmail.cc.split(',').map(addr => parseEmailAddress(addr.trim()));
    ccAddresses.forEach(addr => {
      if (addr.email && !seen.has(addr.email)) {
        addresses.push(addr);
        seen.add(addr.email);
      }
    });
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
