// src/app/api/email/domains/check-dns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import { CheckDnsRequest, CheckDnsResponse, DnsCheckResult } from '@/types/email-domains';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * Mock DNS Checker für Edge Runtime
 * In Produktion sollte dies über eine externe API laufen
 */
class MockDnsChecker {
  async checkAllRecords(dnsRecords: Array<{type: string; host: string; data: string}>): Promise<DnsCheckResult[]> {
    console.log('🔍 Mock DNS check for records:', dnsRecords);
    
    // Simuliere DNS-Checks mit zufälligen Ergebnissen für Development
    return dnsRecords.map(record => ({
      recordType: record.type,
      hostname: record.host,
      expectedValue: record.data,
      actualValue: Math.random() > 0.3 ? record.data : undefined,
      isValid: Math.random() > 0.3,
      checkedAt: new Date() as any,
      error: Math.random() > 0.7 ? 'DNS record not found' : undefined
    }));
  }
}

const mockDnsChecker = new MockDnsChecker();

/**
 * POST /api/email/domains/check-dns
 * DNS-Records überprüfen
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { domainId }: CheckDnsRequest = await req.json();
      
      if (!domainId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ID ist erforderlich' 
          },
          { status: 400 }
        );
      }

      console.log('🔍 Checking DNS for domain:', domainId);

      // Domain laden
      const domain = await domainService.getById(domainId);
      if (!domain || domain.organizationId !== auth.organizationId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain nicht gefunden' 
          },
          { status: 404 }
        );
      }

      if (!domain.dnsRecords || domain.dnsRecords.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Keine DNS-Records vorhanden' 
          },
          { status: 400 }
        );
      }

      console.log(`📋 Checking ${domain.dnsRecords.length} DNS records for ${domain.domain}`);

      // DNS Records prüfen (Mock für Development)
      const checkResults = await mockDnsChecker.checkAllRecords(domain.dnsRecords);

      // Ergebnisse in Firebase speichern
      await domainService.updateDnsCheckResults(domainId, checkResults);

      // Prüfen ob alle Records valid sind
      const allValid = checkResults.every(r => r.isValid);
      const validCount = checkResults.filter(r => r.isValid).length;

      console.log(`✅ DNS Check complete: ${validCount}/${checkResults.length} valid`);

      // Wenn alle Records valid sind, Verifizierung bei SendGrid triggern
      if (allValid && domain.status !== 'verified') {
        console.log('🚀 All DNS records valid, triggering SendGrid verification...');
        
        try {
          // Trigger verification via verify endpoint
          const verifyResponse = await fetch(
            new URL('/api/email/domains/verify', request.url).toString(),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.get('Authorization') || ''
              },
              body: JSON.stringify({ domainId })
            }
          );

          if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json();
            console.log('📧 SendGrid verification result:', verifyResult.status);
          }
        } catch (verifyError) {
          console.error('⚠️ Auto-verification failed:', verifyError);
          // Nicht kritisch, User kann manuell verifizieren
        }
      }

      const response: CheckDnsResponse = {
        success: true,
        results: checkResults,
        allValid
      };

      return NextResponse.json(response);

    } catch (error: any) {
      console.error('❌ DNS check error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'DNS-Überprüfung fehlgeschlagen' 
        },
        { status: 500 }
      );
    }
  });
}