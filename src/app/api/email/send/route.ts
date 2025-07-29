// src/app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { nanoid } from 'nanoid';

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
      threadId,
      campaignId
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
        threadId, // Für Thread-Zuordnung
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
    if (replyTo) {
      msg.replyTo = {
        email: replyTo,
        name: from.name || from.email
      };
      console.log('📮 Setting Reply-To:', replyTo);
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

      return NextResponse.json({
        success: true,
        messageId,
        sendGridMessageId: response.headers['x-message-id'],
        replyTo: msg.replyTo.email // Return für Debugging
      });

    } catch (sendError: any) {
      console.error('❌ SendGrid error:', sendError);
      
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