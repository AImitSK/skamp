// src/lib/email/auto-reporting-email-templates.ts

/**
 * E-Mail Templates für Auto-Reporting
 *
 * Basiert auf dem Layout-System aus approval-email-templates.ts
 * Nutzt das gleiche Branding-System für konsistente E-Mails
 */

import { EmailBrandingSettings, loadBrandingForOrganization } from './approval-email-templates';

// ========================================
// INTERFACES
// ========================================

export interface AutoReportEmailData {
  recipientName: string;
  recipientEmail: string;
  campaignName: string;
  reportPeriod: string; // z.B. "25.11.2024 - 01.12.2024"
  frequency: 'weekly' | 'monthly';
  // Branding
  brandingSettings?: EmailBrandingSettings;
  agencyName?: string;
  agencyLogoUrl?: string;
}

// ========================================
// LAYOUT HELPERS (kopiert aus approval-email-templates.ts)
// ========================================

function generateEmailHeader(data: AutoReportEmailData): string {
  const hasCustomBranding = data.brandingSettings?.logoUrl || data.agencyLogoUrl ||
    data.brandingSettings?.companyName || data.agencyName;

  if (hasCustomBranding) {
    const logoUrl = data.brandingSettings?.logoUrl || data.agencyLogoUrl;
    const companyName = data.brandingSettings?.companyName || data.agencyName || 'CeleroPress';

    if (logoUrl) {
      return `
        <div class="header" style="background-color: transparent; color: black; padding: 20px; text-align: center;">
          <img src="${logoUrl}" alt="${companyName}" style="max-height: 50px; margin-bottom: 10px;">
        </div>`;
    } else {
      return `
        <div class="header" style="background-color: transparent; color: black; padding: 20px; text-align: center;">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: black;">${companyName}</div>
        </div>`;
    }
  } else {
    return `
      <div class="header" style="background-color: transparent; color: black; padding: 20px; text-align: center;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: black;">CeleroPress</div>
      </div>`;
  }
}

function generateEmailFooter(data: AutoReportEmailData): string {
  const hasCustomBranding = data.brandingSettings || data.agencyName;

  if (hasCustomBranding) {
    const branding = data.brandingSettings;
    const companyName = branding?.companyName || data.agencyName;
    const logoUrl = branding?.emailLogoUrl || branding?.logoUrl || data.agencyLogoUrl;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${companyName}" class="logo" style="max-width: 250px; max-height: 100px; display: block; margin-bottom: 15px; object-fit: contain;"><br>`
      : '';

    const companyNameHtml = companyName
      ? `<strong>${companyName}</strong><br>`
      : '';

    let addressHtml = '';
    if (branding?.address) {
      if (branding.address.street) addressHtml += `${branding.address.street}<br>`;
      if (branding.address.postalCode || branding.address.city) {
        addressHtml += `${branding.address.postalCode || ''} ${branding.address.city || ''}`.trim() + '<br>';
      }
    }

    const separatorHtml = (branding?.phone || branding?.email || branding?.website)
      ? '---------<br>'
      : '';

    let contactHtml = '';
    if (branding?.phone) contactHtml += `Fon.: ${branding.phone}<br>`;
    if (branding?.email) contactHtml += `Email: ${branding.email}<br>`;
    if (branding?.website) {
      const cleanWebsite = branding.website.replace(/^https?:\/\/(www\.)?/, '');
      contactHtml += `Web: <a href="${branding.website}" style="color: #007bff; text-decoration: none;">${cleanWebsite}</a>`;
    }

    return `
      <div class="footer">
        ${logoHtml}
        ${companyNameHtml}
        ${addressHtml}
        ${separatorHtml}
        ${contactHtml}
      </div>`;
  } else {
    return `
      <div class="footer">
        <p style="margin: 0;">Bereitgestellt über CeleroPress</p>
      </div>`;
  }
}

function getBaseEmailStyles(): string {
  return `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    .content { padding: 0; }
    .info-box { border-left: 4px solid #007bff; padding-left: 15px; margin: 20px 0; background-color: #f8f9fa; padding: 15px; }
    .report-details { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 0; border-top: none; font-size: 14px; line-height: 1.4; }
    .footer .logo { max-width: 250px; max-height: 100px; display: block; margin-bottom: 15px; object-fit: contain; }
    a { color: #007bff; text-decoration: none; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
    @media only screen and (max-width: 600px) {
      body { padding: 10px !important; }
    }
  `;
}

// ========================================
// TEMPLATES
// ========================================

/**
 * Template für den automatischen Report-Versand
 */
export function getAutoReportEmailTemplate(data: AutoReportEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const frequencyLabel = data.frequency === 'weekly' ? 'Wöchentlicher' : 'Monatlicher';
  const subject = `${frequencyLabel} Monitoring-Report: ${data.campaignName}`;

  const headerHtml = generateEmailHeader(data);
  const footerHtml = generateEmailFooter(data);
  const baseStyles = getBaseEmailStyles();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    ${baseStyles}
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}

    <div class="content">
      <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #333;">
        ${frequencyLabel} Monitoring-Report
      </h1>

      <p>Hallo ${data.recipientName},</p>

      <p>im Anhang finden Sie den aktuellen Monitoring-Report für die Kampagne <strong>"${data.campaignName}"</strong>.</p>

      <div class="info-box">
        <strong>Berichtszeitraum:</strong> ${data.reportPeriod}<br>
        <strong>Kampagne:</strong> ${data.campaignName}<br>
        <strong>Frequenz:</strong> ${frequencyLabel}
      </div>

      <p><strong>Der Report enthält:</strong></p>
      <ul>
        <li>Medienresonanz und Clippings</li>
        <li>E-Mail-Performance-Metriken</li>
        <li>Reichweiten-Analyse</li>
      </ul>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Den vollständigen Report finden Sie im PDF-Anhang dieser E-Mail.
      </p>
    </div>

    ${footerHtml}
  </div>
</body>
</html>
  `;

  const text = `
${subject}

Hallo ${data.recipientName},

im Anhang finden Sie den aktuellen Monitoring-Report für die Kampagne "${data.campaignName}".

BERICHTSZEITRAUM: ${data.reportPeriod}
KAMPAGNE: ${data.campaignName}
FREQUENZ: ${frequencyLabel}

Der Report enthält:
- Medienresonanz und Clippings
- E-Mail-Performance-Metriken
- Reichweiten-Analyse

Den vollständigen Report finden Sie im PDF-Anhang dieser E-Mail.

---
Diese E-Mail wurde automatisch generiert.
${data.agencyName ? `© ${new Date().getFullYear()} ${data.agencyName}. Alle Rechte vorbehalten.` : ''}
  `.trim();

  return { subject, html, text };
}

/**
 * Template mit automatischem Branding-Loading
 */
export async function getAutoReportEmailTemplateWithBranding(
  data: AutoReportEmailData,
  organizationId: string
): Promise<{ subject: string; html: string; text: string }> {
  let enhancedData = { ...data };

  if (!data.brandingSettings) {
    const brandingSettings = await loadBrandingForOrganization(organizationId);
    if (brandingSettings) {
      enhancedData.brandingSettings = brandingSettings;
    }
  }

  return getAutoReportEmailTemplate(enhancedData);
}
