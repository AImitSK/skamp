// src/lib/email/team-invitation-templates.ts
export interface TeamInvitationEmailData {
  recipientName: string;
  recipientEmail: string;
  inviterName: string;
  organizationName: string;
  role: string;
  invitationUrl: string;
  expiresAt?: Date;
}

export function getTeamInvitationEmailTemplate(data: TeamInvitationEmailData) {
  const subject = `Einladung zum Team von ${data.organizationName}`;
  
  const roleDescriptions: Record<string, string> = {
    admin: 'Administrator - Vollzugriff auf alle Funktionen',
    member: 'Team-Mitglied - Kann PR-Kampagnen erstellen und versenden',
    client: 'Kunde - Lesezugriff auf eigene Kampagnen',
    guest: 'Gast - Eingeschränkter Lesezugriff'
  };
  
  const roleDescription = roleDescriptions[data.role] || data.role;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container { 
      max-width: 600px; 
      margin: 40px auto; 
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header { 
      background: linear-gradient(135deg, #005fab 0%, #003d75 100%);
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content { 
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #555;
      line-height: 1.7;
      margin-bottom: 30px;
    }
    .role-box {
      background: #f8f9fa;
      border-left: 4px solid #005fab;
      padding: 20px;
      margin: 30px 0;
      border-radius: 0 8px 8px 0;
    }
    .role-box h3 {
      margin: 0 0 10px 0;
      color: #005fab;
      font-size: 18px;
    }
    .role-box p {
      margin: 0;
      color: #666;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .button { 
      display: inline-block; 
      padding: 16px 40px; 
      background-color: #005fab; 
      color: white; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #004a8c;
    }
    .info-list {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .info-list h4 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
    }
    .info-list ul {
      margin: 0;
      padding-left: 20px;
      color: #666;
    }
    .info-list li {
      margin-bottom: 8px;
    }
    .expiry-notice {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      color: #856404;
      font-size: 14px;
    }
    .footer { 
      background: #f8f9fa;
      padding: 30px;
      text-align: center; 
      color: #666; 
      font-size: 14px;
      border-top: 1px solid #e9ecef;
    }
    .footer a {
      color: #005fab;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Willkommen bei CeleroPress!</h1>
      <p>Sie wurden zum Team eingeladen</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hallo ${data.recipientName || 'dort'},
      </div>
      
      <div class="message">
        <strong>${data.inviterName}</strong> hat Sie eingeladen, dem Team von <strong>${data.organizationName}</strong> 
        in CeleroPress beizutreten - der professionellen PR-Management-Plattform.
      </div>
      
      <div class="role-box">
        <h3>Ihre Rolle: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</h3>
        <p>${roleDescription}</p>
      </div>
      
      <div class="button-container">
        <a href="${data.invitationUrl}" class="button">Einladung annehmen</a>
      </div>
      
      <div class="info-list">
        <h4>Was Sie mit CeleroPress können:</h4>
        <ul>
          <li>PR-Kampagnen erstellen und versenden</li>
          <li>Kontakte und Medien verwalten</li>
          <li>E-Mail-Versand automatisieren</li>
          <li>Mit Ihrem Team zusammenarbeiten</li>
          <li>Freigabeprozesse digital abwickeln</li>
        </ul>
      </div>
      
      ${data.expiresAt ? `
      <div class="expiry-notice">
        <strong>Hinweis:</strong> Diese Einladung ist gültig bis ${data.expiresAt.toLocaleDateString('de-DE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })} Uhr.
      </div>
      ` : ''}
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:<br>
        <a href="${data.invitationUrl}" style="color: #005fab; word-break: break-all;">${data.invitationUrl}</a>
      </p>
    </div>
    
    <div class="footer">
      <p>
        Diese E-Mail wurde automatisch von CeleroPress generiert.<br>
        Sie erhalten diese E-Mail, weil ${data.inviterName} Sie zu seinem Team eingeladen hat.
      </p>
      <p style="margin-top: 20px;">
        <a href="https://www.celeropress.com">www.celeropress.com</a> | 
        <a href="https://www.celeropress.com/datenschutz">Datenschutz</a> | 
        <a href="https://www.celeropress.com/impressum">Impressum</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

Hallo ${data.recipientName || 'dort'},

${data.inviterName} hat Sie eingeladen, dem Team von ${data.organizationName} in CeleroPress beizutreten.

Ihre Rolle: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}
${roleDescription}

Einladung annehmen: ${data.invitationUrl}

Was Sie mit CeleroPress können:
- PR-Kampagnen erstellen und versenden
- Kontakte und Medien verwalten
- E-Mail-Versand automatisieren
- Mit Ihrem Team zusammenarbeiten
- Freigabeprozesse digital abwickeln

${data.expiresAt ? `Diese Einladung ist gültig bis ${data.expiresAt.toLocaleDateString('de-DE')} ${data.expiresAt.toLocaleTimeString('de-DE')} Uhr.` : ''}

Falls der Link nicht funktioniert, kopieren Sie ihn bitte in Ihren Browser.

Diese E-Mail wurde automatisch von CeleroPress generiert.
Sie erhalten diese E-Mail, weil ${data.inviterName} Sie zu seinem Team eingeladen hat.

www.celeropress.com
  `;
  
  return { subject, html, text };
}

export function getTeamInvitationAcceptedEmailTemplate(data: {
  inviterName: string;
  inviterEmail: string;
  newMemberName: string;
  newMemberEmail: string;
  organizationName: string;
  role: string;
}) {
  const subject = `${data.newMemberName} hat Ihre Einladung angenommen`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container { 
      max-width: 600px; 
      margin: 40px auto; 
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header { 
      background: #4caf50;
      color: white; 
      padding: 30px; 
      text-align: center; 
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content { 
      padding: 30px;
    }
    .success-box {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .member-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .member-info h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 16px;
    }
    .member-info p {
      margin: 5px 0;
      color: #666;
    }
    .footer { 
      background: #f8f9fa;
      padding: 20px;
      text-align: center; 
      color: #666; 
      font-size: 14px;
      border-top: 1px solid #e9ecef;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Einladung angenommen</h1>
    </div>
    
    <div class="content">
      <p>Hallo ${data.inviterName},</p>
      
      <div class="success-box">
        <strong>${data.newMemberName}</strong> hat Ihre Einladung angenommen und ist jetzt Teil Ihres Teams bei ${data.organizationName}.
      </div>
      
      <div class="member-info">
        <h3>Neues Team-Mitglied:</h3>
        <p><strong>Name:</strong> ${data.newMemberName}</p>
        <p><strong>E-Mail:</strong> ${data.newMemberEmail}</p>
        <p><strong>Rolle:</strong> ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</p>
        <p><strong>Beigetreten am:</strong> ${new Date().toLocaleDateString('de-DE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })} Uhr</p>
      </div>
      
      <p>Sie können die Team-Einstellungen jederzeit in Ihrem CeleroPress-Dashboard verwalten.</p>
    </div>
    
    <div class="footer">
      <p>Diese E-Mail wurde automatisch von CeleroPress generiert.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  const text = `
${subject}

Hallo ${data.inviterName},

${data.newMemberName} hat Ihre Einladung angenommen und ist jetzt Teil Ihres Teams bei ${data.organizationName}.

Neues Team-Mitglied:
- Name: ${data.newMemberName}
- E-Mail: ${data.newMemberEmail}
- Rolle: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}
- Beigetreten am: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')} Uhr

Sie können die Team-Einstellungen jederzeit in Ihrem CeleroPress-Dashboard verwalten.

Diese E-Mail wurde automatisch von CeleroPress generiert.
  `;
  
  return { subject, html, text };
}