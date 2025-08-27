// src/lib/email/approval-email-templates.ts
export interface ApprovalEmailData {
  recipientName: string;
  recipientEmail: string;
  campaignTitle: string;
  clientName: string;
  approvalUrl: string;
  message?: string;
  agencyName?: string;
  agencyLogoUrl?: string;
}

export function getApprovalRequestEmailTemplate(data: ApprovalEmailData) {
  const subject = `Neue Pressemitteilung zur Freigabe: ${data.campaignTitle}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #005fab; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
    .button { display: inline-block; padding: 12px 30px; background-color: #005fab; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${data.agencyLogoUrl ? `<img src="${data.agencyLogoUrl}" alt="${data.agencyName}" style="max-height: 50px; margin-bottom: 10px;">` : ''}
      <h1>Freigabe erforderlich</h1>
    </div>
    
    <div class="content">
      <p>Sehr geehrte/r ${data.recipientName},</p>
      
      <p>eine neue Pressemitteilung wartet auf Ihre Freigabe:</p>
      
      <h2>${data.campaignTitle}</h2>
      
      ${data.message ? `<p><em>${data.message}</em></p>` : ''}
      
      <p>Bitte prüfen Sie die Pressemitteilung und erteilen Sie Ihre Freigabe oder fordern Sie Änderungen an.</p>
      
      <div style="text-align: center;">
        <a href="${data.approvalUrl}" class="button">Zur Freigabe</a>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:<br>
        <a href="${data.approvalUrl}" style="color: #005fab;">${data.approvalUrl}</a>
      </p>
    </div>
    
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
      ${data.agencyName ? `<p>&copy; ${new Date().getFullYear()} ${data.agencyName}. Alle Rechte vorbehalten.</p>` : ''}
    </div>
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
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
    .button { display: inline-block; padding: 12px 30px; background-color: #005fab; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Erinnerung: Freigabe ausstehend</h1>
    </div>
    
    <div class="content">
      <p>Sehr geehrte/r ${data.recipientName},</p>
      
      <p>dies ist eine freundliche Erinnerung, dass die folgende Pressemitteilung noch auf Ihre Freigabe wartet:</p>
      
      <h2>${data.campaignTitle}</h2>
      
      <p>Bitte nehmen Sie sich einen Moment Zeit, um die Pressemitteilung zu prüfen.</p>
      
      <div style="text-align: center;">
        <a href="${data.approvalUrl}" class="button">Jetzt prüfen</a>
      </div>
    </div>
    
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert.</p>
    </div>
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
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
    .success-box { background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Freigabe erteilt</h1>
    </div>
    
    <div class="content">
      <p>Gute Nachrichten!</p>
      
      <div class="success-box">
        <strong>${data.approverName}</strong> hat die Pressemitteilung <strong>"${data.campaignTitle}"</strong> freigegeben.
      </div>
      
      <p>Die Pressemitteilung kann nun versendet werden.</p>
      
      <p>Freigegeben am: ${new Date().toLocaleString('de-DE')}</p>
    </div>
    
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert.</p>
    </div>
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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
    .feedback-box { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background-color: #005fab; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔄 Änderungen angefordert</h1>
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
    
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert.</p>
      <p>Falls der Button nicht funktioniert: <a href="${data.approvalUrl}">${data.approvalUrl}</a></p>
    </div>
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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #667eea; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
    .status-update { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Status-Update</h1>
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
    
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert.</p>
    </div>
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
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${urgencyLevel === 'urgent' ? '#f44336' : '#ff9800'}; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
    .deadline-box { background-color: ${urgencyLevel === 'urgent' ? '#ffebee' : '#fff3cd'}; border-left: 4px solid ${urgencyLevel === 'urgent' ? '#f44336' : '#ff9800'}; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background-color: #005fab; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ ${urgencyLevel === 'urgent' ? 'DRINGENDE' : ''} Deadline-Erinnerung</h1>
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
    
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert.</p>
    </div>
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