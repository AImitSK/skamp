// src/app/api/email/domains/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgClient from '@sendgrid/client';

// SendGrid konfigurieren
if (process.env.SENDGRID_API_KEY) {
  sgClient.setApiKey(process.env.SENDGRID_API_KEY);
}

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * DELETE /api/email/domains/[id]
 * Domain bei SendGrid löschen
 * Firestore-Löschung macht der Client
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

      // Get SendGrid domain ID from request body
      const body = await req.json().catch(() => ({}));
      const sendgridDomainId = body.sendgridDomainId;

      console.log('🗑️ Deleting domain from SendGrid:', sendgridDomainId);

      // Domain bei SendGrid löschen (falls vorhanden)
      if (sendgridDomainId) {
        try {
          await sgClient.request({
            method: 'DELETE',
            url: `/v3/whitelabel/domains/${sendgridDomainId}`
          });
          console.log('✅ Domain deleted from SendGrid');
        } catch (sgError: any) {
          // 404 ist OK (Domain existiert nicht mehr bei SendGrid)
          if (sgError.response?.status !== 404) {
            console.error('⚠️ SendGrid deletion failed:', sgError);
            // Trotzdem success zurückgeben, damit Client aus Firebase löschen kann
          }
        }
      }

      // Client wird Domain aus Firebase löschen
      return NextResponse.json({
        success: true,
        message: 'Domain kann jetzt aus Firebase gelöscht werden'
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