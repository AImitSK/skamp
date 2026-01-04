// src/app/api/ai-chat/agentic/route.ts
// API Route für Agentic Chat mit Tool-Calls

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { agenticChatFlow, type AgenticChatInput } from '@/lib/ai/agentic/flows/agentic-chat-flow';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body: AgenticChatInput = await req.json();

      // Validierung
      if (!body.specialistType || !body.companyId || !body.companyName || !body.messages) {
        return NextResponse.json(
          { error: 'Fehlende Parameter: specialistType, companyId, companyName oder messages' },
          { status: 400 }
        );
      }

      // Flow aufrufen
      const result = await agenticChatFlow(body);

      return NextResponse.json(result);
    } catch (error: unknown) {
      console.error('Agentic Chat Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      return NextResponse.json(
        { error: `Agentic Chat fehlgeschlagen: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
