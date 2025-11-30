// src/app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { nanoid } from 'nanoid';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { EmailMessage } from '@/types/email-enhanced';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const {
      to,
      cc,
      bcc,
      from,
      subject,
      htmlContent,
      textContent,
      emailAddressId,
      replyToMessageId,
      attachments,
      replyTo, // NEU: Reply-To Adresse direkt aus Request
      threadId: existingThreadId, // Thread-ID bei Replies
      campaignId,
      organizationId,
      userId,
      signatureId,
      mode, // 'new' | 'reply' | 'forward'
      domainId,
      projectId
    } = await request.json();

    // Validate required fields
    if (!to || !to.length || !from || !subject || (!htmlContent && !textContent)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate message ID
    const messageId = `${nanoid()}@${from.email.split('@')[1]}`;

    // Prepare SendGrid message
    const msg: any = {
      to: to.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name
      })),
      from: {
        email: from.email,
        name: from.name || from.email
      },
      subject,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''), // Fallback to stripped HTML
      html: htmlContent,
      customArgs: {
        emailAddressId,
        messageId,
        threadId: existingThreadId, // Für Thread-Zuordnung
        campaignId // Für Kampagnen-Zuordnung
      },
      headers: {
        'Message-ID': `<${messageId}>`,
        'X-Entity-Ref-ID': messageId
      }
    };

    // Add CC if present
    if (cc && cc.length > 0) {
      msg.cc = cc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name
      }));
    }

    // Add BCC if present
    if (bcc && bcc.length > 0) {
      msg.bcc = bcc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name
      }));
    }

    // WICHTIG: Setze Reply-To für Inbox-System
    // Validiere dass replyTo ein gültiger String ist (nicht ein leeres Objekt oder undefined)
    if (replyTo && typeof replyTo === 'string' && replyTo.includes('@')) {
      msg.replyTo = {
        email: replyTo,
        name: from.name || from.email
      };
      console.log('📮 Setting Reply-To:', replyTo);
    } else if (replyTo && typeof replyTo === 'object') {
      // Falls replyTo versehentlich als Objekt übergeben wurde, logge Warnung
      console.warn('⚠️ replyTo wurde als Objekt übergeben, nicht als String:', JSON.stringify(replyTo));
      // Versuche E-Mail aus Objekt zu extrahieren
      const replyToEmail = (replyTo as any).email;
      if (replyToEmail && typeof replyToEmail === 'string' && replyToEmail.includes('@')) {
        msg.replyTo = {
          email: replyToEmail,
          name: from.name || from.email
        };
        console.log('📮 Setting Reply-To from object:', replyToEmail);
      } else {
        // Fallback generieren
        const domain = from.email.split('@')[1];
        const localPart = from.email.split('@')[0];
        const generatedReplyTo = `${localPart}-${nanoid(8)}@inbox.${domain}`;
        msg.replyTo = {
          email: generatedReplyTo,
          name: from.name || from.email
        };
        console.log('⚠️ Generated fallback Reply-To (invalid object):', generatedReplyTo);
      }
    } else {
      // Fallback: Generiere Reply-To wenn nicht vorhanden
      const domain = from.email.split('@')[1];
      const localPart = from.email.split('@')[0];
      const generatedReplyTo = `${localPart}-${nanoid(8)}@inbox.${domain}`;
      msg.replyTo = {
        email: generatedReplyTo,
        name: from.name || from.email
      };
      console.log('⚠️ Generated fallback Reply-To:', generatedReplyTo);
    }

    // Add In-Reply-To header if replying
    if (replyToMessageId) {
      msg.headers['In-Reply-To'] = `<${replyToMessageId}>`;
      msg.headers['References'] = `<${replyToMessageId}>`;
    }

    // Add attachments if present (download from URL and convert to base64)
    if (attachments && attachments.length > 0) {
      console.log('📎 Processing attachments:', attachments.length);

      const processedAttachments = await Promise.all(
        attachments.map(async (att: any) => {
          try {
            // Validate attachment data
            if (!att.path || !att.filename) {
              console.error('❌ Invalid attachment data:', {
                hasPath: !!att.path,
                hasFilename: !!att.filename,
                attachment: att
              });
              return null;
            }

            // Download file from URL
            const response = await fetch(att.path);
            if (!response.ok) {
              console.error(`❌ Failed to download attachment: ${att.filename} (${response.status})`);
              return null;
            }

            // Convert to base64
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');

            return {
              filename: att.filename,
              content: base64,
              type: att.contentType || 'application/octet-stream',
              disposition: 'attachment'
            };
          } catch (error) {
            console.error(`❌ Error processing attachment ${att?.filename || 'unknown'}:`, error);
            return null;
          }
        })
      );

      // Filter out failed attachments
      msg.attachments = processedAttachments.filter(Boolean);
      console.log('✅ Processed attachments:', msg.attachments.length);
    }

    // Send email
    console.log('📧 Sending email via SendGrid:', {
      to: msg.to,
      from: msg.from,
      replyTo: msg.replyTo,
      subject: msg.subject,
      headers: msg.headers
    });

    try {
      const [response] = await sgMail.send(msg);

      console.log('✅ Email sent successfully:', {
        statusCode: response.statusCode,
        messageId,
        replyTo: msg.replyTo.email
      });

      // ========== THREAD-ERSTELLUNG UND E-MAIL-SPEICHERUNG ==========
      let finalThreadId = existingThreadId;

      // Thread erstellen/finden (nur für Replies/Forwards, NICHT für neue E-Mails)
      if (!finalThreadId && mode !== 'new' && organizationId) {
        console.log('🧵 Creating/finding thread for reply/forward...');
        const threadResult = await threadMatcherService.findOrCreateThread({
          messageId,
          subject,
          from,
          to,
          organizationId,
          inReplyTo: mode === 'reply' ? replyToMessageId : null,
          references: mode === 'reply' && replyToMessageId ? [replyToMessageId] : [],
          ...(domainId && { domainId }),
          ...(projectId && { projectId })
        });

        finalThreadId = threadResult.thread?.id || '';
        console.log('✅ Thread created/found:', finalThreadId);
      } else if (mode === 'new') {
        // Für neue E-Mails: Temporäre threadId generieren (kein Thread in Firestore)
        finalThreadId = `sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('📤 Generated temporary threadId for new email:', finalThreadId);
      }

      // E-Mail in Firestore speichern (sent folder)
      if (organizationId && emailAddressId) {
        console.log('💾 Saving sent email to Firestore...');

        const emailMessageData: any = {
          messageId,
          threadId: finalThreadId || `thread_${Date.now()}`,
          from,
          to,
          subject,
          textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
          htmlContent,
          snippet: (textContent || htmlContent.replace(/<[^>]*>/g, '')).substring(0, 150),
          folder: 'sent',
          isRead: true,
          isStarred: false,
          isArchived: false,
          isDraft: false,
          labels: [],
          importance: 'normal',
          emailAccountId: emailAddressId, // FIX: emailAddressId aus Request verwenden
          organizationId,
          userId: userId || organizationId,
          receivedAt: FieldValue.serverTimestamp(),
          sentAt: FieldValue.serverTimestamp(),
          attachments: attachments || [],
          headers: {},
          ...(domainId && { domainId }),
          ...(projectId && { projectId })
        };

        // Optional: signatureId
        if (signatureId) {
          emailMessageData.signatureId = signatureId;
        }

        // Optional: cc
        if (cc && cc.length > 0) {
          emailMessageData.cc = cc;
        }

        // Optional: bcc
        if (bcc && bcc.length > 0) {
          emailMessageData.bcc = bcc;
        }

        // Optional: Reply headers
        if (mode === 'reply' && replyToMessageId) {
          emailMessageData.inReplyTo = replyToMessageId;
          emailMessageData.references = [replyToMessageId];
        }

        // Optional: campaignId
        if (campaignId) {
          emailMessageData.campaignId = campaignId;
        }

        // In Firestore speichern
        const docRef = await adminDb.collection('email_messages').add(emailMessageData);
        console.log('✅ Sent email saved to Firestore:', docRef.id);
      }

      return NextResponse.json({
        success: true,
        messageId,
        threadId: finalThreadId,
        sendGridMessageId: response.headers['x-message-id'],
        replyTo: msg.replyTo.email // Return für Debugging
      });

    } catch (sendError: any) {
      console.error('❌ SendGrid error:', sendError);

      // Log vollständige SendGrid Response für Debugging
      if (sendError.response?.body) {
        console.error('📄 SendGrid Response Body:', JSON.stringify(sendError.response.body, null, 2));
      }

      // Extract error message
      let errorMessage = 'Failed to send email';
      if (sendError.response?.body?.errors?.[0]?.message) {
        errorMessage = sendError.response.body.errors[0].message;
      } else if (sendError.message) {
        errorMessage = sendError.message;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}