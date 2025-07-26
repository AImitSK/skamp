// src/app/api/email/domains/test-inbox/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgMail from '@sendgrid/mail';
import { InboxTestResult } from '@/types/email-domains-enhanced';
import { Timestamp } from 'firebase/firestore';
import crypto from 'crypto';

// Initialize SendGrid mail client
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

/**
 * Generate a unique test ID
 */
function generateTestId(): string {
  return `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Get test email addresses for different providers
 */
function getTestEmailAddresses(customAddresses?: string[]): string[] {
  // If custom addresses provided, use them
  if (customAddresses && customAddresses.length > 0) {
    return customAddresses;
  }

  // Default test addresses (these should be configured in env vars)
  const defaultTestAddresses = [
    process.env.INBOX_TEST_GMAIL,
    process.env.INBOX_TEST_OUTLOOK,
    process.env.INBOX_TEST_YAHOO,
    process.env.INBOX_TEST_CUSTOM
  ].filter(Boolean) as string[];

  // If no test addresses configured, return empty array
  if (defaultTestAddresses.length === 0) {
    console.warn('No inbox test addresses configured in environment variables');
  }

  return defaultTestAddresses;
}

/**
 * Detect email provider from address
 */
function detectProvider(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) return 'unknown';
  
  if (domain.includes('gmail.com') || domain.includes('googlemail.com')) return 'gmail';
  if (domain.includes('outlook.') || domain.includes('hotmail.') || domain.includes('live.')) return 'outlook';
  if (domain.includes('yahoo.')) return 'yahoo';
  if (domain.includes('gmx.')) return 'gmx';
  if (domain.includes('web.de')) return 'web.de';
  if (domain.includes('icloud.com') || domain.includes('me.com')) return 'apple';
  
  return 'other';
}

/**
 * Create test email content
 */
function createTestEmailContent(testId: string, domain: string): { subject: string; text: string; html: string } {
  const timestamp = new Date().toISOString();
  
  return {
    subject: `Inbox Test ${testId} - ${domain}`,
    text: `Dies ist eine Test-E-Mail für die Domain-Verifizierung.

Test ID: ${testId}
Domain: ${domain}
Zeitstempel: ${timestamp}

Diese E-Mail wurde automatisch generiert, um die Zustellbarkeit Ihrer Domain zu testen.
Bitte antworten Sie nicht auf diese E-Mail.

---
SKAMP Email Verification System`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inbox Test</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0066cc;">Inbox Test für ${domain}</h2>
    <p>Dies ist eine Test-E-Mail für die Domain-Verifizierung.</p>
    
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Test ID:</strong> ${testId}</p>
      <p style="margin: 5px 0;"><strong>Domain:</strong> ${domain}</p>
      <p style="margin: 5px 0;"><strong>Zeitstempel:</strong> ${timestamp}</p>
    </div>
    
    <p style="font-size: 12px; color: #666; margin-top: 30px;">
      Diese E-Mail wurde automatisch generiert, um die Zustellbarkeit Ihrer Domain zu testen.
      Bitte antworten Sie nicht auf diese E-Mail.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 11px; color: #999; text-align: center;">
      SKAMP Email Verification System
    </p>
  </div>
</body>
</html>`
  };
}

/**
 * POST /api/email/domains/test-inbox
 * Send test emails to check inbox delivery
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data = await req.json();
      
      if (!data.domainId) {
        return NextResponse.json(
          { success: false, error: 'Domain ID is required' },
          { status: 400 }
        );
      }

      if (!data.fromEmail) {
        return NextResponse.json(
          { success: false, error: 'From email address is required' },
          { status: 400 }
        );
      }

      if (!data.domain) {
        return NextResponse.json(
          { success: false, error: 'Domain is required' },
          { status: 400 }
        );
      }

      // Get test email addresses
      const testAddresses = getTestEmailAddresses(data.testAddresses);
      
      if (testAddresses.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Keine Test-E-Mail-Adressen konfiguriert. Bitte konfigurieren Sie INBOX_TEST_* Umgebungsvariablen oder geben Sie Test-Adressen an.' 
          },
          { status: 400 }
        );
      }

      // Generate test ID
      const testId = generateTestId();
      
      // Create email content
      const emailContent = createTestEmailContent(testId, data.domain);
      
      // Prepare test results
      const results: InboxTestResult[] = [];
      const sendPromises: Promise<any>[] = [];

      // Send test emails
      for (const testEmail of testAddresses) {
        const result: InboxTestResult = {
          id: `${testId}_${testEmail}`,
          testEmail,
          sentAt: Timestamp.now(),
          deliveryStatus: 'pending',
          provider: detectProvider(testEmail)
        };
        
        results.push(result);

        // Create send promise
        const sendPromise = sgMail.send({
          to: testEmail,
          from: data.fromEmail,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false }
          },
          mailSettings: {
            sandboxMode: { enable: process.env.NODE_ENV === 'development' }
          }
        }).then(() => {
          result.deliveryStatus = 'delivered';
          result.deliveredAt = Timestamp.now();
        }).catch((error: any) => {
          console.error(`Failed to send test email to ${testEmail}:`, error);
          result.deliveryStatus = 'failed';
          (result as any).error = error.message;
          
          // Extract additional error info if available
          if (error.response?.body) {
            const sgError = error.response.body.errors?.[0];
            if (sgError) {
              (result as any).error = sgError.message;
              result.spamReasons = [sgError.message];
            }
          }
        });

        sendPromises.push(sendPromise);
      }

      // Wait for all emails to be sent
      await Promise.allSettled(sendPromises);

      // Calculate overall score
      const deliveredCount = results.filter(r => r.deliveryStatus === 'delivered').length;
      const overallScore = Math.round((deliveredCount / results.length) * 100);

      // Prepare response
      const response = {
        success: true,
        testId,
        results,
        overallScore,
        summary: {
          total: results.length,
          delivered: deliveredCount,
          failed: results.filter(r => r.deliveryStatus === 'failed').length,
          message: overallScore === 100 
            ? 'Alle Test-E-Mails wurden erfolgreich versendet!' 
            : `${deliveredCount} von ${results.length} Test-E-Mails wurden versendet.`
        }
      };

      return NextResponse.json(response);

    } catch (error: any) {
      console.error('Inbox test error:', error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Inbox-Test fehlgeschlagen',
          details: error.message 
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/email/domains/test-inbox
 * Get inbox test configuration info
 */
export async function GET(request: NextRequest) {
  const configuredProviders = [];
  
  if (process.env.INBOX_TEST_GMAIL) configuredProviders.push('Gmail');
  if (process.env.INBOX_TEST_OUTLOOK) configuredProviders.push('Outlook');
  if (process.env.INBOX_TEST_YAHOO) configuredProviders.push('Yahoo');
  if (process.env.INBOX_TEST_CUSTOM) configuredProviders.push('Custom');

  return NextResponse.json({
    info: 'Inbox Test Endpoint',
    usage: 'POST with { domainId: string, fromEmail: string, domain: string, testAddresses?: string[] }',
    description: 'Sends test emails to check inbox delivery rates',
    configuredProviders,
    hasTestAddresses: configuredProviders.length > 0
  });
}