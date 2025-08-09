// src/lib/email/inbox-test-service.ts
import sgMail from '@sendgrid/mail';
import { nanoid } from 'nanoid';
import { InboxTestResult, DeliveryStatus, EmailProvider } from '@/types/email-domains';

// Initialisiere SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Konfiguration für Inbox-Tests
 */
export interface InboxTestConfig {
  domain: string;
  fromEmail: string;
  toEmail: string;
  userName: string;
  organizationName?: string;
}

/**
 * Service für E-Mail-Zustellbarkeitstests
 */
export class InboxTestService {
  /**
   * Sendet eine Test-E-Mail zur Überprüfung der Zustellbarkeit
   */
  async sendTestEmail(config: InboxTestConfig): Promise<{
    messageId: string;
    testId: string;
  }> {
    const testId = nanoid();
    const timestamp = new Date().toISOString();
    
    const msg = {
      to: config.toEmail,
      from: {
        email: config.fromEmail,
        name: 'CeleroPress Delivery Test'
      },
      subject: `[CeleroPress Test] Domain-Verifizierung für ${config.domain}`,
      text: this.generateTestEmailText(config, testId, timestamp),
      html: this.generateTestEmailHtml(config, testId, timestamp),
      customArgs: {
        testId,
        domain: config.domain,
        type: 'inbox_test'
      },
      headers: {
        'X-CeleroPress-Test-ID': testId,
        'X-CeleroPress-Domain': config.domain,
        'X-CeleroPress-Test-Type': 'inbox-delivery',
        'List-Unsubscribe': '<mailto:noreply@skamp.de?subject=unsubscribe>',
        'Precedence': 'bulk'
      },
      trackingSettings: {
        clickTracking: {
          enable: true,
          enableText: true
        },
        openTracking: {
          enable: true
        },
        subscriptionTracking: {
          enable: false
        }
      },
      mailSettings: {
        sandboxMode: {
          enable: process.env.NODE_ENV === 'development' && process.env.SENDGRID_SANDBOX !== 'false'
        }
      }
    };
    
    try {
      const [response] = await sgMail.send(msg);
      
      return {
        messageId: response.headers['x-message-id'] || '',
        testId
      };
    } catch (error: any) {
      throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Generiert den Text-Inhalt der Test-E-Mail
   */
  private generateTestEmailText(config: InboxTestConfig, testId: string, timestamp: string): string {
    return `
🎉 Herzlichen Glückwunsch!

Ihre Domain-Authentifizierung funktioniert!

Diese Test-E-Mail bestätigt, dass Ihre Domain ${config.domain} korrekt für den E-Mail-Versand konfiguriert ist.

TEST-DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain:         ${config.domain}
Absender:       ${config.fromEmail}
Test ID:        ${testId}
Zeitstempel:    ${timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Diese E-Mail wurde erfolgreich zugestellt!

Ihre Domain ist korrekt konfiguriert und bereit für den professionellen Versand von Pressemitteilungen und anderen wichtigen E-Mails.

WAS BEDEUTET DAS?
• Ihre E-Mails haben eine höhere Chance, im Posteingang zu landen
• Empfänger sehen Ihre eigene Domain als Absender
• Ihre E-Mails wirken vertrauenswürdiger und professioneller

NÄCHSTE SCHRITTE:
1. Kehren Sie zu CeleroPress zurück
2. Die Testergebnisse werden automatisch ausgewertet
3. Sie können mit dem Versand Ihrer Kampagnen beginnen

---
Diese Test-E-Mail wurde automatisch von CeleroPress generiert.
Sie können auf diese E-Mail nicht antworten.

CeleroPress - Ihre PR-Software
https://www.celeropress.com

© ${new Date().getFullYear()} CeleroPress. Alle Rechte vorbehalten.
`;
  }

  /**
   * Generiert den HTML-Inhalt der Test-E-Mail
   */
  private generateTestEmailHtml(config: InboxTestConfig, testId: string, timestamp: string): string {
    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CeleroPress Domain Test</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 20px !important; }
            .button { width: 100% !important; text-align: center !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #005fab 0%, #003d73 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">
                                🎉 Test erfolgreich!
                            </h1>
                            <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 18px;">
                                Ihre Domain-Authentifizierung funktioniert
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="padding: 40px 30px;">
                            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #2e7d32; font-size: 16px; font-weight: 600;">
                                    ✓ Diese E-Mail wurde erfolgreich zugestellt!
                                </p>
                                <p style="margin: 10px 0 0 0; color: #388e3c; font-size: 14px;">
                                    Ihre Domain ${config.domain} ist korrekt konfiguriert und bereit für den professionellen E-Mail-Versand.
                                </p>
                            </div>
                            
                            <h2 style="color: #333; font-size: 20px; margin: 0 0 20px 0;">Test-Details</h2>
                            
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8f9fa; border-radius: 6px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                                        <strong style="color: #666; font-size: 14px;">Domain:</strong>
                                    </td>
                                    <td style="padding: 15px; border-bottom: 1px solid #e9ecef; font-family: monospace; color: #005fab;">
                                        ${config.domain}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                                        <strong style="color: #666; font-size: 14px;">Absender:</strong>
                                    </td>
                                    <td style="padding: 15px; border-bottom: 1px solid #e9ecef; font-family: monospace; color: #005fab;">
                                        ${config.fromEmail}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                                        <strong style="color: #666; font-size: 14px;">Test ID:</strong>
                                    </td>
                                    <td style="padding: 15px; border-bottom: 1px solid #e9ecef; font-family: monospace; font-size: 12px; color: #666;">
                                        ${testId}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px;">
                                        <strong style="color: #666; font-size: 14px;">Zeitstempel:</strong>
                                    </td>
                                    <td style="padding: 15px; font-size: 14px; color: #666;">
                                        ${new Date(timestamp).toLocaleString('de-DE')}
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="margin: 30px 0; padding: 20px; background: #f0f7ff; border-left: 4px solid #005fab; border-radius: 4px;">
                                <h3 style="margin: 0 0 10px 0; color: #005fab; font-size: 16px;">Was bedeutet das?</h3>
                                <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px;">
                                    <li style="margin-bottom: 8px;">Ihre E-Mails haben eine höhere Chance, im Posteingang zu landen</li>
                                    <li style="margin-bottom: 8px;">Empfänger sehen Ihre eigene Domain als Absender</li>
                                    <li style="margin-bottom: 8px;">Ihre E-Mails wirken vertrauenswürdiger und professioneller</li>
                                </ul>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://app.skamp.de" style="display: inline-block; padding: 12px 30px; background: #005fab; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;" class="button">
                                    Zurück zu CeleroPress
                                </a>
                            </div>
                            
                            <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e9ecef;">
                                <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                                    Diese Test-E-Mail wurde automatisch von CeleroPress generiert.<br>
                                    Sie können auf diese E-Mail nicht antworten.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                                <strong>CeleroPress</strong> - Ihre PR-Software
                            </p>
                            <p style="margin: 0; color: #999; font-size: 12px;">
                                © ${new Date().getFullYear()} CeleroPress. Alle Rechte vorbehalten.
                            </p>
                            <p style="margin: 10px 0 0 0;">
                                <a href="https://app.skamp.de" style="color: #005fab; text-decoration: none; font-size: 12px;">app.skamp.de</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
  }

  /**
   * Analysiert die Zustellqualität basierend auf Headers
   * (Simulierte Analyse - in Produktion würde dies über SendGrid Webhooks erfolgen)
   */
  analyzeDeliveryQuality(headers: Record<string, string>): {
    spamScore: number;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let spamScore = 0;

    // SPF Check
    const authResults = headers['Authentication-Results'] || headers['authentication-results'] || '';
    if (!authResults.includes('spf=pass')) {
      warnings.push('SPF-Check nicht bestanden');
      recommendations.push('Stellen Sie sicher, dass SendGrid in Ihrem SPF-Record enthalten ist');
      spamScore += 2;
    }

    // DKIM Check
    if (!authResults.includes('dkim=pass')) {
      warnings.push('DKIM-Signatur fehlt oder ungültig');
      recommendations.push('Überprüfen Sie die DKIM-Konfiguration in SendGrid');
      spamScore += 3;
    }

    // DMARC Check
    if (!authResults.includes('dmarc=pass')) {
      recommendations.push('Erwägen Sie die Einrichtung eines DMARC-Records für zusätzlichen Schutz');
      spamScore += 1;
    }

    // Spam-Filter Checks
    const spamStatus = headers['X-Spam-Status'] || headers['x-spam-status'] || '';
    if (spamStatus.toLowerCase().includes('yes')) {
      warnings.push('E-Mail wurde als Spam markiert');
      spamScore += 5;
    }

    // SpamAssassin Score
    const spamScoreHeader = headers['X-Spam-Score'] || headers['x-spam-score'] || '';
    if (spamScoreHeader) {
      const score = parseFloat(spamScoreHeader);
      if (score > 5) {
        warnings.push(`SpamAssassin Score ist hoch: ${score}`);
        spamScore = Math.max(spamScore, Math.ceil(score));
      }
    }

    // Weitere Empfehlungen basierend auf Best Practices
    if (spamScore === 0) {
      recommendations.push('Ihre Domain-Konfiguration ist optimal!');
    } else if (spamScore < 3) {
      recommendations.push('Die Konfiguration ist gut, kleine Verbesserungen sind möglich');
    } else {
      recommendations.push('Bitte beheben Sie die genannten Probleme für bessere Zustellbarkeit');
    }

    // Return-Path Check
    const returnPath = headers['Return-Path'] || headers['return-path'] || '';
    if (returnPath && !returnPath.includes('@' + headers['X-CeleroPress-Domain'])) {
      recommendations.push('Konfigurieren Sie einen custom Return-Path für Ihre Domain');
    }

    return {
      spamScore: Math.min(spamScore, 10),
      warnings,
      recommendations
    };
  }

  /**
   * Generiert einen Mock-Test für Entwicklung
   */
  async generateMockTest(provider: EmailProvider): Promise<InboxTestResult> {
    const mockScenarios = {
      gmail: { deliveryStatus: 'delivered' as DeliveryStatus, spamScore: 0, deliveryTime: 1200 },
      outlook: { deliveryStatus: 'delivered' as DeliveryStatus, spamScore: 1, deliveryTime: 2300 },
      yahoo: { deliveryStatus: 'spam' as DeliveryStatus, spamScore: 5, deliveryTime: 3400 },
      gmx: { deliveryStatus: 'delivered' as DeliveryStatus, spamScore: 2, deliveryTime: 1800 },
      web: { deliveryStatus: 'delivered' as DeliveryStatus, spamScore: 1, deliveryTime: 2100 },
      other: { deliveryStatus: 'blocked' as DeliveryStatus, spamScore: 8, deliveryTime: 0 }
    };

    const scenario = mockScenarios[provider] || mockScenarios.other;

    return {
      id: nanoid(),
      testEmail: `test@${provider}.com`,
      provider,
      deliveryStatus: scenario.deliveryStatus,
      deliveryTime: scenario.deliveryTime,
      spamScore: scenario.spamScore,
      headers: {
        'Authentication-Results': 'spf=pass; dkim=pass; dmarc=pass',
        'X-Spam-Score': scenario.spamScore.toString(),
        'X-CeleroPress-Test-ID': nanoid()
      },
      warnings: scenario.spamScore > 3 ? ['Erhöhter Spam-Score festgestellt'] : [],
      recommendations: scenario.deliveryStatus === 'spam' 
        ? ['Überprüfen Sie Ihre Domain-Konfiguration', 'Stellen Sie sicher, dass alle DNS-Records korrekt sind']
        : ['Ihre Konfiguration sieht gut aus'],
      timestamp: new Date() as any
    };
  }

  /**
   * Prüft die Reputation einer Domain
   */
  async checkDomainReputation(domain: string): Promise<{
    score: number;
    factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; description: string }>;
  }> {
    // In Produktion würde dies externe APIs wie Sender Score, Talos, etc. nutzen
    // Hier eine simulierte Implementierung
    const factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; description: string }> = [];
    let score = 70; // Basis-Score

    // Domain-Alter (simuliert)
    factors.push({
      factor: 'Domain-Alter',
      impact: 'positive',
      description: 'Domain ist etabliert'
    });
    score += 10;

    // SPF/DKIM/DMARC Konfiguration
    factors.push({
      factor: 'E-Mail-Authentifizierung',
      impact: 'positive',
      description: 'SPF, DKIM und DMARC sind konfiguriert'
    });
    score += 15;

    // Keine Blacklist-Einträge (simuliert)
    factors.push({
      factor: 'Blacklist-Status',
      impact: 'positive',
      description: 'Domain ist auf keiner bekannten Blacklist'
    });
    score += 5;

    return {
      score: Math.min(score, 100),
      factors
    };
  }
}

// Singleton-Export
export const inboxTestService = new InboxTestService();