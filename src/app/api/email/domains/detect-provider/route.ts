// src/app/api/email/domains/detect-provider/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth-middleware';
import { DetectProviderRequest, DetectProviderResponse } from '@/types/email-domains';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * Mock DNS Provider Detection für Edge Runtime
 */
class MockDnsProviderDetector {
  async detectDnsProvider(domain: string): Promise<string | null> {
    console.log(`🔍 Mock detecting DNS provider for ${domain}`);
    
    // Simuliere Provider-Erkennung basierend auf Domain-Namen
    const domainLower = domain.toLowerCase();
    
    // Einige heuristische Checks
    if (domainLower.includes('ionos')) return 'ionos';
    if (domainLower.includes('strato')) return 'strato';
    if (domainLower.includes('gmail') || domainLower.includes('google')) return 'google';
    
    // Zufälliger Provider für Development
    const providers = ['ionos', 'strato', 'cloudflare', 'hetzner', 'godaddy', null];
    return providers[Math.floor(Math.random() * providers.length)];
  }
}

const mockDetector = new MockDnsProviderDetector();

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
        const provider = await mockDetector.detectDnsProvider(domain);
        
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