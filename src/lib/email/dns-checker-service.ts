// src/lib/email/dns-checker-service.ts
import { Resolver, promises as dnsPromises } from 'dns';
import { promisify } from 'util';
import { DnsCheckResult, DnsRecord, DNS_PROVIDER_PATTERNS } from '@/types/email-domains';

/**
 * Service für DNS-Überprüfungen und Provider-Erkennung
 */
export class DnsCheckerService {
  private resolver: Resolver;
  private resolveCname: (hostname: string) => Promise<string[]>;
  private resolveTxt: (hostname: string) => Promise<string[][]>;
  private resolveNs: (hostname: string) => Promise<string[]>;
  private resolveMx: (hostname: string) => Promise<Array<{ priority: number; exchange: string }>>;

  constructor() {
    this.resolver = new Resolver();
    
    // Verwende öffentliche DNS Server für konsistente Ergebnisse
    this.resolver.setServers([
      '8.8.8.8',      // Google Public DNS Primary
      '8.8.4.4',      // Google Public DNS Secondary
      '1.1.1.1',      // Cloudflare DNS Primary
      '1.0.0.1'       // Cloudflare DNS Secondary
    ]);

    // Promisify DNS-Methoden
    this.resolveCname = promisify(this.resolver.resolveCname).bind(this.resolver);
    this.resolveTxt = promisify(this.resolver.resolveTxt).bind(this.resolver);
    this.resolveNs = promisify(this.resolver.resolveNs).bind(this.resolver);
    this.resolveMx = promisify(this.resolver.resolveMx).bind(this.resolver);
  }

  /**
   * Überprüft einen einzelnen CNAME-Record
   */
  async checkCnameRecord(hostname: string, expectedValue: string): Promise<DnsCheckResult> {
    const startTime = Date.now();
    
    try {
      // Normalisiere den Hostnamen (entferne trailing dot falls vorhanden)
      const normalizedHostname = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
      
      const values = await this.resolveCname(normalizedHostname);
      
      // CNAME-Werte können mit oder ohne trailing dot zurückkommen
      const actualValue = values[0];
      const normalizedActual = actualValue?.endsWith('.') ? actualValue.slice(0, -1) : actualValue;
      const normalizedExpected = expectedValue.endsWith('.') ? expectedValue.slice(0, -1) : expectedValue;
      
      return {
        recordType: 'CNAME',
        hostname: normalizedHostname,
        expectedValue: expectedValue,
        actualValue: actualValue,
        isValid: normalizedActual?.toLowerCase() === normalizedExpected.toLowerCase(),
        checkedAt: new Date() as any,
      };
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      
      return {
        recordType: 'CNAME',
        hostname: hostname,
        expectedValue: expectedValue,
        isValid: false,
        checkedAt: new Date() as any,
        error: errorMessage
      };
    }
  }

  /**
   * Überprüft einen einzelnen TXT-Record
   */
  async checkTxtRecord(hostname: string, expectedValue: string): Promise<DnsCheckResult> {
    try {
      const normalizedHostname = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
      const values = await this.resolveTxt(normalizedHostname);
      
      // TXT-Records können als Array von Arrays zurückkommen
      const flatValues = values.flat();
      
      // Suche nach dem erwarteten Wert (case-insensitive)
      const found = flatValues.some(value => 
        value.toLowerCase() === expectedValue.toLowerCase()
      );
      
      return {
        recordType: 'TXT',
        hostname: normalizedHostname,
        expectedValue: expectedValue,
        actualValue: flatValues.join('; '),
        isValid: found,
        checkedAt: new Date() as any,
      };
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      
      return {
        recordType: 'TXT',
        hostname: hostname,
        expectedValue: expectedValue,
        isValid: false,
        checkedAt: new Date() as any,
        error: errorMessage
      };
    }
  }

  /**
   * Überprüft einen einzelnen MX-Record
   */
  async checkMxRecord(hostname: string, expectedValue: string): Promise<DnsCheckResult> {
    try {
      const normalizedHostname = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
      const values = await this.resolveMx(normalizedHostname);
      
      // MX-Records haben Priorität und Exchange
      const exchanges = values.map(mx => mx.exchange);
      const normalizedExpected = expectedValue.endsWith('.') ? expectedValue.slice(0, -1) : expectedValue;
      
      const found = exchanges.some(exchange => {
        const normalizedExchange = exchange.endsWith('.') ? exchange.slice(0, -1) : exchange;
        return normalizedExchange.toLowerCase() === normalizedExpected.toLowerCase();
      });
      
      return {
        recordType: 'MX',
        hostname: normalizedHostname,
        expectedValue: expectedValue,
        actualValue: exchanges.join(', '),
        isValid: found,
        checkedAt: new Date() as any,
      };
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      
      return {
        recordType: 'MX',
        hostname: hostname,
        expectedValue: expectedValue,
        isValid: false,
        checkedAt: new Date() as any,
        error: errorMessage
      };
    }
  }

  /**
   * Überprüft alle DNS-Records für eine Domain
   */
  async checkAllRecords(dnsRecords: DnsRecord[]): Promise<DnsCheckResult[]> {
    const checkPromises = dnsRecords.map(async (record) => {
      switch (record.type.toUpperCase()) {
        case 'CNAME':
          return this.checkCnameRecord(record.host, record.data);
        case 'TXT':
          return this.checkTxtRecord(record.host, record.data);
        case 'MX':
          return this.checkMxRecord(record.host, record.data);
        default:
          return {
            recordType: record.type,
            hostname: record.host,
            expectedValue: record.data,
            isValid: false,
            checkedAt: new Date() as any,
            error: `Nicht unterstützter Record-Typ: ${record.type}`
          };
      }
    });

    // Führe alle Checks parallel aus, aber mit Timeout
    const results = await Promise.all(
      checkPromises.map(promise => 
        Promise.race([
          promise,
          this.createTimeoutPromise(30000) // 30 Sekunden Timeout pro Check
        ])
      )
    );

    return results;
  }

  /**
   * Erkennt den DNS-Provider einer Domain
   */
  async detectDnsProvider(domain: string): Promise<string | null> {
    try {
      // Entferne Subdomain falls vorhanden
      const baseDomain = this.extractBaseDomain(domain);
      
      // Hole die Nameserver
      const nameservers = await this.resolveNs(baseDomain);
      
      // Normalisiere Nameserver (lowercase, entferne trailing dots)
      const normalizedNameservers = nameservers.map(ns => 
        ns.toLowerCase().replace(/\.$/, '')
      );

      // Durchsuche Provider-Patterns
      for (const [provider, patterns] of Object.entries(DNS_PROVIDER_PATTERNS)) {
        const found = normalizedNameservers.some(ns => 
          patterns.some(pattern => ns.includes(pattern.toLowerCase()))
        );
        
        if (found) {
          return provider;
        }
      }

      // Zusätzliche Heuristiken für nicht gematchte Provider
      const heuristicProvider = this.detectProviderByHeuristics(normalizedNameservers);
      if (heuristicProvider) {
        return heuristicProvider;
      }

      return null;
    } catch (error) {
      console.error('Provider detection failed:', error);
      return null;
    }
  }

  /**
   * Überprüft die DNS-Propagierung weltweit
   */
  async checkDnsPropagation(hostname: string, recordType: 'CNAME' | 'TXT' | 'MX', expectedValue: string): Promise<{
    propagated: boolean;
    servers: Array<{ server: string; success: boolean; value?: string }>;
  }> {
    // Liste von öffentlichen DNS-Servern weltweit
    const dnsServers = [
      { name: 'Google', ip: '8.8.8.8' },
      { name: 'Cloudflare', ip: '1.1.1.1' },
      { name: 'OpenDNS', ip: '208.67.222.222' },
      { name: 'Quad9', ip: '9.9.9.9' },
      { name: 'Comodo', ip: '8.26.56.26' },
    ];

    const results = await Promise.all(
      dnsServers.map(async (server) => {
        const tempResolver = new Resolver();
        tempResolver.setServers([server.ip]);

        try {
          let value: string | undefined;
          
          switch (recordType) {
            case 'CNAME':
              const cname = await promisify(tempResolver.resolveCname).bind(tempResolver)(hostname);
              value = cname[0];
              break;
            case 'TXT':
              const txt = await promisify(tempResolver.resolveTxt).bind(tempResolver)(hostname);
              value = txt.flat().join('; ');
              break;
            case 'MX':
              const mx = await promisify(tempResolver.resolveMx).bind(tempResolver)(hostname);
              value = mx.map(m => m.exchange).join(', ');
              break;
          }

          const normalizedValue = value?.endsWith('.') ? value.slice(0, -1) : value;
          const normalizedExpected = expectedValue.endsWith('.') ? expectedValue.slice(0, -1) : expectedValue;
          
          return {
            server: `${server.name} (${server.ip})`,
            success: normalizedValue?.toLowerCase() === normalizedExpected.toLowerCase(),
            value
          };
        } catch (error) {
          return {
            server: `${server.name} (${server.ip})`,
            success: false
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const propagated = successCount >= Math.ceil(dnsServers.length * 0.8); // 80% müssen erfolgreich sein

    return { propagated, servers: results };
  }

  /**
   * Hilfsmethoden
   */

  private getErrorMessage(error: any): string {
    if (error.code === 'ENOTFOUND') {
      return 'DNS-Eintrag nicht gefunden. Bitte prüfen Sie, ob der Eintrag korrekt angelegt wurde.';
    } else if (error.code === 'ETIMEOUT') {
      return 'Zeitüberschreitung bei der DNS-Abfrage. Bitte versuchen Sie es später erneut.';
    } else if (error.code === 'ESERVFAIL') {
      return 'DNS-Server-Fehler. Der DNS-Server konnte die Anfrage nicht verarbeiten.';
    } else if (error.code === 'ENODATA') {
      return 'Keine Daten für diesen Record-Typ gefunden.';
    } else {
      return `DNS-Fehler: ${error.message || 'Unbekannter Fehler'}`;
    }
  }

  private createTimeoutPromise(ms: number): Promise<DnsCheckResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          recordType: 'UNKNOWN',
          hostname: '',
          expectedValue: '',
          isValid: false,
          checkedAt: new Date() as any,
          error: `Zeitüberschreitung nach ${ms / 1000} Sekunden`
        });
      }, ms);
    });
  }

  private extractBaseDomain(domain: string): string {
    // Entfernt Subdomains und gibt nur die Basis-Domain zurück
    const parts = domain.split('.');
    if (parts.length <= 2) {
      return domain;
    }
    
    // Behandle spezielle TLDs wie .co.uk, .com.au etc.
    const specialTlds = ['co.uk', 'com.au', 'co.nz', 'co.jp', 'co.kr', 'com.br', 'com.mx'];
    const lastTwoParts = parts.slice(-2).join('.');
    
    if (specialTlds.includes(lastTwoParts)) {
      return parts.slice(-3).join('.');
    }
    
    return parts.slice(-2).join('.');
  }

  private detectProviderByHeuristics(nameservers: string[]): string | null {
    // Zusätzliche Heuristiken für Provider-Erkennung
    for (const ns of nameservers) {
      // WordPress.com
      if (ns.includes('wordpress.com')) return 'wordpress';
      
      // Wix
      if (ns.includes('wixdns')) return 'wix';
      
      // Squarespace
      if (ns.includes('squarespace')) return 'squarespace';
      
      // Shopify
      if (ns.includes('myshopify')) return 'shopify';
      
      // DigitalOcean
      if (ns.includes('digitalocean')) return 'digitalocean';
      
      // Weitere deutsche Provider
      if (ns.includes('df.eu')) return 'domainfactory';
      if (ns.includes('schlund.de')) return 'ionos';
      if (ns.includes('ispgateway')) return 'strato';
    }
    
    return null;
  }
}

// Singleton-Export
export const dnsCheckerService = new DnsCheckerService();