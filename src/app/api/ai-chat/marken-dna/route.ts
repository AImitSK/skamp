// src/app/api/ai-chat/marken-dna/route.ts
// API Route für Marken-DNA Chat mit Genkit Flow
// Phase 3: KI-Chat Backend

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { markenDNAChatFlow, type MarkenDNAChatInput } from '@/lib/ai/flows/marken-dna-chat';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body: MarkenDNAChatInput = await req.json();

      // Validierung
      if (!body.documentType || !body.companyId || !body.companyName || !body.messages) {
        return NextResponse.json(
          { error: 'Fehlende Parameter: documentType, companyId, companyName oder messages' },
          { status: 400 }
        );
      }

      // Flow aufrufen
      const result = await markenDNAChatFlow(body);

      return NextResponse.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      return NextResponse.json(
        { error: `Chat generation failed: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
