// src/app/api/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgMail from '@sendgrid/mail';
import { emailComposerService } from '@/lib/email/email-composer-service';
import { rateLimitServiceAPI } from '@/lib/security/rate-limit-service-api';
import { PRCampaign } from '@/types/pr';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Sicherheitskonstanten
const MAX_TEST_RECIPIENTS = 5;
const ALLOWED_TEST_DOMAINS = process.env.NODE_ENV === 'production' 
  ? null 
  : process.env.NEXT_PUBLIC_ALLOWED_TEST_DOMAINS?.split(',') || null;

// Firestore REST API Helper
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function firestoreRequest(
  path: string,
  method: string = 'GET',
  body?: any,
  token?: string
) {
  const url = `${FIRESTORE_BASE_URL}/${path}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firestore request failed: ${error}`);
  }
  
  return response.json();
}

// Convert Firestore document to JS object
function convertFirestoreDocument(doc: any): any {
  if (!doc.fields) return null;
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = convertFirestoreValue(value);
  }
  
  return result;
}

function convertFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.arrayValue !== undefined) {
    return value.arrayValue.values?.map((v: any) => convertFirestoreValue(v)) || [];
  }
  if (value.mapValue !== undefined) {
    const result: any = {};
    if (value.mapValue.fields) {
      for (const [k, v] of Object.entries(value.mapValue.fields)) {
        result[k] = convertFirestoreValue(v);
      }
    }
    return result;
  }
  return null;
}

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
  campaignId?: string; // NEU: Campaign ID für echte Daten
  testMode: boolean;
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    // Erfasse Request-Metadaten für Logging
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Get auth token für API calls
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    let data: TestEmailRequest | null = null;
    
    try {
      data = await req.json();
      
      // Null-Check für data
      if (!data) {
        return NextResponse.json(
          { error: 'Keine Daten empfangen' },
          { status: 400 }
        );
      }
      
      console.log('🧪 Sending test email to:', data.recipient?.email || 'unknown');

      // SICHERHEIT: Rate Limiting prüfen
      const rateLimitCheck = await rateLimitServiceAPI.checkRateLimit(auth.userId, 'test', 1, token);
      
      if (!rateLimitCheck.allowed) {
        // Logge Rate Limit Hit
        await rateLimitServiceAPI.logEmailActivity({
          userId: auth.userId,
          organizationId: auth.organizationId,
          type: 'test',
          recipientCount: 1,
          recipientEmails: data.recipient?.email ? [data.recipient.email] : [],
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

      // SICHERHEIT: E-Mail-Validierung
      if (!data.recipient?.email || !isValidEmail(data.recipient.email)) {
        return NextResponse.json(
          { error: 'Ungültige E-Mail-Adresse' },
          { status: 400 }
        );
      }

      // SICHERHEIT: Domain-Whitelist für Test-Umgebung
      if (ALLOWED_TEST_DOMAINS && process.env.NODE_ENV !== 'production') {
        const emailDomain = data.recipient.email.split('@')[1];
        const isAllowedDomain = ALLOWED_TEST_DOMAINS.some(domain => 
          emailDomain.endsWith(domain.trim())
        );
        
        if (!isAllowedDomain) {
          await rateLimitServiceAPI.logEmailActivity({
            userId: auth.userId,
            organizationId: auth.organizationId,
            type: 'test',
            recipientCount: 1,
            recipientEmails: [data.recipient.email],
            status: 'failed',
            errorMessage: 'E-Mail-Domain nicht erlaubt in Test-Umgebung',
            ip,
            userAgent
          }, token);

          return NextResponse.json(
            { 
              error: `Test-E-Mails können nur an folgende Domains gesendet werden: ${ALLOWED_TEST_DOMAINS.join(', ')}` 
            },
            { status: 403 }
          );
        }
      }

      // SICHERHEIT: Maximale Anzahl Test-Empfänger (falls mehrere übergeben werden)
      const recipientValidation = rateLimitServiceAPI.validateRecipientCount(1, 'test');
      if (!recipientValidation.valid) {
        return NextResponse.json(
          { 
            error: recipientValidation.reason || `Maximale Anzahl Test-Empfänger überschritten` 
          },
          { status: 400 }
        );
      }

      // Absender-Konfiguration
      const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
      const fromName = process.env.SENDGRID_FROM_NAME!;

      if (!fromEmail || !fromName) {
        throw new Error('SendGrid configuration missing');
      }

      // NEU: Lade echte Kampagnen-Daten wenn campaignId vorhanden
      let campaign: PRCampaign | null = null;
      let mediaShareUrl: string | undefined;
      
      if (data.campaignId) {
        console.log('📄 Loading campaign data for test email:', data.campaignId);
        
        try {
          // Lade Campaign über Firestore REST API
          const campaignDoc = await firestoreRequest(
            `pr_campaigns/${data.campaignId}`,
            'GET',
            undefined,
            token
          );
          
          if (campaignDoc.fields) {
            campaign = convertFirestoreDocument(campaignDoc);
            if (campaign) {
              campaign.id = data.campaignId;
              
              // Verwende die echte Pressemitteilung
              if (campaign.contentHtml) {
                data.campaignEmail.pressReleaseHtml = campaign.contentHtml;
              }
              
              // Verwende die Media Share URL falls vorhanden
              mediaShareUrl = campaign.assetShareUrl;
              
              console.log('✅ Campaign data loaded, using real content');
              console.log('📎 Media share URL:', mediaShareUrl || 'none');
            }
          }
        } catch (error) {
          console.error('⚠️ Could not load campaign data:', error);
          // Fortfahren ohne Campaign-Daten
        }
      }

      // Variablen für E-Mail vorbereiten
      const variables = emailComposerService.prepareVariables(
        data.recipient,
        data.senderInfo,
        { 
          title: campaign?.title || 'Test-Kampagne', 
          clientName: campaign?.clientName || auth.organizationId 
        },
        mediaShareUrl // NEU: Media Share URL übergeben
      );

      // HTML und Text Content generieren
      const htmlContent = buildTestEmailHtml(
        data.campaignEmail, 
        variables,
        data.testMode,
        mediaShareUrl, // NEU: Media Share URL übergeben
        campaign // NEU: Campaign für Anhang-Info
      );
      
      const textContent = buildTestEmailText(
        data.campaignEmail, 
        variables,
        data.testMode,
        mediaShareUrl // NEU: Media Share URL übergeben
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
          'X-Organization-Id': auth.organizationId,
          'X-Campaign-Id': data.campaignId || ''
        }
      };

      const [response] = await sgMail.send(msg);
      
      // SICHERHEIT: Erfolgreiche Aktion protokollieren
      await rateLimitServiceAPI.recordAction(auth.userId, 'test', 1, {
        campaignId: data.campaignId,
        recipientEmail: data.recipient.email
      }, token);

      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'test',
        campaignId: data.campaignId,
        campaignTitle: campaign?.title,
        recipientCount: 1,
        recipientEmails: [data.recipient.email],
        status: 'success',
        ip,
        userAgent
      }, token);
      
      console.log('✅ Test email sent successfully');

      return NextResponse.json({
        success: true,
        messageId: response.headers['x-message-id'] || '',
        preview: {
          html: htmlContent,
          text: textContent,
          subject: testSubject
        },
        rateLimit: {
          remaining: rateLimitCheck.remaining - 1,
          resetAt: rateLimitCheck.resetAt
        }
      });

    } catch (error: any) {
      console.error('❌ Test email error:', error);
      
      // SICHERHEIT: Fehler protokollieren
      await rateLimitServiceAPI.logEmailActivity({
        userId: auth.userId,
        organizationId: auth.organizationId,
        type: 'test',
        campaignId: data?.campaignId,
        recipientCount: 1,
        recipientEmails: data?.recipient ? [data.recipient.email] : [],
        status: 'failed',
        errorMessage: error.message || 'Unbekannter Fehler',
        ip,
        userAgent
      }, token);
      
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
  isTest: boolean,
  mediaShareUrl?: string,
  campaign?: PRCampaign | null
): string {
  const testBanner = isTest ? `
    <div style="background: #ff6b6b; color: white; padding: 10px; text-align: center; font-weight: bold;">
      🧪 TEST-EMAIL - Dies ist keine echte Kampagnen-Email
    </div>` : '';

  // NEU: Media Button wenn Share URL vorhanden
  const mediaButtonHtml = mediaShareUrl ? `
    <div style="text-align: center; margin: 30px 0;">
        <a href="${mediaShareUrl}" 
           style="display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            📎 Medien ansehen
        </a>
    </div>` : '';

  // NEU: Anhang-Information
  let attachmentInfo = '';
  if (campaign?.attachedAssets && campaign.attachedAssets.length > 0) {
    const attachmentCount = campaign.attachedAssets.length;
    attachmentInfo = `
    <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #e9ecef;">
        <p style="margin: 0; font-size: 14px; color: #6c757d;">
            <strong>📎 Anhänge:</strong> Diese E-Mail enthält ${attachmentCount} ${attachmentCount === 1 ? 'Anhang' : 'Anhänge'}
        </p>
    </div>`;
  }

  // Verwende prepareHtmlForEmail für bessere E-Mail-Kompatibilität
  const formattedIntroduction = emailComposerService.prepareHtmlForEmail(
    emailComposerService.replaceVariables(email.introduction, variables)
  );
  
  const formattedPressRelease = emailComposerService.prepareHtmlForEmail(
    emailComposerService.replaceVariables(email.pressReleaseHtml, variables)
  );

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
        .press-release h1, .press-release h2, .press-release h3 {
            color: #333;
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
            <div class="introduction">
                ${formattedIntroduction}
            </div>
            
            <div class="press-release">
                ${formattedPressRelease}
            </div>
            
            ${attachmentInfo}
            ${mediaButtonHtml}
            
            <div class="signature">
                ${emailComposerService.replaceVariables(email.signature, variables)}
            </div>
        </div>
        
        <div class="footer">
            <p>Diese TEST-E-Mail wurde über das SKAMP PR-Tool versendet.</p>
            ${campaign ? `<p style="font-size: 11px; color: #adb5bd;">Campaign: ${campaign.title}</p>` : ''}
        </div>
    </div>
</body>
</html>`;
}

function buildTestEmailText(
  email: TestEmailRequest['campaignEmail'], 
  variables: any,
  isTest: boolean,
  mediaShareUrl?: string
): string {
  const testHeader = isTest ? '🧪 TEST-EMAIL - Dies ist keine echte Kampagnen-Email\n\n' : '';
  const mediaText = mediaShareUrl ? `\n\n📎 Medien ansehen: ${mediaShareUrl}\n` : '';
  
  // Extrahiere nur die Einleitung aus dem HTML (ohne Greeting und Signature)
  const introText = stripHtml(emailComposerService.replaceVariables(email.introduction, variables));
  
  return `${testHeader}${introText}

--- PRESSEMITTEILUNG ---
${stripHtml(emailComposerService.replaceVariables(email.pressReleaseHtml, variables))}
--- ENDE PRESSEMITTEILUNG ---
${mediaText}
${emailComposerService.replaceVariables(email.signature, variables)}

---
Diese TEST-E-Mail wurde über das SKAMP PR-Tool versendet.
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