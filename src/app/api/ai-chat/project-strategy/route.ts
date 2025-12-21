// src/app/api/ai-chat/project-strategy/route.ts
// API Route für Projekt-Kernbotschaft Chat mit Genkit Flow
// Phase 3: KI-Chat Backend (Strategie-Tab Integration)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { projectStrategyChatFlow, type ProjectStrategyChatInput } from '@/lib/ai/flows/project-strategy-chat';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body: ProjectStrategyChatInput = await req.json();

      // Validierung
      if (!body.projectId || !body.companyId || !body.companyName || !body.messages) {
        return NextResponse.json(
          { error: 'Fehlende Parameter: projectId, companyId, companyName oder messages' },
          { status: 400 }
        );
      }

      // Flow aufrufen
      const result = await projectStrategyChatFlow(body);

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
