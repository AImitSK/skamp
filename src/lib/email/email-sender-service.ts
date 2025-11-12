/**
 * Email Sender Service
 * Gemeinsame Versand-Logik für Test-Email, Sofort-Versand und Cron-Job
 *
 * Extrahiert aus /api/email/test/route.ts
 */

import { adminDb } from '@/lib/firebase/admin-init';
import sgMail from '@sendgrid/mail';
import { emailComposerService } from '@/lib/email/email-composer-service';
import { PRCampaign } from '@/types/pr';
import { EmailDraft, ManualRecipient, SenderInfo, EmailMetadata, EmailVariables } from '@/types/email-composer';

// SendGrid konfigurieren
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Types für prepared data
export interface PreparedEmailData {
  campaign: PRCampaign;
  signatureHtml: string;
  pdfBase64: string;
  mediaShareUrl?: string;
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
    signatureId?: string
  ): Promise<PreparedEmailData> {
    // 1. Campaign laden
    const campaign = await this.loadCampaign(campaignId, organizationId);

    // 2. HTML-Signatur laden (falls vorhanden)
    const signatureHtml = await this.loadSignature(signatureId);

    // 3. PDF generieren
    const pdfBase64 = await this.generatePDF(campaign);

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
  private async generatePDF(campaign: PRCampaign): Promise<string> {
    const pdfContent = campaign.mainContent || campaign.contentHtml || '';

    if (!pdfContent.trim()) {
      throw new Error('Kein Content für PDF vorhanden');
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
        mainContent: campaign.mainContent, // WICHTIG: mainContent, nicht contentHtml!
        boilerplateSections: campaign.boilerplateSections || [],
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
          userId: campaign.createdBy,
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
    sender: SenderInfo,
    metadata: EmailMetadata
  ): Promise<SendResult> {
    const result: SendResult = {
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    // Alle Empfänger laden (Listen + Manuelle)
    const allRecipients = await this.loadAllRecipients(recipients);

    // Einzeln versenden
    for (const recipient of allRecipients) {
      try {
        await this.sendSingleEmail(
          recipient,
          preparedData,
          sender,
          metadata
        );

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`${recipient.email}: ${errorMessage}`);
      }
    }

    return result;
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
        const listDoc = await adminDb.collection('distribution_lists').doc(listId).get();

        if (!listDoc.exists) {
          continue;
        }

        const listData = listDoc.data();
        if (listData && listData.contacts && Array.isArray(listData.contacts)) {
          allRecipients.push(...listData.contacts);
        }
      } catch (error) {
        // Fehler beim Laden einer Liste - überspringen
      }
    }

    // 2. Manuelle Empfänger hinzufügen
    allRecipients.push(...recipients.manual);

    // 3. Duplikate entfernen (nach Email)
    const uniqueRecipients = allRecipients.reduce((acc, recipient) => {
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
    sender: SenderInfo,
    metadata: EmailMetadata
  ): Promise<void> {
    // Variablen vorbereiten
    const variables = emailComposerService.prepareVariables(
      {
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        email: recipient.email,
        companyName: recipient.companyName,
        salutation: recipient.salutation,
        title: recipient.title
      },
      sender,
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
      false // isTest = false
    );

    // SendGrid Mail Objekt
    const msg = {
      to: recipient.email,
      from: {
        email: sender.contactData?.email || process.env.SENDGRID_FROM_EMAIL!,
        name: sender.contactData?.companyName || process.env.SENDGRID_FROM_NAME!
      },
      subject: personalizedSubject,
      html: emailHtml,
      attachments: [
        {
          content: preparedData.pdfBase64,
          filename: `${preparedData.campaign.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    // Senden via SendGrid
    await sgMail.send(msg);
  }

  /**
   * Erstellt Email-HTML
   */
  private buildEmailHtml(
    preparedData: PreparedEmailData,
    variables: EmailVariables,
    metadata: EmailMetadata,
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

    // Einleitung mit Variablen
    const formattedIntroduction = emailComposerService.replaceVariables(
      preparedData.campaign.mainContent || '',
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
