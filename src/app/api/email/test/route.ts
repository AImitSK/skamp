// src/app/api/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgMail from '@sendgrid/mail';
import { emailComposerService } from '@/lib/email/email-composer-service';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface TestEmailRequest {
  recipient: {
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    companyName?: string;
  };
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
  testMode: boolean;
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data: TestEmailRequest = await req.json();
      
      console.log('🧪 Sending test email to:', data.recipient.email);

      // Validierung
      if (!data.recipient.email || !isValidEmail(data.recipient.email)) {
        return NextResponse.json(
          { error: 'Ungültige E-Mail-Adresse' },
          { status: 400 }
        );
      }

      // Absender-Konfiguration
      const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
      const fromName = process.env.SENDGRID_FROM_NAME!;

      if (!fromEmail || !fromName) {
        throw new Error('SendGrid configuration missing');
      }

      // Variablen für E-Mail vorbereiten
      const variables = emailComposerService.prepareVariables(
        data.recipient,
        data.senderInfo,
        { title: 'Test-Kampagne', clientName: auth.organizationId },
        undefined
      );

      // HTML und Text Content generieren
      const htmlContent = buildTestEmailHtml(
        data.campaignEmail, 
        variables,
        data.testMode
      );
      
      const textContent = buildTestEmailText(
        data.campaignEmail, 
        variables,
        data.testMode
      );
      
      const personalizedSubject = emailComposerService.replaceVariables(
        data.campaignEmail.subject, 
        variables
      );

      // Test-Email Prefix
      const testSubject = `[TEST] ${personalizedSubject}`;

      const msg = {
        to: {
          email: data.recipient.email,
          name: data.recipient.name
        },
        from: {
          email: fromEmail,
          name: fromName
        },
        subject: testSubject,
        html: htmlContent,
        text: textContent,
        // Tracking für Test-Emails deaktivieren
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false }
        },
        // Custom headers für Identifikation
        headers: {
          'X-Campaign-Type': 'test',
          'X-Organization-Id': auth.organizationId
        }
      };

      const [response] = await sgMail.send(msg);
      
      console.log('✅ Test email sent successfully');

      return NextResponse.json({
        success: true,
        messageId: response.headers['x-message-id'] || '',
        preview: {
          html: htmlContent,
          text: textContent,
          subject: testSubject
        }
      });

    } catch (error: any) {
      console.error('❌ Test email error:', error);
      
      return NextResponse.json(
        { 
          error: error.message || 'Test-Email konnte nicht gesendet werden' 
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

function buildTestEmailHtml(
  email: TestEmailRequest['campaignEmail'], 
  variables: any,
  isTest: boolean
): string {
  const testBanner = isTest ? `
    <div style="background: #ff6b6b; color: white; padding: 10px; text-align: center; font-weight: bold;">
      🧪 TEST-EMAIL - Dies ist keine echte Kampagnen-Email
    </div>` : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailComposerService.replaceVariables(email.subject, variables)}</title>
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
            white-space: pre-line;
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
    ${testBanner}
    <div class="container">
        <div class="header">
            <h1>${variables.sender.company || 'Test Company'}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                ${emailComposerService.replaceVariables(email.greeting, variables)}
            </div>
            
            <div class="introduction">
                ${emailComposerService.replaceVariables(email.introduction, variables)}
            </div>
            
            <div class="press-release">
                ${emailComposerService.replaceVariables(email.pressReleaseHtml, variables)}
            </div>
            
            <div class="closing">
                ${emailComposerService.replaceVariables(email.closing, variables)}
            </div>
            
            <div class="signature">
                ${emailComposerService.replaceVariables(email.signature, variables)}
            </div>
        </div>
        
        <div class="footer">
            <p>Diese TEST-E-Mail wurde über das SKAMP PR-Tool versendet.</p>
            <p>Organization ID: ${variables.campaign.clientName}</p>
        </div>
    </div>
</body>
</html>`;
}

function buildTestEmailText(
  email: TestEmailRequest['campaignEmail'], 
  variables: any,
  isTest: boolean
): string {
  const testHeader = isTest ? '🧪 TEST-EMAIL - Dies ist keine echte Kampagnen-Email\n\n' : '';
  
  return `${testHeader}${emailComposerService.replaceVariables(email.greeting, variables)}

${emailComposerService.replaceVariables(email.introduction, variables)}

--- PRESSEMITTEILUNG ---
${stripHtml(emailComposerService.replaceVariables(email.pressReleaseHtml, variables))}
--- ENDE PRESSEMITTEILUNG ---

${emailComposerService.replaceVariables(email.closing, variables)}

${emailComposerService.replaceVariables(email.signature, variables)}

---
Diese TEST-E-Mail wurde über das SKAMP PR-Tool versendet.
Organization ID: ${variables.campaign.clientName}
`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}