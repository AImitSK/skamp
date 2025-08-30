// src/app/api/sendgrid/send-approval-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { rateLimitServiceAPI } from '@/lib/security/rate-limit-service-api';
import { emailAddressService } from '@/lib/email/email-address-service';
import sgMail from '@sendgrid/mail';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Sicherheitskonstanten für Approval-E-Mails
const MAX_APPROVAL_RECIPIENTS_PER_REQUEST = 10; // Deutlich weniger als Kampagnen
const MAX_APPROVAL_EMAILS_PER_DAY = 100; // Separate Limits für Approvals

// Datentypen für die Approval-Email API
interface SendApprovalEmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  // Approval-spezifische Felder
  approvalType: 'request' | 'reminder' | 'status_update' | 'approved' | 'changes_requested';
  approvalData: {
    campaignTitle: string;
    clientName: string;
    approvalUrl: string;
    recipientName: string;
    message?: string;
    feedback?: string;
    changedBy?: string;
    adminName?: string;
    adminEmail?: string;
  };
}

// Geschützte Route mit Auth - spezifisch für Approval-E-Mails
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    // Erfasse Request-Metadaten
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Get auth token for API calls
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    let data: SendApprovalEmailRequest | null = null;
    
    try {
      data = await req.json();
      
      if (!data) {
        return NextResponse.json(
          { success: false, error: 'Keine Daten empfangen' },
          { status: 400 }
        );
      }
      
      console.log('📧 Starting approval email send:', data.approvalType);
      console.log('📊 Auth context:', {
        userId: auth.userId,
        organizationId: auth.organizationId
      });

      // E-Mail-Adresse für Organisation holen
      console.log('🔍 Getting email address for organization...');
      
      let emailAddress = await emailAddressService.getDefaultForOrganizationServer(auth.organizationId, token);
      
      if (!emailAddress) {
        console.log('⚠️ No default email address found for approval emails');
        
        return NextResponse.json(
          { 
            success: false,
            error: 'Keine E-Mail-Adresse für Freigabe-Benachrichtigungen konfiguriert. Bitte richten Sie eine Standard-E-Mail-Adresse ein.',
            details: {
              organizationId: auth.organizationId,
              userId: auth.userId
            }
          },
          { status: 400 }
        );
      }
      
      console.log('✅ Using email address for approvals:', emailAddress.email);

      // APPROVAL-SPEZIFISCHES RATE LIMITING
      const approvalRateLimit = await rateLimitServiceAPI.checkRateLimit(
        auth.userId, 
        'approval', 
        1, 
        token
      );
      
      if (!approvalRateLimit.allowed) {
        await rateLimitServiceAPI.logEmailActivity({
          userId: auth.userId,
          organizationId: auth.organizationId,
          type: 'approval',
          recipientCount: 1,
          status: 'rate_limited',
          errorMessage: approvalRateLimit.reason,
          ip,
          userAgent
        }, token);

        return NextResponse.json(
          { 
            success: false,
            error: approvalRateLimit.reason || 'Approval-E-Mail-Limit überschritten',
            rateLimit: {
              remaining: approvalRateLimit.remaining,
              resetAt: approvalRateLimit.resetAt
            }
          },
          { status: 429 }
        );
      }

      // Validiere E-Mail-Adresse
      if (!isValidEmail(data.to)) {
        return NextResponse.json(
          { success: false, error: 'Ungültige E-Mail-Adresse' },
          { status: 400 }
        );
      }

      // Reply-To Adresse generieren
      const replyToAddress = emailAddressService.generateReplyToAddress(emailAddress);
      console.log('📧 Generated reply-to for approval:', replyToAddress);

      // Absender-Konfiguration
      const fromEmail = emailAddress.email;
      const fromName = emailAddress.displayName || 'CeleroPress Freigaben';

      // APPROVAL-SPEZIFISCHE E-MAIL-GENERIERUNG
      let htmlContent: string;
      let textContent: string;
      let finalSubject: string;

      if (data.html && data.text) {
        // Custom HTML/Text verwenden
        htmlContent = data.html;
        textContent = data.text;
        finalSubject = data.subject;
      } else {
        // Approval-Template generieren
        const templateResult = generateApprovalEmailTemplate(data.approvalType, data.approvalData);
        htmlContent = templateResult.html;
        textContent = templateResult.text;
        finalSubject = data.subject || templateResult.subject;
      }

      const msg = {
        to: {
          email: data.to,
          name: data.approvalData.recipientName
        },
        from: {
          email: fromEmail,
          name: fromName
        },
        reply_to: {
          email: replyToAddress,
          name: fromName
        },
        subject: finalSubject,
        html: htmlContent,
        text: textContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        },
        // Approval-spezifische Custom Args
        customArgs: {
          email_type: 'approval',
          approval_type: data.approvalType,
          user_id: auth.userId,
          organization_id: auth.organizationId,
          email_address_id: emailAddress.id
        },
        headers: {
          'X-CeleroPress-EmailType': 'approval',
          'X-CeleroPress-ApprovalType': data.approvalType,
          'X-CeleroPress-Organization': auth.organizationId,
          'X-Original-From': fromEmail
        }
      };

      console.log('📤 Sending approval email to:', data.to);
      const [response] = await sgMail.send(msg);
      
      const messageId = response.headers['x-message-id'] || '';
      console.log('✅ Approval email sent successfully, messageId:', messageId);

      // Update E-Mail-Statistiken
      if (emailAddress.id) {
        await emailAddressService.updateStats(emailAddress.id, 'sent').catch(err => 
          console.error('Failed to update email stats:', err)
        );
      }

      // Protokolliere Approval-E-Mail-Versand
      await rateLimitServiceAPI.recordAction(auth.userId, 'approval', 1, {
        approvalType: data.approvalType,
        campaignTitle: data.approvalData.campaignTitle,
        recipientEmail: data.to
      }, token);

      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'approval',
        campaignTitle: data.approvalData.campaignTitle,
        recipientCount: 1,
        status: 'success',
        ip,
        userAgent
      }, token);

      return NextResponse.json({
        success: true,
        messageId,
        emailConfig: {
          from: fromEmail,
          replyTo: replyToAddress,
          displayName: fromName,
          emailAddressId: emailAddress.id
        },
        rateLimit: {
          approvalEmailsRemaining: approvalRateLimit.remaining - 1,
          resetAt: approvalRateLimit.resetAt
        }
      });

    } catch (error: any) {
      console.error('❌ Approval Email API Error:', error);
      
      // Fehler protokollieren
      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'approval',
        campaignTitle: data?.approvalData?.campaignTitle,
        recipientCount: 0,
        status: 'failed',
        errorMessage: error.message,
        ip,
        userAgent
      }, token).catch(err => console.error('Failed to log error:', err));
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: {
            organizationId: auth.organizationId,
            userId: auth.userId
          }
        }, 
        { status: 500 }
      );
    }
  });
}

// APPROVAL-SPEZIFISCHE TEMPLATE-GENERIERUNG
function generateApprovalEmailTemplate(
  type: SendApprovalEmailRequest['approvalType'],
  data: SendApprovalEmailRequest['approvalData']
): { html: string; text: string; subject: string } {
  
  const baseStyle = `
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 20px; 
      background-color: #f8f9fa;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 8px; 
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 30px;
    }
    .header { 
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e9ecef;
    }
    .header h1 { 
      margin: 0; 
      font-size: 24px; 
      font-weight: 600;
      color: #333;
    }
    .content { 
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #28a745;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer { 
      font-size: 12px; 
      color: #6c757d; 
      text-align: center;
      border-top: 1px solid #e9ecef;
      padding-top: 20px;
      margin-top: 30px;
    }
  `;

  let subject: string;
  let htmlContent: string;
  let textContent: string;

  switch (type) {
    case 'request':
      subject = `Freigabe-Anfrage: ${data.campaignTitle}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyle}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔍 Freigabe-Anfrage</h1>
            </div>
            <div class="content">
              <p>Hallo <strong>${data.recipientName}</strong>,</p>
              <p>für Sie wurde eine neue Pressemeldung von <strong>${data.adminName || 'Ihrem PR-Team'}</strong> erstellt und wartet auf Ihre Freigabe:</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <strong>Pressemeldung:</strong> "${data.campaignTitle}"<br>
                <strong>Erstellt für:</strong> ${data.clientName}<br>
                <strong>Erstellt von:</strong> ${data.adminName || 'PR-Team'} ${data.adminEmail ? `(${data.adminEmail})` : ''}
              </div>
              ${data.message ? `<p><strong>Nachricht vom Team:</strong><br><em>${data.message}</em></p>` : ''}
              <p>Bitte prüfen Sie die Pressemeldung und geben Sie diese frei oder fordern Sie Änderungen an.</p>
              <div style="text-align: center;">
                <a href="${data.approvalUrl}" class="button">🔍 Pressemeldung jetzt prüfen und freigeben</a>
              </div>
            </div>
            <div class="footer">
              <p>Diese Benachrichtigung wurde automatisch von CeleroPress gesendet.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      textContent = `
NEUE FREIGABE-ANFRAGE VON CELEROPRESS

Hallo ${data.recipientName},

für Sie wurde eine neue Pressemeldung von ${data.adminName || 'Ihrem PR-Team'} erstellt und wartet auf Ihre Freigabe:

Pressemeldung: "${data.campaignTitle}"
Erstellt für: ${data.clientName}
Erstellt von: ${data.adminName || 'PR-Team'} ${data.adminEmail ? `(${data.adminEmail})` : ''}

${data.message ? `Nachricht vom Team:\n"${data.message}"\n\n` : ''}

Bitte prüfen Sie die Pressemeldung und geben Sie diese frei oder fordern Sie Änderungen an:
${data.approvalUrl}

Bei Fragen antworten Sie einfach auf diese E-Mail.

---
Diese Benachrichtigung wurde automatisch von CeleroPress gesendet.
      `;
      break;

    case 'reminder':
      subject = `Erinnerung: Freigabe für "${data.campaignTitle}"`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyle}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Freundliche Erinnerung</h1>
            </div>
            <div class="content">
              <p>Sehr geehrte/r ${data.recipientName},</p>
              <p>dies ist eine freundliche Erinnerung an die ausstehende Freigabe für "<strong>${data.campaignTitle}</strong>".</p>
              <p>Die Pressemitteilung wartet noch auf Ihre Prüfung und Freigabe.</p>
              <div style="text-align: center;">
                <a href="${data.approvalUrl}" class="button">Jetzt prüfen</a>
              </div>
            </div>
            <div class="footer">
              <p>Diese Erinnerung wurde automatisch von CeleroPress gesendet.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      textContent = `
Erinnerung: Freigabe für "${data.campaignTitle}"

Sehr geehrte/r ${data.recipientName},

dies ist eine freundliche Erinnerung an die ausstehende Freigabe für "${data.campaignTitle}".

Die Pressemitteilung wartet noch auf Ihre Prüfung: ${data.approvalUrl}

---
Diese Erinnerung wurde automatisch von CeleroPress gesendet.
      `;
      break;

    case 'approved':
      subject = `✅ Freigabe erhalten für "${data.campaignTitle}"`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyle}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Freigabe erhalten</h1>
            </div>
            <div class="content">
              <p>Gute Nachrichten!</p>
              <p>Die Freigabe für "<strong>${data.campaignTitle}</strong>" wurde erteilt${data.changedBy ? ` von ${data.changedBy}` : ''}.</p>
              <p>Die Kampagne kann nun versendet werden.</p>
              <div style="text-align: center;">
                <a href="${data.approvalUrl}" class="button">Details ansehen</a>
              </div>
            </div>
            <div class="footer">
              <p>Diese Benachrichtigung wurde automatisch von CeleroPress gesendet.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      textContent = `
✅ Freigabe erhalten für "${data.campaignTitle}"

Gute Nachrichten!

Die Freigabe für "${data.campaignTitle}" wurde erteilt${data.changedBy ? ` von ${data.changedBy}` : ''}.

Die Kampagne kann nun versendet werden.

Details: ${data.approvalUrl}

---
Diese Benachrichtigung wurde automatisch von CeleroPress gesendet.
      `;
      break;

    case 'changes_requested':
      subject = `🔄 Änderungen angefordert für "${data.campaignTitle}"`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyle}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔄 Änderungen angefordert</h1>
            </div>
            <div class="content">
              <p>Für die Pressemitteilung "<strong>${data.campaignTitle}</strong>" wurden Änderungen angefordert${data.changedBy ? ` von ${data.changedBy}` : ''}.</p>
              ${data.feedback ? `
                <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <strong>Feedback:</strong><br>
                  ${data.feedback.replace(/\n/g, '<br>')}
                </div>
              ` : ''}
              <p>Bitte überarbeiten Sie die Kampagne entsprechend und reichen Sie diese erneut ein.</p>
              <div style="text-align: center;">
                <a href="${data.approvalUrl}" class="button">Details ansehen</a>
              </div>
            </div>
            <div class="footer">
              <p>Diese Benachrichtigung wurde automatisch von CeleroPress gesendet.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      textContent = `
🔄 Änderungen angefordert für "${data.campaignTitle}"

Für die Pressemitteilung "${data.campaignTitle}" wurden Änderungen angefordert${data.changedBy ? ` von ${data.changedBy}` : ''}.

${data.feedback ? `Feedback: ${data.feedback}\n\n` : ''}

Bitte überarbeiten Sie die Kampagne entsprechend und reichen Sie diese erneut ein.

Details: ${data.approvalUrl}

---
Diese Benachrichtigung wurde automatisch von CeleroPress gesendet.
      `;
      break;

    default:
      subject = `Status-Update: ${data.campaignTitle}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${baseStyle}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📄 Status-Update</h1>
            </div>
            <div class="content">
              <p>Der Status der Pressemitteilung "<strong>${data.campaignTitle}</strong>" hat sich geändert.</p>
              <div style="text-align: center;">
                <a href="${data.approvalUrl}" class="button">Details ansehen</a>
              </div>
            </div>
            <div class="footer">
              <p>Diese Benachrichtigung wurde automatisch von CeleroPress gesendet.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      textContent = `
Status-Update: ${data.campaignTitle}

Der Status der Pressemitteilung "${data.campaignTitle}" hat sich geändert.

Details: ${data.approvalUrl}

---
Diese Benachrichtigung wurde automatisch von CeleroPress gesendet.
      `;
  }

  return { html: htmlContent, text: textContent, subject };
}

// Hilfsfunktion
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}