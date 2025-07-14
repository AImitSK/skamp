// src/app/api/email/domains/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import sgClient from '@sendgrid/client';

// SendGrid konfigurieren
sgClient.setApiKey(process.env.SENDGRID_API_KEY!);

interface VerifyDomainRequest {
  domainId: string;
}

/**
 * POST /api/email/domains/verify
 * Verifizierungsstatus bei SendGrid prüfen und aktualisieren
 */
export async function POST(request: NextRequest) {
  // Die 'withAuth'-Funktion umschließt die Routenlogik, um die Authentifizierung zu gewährleisten.
  // Sie erwartet die Anfrage und eine Callback-Funktion als Argumente, was den Fehler "Expected 2 arguments" behebt.
  return withAuth(request, async (req: NextRequest, auth: AuthContext) => {
    try {
      // Wichtig: 'req.json()' verwenden, das vom withAuth-Callback kommt.
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

      // Domain aus Firebase laden und Berechtigung prüfen
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

      // Schritt 1: Eine neue Validierungsprüfung bei SendGrid anstoßen.
      try {
        await sgClient.request({
          method: 'POST',
          url: `/v3/whitelabel/domains/${domain.sendgridDomainId}/validate`
        });
        console.log('✅ SendGrid validation triggered successfully.');
      } catch (validateError: any) {
        // Dieser Fehler ist nicht unbedingt kritisch, wenn die Domain bereits validiert wird.
        console.warn('⚠️ Could not trigger SendGrid validation. This might be okay if a validation is already in progress.', validateError.response?.body || validateError.message);
      }

      // Schritt 2: Den aktuellen Status der Domain von SendGrid abrufen.
      const [statusResponse, ] = await sgClient.request({
          method: 'GET',
          url: `/v3/whitelabel/domains/${domain.sendgridDomainId}`
      });

      const sendgridDomain = statusResponse.body as any;
      console.log('📊 SendGrid verification status:', sendgridDomain.valid ? 'valid' : 'invalid');

      // DNS Records aus der Antwort extrahieren und aktualisieren
      const updatedDnsRecords = [];
      if (sendgridDomain.dns) {
          const { mail_cname, dkim1, dkim2 } = sendgridDomain.dns;
          if (mail_cname) {
              updatedDnsRecords.push({ type: 'CNAME' as const, ...mail_cname });
          }
          if (dkim1) {
              updatedDnsRecords.push({ type: 'CNAME' as const, ...dkim1 });
          }
          if (dkim2) {
              updatedDnsRecords.push({ type: 'CNAME' as const, ...dkim2 });
          }
      }
      
      // Domain-Status in Firebase aktualisieren
      const newStatus = sendgridDomain.valid ? 'verified' : 'pending';
      await domainService.updateVerificationStatus(
        domainId, 
        newStatus,
        true // incrementAttempts
      );

      // DNS Records in Firebase aktualisieren
      await domainService.updateDnsRecords(domainId, updatedDnsRecords);

      return NextResponse.json({
        success: true,
        status: newStatus,
        valid: sendgridDomain.valid,
        dnsRecords: updatedDnsRecords,
        details: {
          mailCnameValid: sendgridDomain.dns?.mail_cname?.valid || false,
          dkim1Valid: sendgridDomain.dns?.dkim1?.valid || false,
          dkim2Valid: sendgridDomain.dns?.dkim2?.valid || false
        }
      });

    } catch (error: any) {
      console.error('❌ Verification error:', error.response?.body || error);
      
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
