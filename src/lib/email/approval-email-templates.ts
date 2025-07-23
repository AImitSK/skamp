// src/app/api/email/send-approval/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgMail from '@sendgrid/mail';
import { rateLimitServiceAPI } from '@/lib/security/rate-limit-service-api';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface SendApprovalEmailRequest {
  recipients: string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  customArgs?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    let data: SendApprovalEmailRequest | null = null;
    
    try {
      data = await req.json();
      
      if (!data) {
        return NextResponse.json(
          { error: 'Keine Daten empfangen' },
          { status: 400 }
        );
      }
      
      console.log('📧 Sending approval email to:', data.recipients.length, 'recipients');

      // Rate Limiting für Approval Emails (behandle wie Test-Emails)
      const rateLimitCheck = await rateLimitServiceAPI.checkRateLimit(
        auth.userId, 
        'test', // Verwende test rate limit für Approval emails
        data.recipients.length, 
        token
      );
      
      if (!rateLimitCheck.allowed) {
        await rateLimitServiceAPI.logEmailActivity({
          userId: auth.userId,
          organizationId: auth.organizationId,
          type: 'test',
          recipientCount: data.recipients.length,
          recipientEmails: data.recipients,
          status: 'rate_limited',
          errorMessage: rateLimitCheck.reason,
          ip,
          userAgent
        }, token);

        return NextResponse.json(
          { 
            error: rateLimitCheck.reason || 'Rate limit überschritten',
            remaining: rateLimitCheck.remaining,
            resetAt: rateLimitCheck.resetAt
          },
          { status: 429 }
        );
      }

      // Validierung
      if (!data.recipients || data.recipients.length === 0) {
        return NextResponse.json(
          { error: 'Keine Empfänger angegeben' },
          { status: 400 }
        );
      }

      if (!data.subject || !data.html || !data.text) {
        return NextResponse.json(
          { error: 'Betreff und Inhalt sind erforderlich' },
          { status: 400 }
        );
      }

      // Absender-Konfiguration
      const fromEmail = data.from || process.env.SENDGRID_FROM_EMAIL!;
      const fromName = process.env.SENDGRID_FROM_NAME!;

      if (!fromEmail || !fromName) {
        throw new Error('SendGrid configuration missing');
      }

      const results = [];
      let successCount = 0;
      let failCount = 0;

      // Sende E-Mails einzeln für bessere Personalisierung
      for (const recipient of data.recipients) {
        try {
          // Validiere E-Mail-Format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(recipient)) {
            results.push({
              email: recipient,
              status: 'failed',
              error: 'Ungültige E-Mail-Adresse'
            });
            failCount++;
            continue;
          }

          const msg = {
            to: recipient,
            from: {
              email: fromEmail,
              name: fromName
            },
            replyTo: data.replyTo,
            subject: data.subject,
            html: data.html,
            text: data.text,
            // Tracking für Approval-Emails
            trackingSettings: {
              clickTracking: { enable: true },
              openTracking: { enable: true }
            },
            // Custom headers für Identifikation
            customArgs: {
              ...data.customArgs,
              user_id: auth.userId,
              organization_id: auth.organizationId
            }
          };

          const [response] = await sgMail.send(msg);
          
          results.push({
            email: recipient,
            status: 'sent',
            messageId: response.headers['x-message-id'] || ''
          });
          successCount++;

        } catch (error: any) {
          console.error('Send error for', recipient, ':', error.message);
          results.push({
            email: recipient,
            status: 'failed',
            error: error.message
          });
          failCount++;
        }
      }

      // Erfolgreiche Aktion protokollieren
      await rateLimitServiceAPI.recordAction(auth.userId, 'test', data.recipients.length, {
        type: 'approval_email',
        recipientCount: data.recipients.length,
        successCount,
        failCount
      }, token);

      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'test',
        recipientCount: data.recipients.length,
        recipientEmails: data.recipients,
        status: successCount > 0 ? 'success' : 'failed',
        errorMessage: failCount > 0 ? `${failCount} E-Mails fehlgeschlagen` : undefined,
        ip,
        userAgent
      }, token);
      
      console.log('✅ Approval emails sent:', { successCount, failCount });

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: data.recipients.length,
          success: successCount,
          failed: failCount
        },
        rateLimit: {
          remaining: rateLimitCheck.remaining - data.recipients.length,
          resetAt: rateLimitCheck.resetAt
        }
      });

    } catch (error: any) {
      console.error('❌ Approval email error:', error);
      
      // Fehler protokollieren
      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'test',
        recipientCount: data?.recipients?.length || 0,
        recipientEmails: data?.recipients || [],
        status: 'failed',
        errorMessage: error.message || 'Unbekannter Fehler',
        ip,
        userAgent
      }, token);
      
      return NextResponse.json(
        { 
          error: error.message || 'Approval-Email konnte nicht gesendet werden' 
        },
        { status: 500 }
      );
    }
  });
}