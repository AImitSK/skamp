// src/lib/email/dns-checker-service-edge.ts
import { DnsCheckResult, DnsRecord } from '@/types/email-domains';

/**
 * DNS Checker Service für Edge Runtime (Vercel)
 * Verwendet externe APIs statt Node.js DNS Module
 */
export class DnsCheckerServiceEdge {
  
  /**
   * Prüft alle DNS Records über externe API
   */
  async checkAllRecords(dnsRecords: DnsRecord[]): Promise<DnsCheckResult[]> {
    console.log('🔍 Checking DNS records via external API:', dnsRecords);
    
    const checkPromises = dnsRecords.map(async (record) => {
      try {
        // Option 1: Google DNS API (public, no auth required)
        const response = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(record.host)}&type=${record.type}`,
          { 
            headers: { 'Accept': 'application/json' },
            // Add timeout
            signal: AbortSignal.timeout(10000)
          }
        );
        
        if (!response.ok) {
          throw new Error(`DNS lookup failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse response based on record type
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
        } as DnsCheckResult;
        
      } catch (error: any) {
        console.error('DNS check error for', record.host, ':', error);
        
        // Fallback to mock for development
        return {
          recordType: record.type,
          hostname: record.host,
          expectedValue: record.data,
          actualValue: undefined,
          isValid: false,
          checkedAt: new Date() as any,
          error: error.message || 'DNS lookup failed'
        } as DnsCheckResult;
      }
    });
    
    return Promise.all(checkPromises);
  }
  
  /**
   * Erkennt den DNS Provider über externe API
   */
  async detectDnsProvider(domain: string): Promise<string | null> {
    try {
      // Use Google DNS to get NS records
      const response = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`,
        { 
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        }
      );
      
      if (!response.ok) {
        throw new Error(`NS lookup failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.Answer && data.Answer.length > 0) {
        const nameservers = data.Answer.map((a: any) => a.data.toLowerCase());
        
        // Provider patterns
        const providerPatterns: Record<string, string[]> = {
          'ionos': ['ionos', 'ui-dns'],
          'strato': ['strato'],
          'godaddy': ['godaddy', 'domaincontrol'],
          'cloudflare': ['cloudflare'],
          'hetzner': ['hetzner', 'your-server.de'],
          'all-inkl': ['all-inkl', 'kasserver'],
        };
        
        for (const [provider, patterns] of Object.entries(providerPatterns)) {
          if (nameservers.some((ns: string) => 
            patterns.some(pattern => ns.includes(pattern))
          )) {
            return provider;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Provider detection failed:', error);
      return null;
    }
  }
}

export const dnsCheckerService = new DnsCheckerServiceEdge();