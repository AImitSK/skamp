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
 * Generiert Footer-HTML mit Branding oder CeleroPress-Fallback  
 * Folgt der gleichen Logik wie die Freigabe-Seite (Zeile 1009-1083)
 */
function generateEmailFooter(data: ApprovalEmailData): string {
  // Prüfe auf jede Art von Branding-Information (nicht nur brandingSettings)
  const hasCustomBranding = data.brandingSettings || data.agencyName;
  
  if (hasCustomBranding) {
    const branding = data.brandingSettings;
    
    // Firmeninfo-Bereiche sammeln
    const companyInfo = [];
    
    // Verwende Branding-Daten oder Agency-Fallbacks
    const companyName = branding?.companyName || data.agencyName;
    if (companyName) {
      companyInfo.push(`<strong>${companyName}</strong>`);
    }
    
    if (branding?.address && (branding.address.street || branding.address.postalCode || branding.address.city)) {
      const addressParts = [
        branding.address.street,
        branding.address.postalCode && branding.address.city 
          ? `${branding.address.postalCode} ${branding.address.city}`
          : branding.address.postalCode || branding.address.city
      ].filter(Boolean);
      
      companyInfo.push(`📍 ${addressParts.join(', ')}`);
    }
    
    if (branding?.phone) {
      companyInfo.push(`📞 ${branding.phone}`);
    }
    
    if (branding?.email) {
      companyInfo.push(`📧 ${branding.email}`);
    }
    
    if (branding?.website) {
      const cleanWebsite = branding.website.replace(/^https?:\/\/(www\.)?/, '');
      companyInfo.push(`🌐 <a href="${branding.website}" style="color: #005fab; text-decoration: none;">${cleanWebsite}</a>`);
    }
    
    const copyrightLine = branding?.showCopyright 
      ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Copyright © ${new Date().getFullYear()} ${companyName || 'CeleroPress'}. Alle Rechte vorbehalten.</p>`
      : '';
    
    // Wenn keine Details vorhanden sind, zeige wenigstens den Firmennamen
    const footerContent = companyInfo.length > 0 
      ? companyInfo.join(' | ')
      : `Bereitgestellt über ${companyName || 'CeleroPress'}`;
    
    return `
      <div class="footer" style="margin-top: 30px; padding: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0; line-height: 1.5;">${footerContent}</p>
        ${copyrightLine}
      </div>`;
  } else {
    // Fallback: CeleroPress Standard-Footer nur wenn wirklich keine Branding-Daten da sind
    return `
      <div class="footer" style="margin-top: 30px; padding: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
        <p style="margin: 0;">Bereitgestellt über CeleroPress</p>
      </div>`;
  }
}

/**
 * Basis-CSS-Styles für alle E-Mail-Templates
 * Konsistent mit dem Design der Freigabe-Seite
 */
function getBaseEmailStyles(): string {
  return `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .content { background-color: white; padding: 30px; }
    .info-box { background: #e8f4fd; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #007bff; }
    .admin-message-box { background: #f0f8f0; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #28a745; }
    .original-message-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .button { 
      display: inline-block; 
      padding: 12px 30px; 
      background-color: #007bff; 
      color: white !important; 
      text-decoration: none; 
      border-radius: 5px; 
      margin: 20px 0;
      font-weight: bold;
    }
    .button:hover { background-color: #0056b3; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px !important; }
    }
  `;
}

export function getApprovalRequestEmailTemplate(data: ApprovalEmailData) {
  const subject = `Neue Pressemitteilung zur Freigabe: ${data.campaignTitle}`;
  
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
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
      Freigabe erforderlich
    </h1>
    </div>
    
    <div class="content">
      <p>Hallo <strong>${data.recipientName}</strong>,</p>
      
      <p>eine neue Pressemitteilung wartet auf Ihre Freigabe:</p>
      
      <div class="info-box">
        <strong>Pressemitteilung:</strong> "${data.campaignTitle}"<br>
        <strong>Erstellt für:</strong> ${data.clientName}<br>
        <strong>Status:</strong> <span style="color: #005fab;">Wartet auf Ihre Freigabe</span>
      </div>
      
      ${data.message ? `
        <div class="original-message-box">
          <strong>Nachricht:</strong><br>
          <em>${data.message}</em>
        </div>
      ` : ''}
      
      <p>Bitte prüfen Sie die Pressemitteilung und erteilen Sie Ihre Freigabe oder fordern Sie Änderungen an.</p>
      
      <div style="text-align: center;">
        <a href="${data.approvalUrl}" class="button">🔍 Zur Freigabe</a>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:<br>
        <a href="${data.approvalUrl}" style="color: #005fab;">${data.approvalUrl}</a>
      </p>
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
  const subject = `⏰ Erinnerung: Freigabe ausstehend für "${data.campaignTitle}"`;
  
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
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
      ⏰ Erinnerung: Freigabe ausstehend
    </h1>
    </div>
    
    <div class="content">
      <p>Hallo <strong>${data.recipientName}</strong>,</p>
      
      <p>dies ist eine freundliche Erinnerung, dass die folgende Pressemitteilung noch auf Ihre Freigabe wartet:</p>
      
      <div class="info-box">
        <strong>Pressemitteilung:</strong> "${data.campaignTitle}"<br>
        <strong>Erstellt für:</strong> ${data.clientName}<br>
        <strong>Status:</strong> <span style="color: #ff9800;">Wartet auf Ihre Freigabe</span>
      </div>
      
      <p>Bitte nehmen Sie sich einen Moment Zeit, um die Pressemitteilung zu prüfen.</p>
      
      <div style="text-align: center;">
        <a href="${data.approvalUrl}" class="button">⏰ Jetzt prüfen</a>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:<br>
        <a href="${data.approvalUrl}" style="color: #ff9800;">${data.approvalUrl}</a>
      </p>
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
  const subject = `✅ Freigabe erteilt: ${data.campaignTitle}`;
  
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
    .success-box { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
      ✅ Freigabe erteilt
    </h1>
    </div>
    
    <div class="content">
      <p>Gute Nachrichten!</p>
      
      <div class="success-box">
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
  const subject = `🔄 Änderungen angefordert: ${data.campaignTitle}`;
  
  // Verwende das neue Layout-System für Konsistenz
  const headerHtml = generateEmailHeader(data);
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
    .feedback-box { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${headerHtml}
      🔄 Änderungen angefordert
    </h1>
    </div>
    
    <div class="content">
      <p><strong>${data.reviewerName}</strong> hat Änderungen zur Pressemitteilung <strong>"${data.campaignTitle}"</strong> angefordert.</p>
      
      <div class="feedback-box">
        <strong>Allgemeines Feedback:</strong><br>
        ${data.feedback.replace(/\n/g, '<br>')}
      </div>
      
      ${inlineCommentsHtml}
      
      <p>Bitte überarbeiten Sie die Pressemitteilung entsprechend dem Feedback und reichen Sie sie erneut zur Freigabe ein.</p>
      
      <div style="text-align: center;">
        <a href="${data.approvalUrl}" class="button">Zur Bearbeitung</a>
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
  const subject = `Status-Update: ${data.campaignTitle} - ${data.newStatus}`;
  
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
  const subject = `⏰ Deadline-Erinnerung: ${data.campaignTitle}`;
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
  const subject = `🔄 Überarbeitete Pressemeldung zur erneuten Freigabe: ${data.campaignTitle}`;
  
  // Verwende das neue Layout-System
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
      🔄 Überarbeitete Pressemeldung zur erneuten Freigabe
    </h1>
    </div>
    
    <div class="content">
      <p>Hallo <strong>${data.recipientName}</strong>,</p>
      
      <p>Die Pressemeldung wurde von <strong>${data.adminName || 'Ihrem PR-Team'}</strong> überarbeitet und wartet erneut auf Ihre Freigabe:</p>
      
      <div class="info-box">
        <strong>Pressemeldung:</strong> "${data.campaignTitle}"<br>
        <strong>Erstellt für:</strong> ${data.clientName}<br>
        <strong>Überarbeitet von:</strong> ${data.adminName || 'PR-Team'} ${data.adminEmail ? `(${data.adminEmail})` : ''}<br>
        <strong>Status:</strong> <span style="color: #007bff;">Überarbeitet - erneute Freigabe erforderlich</span>
      </div>
      
      ${data.adminMessage ? `
        <div class="admin-message-box">
          <strong>📝 Nachricht vom Admin:</strong><br>
          <em>${data.adminMessage}</em>
        </div>
      ` : ''}
      
      ${data.message ? `
        <div class="original-message-box">
          <strong>Ursprüngliche Nachricht:</strong><br>
          <em>${data.message}</em>
        </div>
      ` : ''}
      
      <p>Bitte prüfen Sie die überarbeitete Pressemeldung und geben Sie diese erneut frei.</p>
      
      <div style="text-align: center;">
        <a href="${data.approvalUrl}" class="button">🔍 Überarbeitete Pressemeldung jetzt prüfen</a>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:<br>
        <a href="${data.approvalUrl}" style="color: #007bff;">${data.approvalUrl}</a>
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