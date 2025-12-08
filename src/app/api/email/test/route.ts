// src/app/api/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgMail from '@sendgrid/mail';
import { emailComposerService } from '@/lib/email/email-composer-service';
import { emailAddressService } from '@/lib/email/email-address-service';
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
    salutation?: string;
    title?: string;
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
  campaignId?: string;
  signatureId?: string; // NEU: Signatur-ID für HTML-Signatur
  // Phase 2 i18n: Ausgewählte Sprachen für PDFs
  projectId?: string;
  selectedLanguages?: {
    original: boolean;
    translations: string[];
  };
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
      console.log('📊 Auth context:', {
        userId: auth.userId,
        organizationId: auth.organizationId
      });

      // NEU: E-Mail-Adresse für Test-Versand holen
      console.log('🔍 Getting email address for test...');
      
      // Verwende Server-Methode für API Routes
      let emailAddress = await emailAddressService.getDefaultForOrganizationServer(auth.organizationId, token);
      
      if (!emailAddress) {
        console.log('⚠️ No default email address found, trying to get any active email...');
        
        // Zusätzlicher Fallback: Versuche irgendeine aktive E-Mail-Adresse zu finden
        try {
          const allEmails = await emailAddressService.getByOrganizationServer(auth.organizationId, auth.userId, token);
          const activeEmail = allEmails.find(e => e.isActive);
          
          if (activeEmail) {
            console.log('✅ Found active email as fallback:', activeEmail.email);
            emailAddress = activeEmail;
            
            // Optional: Setze diese E-Mail als Standard für zukünftige Verwendung
            try {
              await emailAddressService.setAsDefault(activeEmail.id!, auth.organizationId);
              console.log('✅ Set fallback email as default');
            } catch (err) {
              console.warn('Could not set as default:', err);
            }
          }
        } catch (fallbackError) {
          console.error('Fallback search failed:', fallbackError);
        }
      }
      
      if (!emailAddress) {
        console.error('❌ No email addresses found for organization after all attempts');
        
        return NextResponse.json(
          { 
            error: 'Keine E-Mail-Adresse konfiguriert. Bitte richten Sie mindestens eine E-Mail-Adresse in den Einstellungen ein.',
            details: {
              organizationId: auth.organizationId,
              userId: auth.userId,
              hint: 'Gehen Sie zu Einstellungen → E-Mail und fügen Sie eine E-Mail-Adresse hinzu.'
            }
          },
          { status: 400 }
        );
      }

      console.log('✅ Using email address:', emailAddress.email);

      // NEU: Reply-To Adresse generieren (inline, da emailAddressService im Server-Kontext nicht verfügbar)
      const prefix = emailAddress.localPart?.substring(0, 10).replace(/[^a-z0-9]/gi, '') || 'email';
      const shortOrgId = auth.organizationId.substring(0, 8);
      const shortEmailId = emailAddress.id!.substring(0, 8);
      const replyToAddress = `${prefix}-${shortOrgId}-${shortEmailId}@inbox.sk-online-marketing.de`;
      console.log('📧 Generated reply-to address:', replyToAddress);

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

      // Absender-Konfiguration mit E-Mail-Adresse
      const fromEmail = emailAddress.email;
      const fromName = emailAddress.displayName || data.senderInfo.company;

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

              // Verwende Original-Content für Email-Body
              if (campaign.contentHtml) {
                data.campaignEmail.pressReleaseHtml = campaign.contentHtml;
              }

              // Verwende die Media Share URL falls vorhanden
              mediaShareUrl = campaign.assetShareUrl;

              console.log('✅ Campaign data loaded');
              console.log('📎 Media share URL:', mediaShareUrl || 'none');
            }
          }
        } catch (error) {
          console.error('⚠️ Could not load campaign data:', error);
          // Fortfahren ohne Campaign-Daten
        }
      }

      // NEU: Lade HTML-Signatur falls signatureId vorhanden
      let signatureHtml = '';
      console.log('🔍 Signatur-ID prüfen:', data.signatureId);

      if (data.signatureId) {
        try {
          console.log('📝 Lade HTML-Signatur:', data.signatureId);
          // SERVER-SIDE: Verwende Admin SDK direkt
          const { adminDb } = await import('@/lib/firebase/admin-init');
          const signatureDoc = await adminDb.collection('email_signatures').doc(data.signatureId).get();

          if (signatureDoc.exists) {
            const signatureData = signatureDoc.data();
            if (signatureData && signatureData.content) {
              signatureHtml = signatureData.content;
              console.log('✅ HTML-Signatur geladen, Länge:', signatureHtml.length);
            } else {
              console.warn('⚠️ Signatur-Dokument hat kein content-Feld');
            }
          } else {
            console.warn('⚠️ Signatur nicht gefunden:', data.signatureId);
          }
        } catch (error) {
          console.error('❌ Fehler beim Laden der Signatur:', error);
          // Fallback: Verwende Sender-Daten als Text-Signatur
          signatureHtml = '';
        }
      } else {
        console.log('ℹ️ Keine signatureId vorhanden, verwende Sender-Daten');
      }

      // Variablen für E-Mail vorbereiten
      const variables = emailComposerService.prepareVariables(
        data.recipient,
        data.senderInfo,
        {
          title: campaign?.title || 'Test-Kampagne',
          clientName: campaign?.clientName || auth.organizationId
        },
        mediaShareUrl
      );

      // HTML und Text Content generieren
      const htmlContent = buildTestEmailHtml(
        data.campaignEmail,
        variables,
        data.testMode,
        mediaShareUrl,
        campaign,
        replyToAddress, // NEU: Reply-To für Info im Footer
        campaign?.keyVisual, // NEU: Key Visual für Test-E-Mails
        signatureHtml // NEU: HTML-Signatur
      );
      
      const textContent = buildTestEmailText(
        data.campaignEmail, 
        variables,
        data.testMode,
        mediaShareUrl,
        replyToAddress // NEU: Reply-To für Info im Footer
      );
      
      const personalizedSubject = emailComposerService.replaceVariables(
        data.campaignEmail.subject, 
        variables
      );

      // Test-Email Prefix
      const testSubject = `[TEST] ${personalizedSubject}`;

      // Phase 2 i18n: Generiere PDFs für alle ausgewählten Sprachen
      const pdfAttachments: Array<{
        content: string;
        filename: string;
        type: string;
        disposition: string;
      }> = [];

      if (campaign?.mainContent || campaign?.contentHtml) {
        try {
          const { pdfTemplateService } = await import('@/lib/firebase/pdf-template-service');
          const { translationAdminService } = await import('@/lib/firebase-admin/translation-admin-service');

          // Template laden
          let template;
          if (campaign?.templateId) {
            template = await pdfTemplateService.getTemplateById(campaign.templateId);
          }
          if (!template) {
            const systemTemplates = await pdfTemplateService.getSystemTemplates();
            template = systemTemplates[0];
          }

          // Boilerplate-Sections für Original formatieren
          const formattedBoilerplateSections = (campaign?.boilerplateSections || []).map(section => ({
            id: section.id,
            customTitle: section.customTitle,
            content: section.content || '',
            type: section.type === 'boilerplate' ? undefined : section.type as 'lead' | 'contact' | 'main' | 'quote' | undefined,
            boilerplate: section.boilerplateId ? { content: section.content || '' } : undefined,
            contentHtml: section.content
          }));

          // Helper-Funktion für PDF-Generierung
          const generatePdf = async (
            content: string,
            title: string,
            language: string,
            isTranslation: boolean
          ) => {
            const templateHtml = await pdfTemplateService.renderTemplateWithStyle(template, {
              title,
              mainContent: content,
              boilerplateSections: isTranslation ? [] : formattedBoilerplateSections,
              keyVisual: campaign?.keyVisual,
              clientName: campaign?.clientName || 'Test Client',
              date: new Date().toISOString(),
              language
            });

            const languageSuffix = isTranslation ? `_${language.toUpperCase()}` : '';
            const pdfFileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}${languageSuffix}_Pressemitteilung.pdf`;

            const pdfResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-pdf`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                campaignId: campaign?.id || 'temp',
                organizationId: auth.organizationId,
                mainContent: content,
                clientName: campaign?.clientName || 'Test',
                userId: auth.userId,
                html: templateHtml,
                fileName: pdfFileName,
                title,
                options: {
                  format: 'A4' as const,
                  orientation: 'portrait' as const,
                  printBackground: true,
                  waitUntil: 'networkidle0' as const,
                  margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
                }
              })
            });

            if (pdfResponse.ok) {
              const pdfResult = await pdfResponse.json();
              if (pdfResult.success && pdfResult.pdfBase64) {
                return {
                  content: pdfResult.pdfBase64,
                  filename: pdfFileName,
                  type: 'application/pdf',
                  disposition: 'attachment'
                };
              }
            }
            return null;
          };

          // 1. Original-PDF generieren (wenn original: true)
          if (!data.selectedLanguages || data.selectedLanguages.original !== false) {
            console.log('📄 Generiere Original-PDF (DE)...');
            const originalContent = campaign.mainContent || campaign.contentHtml || '';
            const originalPdf = await generatePdf(
              originalContent,
              campaign.title || 'Pressemitteilung',
              'de',
              false
            );
            if (originalPdf) {
              pdfAttachments.push(originalPdf);
              console.log('✅ Original-PDF generiert:', originalPdf.filename);
            }
          }

          // 2. Übersetzungs-PDFs generieren
          if (data.selectedLanguages?.translations && data.selectedLanguages.translations.length > 0 && data.projectId) {
            for (const langCode of data.selectedLanguages.translations) {
              console.log(`📄 Generiere Übersetzungs-PDF (${langCode.toUpperCase()})...`);
              try {
                const translation = await translationAdminService.getByLanguage(
                  auth.organizationId,
                  data.projectId,
                  langCode
                );

                if (translation && translation.content) {
                  const translationPdf = await generatePdf(
                    translation.content,
                    translation.title || `${campaign.title} (${langCode.toUpperCase()})`,
                    langCode,
                    true
                  );
                  if (translationPdf) {
                    pdfAttachments.push(translationPdf);
                    console.log(`✅ Übersetzungs-PDF generiert (${langCode.toUpperCase()}):`, translationPdf.filename);
                  }
                } else {
                  console.warn(`⚠️ Keine Übersetzung gefunden für: ${langCode}`);
                }
              } catch (translationError) {
                console.error(`❌ Fehler beim Laden der Übersetzung ${langCode}:`, translationError);
              }
            }
          }

          console.log(`📎 Insgesamt ${pdfAttachments.length} PDF(s) generiert`);

        } catch (pdfError) {
          console.error('⚠️ PDF-Generierung fehlgeschlagen:', pdfError);
          // Fortfahren ohne PDFs - nicht blockierend
        }
      }

      const msg: any = {
        to: {
          email: data.recipient.email,
          name: data.recipient.name
        },
        from: {
          email: fromEmail,
          name: fromName
        },
        // NEU: Reply-To Header
        reply_to: {
          email: replyToAddress,
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
          'X-Campaign-Id': data.campaignId || '',
          'X-CeleroPress-EmailAddress': emailAddress.id || ''
        }
      };

      // Füge alle PDF-Anhänge hinzu falls vorhanden
      if (pdfAttachments.length > 0) {
        msg.attachments = pdfAttachments;
      }

      const [response] = await sgMail.send(msg);
      
      // SICHERHEIT: Erfolgreiche Aktion protokollieren
      await rateLimitServiceAPI.recordAction(auth.userId, 'test', 1, {
        campaignId: data.campaignId,
        recipientEmail: data.recipient.email,
        emailAddressId: emailAddress.id
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
        emailConfig: {
          from: fromEmail,
          replyTo: replyToAddress,
          emailAddressId: emailAddress.id
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
  campaign?: PRCampaign | null,
  replyToAddress?: string,
  keyVisual?: { url: string; cropData?: any },
  signatureHtml?: string
): string {
  const testBanner = isTest ? `
    <div style="background: #ff6b6b; color: white; padding: 10px; text-align: center; font-weight: bold;">
      TEST-EMAIL - Dies ist keine echte Kampagnen-Email
    </div>` : '';

  // Media Link Box (nur wenn vorhanden)
  const mediaLinkHtml = mediaShareUrl ? `
    <div style="margin: 30px 0 20px 0; padding: 15px; background-color: #f0f7ff; border-left: 4px solid #005fab; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">
            <strong style="color: #005fab;">Medien-Anhänge:</strong><br>
            <a href="${mediaShareUrl}" style="color: #005fab; text-decoration: underline; font-weight: 500;">Hier können Sie die Medien-Dateien zu dieser Pressemitteilung herunterladen</a>
        </p>
    </div>` : '';

  // Verwende prepareHtmlForEmail für bessere E-Mail-Kompatibilität
  // WICHTIG: email.introduction enthält bereits Greeting + Einleitungstext als HTML
  const formattedIntroduction = emailComposerService.prepareHtmlForEmail(
    emailComposerService.replaceVariables(email.introduction, variables)
  );

  // Signatur-Hierarchie: HTML-Signatur > Text-Signatur > Sender-Daten-Fallback
  let formattedSignature = '';
  if (signatureHtml) {
    // 1. Priorität: HTML-Signatur
    formattedSignature = emailComposerService.replaceVariables(signatureHtml, variables);
    console.log('✅ Verwende HTML-Signatur');
  } else if (email.signature) {
    // 2. Priorität: Text-Signatur aus email.signature
    formattedSignature = emailComposerService.replaceVariables(email.signature, variables).replace(/\n/g, '<br>');
    console.log('✅ Verwende Text-Signatur aus email.signature');
  } else {
    // 3. Fallback: Sender-Daten aus variables als einfache Signatur
    formattedSignature = [
      variables.sender.name,
      variables.sender.title,
      variables.sender.company,
      variables.sender.phone,
      variables.sender.email
    ].filter(Boolean).join('<br>');
    console.log('⚠️ Verwende Sender-Daten als Fallback-Signatur');
  }

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
            padding: 20px;
            background-color: #ffffff;
        }
        .content {
            max-width: 600px;
            margin: 0;
            padding-bottom: 10px;
        }
        .email-body {
            margin-bottom: 10px;
        }
        .signature {
            margin-top: 20px;
        }
        p {
            margin: 0 0 1em 0;
        }
        a {
            color: #005fab;
        }
    </style>
</head>
<body>
    ${testBanner}
    <div class="content">
        <div class="email-body">
            ${formattedIntroduction}
        </div>

        ${mediaLinkHtml}

        <div class="signature">
            ${formattedSignature}
        </div>
    </div>
</body>
</html>`;
}

function buildTestEmailText(
  email: TestEmailRequest['campaignEmail'],
  variables: any,
  isTest: boolean,
  mediaShareUrl?: string,
  replyToAddress?: string
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