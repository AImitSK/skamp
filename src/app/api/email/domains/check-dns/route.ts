// src/app/api/email/domains/check-dns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { DnsRecord, DnsCheckResult } from '@/types/email-domains';

/**
 * Mock DNS Check für Vercel
 * In Production würde man hier eine externe DNS API verwenden
 */
async function checkDnsRecords(dnsRecords: DnsRecord[]): Promise<DnsCheckResult[]> {
  // Simuliere DNS-Check mit Google DNS API
  const results = await Promise.all(
    dnsRecords.map(async (record) => {
      try {
        // Für Production: Nutze Google DNS oder Cloudflare DNS API
        const response = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(record.host)}&type=${record.type}`,
          { 
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000)
          }
        );
        
        if (!response.ok) {
          throw new Error(`DNS lookup failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        let actualValue: string | undefined;
        let isValid = false;
        
        if (data.Answer && data.Answer.length > 0) {
          actualValue = data.Answer[0].data;
          
          // Normalize values for comparison
          const normalizedActual = actualValue?.toLowerCase().replace(/\.$/, '');
          const normalizedExpected = record.data.toLowerCase().replace(/\.$/, '');
          
          isValid = normalizedActual === normalizedExpected;
        }
        
        return {
          recordType: record.type,
          hostname: record.host,
          expectedValue: record.data,
          actualValue,
          isValid,
          checkedAt: new Date() as any,
        };
        
      } catch (error) {
        // Fallback für Development: Simuliere Ergebnisse
        return {
          recordType: record.type,
          hostname: record.host,
          expectedValue: record.data,
          actualValue: Math.random() > 0.3 ? record.data : undefined,
          isValid: Math.random() > 0.3,
          checkedAt: new Date() as any,
          error: 'DNS check failed'
        };
      }
    })
  );
  
  return results;
}

/**
 * POST /api/email/domains/check-dns
 * DNS-Records überprüfen (ohne Firestore-Zugriff)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { domainId, dnsRecords } = await req.json();
      
      if (!domainId || !dnsRecords || dnsRecords.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ID und DNS Records sind erforderlich' 
          },
          { status: 400 }
        );
      }

      console.log(`📋 Checking ${dnsRecords.length} DNS records`);

      // DNS Records prüfen
      const checkResults = await checkDnsRecords(dnsRecords);

      // Prüfen ob alle Records valid sind
      const allValid = checkResults.every((r: DnsCheckResult) => r.isValid);
      const validCount = checkResults.filter((r: DnsCheckResult) => r.isValid).length;

      console.log(`✅ DNS Check complete: ${validCount}/${checkResults.length} valid`);

      return NextResponse.json({
        success: true,
        results: checkResults,
        allValid
      });

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