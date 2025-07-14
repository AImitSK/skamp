// src/app/api/email/domains/check-dns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import { dnsCheckerService } from '@/lib/email/dns-checker-service';
import { CheckDnsRequest, CheckDnsResponse } from '@/types/email-domains';

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

      // DNS Records prüfen
      const checkResults = await dnsCheckerService.checkAllRecords(
        domain.dnsRecords
      );

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

      // DNS Propagation Status prüfen (optional, für besseres UX)
      let propagationStatus = null;
      if (allValid && checkResults.length > 0) {
        try {
          const firstRecord = domain.dnsRecords[0];
          propagationStatus = await dnsCheckerService.checkDnsPropagation(
            firstRecord.host,
            firstRecord.type as 'CNAME' | 'TXT' | 'MX',
            firstRecord.data
          );
        } catch (propError) {
          console.warn('⚠️ Propagation check failed:', propError);
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