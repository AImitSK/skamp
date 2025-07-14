// src/app/api/email/domains/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import { CreateDomainRequest, CreateDomainResponse, DnsRecord } from '@/types/email-domains';
import sgClient from '@sendgrid/client';

// SendGrid konfigurieren
sgClient.setApiKey(process.env.SENDGRID_API_KEY!);

/**
 * POST /api/email/domains
 * Neue Domain bei SendGrid registrieren und in Firebase speichern
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data: CreateDomainRequest = await req.json();
      
      // Validierung
      if (!data.domain) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ist erforderlich' 
          },
          { status: 400 }
        );
      }

      // Domain normalisieren (lowercase, trim)
      const domain = data.domain.toLowerCase().trim();
      
      // Domain-Format validieren
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(domain)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Ungültiges Domain-Format' 
          },
          { status: 400 }
        );
      }

      console.log('🌐 Creating domain authentication for:', domain);

      // Prüfe ob Domain bereits existiert
      const existingDomain = await domainService.getByDomain(domain, auth.organizationId);
      if (existingDomain) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Diese Domain ist bereits registriert' 
          },
          { status: 409 }
        );
      }

      // Domain bei SendGrid authentifizieren
      const [response, ] = await sgClient.request({
        method: 'POST',
        url: '/v3/whitelabel/domains',
        body: {
          domain: domain,
          subdomain: `em${Date.now()}`, // Unique subdomain für SendGrid
          automatic_security: true,
          custom_spf: false,
          default: false
        }
      });

      const sendgridDomain = response.body as any;
      console.log('✅ SendGrid domain created:', sendgridDomain.id);

      // DNS Records extrahieren
      const dnsRecords: DnsRecord[] = [];
      
      // Mail CNAME
      if (sendgridDomain.dns.mail_cname) {
        dnsRecords.push({
          type: 'CNAME',
          host: sendgridDomain.dns.mail_cname.host,
          data: sendgridDomain.dns.mail_cname.data,
          valid: sendgridDomain.dns.mail_cname.valid
        });
      }

      // DKIM Records
      if (sendgridDomain.dns.dkim1) {
        dnsRecords.push({
          type: 'CNAME',
          host: sendgridDomain.dns.dkim1.host,
          data: sendgridDomain.dns.dkim1.data,
          valid: sendgridDomain.dns.dkim1.valid
        });
      }

      if (sendgridDomain.dns.dkim2) {
        dnsRecords.push({
          type: 'CNAME',
          host: sendgridDomain.dns.dkim2.host,
          data: sendgridDomain.dns.dkim2.data,
          valid: sendgridDomain.dns.dkim2.valid
        });
      }

      // Domain in Firebase speichern
      const domainId = await domainService.create({
        domain,
        provider: data.provider,
        userId: auth.userId,
        organizationId: auth.organizationId
      });
      
      // SendGrid Domain ID separat updaten
      await domainService.update(domainId, {
        sendgridDomainId: sendgridDomain.id,
        dnsRecords
      });

      console.log('💾 Domain saved to Firebase:', domainId);

      const response_data: CreateDomainResponse = {
        success: true,
        domainId,
        dnsRecords
      };

      return NextResponse.json(response_data);

    } catch (error: any) {
      console.error('❌ Domain creation error:', error);
      
      // SendGrid-spezifische Fehler behandeln
      if (error.response?.body) {
        const sendgridError = error.response.body;
        return NextResponse.json(
          { 
            success: false,
            error: sendgridError.errors?.[0]?.message || 'SendGrid-Fehler',
            details: sendgridError
          },
          { status: error.code || 500 }
        );
      }

      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'Domain konnte nicht erstellt werden' 
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/email/domains
 * Alle Domains einer Organisation abrufen
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const domains = await domainService.getAll(auth.organizationId);
      
      return NextResponse.json({
        success: true,
        domains,
        count: domains.length
      });

    } catch (error: any) {
      console.error('❌ Error fetching domains:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Domains konnten nicht geladen werden' 
        },
        { status: 500 }
      );
    }
  });
}