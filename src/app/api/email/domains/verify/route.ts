// src/app/api/email/domains/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import sgClient from '@sendgrid/client';

// SendGrid konfigurieren
if (process.env.SENDGRID_API_KEY) {
  sgClient.setApiKey(process.env.SENDGRID_API_KEY);
}

interface VerifyDomainRequest {
  domainId: string;
}

/**
 * POST /api/email/domains/verify
 * Verifizierungsstatus bei SendGrid prüfen und aktualisieren
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { domainId }: VerifyDomainRequest = await req.json();
      
      if (!domainId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ID ist erforderlich' 
          },
          { status: 400 }
        );
      }

      console.log('🔍 Verifying domain:', domainId);

      // Domain aus Firebase laden
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

      if (!domain.sendgridDomainId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Keine SendGrid Domain ID vorhanden' 
          },
          { status: 400 }
        );
      }

      // SendGrid Domain Status prüfen
      const [response, ] = await sgClient.request({
        method: 'GET',
        url: `/v3/whitelabel/domains/${domain.sendgridDomainId}`
      });

      const sendgridDomain = response.body as any;
      console.log('📊 SendGrid verification status:', sendgridDomain.valid ? 'valid' : 'invalid');

      // DNS Records aktualisieren
      const updatedDnsRecords = [];
      
      if (sendgridDomain.dns.mail_cname) {
        updatedDnsRecords.push({
          type: 'CNAME' as const,
          host: sendgridDomain.dns.mail_cname.host,
          data: sendgridDomain.dns.mail_cname.data,
          valid: sendgridDomain.dns.mail_cname.valid
        });
      }

      if (sendgridDomain.dns.dkim1) {
        updatedDnsRecords.push({
          type: 'CNAME' as const,
          host: sendgridDomain.dns.dkim1.host,
          data: sendgridDomain.dns.dkim1.data,
          valid: sendgridDomain.dns.dkim1.valid
        });
      }

      if (sendgridDomain.dns.dkim2) {
        updatedDnsRecords.push({
          type: 'CNAME' as const,
          host: sendgridDomain.dns.dkim2.host,
          data: sendgridDomain.dns.dkim2.data,
          valid: sendgridDomain.dns.dkim2.valid
        });
      }

      // Domain-Status in Firebase aktualisieren
      const newStatus = sendgridDomain.valid ? 'verified' : 'pending';
      await domainService.updateVerificationStatus(
        domainId, 
        newStatus,
        true // incrementAttempts
      );

      // DNS Records aktualisieren
      await domainService.updateDnsRecords(domainId, updatedDnsRecords);

      // Falls verifiziert, triggere auch DNS validate bei SendGrid
      if (sendgridDomain.valid) {
        try {
          await sgClient.request({
            method: 'POST',
            url: `/v3/whitelabel/domains/${domain.sendgridDomainId}/validate`
          });
          console.log('✅ SendGrid validation triggered');
        } catch (validateError) {
          console.warn('⚠️ SendGrid validate failed:', validateError);
          // Nicht kritisch, weitermachen
        }
      }

      return NextResponse.json({
        success: true,
        status: newStatus,
        valid: sendgridDomain.valid,
        dnsRecords: updatedDnsRecords,
        details: {
          mailCnameValid: sendgridDomain.dns.mail_cname?.valid || false,
          dkim1Valid: sendgridDomain.dns.dkim1?.valid || false,
          dkim2Valid: sendgridDomain.dns.dkim2?.valid || false
        }
      });

    } catch (error: any) {
      console.error('❌ Verification error:', error);
      
      // SendGrid-spezifische Fehler
      if (error.response?.status === 404) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain wurde bei SendGrid nicht gefunden. Möglicherweise wurde sie gelöscht.' 
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'Verifizierung fehlgeschlagen' 
        },
        { status: 500 }
      );
    }
  });
}