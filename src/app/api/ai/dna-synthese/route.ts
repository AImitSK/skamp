// src/app/api/ai/dna-synthese/route.ts
// API Route für DNA Synthese - KI-Komprimierung der 6 Marken-DNA Dokumente

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { dnaSyntheseFlow, type DNASyntheseInput } from '@/lib/ai/flows/dna-synthese';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body: DNASyntheseInput = await req.json();

      // Validierung
      if (!body.companyId || !body.companyName || !body.markenDNAContent) {
        return NextResponse.json(
          { error: 'Fehlende Parameter: companyId, companyName oder markenDNAContent' },
          { status: 400 }
        );
      }

      // Prüfen ob Content nicht leer ist
      if (body.markenDNAContent.trim().length < 100) {
        return NextResponse.json(
          { error: 'markenDNAContent ist zu kurz - mindestens 6 Dokumente erforderlich' },
          { status: 400 }
        );
      }

      // Flow aufrufen
      const result = await dnaSyntheseFlow(body);

      return NextResponse.json(result);
    } catch (error: unknown) {
      console.error('DNA Synthese Fehler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      return NextResponse.json(
        { error: `DNA Synthese fehlgeschlagen: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
