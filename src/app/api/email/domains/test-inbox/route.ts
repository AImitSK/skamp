// src/app/api/email/domains/test-inbox/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import { inboxTestService } from '@/lib/email/inbox-test-service';
import { InboxTestRequest, InboxTestResponse, InboxTestResult } from '@/types/email-domains';
import { nanoid } from 'nanoid';
import { Timestamp } from 'firebase/firestore';

/**
 * POST /api/email/domains/test-inbox
 * Inbox-Zustellbarkeitstest durchführen
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data: InboxTestRequest = await req.json();
      
      // Validierung
      if (!data.domainId || !data.testEmail) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ID und Test-Email sind erforderlich' 
          },
          { status: 400 }
        );
      }

      // Email-Format validieren
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.testEmail)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Ungültiges E-Mail-Format' 
          },
          { status: 400 }
        );
      }

      console.log('📧 Starting inbox test for domain:', data.domainId);

      // Domain laden und prüfen
      const domain = await domainService.getById(data.domainId);
      if (!domain || domain.organizationId !== auth.organizationId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain nicht gefunden' 
          },
          { status: 404 }
        );
      }

      if (domain.status !== 'verified') {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain muss vor dem Test verifiziert sein' 
          },
          { status: 400 }
        );
      }

      // Rate Limiting: Max 1 Test pro Minute
      if (domain.lastInboxTestAt) {
        const lastTest = domain.lastInboxTestAt.toDate();
        const oneMinuteAgo = new Date(Date.now() - 60000);
        
        if (lastTest > oneMinuteAgo) {
          const waitSeconds = Math.ceil((lastTest.getTime() - oneMinuteAgo.getTime()) / 1000);
          return NextResponse.json(
            { 
              success: false,
              error: `Bitte warten Sie noch ${waitSeconds} Sekunden bis zum nächsten Test` 
            },
            { status: 429 }
          );
        }
      }

      // Test-Email senden
      const testId = nanoid();
      console.log(`📤 Sending test email to ${data.testEmail} with ID: ${testId}`);

      try {
        const { messageId } = await inboxTestService.sendTestEmail({
          domain: domain.domain,
          fromEmail: `test@${domain.domain}`,
          toEmail: data.testEmail,
          userName: auth.email || 'SKAMP User'
        });

        // Test-Ergebnis initial speichern
        const testResult: InboxTestResult = {
          id: testId,
          testEmail: data.testEmail,
          provider: data.provider,
          deliveryStatus: 'pending',
          timestamp: Timestamp.now()
        };

        await domainService.addInboxTestResult(data.domainId, testResult);

        console.log('✅ Test email sent successfully:', messageId);

        const response: InboxTestResponse = {
          success: true,
          testId,
          messageId,
          status: 'sending'
        };

        return NextResponse.json(response);

      } catch (sendError: any) {
        console.error('❌ Failed to send test email:', sendError);
        
        // Test als fehlgeschlagen markieren
        const failedResult: InboxTestResult = {
          id: testId,
          testEmail: data.testEmail,
          provider: data.provider,
          deliveryStatus: 'blocked',
          timestamp: Timestamp.now()
        };

        await domainService.addInboxTestResult(data.domainId, failedResult);

        return NextResponse.json(
          { 
            success: false,
            error: sendError.message || 'Test-Email konnte nicht gesendet werden' 
          },
          { status: 500 }
        );
      }

    } catch (error: any) {
      console.error('❌ Inbox test error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'Inbox-Test fehlgeschlagen' 
        },
        { status: 500 }
      );
    }
  });
}