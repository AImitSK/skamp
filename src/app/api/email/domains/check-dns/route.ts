// src/app/api/email/domains/check-dns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { promises as dns } from 'dns';
import { DnsRecord, DnsCheckResult } from '@/types/email-domains-enhanced';
import { Timestamp } from 'firebase/firestore';

/**
 * Resolve DNS records using Node.js DNS module
 */
async function resolveDnsRecord(record: DnsRecord): Promise<DnsCheckResult> {
  const result: DnsCheckResult = {
    recordType: record.type,
    host: record.host,
    expected: record.data,
    actual: null,
    valid: false,
    checkedAt: Timestamp.now()
  };

  try {
    switch (record.type) {
      case 'CNAME':
        try {
          const cnames = await dns.resolveCname(record.host);
          if (cnames && cnames.length > 0) {
            // CNAME records often have trailing dots, normalize for comparison
            result.actual = cnames[0].replace(/\.$/, '');
            const expectedNormalized = record.data.replace(/\.$/, '');
            result.valid = result.actual.toLowerCase() === expectedNormalized.toLowerCase();
          }
        } catch (cnameError: any) {
          // CNAME not found, try to resolve as A record (some providers do this)
          try {
            const addresses = await dns.resolve4(record.host);
            if (addresses && addresses.length > 0) {
              result.actual = `A:${addresses[0]}`;
              result.error = 'CNAME erwartet, aber A-Record gefunden';
            }
          } catch {
            result.error = 'DNS-Eintrag nicht gefunden';
          }
        }
        break;

      case 'TXT':
        try {
          const txtRecords = await dns.resolveTxt(record.host);
          if (txtRecords && txtRecords.length > 0) {
            // TXT records are returned as arrays of strings, join them
            const flatRecords = txtRecords.map(r => r.join(''));
            result.actual = flatRecords.join('; ');
            
            // Check if expected value is contained in any TXT record
            result.valid = flatRecords.some(txt => 
              txt.includes(record.data) || txt === record.data
            );
          }
        } catch (txtError: any) {
          result.error = 'TXT-Eintrag nicht gefunden';
        }
        break;

      case 'MX':
        try {
          const mxRecords = await dns.resolveMx(record.host);
          if (mxRecords && mxRecords.length > 0) {
            // Sort by priority and format
            mxRecords.sort((a, b) => a.priority - b.priority);
            result.actual = mxRecords
              .map(mx => `${mx.priority} ${mx.exchange}`)
              .join('; ');
            
            // For MX, check if the expected exchange is present
            result.valid = mxRecords.some(mx => 
              mx.exchange.replace(/\.$/, '').toLowerCase() === 
              record.data.replace(/\.$/, '').toLowerCase()
            );
          }
        } catch (mxError: any) {
          result.error = 'MX-Eintrag nicht gefunden';
        }
        break;

      default:
        result.error = `Unbekannter Record-Typ: ${record.type}`;
    }
  } catch (error: any) {
    console.error(`DNS resolution error for ${record.host}:`, error);
    result.error = error.code === 'ENOTFOUND' 
      ? 'Domain nicht gefunden' 
      : `DNS-Fehler: ${error.code || error.message}`;
  }

  return result;
}

/**
 * POST /api/email/domains/check-dns
 * Check DNS records for a domain
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data = await req.json();
      
      if (!data.dnsRecords || !Array.isArray(data.dnsRecords)) {
        return NextResponse.json(
          { success: false, error: 'DNS records are required' },
          { status: 400 }
        );
      }

      // Check each DNS record in parallel
      const checkPromises = data.dnsRecords.map((record: DnsRecord) => 
        resolveDnsRecord(record)
      );
      
      const results = await Promise.all(checkPromises);
      
      // Calculate summary
      const validCount = results.filter(r => r.valid).length;
      const totalCount = results.length;
      const allValid = validCount === totalCount;
      
      // Prepare response
      const response = {
        success: true,
        results,
        allValid,
        validCount,
        totalCount,
        summary: {
          percentage: Math.round((validCount / totalCount) * 100),
          message: allValid 
            ? 'Alle DNS-Einträge sind korrekt konfiguriert' 
            : `${validCount} von ${totalCount} DNS-Einträgen sind korrekt`
        }
      };

      return NextResponse.json(response);

    } catch (error: any) {
      console.error('DNS check error:', error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'DNS-Überprüfung fehlgeschlagen',
          details: error.message 
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/email/domains/check-dns
 * Get DNS check instructions
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    info: 'DNS Check Endpoint',
    usage: 'POST with { domainId: string, dnsRecords: DnsRecord[] }',
    description: 'Checks DNS records and returns validation results',
    supportedTypes: ['CNAME', 'TXT', 'MX']
  });
}