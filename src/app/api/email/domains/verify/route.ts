// src/app/api/email/domains/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgClient from '@sendgrid/client';

// SendGrid konfigurieren
if (process.env.SENDGRID_API_KEY) {
  sgClient.setApiKey(process.env.SENDGRID_API_KEY);
}

interface VerifyDomainRequest {
  domainId: string;
  sendgridDomainId: number;
}

/**
 * POST /api/email/domains/verify
 * Verifizierungsstatus bei SendGrid prüfen
 * Firestore-Updates werden vom Client gemacht
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { domainId, sendgridDomainId }: VerifyDomainRequest = await req.json();
      
      if (!domainId || !sendgridDomainId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ID und SendGrid Domain ID sind erforderlich' 
          },
          { status: 400 }
        );
      }

      console.log('🔍 Checking SendGrid domain status:', sendgridDomainId);

      // SendGrid Domain Status prüfen
      const [response, ] = await sgClient.request({
        method: 'GET',
        url: `/v3/whitelabel/domains/${sendgridDomainId}`
      });

      const sendgridDomain = response.body as any;
      console.log('📊 SendGrid verification status:', sendgridDomain.valid ? 'valid' : 'invalid');

      // DNS Records extrahieren
      const dnsRecords = [];
      
      if (sendgridDomain.dns.mail_cname) {
        dnsRecords.push({
          type: 'CNAME',
          host: sendgridDomain.dns.mail_cname.host,
          data: sendgridDomain.dns.mail_cname.data,
          valid: sendgridDomain.dns.mail_cname.valid
        });
      }

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

      // Falls verifiziert, triggere auch DNS validate bei SendGrid
      if (sendgridDomain.valid) {
        try {
          await sgClient.request({
            method: 'POST',
            url: `/v3/whitelabel/domains/${sendgridDomainId}/validate`
          });
          console.log('✅ SendGrid validation triggered');
        } catch (validateError) {
          console.warn('⚠️ SendGrid validate failed:', validateError);
          // Nicht kritisch, weitermachen
        }
      }

      // Return the data, client will update Firestore
      return NextResponse.json({
        success: true,
        domainId,
        status: sendgridDomain.valid ? 'verified' : 'pending',
        valid: sendgridDomain.valid,
        dnsRecords,
        details: {
          mailCnameValid: sendgridDomain.dns.mail_cname?.valid || false,
          dkim1Valid: sendgridDomain.dns.dkim1?.valid || false,
          dkim2Valid: sendgridDomain.dns.dkim2?.valid || false
        }
      });

    } catch (error: any) {
      console.error('❌ SendGrid verification error:', error);
      
      // SendGrid-spezifische Fehler
      if (error.response?.status === 404) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain wurde bei SendGrid nicht gefunden.' 
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'SendGrid-Verifizierung fehlgeschlagen' 
        },
        { status: 500 }
      );
    }
  });
}