// src/app/api/email/domains/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import sgClient from '@sendgrid/client';

// SendGrid konfigurieren
sgClient.setApiKey(process.env.SENDGRID_API_KEY!);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * DELETE /api/email/domains/[id]
 * Domain löschen
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const domainId = params.id;
      
      if (!domainId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ID ist erforderlich' 
          },
          { status: 400 }
        );
      }

      console.log('🗑️ Deleting domain:', domainId);

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

      // Domain bei SendGrid löschen (falls vorhanden)
      if (domain.sendgridDomainId) {
        try {
          await sgClient.request({
            method: 'DELETE',
            url: `/v3/whitelabel/domains/${domain.sendgridDomainId}`
          });
          console.log('✅ Domain deleted from SendGrid');
        } catch (sgError: any) {
          // 404 ist OK (Domain existiert nicht mehr bei SendGrid)
          if (sgError.response?.status !== 404) {
            console.error('⚠️ SendGrid deletion failed:', sgError);
            // Trotzdem weitermachen und aus Firebase löschen
          }
        }
      }

      // Domain aus Firebase löschen
      await domainService.delete(domainId);
      console.log('✅ Domain deleted from Firebase');

      return NextResponse.json({
        success: true,
        message: 'Domain erfolgreich gelöscht'
      });

    } catch (error: any) {
      console.error('❌ Domain deletion error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'Domain konnte nicht gelöscht werden' 
        },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/email/domains/[id]
 * Einzelne Domain abrufen
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const domainId = params.id;
      
      if (!domainId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ID ist erforderlich' 
          },
          { status: 400 }
        );
      }

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

      return NextResponse.json({
        success: true,
        domain
      });

    } catch (error: any) {
      console.error('❌ Error fetching domain:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Domain konnte nicht geladen werden' 
        },
        { status: 500 }
      );
    }
  });
}