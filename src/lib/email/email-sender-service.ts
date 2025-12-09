/**
 * Email Sender Service
 * Gemeinsame Versand-Logik für Test-Email, Sofort-Versand und Cron-Job
 *
 * Extrahiert aus /api/email/test/route.ts
 */

import { adminDb } from '@/lib/firebase/admin-init';
import sgMail from '@sendgrid/mail';
import { emailComposerService } from '@/lib/email/email-composer-service';
import { PRCampaign, CampaignBoilerplateSection } from '@/types/pr';
import { EmailDraft, ManualRecipient, EmailMetadata, EmailVariables } from '@/types/email-composer';
import { EmailAddress } from '@/types/email-enhanced';
import { ProjectTranslation } from '@/types/translation';
import { LanguageCode, LANGUAGE_NAMES } from '@/types/international';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Types für Translation-PDF
export interface TranslationPDF {
  language: LanguageCode;
  languageName: string;
  pdfBase64: string;
  fileName: string;
}

// PDF-Format Optionen (separate oder kombiniert)
export type PdfFormat = 'separate' | 'combined';

// Types für prepared data
export interface PreparedEmailData {
  campaign: PRCampaign;
  signatureHtml: string;
  pdfBase64: string;
  mediaShareUrl?: string;
  // NEU: Multi-Language PDFs
  translationPDFs?: TranslationPDF[];
  pdfFormat?: PdfFormat;
}

export interface SendResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface Recipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  salutation?: string;
  title?: string;
  companyName?: string;
}

export class EmailSenderService {
  /**
   * Bereitet alle Daten für Email-Versand vor
   * - Lädt Campaign
   * - Lädt HTML-Signatur
   * - Generiert PDF
   * - Holt/erstellt Share-Link
   */
  async prepareEmailData(
    campaignId: string,
    organizationId: string,
    signatureId?: string,
    userId?: string
  ): Promise<PreparedEmailData> {
    // 1. Campaign laden
    const campaign = await this.loadCampaign(campaignId, organizationId);

    // 2. HTML-Signatur laden (falls vorhanden)
    const signatureHtml = await this.loadSignature(signatureId);

    // 3. PDF generieren
    const pdfBase64 = await this.generatePDF(campaign, userId);

    // 4. Media-Share-Link
    const mediaShareUrl = this.getMediaShareUrl(campaign);

    return {
      campaign,
      signatureHtml,
      pdfBase64,
      mediaShareUrl
    };
  }

  /**
   * Lädt Campaign aus Firestore
   */
  private async loadCampaign(
    campaignId: string,
    organizationId: string
  ): Promise<PRCampaign> {
    if (!campaignId) {
      throw new Error('Campaign-ID ist erforderlich');
    }

    const campaignDoc = await adminDb.collection('pr_campaigns').doc(campaignId).get();

    if (!campaignDoc.exists) {
      throw new Error('Campaign nicht gefunden: ' + campaignId);
    }

    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as PRCampaign;

    // Sicherheit: Prüfe organizationId
    if (campaign.organizationId !== organizationId) {
      throw new Error('Zugriff verweigert: Campaign gehört zu anderer Organization');
    }

    return campaign;
  }

  /**
   * Lädt HTML-Signatur aus Firestore
   */
  private async loadSignature(signatureId?: string): Promise<string> {
    if (!signatureId) {
      return '';
    }

    try {
      const signatureDoc = await adminDb.collection('email_signatures').doc(signatureId).get();

      if (!signatureDoc.exists) {
        return '';
      }

      const signatureData = signatureDoc.data();
      if (signatureData && signatureData.content) {
        return signatureData.content;
      }

      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Generiert PDF über /api/generate-pdf
   */
  private async generatePDF(campaign: PRCampaign, userId?: string): Promise<string> {
    const pdfContent = campaign.mainContent || campaign.contentHtml || '';

    if (!pdfContent.trim()) {
      throw new Error('Kein Content für PDF vorhanden');
    }

    // userId: Nutze übergebenen userId oder campaign.userId als Fallback
    const effectiveUserId = userId || campaign.userId;

    if (!effectiveUserId) {
      throw new Error('userId für PDF-Generation nicht verfügbar');
    }

    try {
      // Lade PDF-Template
      const { pdfTemplateService } = await import('@/lib/firebase/pdf-template-service');

      let template;
      if (campaign.templateId) {
        template = await pdfTemplateService.getTemplateById(campaign.templateId);
      }
      if (!template) {
        const systemTemplates = await pdfTemplateService.getSystemTemplates();
        template = systemTemplates[0];
      }

      const templateHtml = await pdfTemplateService.renderTemplateWithStyle(template, {
        title: campaign.title,
        mainContent: campaign.mainContent || '', // WICHTIG: mainContent, nicht contentHtml!
        boilerplateSections: (campaign.boilerplateSections || []) as any,
        keyVisual: campaign.keyVisual,
        clientName: campaign.clientName || 'Client',
        date: new Date().toISOString()
      });

      // PDF-API aufrufen
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const pdfResponse = await fetch(`${baseUrl}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id || 'temp',
          organizationId: campaign.organizationId,
          mainContent: campaign.mainContent, // mainContent!
          clientName: campaign.clientName || 'Client',
          userId: effectiveUserId,
          html: templateHtml,
          fileName: `${campaign.title.replace(/[^a-zA-Z0-9]/g, '_')}_Pressemitteilung.pdf`,
          title: campaign.title,
          options: {
            format: 'A4' as const,
            orientation: 'portrait' as const,
            printBackground: true,
            waitUntil: 'networkidle0' as const,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
          }
        })
      });

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        throw new Error(`PDF-Generation fehlgeschlagen: ${errorText}`);
      }

      const pdfData = await pdfResponse.json();

      if (!pdfData.pdfBase64) {
        throw new Error('PDF-API hat kein pdfBase64 zurückgegeben');
      }

      return pdfData.pdfBase64;
    } catch (error) {
      throw new Error(`PDF-Generation fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generiert PDF für eine Übersetzung
   * Nutzt den übersetzten Content statt dem Original
   */
  public async generatePDFForTranslation(
    campaign: PRCampaign,
    translation: ProjectTranslation,
    userId?: string
  ): Promise<TranslationPDF> {
    const translatedContent = translation.content || '';

    if (!translatedContent.trim()) {
      throw new Error(`Kein Content für Übersetzung (${translation.language}) vorhanden`);
    }

    const effectiveUserId = userId || campaign.userId;

    if (!effectiveUserId) {
      throw new Error('userId für PDF-Generation nicht verfügbar');
    }

    try {
      // Lade PDF-Template
      const { pdfTemplateService } = await import('@/lib/firebase/pdf-template-service');

      let template;
      if (campaign.templateId) {
        template = await pdfTemplateService.getTemplateById(campaign.templateId);
      }
      if (!template) {
        const systemTemplates = await pdfTemplateService.getSystemTemplates();
        template = systemTemplates[0];
      }

      // Titel: Verwende übersetzten Titel oder Original mit Sprach-Suffix
      const translatedTitle = translation.title ||
        `${campaign.title} (${LANGUAGE_NAMES[translation.language] || translation.language})`;

      // Übersetzte Boilerplates für PDF aufbereiten
      let boilerplatesForPdf: Array<{
        id?: string;
        customTitle?: string;
        content: string;
        type?: 'lead' | 'main' | 'quote' | 'contact';
      }> = [];

      if (translation.translatedBoilerplates && translation.translatedBoilerplates.length > 0) {
        // Verwende übersetzte Boilerplates
        boilerplatesForPdf = translation.translatedBoilerplates.map(tb => {
          // Finde Original-Boilerplate für zusätzliche Metadaten
          const originalSection = (campaign.boilerplateSections || []).find(
            (s: { id?: string }) => s.id === tb.id
          );
          // Mappe type korrekt für TemplateData
          const typeMap: Record<string, 'lead' | 'main' | 'quote' | 'contact' | undefined> = {
            'lead': 'lead',
            'main': 'main',
            'quote': 'quote',
            'contact': 'contact',
            'boilerplate': undefined, // boilerplate wird zu undefined gemappt
          };
          return {
            id: tb.id,
            customTitle: tb.translatedTitle || originalSection?.customTitle,
            content: tb.translatedContent,
            type: typeMap[originalSection?.type || ''] || undefined,
          };
        });
      }

      const templateHtml = await pdfTemplateService.renderTemplateWithStyle(template, {
        title: translatedTitle,
        mainContent: translatedContent, // Übersetzter Content!
        boilerplateSections: boilerplatesForPdf, // Übersetzte Boilerplates
        keyVisual: campaign.keyVisual,
        clientName: campaign.clientName || 'Client',
        date: new Date().toISOString(),
        language: translation.language // Sprache für Template-Labels
      });

      // PDF-API aufrufen
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const fileName = `${campaign.title.replace(/[^a-zA-Z0-9]/g, '_')}_${translation.language.toUpperCase()}.pdf`;

      const pdfResponse = await fetch(`${baseUrl}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id || 'temp',
          organizationId: campaign.organizationId,
          mainContent: translatedContent,
          clientName: campaign.clientName || 'Client',
          userId: effectiveUserId,
          html: templateHtml,
          fileName,
          title: translatedTitle,
          options: {
            format: 'A4' as const,
            orientation: 'portrait' as const,
            printBackground: true,
            waitUntil: 'networkidle0' as const,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
          }
        })
      });

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        throw new Error(`PDF-Generation für ${translation.language} fehlgeschlagen: ${errorText}`);
      }

      const pdfData = await pdfResponse.json();

      if (!pdfData.pdfBase64) {
        throw new Error(`PDF-API hat kein pdfBase64 für ${translation.language} zurückgegeben`);
      }

      return {
        language: translation.language,
        languageName: LANGUAGE_NAMES[translation.language] || translation.language,
        pdfBase64: pdfData.pdfBase64,
        fileName
      };
    } catch (error) {
      throw new Error(`PDF-Generation für Übersetzung (${translation.language}) fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Bereitet Email-Daten mit Übersetzungs-PDFs vor
   * Erweiterte Version von prepareEmailData für Multi-Language Support
   */
  async prepareEmailDataWithTranslations(
    campaignId: string,
    organizationId: string,
    projectId: string,
    selectedLanguages: LanguageCode[],
    pdfFormat: PdfFormat = 'separate',
    signatureId?: string,
    userId?: string
  ): Promise<PreparedEmailData> {
    // 1. Basis-Daten vorbereiten (Original-PDF)
    const baseData = await this.prepareEmailData(campaignId, organizationId, signatureId, userId);

    // Wenn keine Übersetzungen ausgewählt, nur Original zurückgeben
    if (!selectedLanguages || selectedLanguages.length === 0) {
      return baseData;
    }

    // 2. Übersetzungen laden
    const translationPDFs: TranslationPDF[] = [];

    for (const language of selectedLanguages) {
      try {
        // Lade Übersetzung aus Firestore
        const translationSnapshot = await adminDb
          .collection(`organizations/${organizationId}/projects/${projectId}/translations`)
          .where('language', '==', language)
          .limit(1)
          .get();

        if (translationSnapshot.empty) {
          console.warn(`⚠️ Keine Übersetzung für Sprache ${language} gefunden`);
          continue;
        }

        const translationDoc = translationSnapshot.docs[0];
        const translation: ProjectTranslation = {
          id: translationDoc.id,
          organizationId,
          projectId,
          ...translationDoc.data()
        } as ProjectTranslation;

        // 3. PDF für Übersetzung generieren
        console.log(`📄 Generiere PDF für Übersetzung: ${language}, translatedBoilerplates: ${translation.translatedBoilerplates?.length || 0}`);
        const translationPDF = await this.generatePDFForTranslation(
          baseData.campaign,
          translation,
          userId
        );
        translationPDFs.push(translationPDF);
        console.log(`✅ PDF für ${language} generiert`);

      } catch (error) {
        console.error(`❌ Fehler beim Generieren des PDFs für ${language}:`, error);
        // Fehler bei einer Übersetzung sollte nicht den gesamten Versand blockieren
      }
    }

    return {
      ...baseData,
      translationPDFs,
      pdfFormat
    };
  }

  /**
   * Holt Media-Share-Link aus Campaign
   */
  private getMediaShareUrl(campaign: PRCampaign): string | undefined {
    if (!campaign.attachedAssets || campaign.attachedAssets.length === 0) {
      return undefined;
    }

    // Verwende vorhandenen Share-Link
    if (campaign.assetShareUrl) {
      return campaign.assetShareUrl;
    }

    // TODO: Hier könnte man einen neuen Share-Link erstellen
    // Für jetzt: undefined wenn keiner vorhanden
    return undefined;
  }

  /**
   * Versendet Emails an alle Empfänger
   */
  async sendToRecipients(
    recipients: EmailDraft['recipients'],
    preparedData: PreparedEmailData,
    emailAddressId: string,
    metadata: EmailMetadata,
    emailBody: string
  ): Promise<SendResult> {
    const result: SendResult = {
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    // 1. Lade EmailAddress (Server-seitig via adminDb)
    console.log(`📧 Lade EmailAddress: ${emailAddressId}`);
    const emailAddressDoc = await adminDb.collection('email_addresses').doc(emailAddressId).get();

    if (!emailAddressDoc.exists) {
      throw new Error(`EmailAddress nicht gefunden: ${emailAddressId}`);
    }

    const emailAddress = { id: emailAddressDoc.id, ...emailAddressDoc.data() } as any;

    if (!emailAddress.isActive || (emailAddress.verificationStatus && emailAddress.verificationStatus !== 'verified')) {
      throw new Error(`EmailAddress ist nicht aktiv oder verifiziert: ${emailAddress.email}`);
    }

    console.log(`✅ EmailAddress geladen: ${emailAddress.email}`);

    // 2. Alle Empfänger laden (Listen + Manuelle)
    console.log('📋 Lade Empfänger...');
    const allRecipients = await this.loadAllRecipients(recipients);
    console.log(`✅ ${allRecipients.length} Empfänger geladen`);

    // 3. Einzeln versenden
    for (const recipient of allRecipients) {
      try {
        console.log(`📤 Sende Email an ${recipient.email}...`);
        await this.sendSingleEmail(
          recipient,
          preparedData,
          emailAddress,
          metadata,
          emailBody
        );

        result.successCount++;
        console.log(`✅ Email an ${recipient.email} gesendet`);
      } catch (error) {
        result.failureCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`${recipient.email}: ${errorMessage}`);
        console.error(`❌ Email an ${recipient.email} fehlgeschlagen:`, errorMessage);
      }
    }

    return result;
  }

  /**
   * Validiert Email-Adresse
   */
  private isValidEmail(email: string): boolean {
    // Einfache Email-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Prüfe auf trailing dot oder andere ungültige Zeichen
    if (email.endsWith('.') || email.startsWith('.')) {
      return false;
    }

    return emailRegex.test(email);
  }

  /**
   * Lädt alle Empfänger (Listen + Manuelle)
   */
  private async loadAllRecipients(
    recipients: EmailDraft['recipients']
  ): Promise<Recipient[]> {
    const allRecipients: Recipient[] = [];

    // 1. Empfänger aus Listen laden
    for (const listId of recipients.listIds) {
      try {
        console.log(`📋 Lade Liste: ${listId}`);

        // Versuche erst in distribution_lists (Master Listen)
        let listDoc = await adminDb.collection('distribution_lists').doc(listId).get();
        let listData = listDoc.exists ? listDoc.data() : null;

        // Falls nicht gefunden, versuche in project_distribution_lists (Custom Listen)
        if (!listDoc.exists) {
          console.log(`🔍 Nicht in distribution_lists gefunden, versuche project_distribution_lists...`);
          listDoc = await adminDb.collection('project_distribution_lists').doc(listId).get();
          listData = listDoc.exists ? listDoc.data() : null;
        }

        if (!listData) {
          console.warn(`⚠️ Liste ${listId} nicht gefunden in beiden Collections`);
          continue;
        }

        console.log(`✅ Liste ${listId} gefunden, Typ: ${listData.type || 'master'}`);

        // Master Listen haben ein "contacts" Array mit vollständigen Objekten
        if (listData.contacts && Array.isArray(listData.contacts)) {
          console.log(`📧 Füge ${listData.contacts.length} Kontakte aus contacts-Array hinzu`);
          allRecipients.push(...listData.contacts);
        }
        // Custom Listen haben ein "contactIds" Array - müssen wir laden
        else if (listData.contactIds && Array.isArray(listData.contactIds)) {
          console.log(`🔍 Lade ${listData.contactIds.length} Kontakte via contactIds...`);
          for (const contactId of listData.contactIds) {
            try {
              const contactDoc = await adminDb.collection('contacts_enhanced').doc(contactId).get();
              if (contactDoc.exists) {
                const contactData = contactDoc.data();
                // Konvertiere ContactEnhanced zu Recipient Format
                const primaryEmail = contactData?.emails?.find((e: any) => e.isPrimary)?.email ||
                                   contactData?.emails?.[0]?.email;

                if (primaryEmail) {
                  allRecipients.push({
                    id: contactDoc.id,
                    email: primaryEmail,
                    firstName: contactData?.name?.firstName || '',
                    lastName: contactData?.name?.lastName || '',
                    salutation: contactData?.salutation,
                    title: contactData?.title,
                    companyName: contactData?.companyName
                  });
                }
              }
            } catch (contactError) {
              console.error(`❌ Fehler beim Laden von Kontakt ${contactId}:`, contactError);
            }
          }
        } else {
          console.warn(`⚠️ Liste ${listId} hat weder contacts noch contactIds`);
        }
      } catch (error) {
        console.error(`❌ Fehler beim Laden von Liste ${listId}:`, error);
        // Fehler beim Laden einer Liste - überspringen
      }
    }

    // 2. Manuelle Empfänger hinzufügen
    allRecipients.push(...recipients.manual);

    // 3. Duplikate entfernen (nach Email) + ungültige Emails filtern
    const uniqueRecipients = allRecipients.reduce((acc, recipient) => {
      // Prüfe ob Email gültig ist
      if (!this.isValidEmail(recipient.email)) {
        console.warn(`⚠️ Ungültige Email-Adresse übersprungen: ${recipient.email}`);
        return acc;
      }

      // Prüfe auf Duplikate
      if (!acc.find(r => r.email === recipient.email)) {
        acc.push(recipient);
      }
      return acc;
    }, [] as Recipient[]);

    return uniqueRecipients;
  }

  /**
   * Versendet einzelne Email
   */
  private async sendSingleEmail(
    recipient: Recipient,
    preparedData: PreparedEmailData,
    emailAddress: EmailAddress,
    metadata: EmailMetadata,
    emailBody: string
  ): Promise<void> {
    // Variablen vorbereiten (für Signatur und Personalisierung)
    const variables = emailComposerService.prepareVariables(
      {
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        email: recipient.email,
        companyName: recipient.companyName,
        salutation: recipient.salutation,
        title: recipient.title
      },
      {
        name: emailAddress.displayName || emailAddress.email,
        email: emailAddress.email,
        company: typeof emailAddress.domain === 'string' ? emailAddress.domain : emailAddress.domain?.name || '',
        title: undefined,
        phone: undefined
      },
      preparedData.campaign
    );

    // Subject mit Variablen
    const personalizedSubject = emailComposerService.replaceVariables(
      metadata.subject,
      variables
    );

    // Email-HTML bauen
    const emailHtml = this.buildEmailHtml(
      preparedData,
      variables,
      metadata,
      emailBody,
      false // isTest = false
    );

    // FROM: Verifizierte EmailAddress
    const senderEmail = emailAddress.email;
    const senderName = emailAddress.displayName || (typeof emailAddress.domain === 'string' ? emailAddress.domain : emailAddress.domain?.name) || undefined;

    // REPLY-TO: Generiere Reply-To Adresse via replyToGeneratorService
    const { replyToGeneratorService } = await import('./reply-to-generator-service');
    const replyToAddress = await replyToGeneratorService.generateReplyTo(
      preparedData.campaign.projectId,
      emailAddress,
      metadata.useSystemInbox !== false // Default: true
    );

    console.log('🔍 Sender-Info:', {
      from: senderEmail,
      fromName: senderName,
      replyTo: replyToAddress,
      useSystemInbox: metadata.useSystemInbox !== false
    });

    // Attachments vorbereiten: Original-PDF + Übersetzungs-PDFs
    const attachments: Array<{
      content: string;
      filename: string;
      type: string;
      disposition: string;
    }> = [
      {
        content: preparedData.pdfBase64,
        filename: `${preparedData.campaign.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      }
    ];

    // Übersetzungs-PDFs hinzufügen (wenn vorhanden und pdfFormat = 'separate')
    if (preparedData.translationPDFs && preparedData.translationPDFs.length > 0) {
      if (preparedData.pdfFormat === 'separate') {
        // Separate PDFs: Jede Übersetzung als eigenes Attachment
        for (const translationPDF of preparedData.translationPDFs) {
          attachments.push({
            content: translationPDF.pdfBase64,
            filename: translationPDF.fileName,
            type: 'application/pdf',
            disposition: 'attachment'
          });
        }
        console.log(`📎 ${preparedData.translationPDFs.length} Übersetzungs-PDFs als separate Attachments hinzugefügt`);
      }
      // TODO: pdfFormat === 'combined' würde hier ein kombiniertes PDF erstellen
      // Das erfordert PDF-Merge-Funktionalität (z.B. pdf-lib)
    }

    // SendGrid Mail Objekt
    const msg = {
      to: recipient.email,
      from: {
        email: senderEmail,
        name: senderName || undefined
      },
      replyTo: replyToAddress, // ✅ Reply-To hinzugefügt
      subject: personalizedSubject,
      html: emailHtml,
      attachments
    } as any;

    // Senden via SendGrid
    const sendResult = await sgMail.send(msg);

    // Email-Tracking: Erstelle email_campaign_send Dokument für SendGrid-Webhook
    try {
      const messageId = sendResult[0]?.headers?.['x-message-id'] || undefined;
      await adminDb.collection('email_campaign_sends').add({
        campaignId: preparedData.campaign.id,
        organizationId: preparedData.campaign.organizationId,
        recipientEmail: recipient.email,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        status: 'sent',
        messageId: messageId,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Email-Tracking-Dokument erstellt für ${recipient.email}`);
    } catch (trackingError) {
      console.error('⚠️ Fehler beim Erstellen des Tracking-Dokuments:', trackingError);
      // Nicht blockierend - Email wurde bereits versendet
    }
  }

  /**
   * Erstellt Email-HTML
   */
  private buildEmailHtml(
    preparedData: PreparedEmailData,
    variables: EmailVariables,
    metadata: EmailMetadata,
    emailBody: string,
    isTest: boolean
  ): string {
    // TEST-Banner (nur für Test-Emails)
    const testBanner = isTest ? `
      <div style="background: #ff6b6b; color: white; padding: 10px; text-align: center; font-weight: bold;">
        TEST-EMAIL - Dies ist keine echte Kampagnen-Email
      </div>` : '';

    // Media-Link Box (nur wenn vorhanden)
    const mediaLinkHtml = preparedData.mediaShareUrl ? `
      <div style="margin: 30px 0 20px 0; padding: 15px; background-color: #f0f7ff; border-left: 4px solid #005fab; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">
          <strong style="color: #005fab;">Medien-Anhänge:</strong><br>
          <a href="${preparedData.mediaShareUrl}" style="color: #005fab; text-decoration: underline; font-weight: 500;">Hier können Sie die Medien-Dateien zu dieser Pressemitteilung herunterladen</a>
        </p>
      </div>` : '';

    // Email-Body mit Variablen (aus Draft, nicht aus Campaign!)
    const formattedIntroduction = emailComposerService.replaceVariables(
      emailBody || '',
      variables
    );

    // Signatur-Hierarchie: HTML-Signatur > Sender-Daten-Fallback
    let formattedSignature = '';
    if (preparedData.signatureHtml) {
      // HTML-Signatur mit Variablen
      formattedSignature = emailComposerService.replaceVariables(
        preparedData.signatureHtml,
        variables
      );
    } else {
      // Fallback: Sender-Daten als Text
      formattedSignature = [
        variables.sender.name,
        variables.sender.title,
        variables.sender.company,
        variables.sender.phone,
        variables.sender.email
      ].filter(Boolean).join('<br>');
    }

    // Komplettes Email-HTML
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .signature { margin-top: 20px; }
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
}

// Singleton-Instanz
export const emailSenderService = new EmailSenderService();
