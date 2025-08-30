// src/app/api/email/send-approval/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgMail from '@sendgrid/mail';
import { rateLimitServiceAPI } from '@/lib/security/rate-limit-service-api';
import {
  getApprovalRequestEmailTemplate,
  getApprovalReminderEmailTemplate,
  getApprovalGrantedEmailTemplate,
  getChangesRequestedEmailTemplate
} from '@/lib/email/approval-email-templates';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface SendApprovalEmailRequest {
  type: 'request' | 'reminder' | 'approved' | 'changes_requested';
  recipients: Array<{
    email: string;
    name: string;
  }>;
  campaignTitle: string;
  clientName: string;
  approvalUrl: string;
  message?: string;
  agencyName?: string;
  agencyLogoUrl?: string;
  // Für approved/changes_requested
  actorName?: string;
  feedback?: string;
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
      
      // Array-Validierung für recipients
      if (!Array.isArray(data.recipients)) {
        return NextResponse.json(
          { error: 'Recipients muss ein Array sein' },
          { status: 400 }
        );
      }

      console.log('📧 Sending approval email:', data.type, 'to', data.recipients.length, 'recipients');

      // Rate Limiting
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
          recipientEmails: data.recipients.map(r => r.email),
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

      if (!data.campaignTitle || !data.clientName || !data.approvalUrl) {
        return NextResponse.json(
          { error: 'Pflichtfelder fehlen' },
          { status: 400 }
        );
      }

      // Absender-Konfiguration
      const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
      const fromName = data.agencyName || process.env.SENDGRID_FROM_NAME!;

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
          if (!emailRegex.test(recipient.email)) {
            results.push({
              email: recipient.email,
              status: 'failed',
              error: 'Ungültige E-Mail-Adresse'
            });
            failCount++;
            continue;
          }

          // Generiere Template basierend auf Typ
          let emailContent;
          switch (data.type) {
            case 'request':
              emailContent = getApprovalRequestEmailTemplate({
                recipientName: recipient.name,
                recipientEmail: recipient.email,
                campaignTitle: data.campaignTitle,
                clientName: data.clientName,
                approvalUrl: data.approvalUrl,
                message: data.message,
                agencyName: data.agencyName,
                agencyLogoUrl: data.agencyLogoUrl
              });
              break;
              
            case 'reminder':
              emailContent = getApprovalReminderEmailTemplate({
                recipientName: recipient.name,
                recipientEmail: recipient.email,
                campaignTitle: data.campaignTitle,
                clientName: data.clientName,
                approvalUrl: data.approvalUrl,
                agencyName: data.agencyName,
                agencyLogoUrl: data.agencyLogoUrl
              });
              break;
              
            case 'approved':
              emailContent = getApprovalGrantedEmailTemplate({
                recipientName: recipient.name,
                recipientEmail: recipient.email,
                campaignTitle: data.campaignTitle,
                clientName: data.clientName,
                approvalUrl: data.approvalUrl,
                agencyName: data.agencyName,
                agencyLogoUrl: data.agencyLogoUrl,
                approverName: data.actorName || 'Kunde'
              });
              break;
              
            case 'changes_requested':
              emailContent = getChangesRequestedEmailTemplate({
                recipientName: recipient.name,
                recipientEmail: recipient.email,
                campaignTitle: data.campaignTitle,
                clientName: data.clientName,
                approvalUrl: data.approvalUrl,
                agencyName: data.agencyName,
                agencyLogoUrl: data.agencyLogoUrl,
                reviewerName: data.actorName || 'Kunde',
                feedback: data.feedback || ''
              });
              break;
              
            default:
              throw new Error(`Unbekannter E-Mail-Typ: ${data.type}`);
          }

          const msg = {
            to: recipient.email,
            from: {
              email: fromEmail,
              name: fromName
            },
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            // Tracking für Approval-Emails
            trackingSettings: {
              clickTracking: { enable: true },
              openTracking: { enable: true }
            },
            // Custom headers für Identifikation
            customArgs: {
              type: 'approval',
              approval_type: data.type,
              campaign_title: data.campaignTitle,
              user_id: auth.userId,
              organization_id: auth.organizationId
            }
          };

          const [response] = await sgMail.send(msg);
          
          results.push({
            email: recipient.email,
            status: 'sent',
            messageId: response.headers['x-message-id'] || ''
          });
          successCount++;

        } catch (error: any) {
          console.error('Send error for', recipient.email, ':', error.message);
          results.push({
            email: recipient.email,
            status: 'failed',
            error: error.message
          });
          failCount++;
        }
      }

      // Erfolgreiche Aktion protokollieren
      await rateLimitServiceAPI.recordAction(auth.userId, 'test', data.recipients.length, {
        type: 'approval_email',
        emailType: data.type,
        recipientCount: data.recipients.length,
        successCount,
        failCount
      }, token);

      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'test',
        recipientCount: data.recipients.length,
        recipientEmails: data.recipients.map(r => r.email),
        status: successCount > 0 ? 'success' : 'failed',
        errorMessage: failCount > 0 ? `${failCount} E-Mails fehlgeschlagen` : undefined,
        ip,
        userAgent
      }, token);
      
      console.log('✅ Approval emails sent:', { type: data.type, successCount, failCount });

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
        recipientEmails: data?.recipients?.map(r => r.email) || [],
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