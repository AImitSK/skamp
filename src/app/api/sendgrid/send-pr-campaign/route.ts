// src/app/api/sendgrid/send-pr-campaign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

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
}

export async function POST(request: NextRequest) {
  try {
    const data: SendPRCampaignRequest = await request.json();
    
    console.log('🚀 Starting PR campaign send for', data.recipients.length, 'recipients');

    // Absender-Konfiguration aus Environment Variables
    const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
    const fromName = process.env.SENDGRID_FROM_NAME!;

    if (!fromEmail || !fromName) {
      throw new Error('SendGrid configuration missing');
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // E-Mails einzeln oder in Batches senden
    for (const recipient of data.recipients) {
      try {
        // HTML E-Mail aufbauen
        const htmlContent = buildPREmailHtml(data.campaignEmail, data.senderInfo, recipient);
        const textContent = buildPREmailText(data.campaignEmail, data.senderInfo, recipient);
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

    console.log('✅ Campaign send completed:', { successCount, failCount });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: data.recipients.length,
        success: successCount,
        failed: failCount
      }
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      }, 
      { status: 500 }
    );
  }
}

// Hilfsfunktionen
function buildPREmailHtml(
  email: SendPRCampaignRequest['campaignEmail'], 
  sender: SendPRCampaignRequest['senderInfo'],
  recipient: SendPRCampaignRequest['recipients'][0]
): string {
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
  recipient: SendPRCampaignRequest['recipients'][0]
): string {
  return `
${replaceVariables(email.greeting, recipient, sender)}

${replaceVariables(email.introduction, recipient, sender)}

--- PRESSEMITTEILUNG ---
${stripHtml(replaceVariables(email.pressReleaseHtml, recipient, sender))}
--- ENDE PRESSEMITTEILUNG ---

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