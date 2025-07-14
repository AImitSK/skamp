// src/app/api/email/domains/detect-provider/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth-middleware';
import { dnsCheckerService } from '@/lib/email/dns-checker-service';
import { DetectProviderRequest, DetectProviderResponse } from '@/types/email-domains';

/**
 * POST /api/email/domains/detect-provider
 * DNS-Provider einer Domain erkennen
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const data: DetectProviderRequest = await req.json();
      
      if (!data.domain) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Domain ist erforderlich' 
          },
          { status: 400 }
        );
      }

      // Domain normalisieren
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

      console.log('🔍 Detecting DNS provider for:', domain);

      try {
        const provider = await dnsCheckerService.detectDnsProvider(domain);
        
        console.log('✅ Provider detected:', provider || 'unknown');

        const response: DetectProviderResponse = {
          success: true,
          provider
        };

        return NextResponse.json(response);

      } catch (detectionError: any) {
        console.warn('⚠️ Provider detection failed:', detectionError.message);
        
        // Bei Fehler trotzdem success mit null zurückgeben
        // (User kann Provider manuell auswählen)
        return NextResponse.json({
          success: true,
          provider: null
        });
      }

    } catch (error: any) {
      console.error('❌ Provider detection error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'Provider-Erkennung fehlgeschlagen' 
        },
        { status: 500 }
      );
    }
  });
}