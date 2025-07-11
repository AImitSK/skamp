// src/app/api/sendgrid/send-pr-campaign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { rateLimitServiceAPI } from '@/lib/security/rate-limit-service-api';
import sgMail from '@sendgrid/mail';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Sicherheitskonstanten
const MAX_RECIPIENTS_PER_BATCH = 100; // SendGrid Batch-Limit
const MAX_RECIPIENTS_PER_CAMPAIGN = parseInt(process.env.NEXT_PUBLIC_MAX_RECIPIENTS_PER_CAMPAIGN || '500');

// Datentypen für die API
interface SendPRCampaignRequest {
  recipients: Array<{
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    companyName?: string;
  }>;
  campaignEmail: {
    subject: string;
    greeting: string;
    introduction: string;
    pressReleaseHtml: string;
    closing: string;
    signature: string;
  };
  senderInfo: {
    name: string;
    title: string;
    company: string;
    phone?: string;
    email?: string;
  };
  campaignId?: string; // NEU: Für Logging
  campaignTitle?: string; // NEU: Für Logging
  mediaShareUrl?: string;
}

// NEU: Geschützte Route mit Auth
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    // Erfasse Request-Metadaten
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Get auth token for API calls
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    let data: SendPRCampaignRequest | null = null;
    
    try {
      data = await req.json();
      
      if (!data) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Keine Daten empfangen'
          },
          { status: 400 }
        );
      }
      
      console.log('🚀 Starting PR campaign send for', data.recipients.length, 'recipients');

      // SICHERHEIT: Prüfe Campaign Rate Limit
      const campaignRateLimit = await rateLimitServiceAPI.checkRateLimit(auth.userId, 'campaign', 1, token);
      
      if (!campaignRateLimit.allowed) {
        await rateLimitServiceAPI.logEmailActivity({
          userId: auth.userId,
          organizationId: auth.organizationId,
          type: 'campaign',
          campaignId: data.campaignId,
          campaignTitle: data.campaignTitle,
          recipientCount: data.recipients.length,
          status: 'rate_limited',
          errorMessage: campaignRateLimit.reason,
          ip,
          userAgent
        }, token);

        return NextResponse.json(
          { 
            success: false,
            error: campaignRateLimit.reason || 'Kampagnen-Limit überschritten',
            rateLimit: {
              remaining: campaignRateLimit.remaining,
              resetAt: campaignRateLimit.resetAt
            }
          },
          { status: 429 }
        );
      }

      // SICHERHEIT: Validiere Empfängeranzahl
      const recipientValidation = rateLimitServiceAPI.validateRecipientCount(
        data.recipients.length, 
        'campaign'
      );
      
      if (!recipientValidation.valid) {
        await rateLimitServiceAPI.logEmailActivity({
          userId: auth.userId,
          organizationId: auth.organizationId,
          type: 'campaign',
          campaignId: data.campaignId,
          campaignTitle: data.campaignTitle,
          recipientCount: data.recipients.length,
          status: 'failed',
          errorMessage: recipientValidation.reason,
          ip,
          userAgent
        }, token);

        return NextResponse.json(
          { 
            success: false,
            error: recipientValidation.reason || 'Zu viele Empfänger',
            maxAllowed: recipientValidation.maxAllowed
          },
          { status: 400 }
        );
      }

      // SICHERHEIT: Prüfe tägliches Empfänger-Limit
      const dailyLimit = await rateLimitServiceAPI.checkDailyRecipientLimit(
        auth.userId, 
        data.recipients.length,
        token
      );
      
      if (!dailyLimit.allowed) {
        await rateLimitServiceAPI.logEmailActivity({
          userId: auth.userId,
          organizationId: auth.organizationId,
          type: 'campaign',
          campaignId: data.campaignId,
          campaignTitle: data.campaignTitle,
          recipientCount: data.recipients.length,
          status: 'rate_limited',
          errorMessage: dailyLimit.reason,
          ip,
          userAgent
        }, token);

        return NextResponse.json(
          { 
            success: false,
            error: dailyLimit.reason || 'Tägliches Empfänger-Limit erreicht',
            dailyRemaining: dailyLimit.remaining
          },
          { status: 429 }
        );
      }

      // SICHERHEIT: Validiere und säubere Empfänger-Emails
      const validRecipients = data.recipients.filter(recipient => {
        return recipient.email && isValidEmail(recipient.email);
      });

      if (validRecipients.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Keine gültigen E-Mail-Adressen gefunden' 
          },
          { status: 400 }
        );
      }

      console.log(`📧 Validated ${validRecipients.length} of ${data.recipients.length} recipients`);

      // Absender-Konfiguration
      const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
      const fromName = process.env.SENDGRID_FROM_NAME!;

      if (!fromEmail || !fromName) {
        throw new Error('SendGrid configuration missing');
      }

      const results = [];
      let successCount = 0;
      let failCount = 0;

      // SICHERHEIT: Sende in Batches für bessere Performance und Kontrolle
      const batches = [];
      for (let i = 0; i < validRecipients.length; i += MAX_RECIPIENTS_PER_BATCH) {
        batches.push(validRecipients.slice(i, i + MAX_RECIPIENTS_PER_BATCH));
      }

      console.log(`📦 Sending in ${batches.length} batches`);

      // Sende Batches sequenziell
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📤 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} recipients`);
        
        for (const recipient of batch) {
          try {
            // HTML E-Mail aufbauen
            const htmlContent = buildPREmailHtml(data.campaignEmail, data.senderInfo, recipient, data.mediaShareUrl);
            const textContent = buildPREmailText(data.campaignEmail, data.senderInfo, recipient, data.mediaShareUrl);
            const personalizedSubject = replaceVariables(data.campaignEmail.subject, recipient, data.senderInfo);

            const msg = {
              to: {
                email: recipient.email,
                name: recipient.name
              },
              from: {
                email: fromEmail,
                name: fromName
              },
              subject: personalizedSubject,
              html: htmlContent,
              text: textContent,
              trackingSettings: {
                clickTracking: { enable: true },
                openTracking: { enable: true }
              },
              // Custom Headers für Tracking
              customArgs: {
                campaign_id: data.campaignId || 'unknown',
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

        // Kleine Pause zwischen Batches
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // SICHERHEIT: Protokolliere Campaign-Versand
      await rateLimitServiceAPI.recordAction(auth.userId, 'campaign', 1, {
        campaignId: data.campaignId,
        recipientCount: validRecipients.length,
        successCount,
        failCount
      }, token);

      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'campaign',
        campaignId: data.campaignId,
        campaignTitle: data.campaignTitle,
        recipientCount: validRecipients.length,
        status: successCount > 0 ? 'success' : 'failed',
        errorMessage: failCount > 0 ? `${failCount} E-Mails fehlgeschlagen` : undefined,
        ip,
        userAgent
      }, token);

      console.log('✅ Campaign send completed:', { successCount, failCount });

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: validRecipients.length,
          success: successCount,
          failed: failCount
        },
        rateLimit: {
          campaignsRemaining: campaignRateLimit.remaining - 1,
          dailyRecipientsRemaining: dailyLimit.remaining - validRecipients.length,
          resetAt: campaignRateLimit.resetAt
        }
      });

    } catch (error: any) {
      console.error('❌ API Error:', error);
      
      // Fehler protokollieren
      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'campaign',
        campaignId: data?.campaignId,
        recipientCount: 0,
        status: 'failed',
        errorMessage: error.message,
        ip,
        userAgent
      }, token);
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        }, 
        { status: 500 }
      );
    }
  });
}

// Hilfsfunktionen
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function buildPREmailHtml(
  email: SendPRCampaignRequest['campaignEmail'], 
  sender: SendPRCampaignRequest['senderInfo'],
  recipient: SendPRCampaignRequest['recipients'][0],
  mediaShareUrl?: string
): string {
  // NEU: Media Button HTML
  const mediaButtonHtml = mediaShareUrl ? `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${mediaShareUrl}" 
                   style="display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    📎 Medien ansehen
                </a>
            </div>` : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${replaceVariables(email.subject, recipient, sender)}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600;
        }
        .content { 
            padding: 30px 20px; 
        }
        .greeting { 
            font-size: 16px; 
            margin-bottom: 20px; 
        }
        .introduction { 
            margin-bottom: 25px; 
            color: #555;
        }
        .press-release { 
            background: #f8f9fa; 
            padding: 25px; 
            border-left: 4px solid #667eea; 
            margin: 25px 0; 
            border-radius: 0 8px 8px 0;
        }
        .press-release h2 {
            color: #333;
            margin-top: 0;
        }
        .closing { 
            margin: 25px 0; 
        }
        .signature { 
            border-top: 2px solid #e9ecef; 
            padding-top: 20px; 
            margin-top: 30px; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .footer { 
            font-size: 12px; 
            color: #6c757d; 
            text-align: center;
            padding: 20px;
            background: #f1f3f4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${sender.company}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                ${replaceVariables(email.greeting, recipient, sender)}
            </div>
            
            <div class="introduction">
                ${replaceVariables(email.introduction, recipient, sender)}
            </div>
            
            <div class="press-release">
                ${replaceVariables(email.pressReleaseHtml, recipient, sender)}
            </div>
            
            ${mediaButtonHtml}
            
            <div class="closing">
                ${replaceVariables(email.closing, recipient, sender)}
            </div>
            
            <div class="signature">
                ${replaceVariables(email.signature, recipient, sender).replace(/\n/g, '<br>')}
            </div>
        </div>
        
        <div class="footer">
            <p>Diese E-Mail wurde über das SKAMP PR-Tool versendet.</p>
        </div>
    </div>
</body>
</html>`;
}

function buildPREmailText(
  email: SendPRCampaignRequest['campaignEmail'], 
  sender: SendPRCampaignRequest['senderInfo'],
  recipient: SendPRCampaignRequest['recipients'][0],
  mediaShareUrl?: string
): string {
  const mediaText = mediaShareUrl ? `\n\n📎 Medien ansehen: ${mediaShareUrl}\n` : '';
  
  return `
${replaceVariables(email.greeting, recipient, sender)}

${replaceVariables(email.introduction, recipient, sender)}

--- PRESSEMITTEILUNG ---
${stripHtml(replaceVariables(email.pressReleaseHtml, recipient, sender))}
--- ENDE PRESSEMITTEILUNG ---
${mediaText}
${replaceVariables(email.closing, recipient, sender)}

${replaceVariables(email.signature, recipient, sender)}

---
Diese E-Mail wurde über das SKAMP PR-Tool versendet.
Powered by ${sender.company}
`;
}

function replaceVariables(
  template: string, 
  recipient: SendPRCampaignRequest['recipients'][0],
  sender: SendPRCampaignRequest['senderInfo']
): string {
  const variables = {
    firstName: recipient.firstName,
    lastName: recipient.lastName,
    fullName: recipient.name,
    companyName: recipient.companyName || '',
    senderName: sender.name,
    senderTitle: sender.title,
    senderCompany: sender.company,
    senderPhone: sender.phone || '',
    senderEmail: sender.email || '',
    currentDate: new Date().toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  };

  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  });

  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}