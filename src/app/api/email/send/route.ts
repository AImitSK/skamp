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
      attachments
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
      cc: cc?.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name
      })),
      bcc: bcc?.map((recipient: any) => ({
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
        messageId
      },
      headers: {
        'Message-ID': `<${messageId}>`,
        'X-Entity-Ref-ID': messageId
      }
    };

    // Add In-Reply-To header if replying
    if (replyToMessageId) {
      msg.headers['In-Reply-To'] = `<${replyToMessageId}>`;
      msg.headers['References'] = `<${replyToMessageId}>`;
    }

    // Send email
    console.log('📧 Sending email via SendGrid:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });

    try {
      const [response] = await sgMail.send(msg);
      
      console.log('✅ Email sent successfully:', {
        statusCode: response.statusCode,
        messageId
      });

      return NextResponse.json({
        success: true,
        messageId,
        sendGridMessageId: response.headers['x-message-id']
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