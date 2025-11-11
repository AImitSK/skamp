// src/lib/email/approval-email-templates.ts

// ========== BRANDING & LAYOUT SYSTEM ==========

/**
 * Branding-Konfiguration basierend auf Freigabe-Seite Layout-System
 * Folgt der gleichen Logik wie src/app/freigabe/[shareId]/page.tsx
 */
export interface EmailBrandingSettings {
  companyName?: string;
  logoUrl?: string;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  showCopyright?: boolean;
}

export interface ApprovalEmailData {
  recipientName: string;
  recipientEmail: string;
  campaignTitle: string;
  clientName: string;
  approvalUrl: string;
  message?: string;
  agencyName?: string;
  agencyLogoUrl?: string;
  // NEU: Erweiterte Branding-Unterstützung
  brandingSettings?: EmailBrandingSettings;
}

// ========== LAYOUT-FUNKTIONEN ==========

/**
 * Generiert Header-HTML mit Logo oder Firmenname-Fallback
 * Folgt der gleichen Logik wie die Freigabe-Seite (Zeile 752-766)
 */
function generateEmailHeader(data: ApprovalEmailData, headerColor: string = 'transparent'): string {
  // Prüfe auf jede Art von Branding-Information, nicht nur Logo
  const hasCustomBranding = data.brandingSettings?.logoUrl || data.agencyLogoUrl || 
                           data.brandingSettings?.companyName || data.agencyName;
  
  if (hasCustomBranding) {
    const logoUrl = data.brandingSettings?.logoUrl || data.agencyLogoUrl;
    const companyName = data.brandingSettings?.companyName || data.agencyName || 'CeleroPress';
    
    if (logoUrl) {
      // Mit Logo
      return `
        <div class="header" style="background-color: transparent; color: black; padding: 20px; text-align: center;">
          <img src="${logoUrl}" alt="${companyName}" style="max-height: 50px; margin-bottom: 10px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: black;">`;
    } else {
      // Ohne Logo, aber mit Firmenname
      return `
        <div class="header" style="background-color: transparent; color: black; padding: 20px; text-align: center;">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: black;">${companyName}</div>
          <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: black;">`;
    }
  } else {
    // Echte Fallback-Situation: Keine Branding-Daten vorhanden
    return `
      <div class="header" style="background-color: transparent; color: black; padding: 20px; text-align: center;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: black;">CeleroPress</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: black;">`;
  }
}

/**
 * Generiert Footer-HTML mit Branding (Logo + Adresse, linksbündig ohne Icons)
 */
function generateEmailFooter(data: ApprovalEmailData): string {
  const hasCustomBranding = data.brandingSettings || data.agencyName;

  if (hasCustomBranding) {
    const branding = data.brandingSettings;
    const companyName = branding?.companyName || data.agencyName;
    // Nutze Email-optimierte Logo-Version (max 250x100px), fallback auf Original
    const logoUrl = branding?.emailLogoUrl || branding?.logoUrl || data.agencyLogoUrl;

    // Logo (falls vorhanden) - mit Zeilenumbruch danach!
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${companyName}" class="logo" style="max-width: 250px; max-height: 100px; display: block; margin-bottom: 15px; object-fit: contain;"><br>`
      : '';

    // Firmenname (immer anzeigen)
    const companyNameHtml = companyName
      ? `<strong>${companyName}</strong><br>`
      : '';

    // Adresse
    let addressHtml = '';
    if (branding?.address) {
      if (branding.address.street) addressHtml += `${branding.address.street}<br>`;
      if (branding.address.postalCode || branding.address.city) {
        addressHtml += `${branding.address.postalCode || ''} ${branding.address.city || ''}`.trim() + '<br>';
      }
    }

    // Trennlinie vor Kontaktdaten (ohne Leerzeilen!)
    const separatorHtml = (branding?.phone || branding?.email || branding?.website)
      ? '---------<br>'
      : '';

    // Kontaktdaten
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
    // Fallback: CeleroPress
    return `
      <div class="footer">
        <p style="margin: 0;">Bereitgestellt über CeleroPress</p>
      </div>`;
  }
}

/**
 * Basis-CSS-Styles für alle E-Mail-Templates
 * Minimalistisches Design ohne Hintergrundfarben und Buttons
 */
function getBaseEmailStyles(): string {
  return `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    .content { padding: 0; }
    .info-box { border-left: 4px solid #007bff; padding-left: 15px; margin: 20px 0; }
    .admin-message-box { border-left: 4px solid #28a745; padding-left: 15px; margin: 20px 0; }
    .original-message-box { border-left: 4px solid #999; padding-left: 15px; margin: 20px 0; }
    .link-section { margin: 30px 0; font-size: 16px; }
    .footer { margin-top: 40px; padding-top: 0; border-top: none; font-size: 14px; line-height: 1.4; }
    .footer .logo { max-width: 250px; max-height: 100px; display: block; margin-bottom: 15px; object-fit: contain; }
    a { color: #007bff; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      body { padding: 10px !important; }
    }
  `;
}

export function getApprovalRequestEmailTemplate(data: ApprovalEmailData) {
  const subject = `Neue Pressemitteilung zur Freigabe: ${data.campaignTitle}`;

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
    <div class="content">
      <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">
        Neue Pressemitteilung zur Freigabe
      </h1>

      <p>Hallo ${data.recipientName},</p>

      <p>eine neue Pressemitteilung wartet auf Ihre Freigabe:</p>

      <div class="info-box">
        <strong>Pressemitteilung:</strong> "${data.campaignTitle}"<br>
        <strong>Erstellt für:</strong> ${data.clientName}<br>
        <strong>Status:</strong> Wartet auf Ihre Freigabe
      </div>

      ${data.message ? `
        <div class="original-message-box">
          <strong>Nachricht:</strong><br>
          ${data.message}
        </div>
      ` : ''}

      <p>Bitte prüfen Sie die Pressemitteilung und erteilen Sie Ihre Freigabe oder fordern Sie Änderungen an.</p>

      <div class="link-section">
        <strong>Freigabecenter:</strong> <a href="${data.approvalUrl}">${data.approvalUrl}</a>
      </div>
    </div>

    ${footerHtml}
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

Sehr geehrte/r ${data.recipientName},

eine neue Pressemitteilung wartet auf Ihre Freigabe:

${data.campaignTitle}

${data.message ? data.message + '\n\n' : ''}

Bitte prüfen Sie die Pressemitteilung und erteilen Sie Ihre Freigabe oder fordern Sie Änderungen an.

Zur Freigabe: ${data.approvalUrl}

Diese E-Mail wurde automatisch generiert.
${data.agencyName ? `\n© ${new Date().getFullYear()} ${data.agencyName}. Alle Rechte vorbehalten.` : ''}
  `;
  
  return { subject, html, text };
}

export function getApprovalReminderEmailTemplate(data: ApprovalEmailData) {
  const subject = `Erinnerung: Freigabe ausstehend für "${data.campaignTitle}"`;

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
    <div class="content">
      <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">
        Erinnerung: Freigabe ausstehend
      </h1>

      <p>Hallo ${data.recipientName},</p>

      <p>dies ist eine freundliche Erinnerung, dass die folgende Pressemitteilung noch auf Ihre Freigabe wartet:</p>

      <div class="info-box">
        <strong>Pressemitteilung:</strong> "${data.campaignTitle}"<br>
        <strong>Erstellt für:</strong> ${data.clientName}<br>
        <strong>Status:</strong> Wartet auf Ihre Freigabe
      </div>

      <p>Bitte nehmen Sie sich einen Moment Zeit, um die Pressemitteilung zu prüfen.</p>

      <div class="link-section">
        <strong>Freigabecenter:</strong> <a href="${data.approvalUrl}">${data.approvalUrl}</a>
      </div>
    </div>

    ${footerHtml}
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

Sehr geehrte/r ${data.recipientName},

dies ist eine freundliche Erinnerung, dass die folgende Pressemitteilung noch auf Ihre Freigabe wartet:

${data.campaignTitle}

Bitte nehmen Sie sich einen Moment Zeit, um die Pressemitteilung zu prüfen.

Jetzt prüfen: ${data.approvalUrl}

Diese E-Mail wurde automatisch generiert.
  `;
  
  return { subject, html, text };
}

export function getApprovalGrantedEmailTemplate(data: ApprovalEmailData & { approverName: string }) {
  const subject = `Freigabe erteilt: ${data.campaignTitle}`;

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
    <div class="content">
      <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">
        Freigabe erteilt
      </h1>

      <p>Gute Nachrichten!</p>

      <div class="info-box">
        <strong>${data.approverName}</strong> hat die Pressemitteilung <strong>"${data.campaignTitle}"</strong> freigegeben.
      </div>

      <p>Die Pressemitteilung kann nun versendet werden.</p>

      <p>Freigegeben am: ${new Date().toLocaleString('de-DE')}</p>
    </div>

    ${footerHtml}
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

Gute Nachrichten!

${data.approverName} hat die Pressemitteilung "${data.campaignTitle}" freigegeben.

Die Pressemitteilung kann nun versendet werden.

Freigegeben am: ${new Date().toLocaleString('de-DE')}

Diese E-Mail wurde automatisch generiert.
  `;
  
  return { subject, html, text };
}

export function getChangesRequestedEmailTemplate(data: ApprovalEmailData & { feedback: string; reviewerName: string; inlineComments?: any[] }) {
  const subject = `Änderungen angefordert: ${data.campaignTitle}`;

  const footerHtml = generateEmailFooter(data);
  const baseStyles = getBaseEmailStyles();
  
  // Inline-Kommentare für HTML aufbereiten
  const inlineCommentsHtml = data.inlineComments && data.inlineComments.length > 0 ? `
    <div style="margin-top: 20px;">
      <strong>Inline-Kommentare:</strong>
      <div style="margin-top: 10px;">
        ${data.inlineComments.map(comment => `
          <div style="background-color: #f8f9fa; border-left: 3px solid #ff9800; padding: 10px; margin: 5px 0;">
            <em>"${comment.quote}"</em><br>
            <span style="color: #333;">→ ${comment.text}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Inline-Kommentare für Text aufbereiten
  const inlineCommentsText = data.inlineComments && data.inlineComments.length > 0 ? `

Inline-Kommentare:
${data.inlineComments.map(comment => `"${comment.quote}" → ${comment.text}`).join('\n')}
  ` : '';
  
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
    <div class="content">
      <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">
        Änderungen angefordert
      </h1>

      <p><strong>${data.reviewerName}</strong> hat Änderungen zur Pressemitteilung <strong>"${data.campaignTitle}"</strong> angefordert.</p>

      <div class="admin-message-box">
        <strong>Allgemeines Feedback:</strong><br>
        ${data.feedback.replace(/\n/g, '<br>')}
      </div>

      ${inlineCommentsHtml}

      <p>Bitte überarbeiten Sie die Pressemitteilung entsprechend dem Feedback und reichen Sie sie erneut zur Freigabe ein.</p>

      <div class="link-section">
        <strong>Zur Bearbeitung:</strong> <a href="${data.approvalUrl}">${data.approvalUrl}</a>
      </div>

      <p>Angefordert am: ${new Date().toLocaleString('de-DE')}</p>
    </div>

    ${footerHtml}
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

${data.reviewerName} hat Änderungen zur Pressemitteilung "${data.campaignTitle}" angefordert.

Allgemeines Feedback:
${data.feedback}
${inlineCommentsText}

Bitte überarbeiten Sie die Pressemitteilung entsprechend dem Feedback und reichen Sie sie erneut zur Freigabe ein.

Zur Bearbeitung: ${data.approvalUrl}

Angefordert am: ${new Date().toLocaleString('de-DE')}

Diese E-Mail wurde automatisch generiert.
  `;
  
  return { subject, html, text };
}

// ========== ERWEITERTE TEMPLATES FÜR PHASE 4 ==========

/**
 * Template für Status-Update-Benachrichtigungen an interne Teams
 */
export function getApprovalStatusUpdateTemplate(data: ApprovalEmailData & {
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  dashboardUrl: string;
}) {
  const subject = `Status-Update: ${data.campaignTitle}`;
  
  // Verwende das neue Layout-System für Konsistenz
  const headerHtml = generateEmailHeader(data);
  const footerHtml = generateEmailFooter(data);
  const baseStyles = getBaseEmailStyles();
  
  const statusLabels: Record<string, string> = {
    'pending': 'Ausstehend',
    'approved': 'Freigegeben', 
    'rejected': 'Abgelehnt',
    'changes_requested': 'Änderungen angefordert',
    'in_review': 'In Bearbeitung'
  };
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    ${baseStyles}
    .status-update { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
      📋 Status-Update
    </h1>
    </div>
    
    <div class="content">
      <p>Der Status der Kampagne <strong>"${data.campaignTitle}"</strong> hat sich geändert.</p>
      
      <div class="status-update">
        <strong>Status-Änderung:</strong><br>
        ${statusLabels[data.previousStatus] || data.previousStatus} → <strong>${statusLabels[data.newStatus] || data.newStatus}</strong><br>
        <em>Geändert von: ${data.changedBy}</em>
      </div>
      
      <p>Kunde: <strong>${data.clientName}</strong></p>
      
      <div style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">Im Dashboard ansehen</a>
      </div>
      
      <p>Geändert am: ${new Date().toLocaleString('de-DE')}</p>
    </div>
    
    ${footerHtml}
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

Der Status der Kampagne "${data.campaignTitle}" hat sich geändert.

Status-Änderung:
${statusLabels[data.previousStatus] || data.previousStatus} → ${statusLabels[data.newStatus] || data.newStatus}
Geändert von: ${data.changedBy}

Kunde: ${data.clientName}

Im Dashboard ansehen: ${data.dashboardUrl}

Geändert am: ${new Date().toLocaleString('de-DE')}

Diese E-Mail wurde automatisch generiert.
  `;
  
  return { subject, html, text };
}

/**
 * Template für Deadline-Erinnerungen
 */
export function getApprovalDeadlineReminderTemplate(data: ApprovalEmailData & {
  deadline: Date;
  hoursRemaining: number;
}) {
  const subject = `Deadline-Erinnerung: ${data.campaignTitle}`;
  const urgencyLevel = data.hoursRemaining < 24 ? 'urgent' : 'normal';
  
  // Verwende das neue Layout-System für Konsistenz  
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
    .deadline-box { 
      background-color: ${urgencyLevel === 'urgent' ? '#ffebee' : '#fff3cd'}; 
      border-left: 4px solid ${urgencyLevel === 'urgent' ? '#f44336' : '#ff9800'}; 
      padding: 15px; 
      margin: 20px 0; 
    }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
      ⏰ ${urgencyLevel === 'urgent' ? 'DRINGENDE' : ''} Deadline-Erinnerung
    </h1>
    </div>
    
    <div class="content">
      <p>Sehr geehrte/r ${data.recipientName},</p>
      
      <p>die Deadline für die Freigabe der Pressemitteilung <strong>"${data.campaignTitle}"</strong> rückt näher.</p>
      
      <div class="deadline-box">
        <strong>Deadline:</strong> ${data.deadline.toLocaleString('de-DE')}<br>
        <strong>Verbleibende Zeit:</strong> ${data.hoursRemaining < 1 ? 'Weniger als 1 Stunde' : `${Math.round(data.hoursRemaining)} Stunden`}
      </div>
      
      <p>${urgencyLevel === 'urgent' ? 
        'Bitte überprüfen Sie die Pressemitteilung umgehend und erteilen Sie Ihre Freigabe.' :
        'Bitte nehmen Sie sich Zeit für die Überprüfung der Pressemitteilung.'
      }</p>
      
      <div style="text-align: center;">
        <a href="${data.approvalUrl}" class="button">Jetzt freigeben</a>
      </div>
    </div>
    
    ${footerHtml}
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

Sehr geehrte/r ${data.recipientName},

die Deadline für die Freigabe der Pressemitteilung "${data.campaignTitle}" rückt näher.

Deadline: ${data.deadline.toLocaleString('de-DE')}
Verbleibende Zeit: ${data.hoursRemaining < 1 ? 'Weniger als 1 Stunde' : `${Math.round(data.hoursRemaining)} Stunden`}

${urgencyLevel === 'urgent' ? 
  'Bitte überprüfen Sie die Pressemitteilung umgehend und erteilen Sie Ihre Freigabe.' :
  'Bitte nehmen Sie sich Zeit für die Überprüfung der Pressemitteilung.'
}

Jetzt freigeben: ${data.approvalUrl}

Diese E-Mail wurde automatisch generiert.
  `;
  
  return { subject, html, text };
}

/**
 * Template für Re-Request E-Mails (Überarbeitete Pressemeldung zur erneuten Freigabe)
 * NEU: Migriert aus approval-service.ts für zentrale Template-Verwaltung
 */
export function getApprovalReRequestEmailTemplate(data: ApprovalEmailData & {
  adminName?: string;
  adminEmail?: string;
  adminMessage?: string;
}) {
  const subject = `Überarbeitete Pressemeldung zur erneuten Freigabe: ${data.campaignTitle}`;

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
    <div class="content">
      <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">
        Überarbeitete Pressemeldung zur erneuten Freigabe
      </h1>

      <p>Hallo ${data.recipientName},</p>

      <p>Die Pressemeldung wurde von ${data.adminName || data.agencyName || 'Ihrem PR-Team'} überarbeitet und wartet erneut auf Ihre Freigabe:</p>

      <div class="info-box">
        <strong>Pressemeldung:</strong> "${data.campaignTitle}"<br>
        <strong>Erstellt für:</strong> ${data.clientName}<br>
        <strong>Überarbeitet von:</strong> ${data.adminName || data.agencyName || 'PR-Team'} ${data.adminEmail ? `(${data.adminEmail})` : ''}<br>
        <strong>Status:</strong> Überarbeitet - erneute Freigabe erforderlich
      </div>

      ${data.adminMessage ? `
        <div class="admin-message-box">
          <strong>Nachricht vom Admin:</strong><br>
          ${data.adminMessage}
        </div>
      ` : ''}

      <p>Bitte prüfen Sie die überarbeitete Pressemeldung und geben Sie diese erneut frei.</p>

      <div class="link-section">
        <strong>Freigabecenter:</strong> <a href="${data.approvalUrl}">${data.approvalUrl}</a>
      </div>
    </div>

    ${footerHtml}
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

Hallo ${data.recipientName},

die Pressemeldung wurde von ${data.adminName || 'Ihrem PR-Team'} überarbeitet und wartet erneut auf Ihre Freigabe:

Pressemeldung: "${data.campaignTitle}"
Erstellt für: ${data.clientName}
Überarbeitet von: ${data.adminName || 'PR-Team'}${data.adminEmail ? ` (${data.adminEmail})` : ''}
Status: Überarbeitet - erneute Freigabe erforderlich

${data.adminMessage ? `NACHRICHT VOM ADMIN:
${data.adminMessage}

` : ''}${data.message ? `URSPRÜNGLICHE NACHRICHT:
${data.message}

` : ''}Bitte prüfen Sie die überarbeitete Pressemeldung und geben Sie diese erneut frei:
${data.approvalUrl}

Bei Fragen antworten Sie einfach auf diese E-Mail.

Diese E-Mail wurde automatisch von CeleroPress generiert.
${data.agencyName ? `\n© ${new Date().getFullYear()} ${data.agencyName}. Alle Rechte vorbehalten.` : ''}

Beste Grüße,
Ihr CeleroPress Team
  `;
  
  return { subject, html, text };
}

// ========== BRANDING-INTEGRATION HILFSFUNKTIONEN ==========

/**
 * Lädt Branding-Settings für eine Organisation (für zukünftige Integration)
 * TODO: Diese Funktion kann in Zukunft mit dem brandingService verbunden werden
 */
export async function loadBrandingForOrganization(organizationId: string): Promise<EmailBrandingSettings | null> {
  try {
    // Dynamischer Import um Circular Dependencies zu vermeiden
    const { brandingService } = await import('@/lib/firebase/branding-service');
    const brandingSettings = await brandingService.getBrandingSettings(organizationId);
    
    if (!brandingSettings) return null;
    
    // Konvertiere BrandingSettings zu EmailBrandingSettings
    return {
      companyName: brandingSettings.companyName,
      logoUrl: brandingSettings.logoUrl,
      address: brandingSettings.address ? {
        street: brandingSettings.address.street,
        postalCode: brandingSettings.address.postalCode,
        city: brandingSettings.address.city,
      } : undefined,
      phone: brandingSettings.phone,
      email: brandingSettings.email,
      website: brandingSettings.website,
      showCopyright: brandingSettings.showCopyright
    };
  } catch (error) {
    console.warn('Failed to load branding settings:', error);
    return null;
  }
}

/**
 * Erweiterte Template-Funktion mit automatischem Branding-Loading
 * Kann als Drop-in-Replacement für die Standard-Template-Funktionen verwendet werden
 */
export async function getApprovalReRequestEmailTemplateWithBranding(
  data: ApprovalEmailData & { adminName?: string; adminEmail?: string; adminMessage?: string; },
  organizationId?: string
): Promise<{ subject: string; html: string; text: string }> {
  // Lade Branding-Settings falls organizationId vorhanden
  let enhancedData = { ...data };
  
  if (organizationId && !data.brandingSettings) {
    const brandingSettings = await loadBrandingForOrganization(organizationId);
    if (brandingSettings) {
      enhancedData.brandingSettings = brandingSettings;
    }
  }
  
  // Verwende die Standard-Template-Funktion mit erweiterten Daten
  return getApprovalReRequestEmailTemplate(enhancedData);
}