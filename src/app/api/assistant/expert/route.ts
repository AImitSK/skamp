// src/app/api/assistant/expert/route.ts
// API Route für Experten-Assistenten mit DNA Synthese Integration
// Phase 5: KI-Assistenten Integration

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { expertAssistantFlow } from '@/lib/ai/flows/expert-assistant';
import type { z } from 'genkit';

// Input Type aus dem Flow-Schema ableiten
type ExpertAssistantInput = {
  projectId: string;
  userPrompt: string;
  language?: 'de' | 'en';
  outputFormat?: 'pressrelease' | 'social' | 'blog' | 'email' | 'custom';
};

/**
 * POST /api/assistant/expert
 *
 * Generiert Text mit dem Experten-Modus (CeleroPress Formel)
 *
 * Dieser Endpoint:
 * - Prüft die Session-Authentifizierung
 * - Validiert Projekt-Zugriff
 * - Ruft expertAssistantFlow auf
 * - Gibt generierten Text mit Metadaten zurück
 *
 * @requires Authentication (Bearer Token)
 * @requires Project Access (projectId muss zu organizationId gehören)
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const body: ExpertAssistantInput = await req.json();

      // Validierung der erforderlichen Parameter
      if (!body.projectId || !body.userPrompt) {
        return NextResponse.json(
          { error: 'Fehlende Parameter: projectId und userPrompt sind erforderlich' },
          { status: 400 }
        );
      }

      // Projekt-Zugriffsprüfung
      // TODO: Implementiere checkProjectAccess wenn verfügbar
      // Für jetzt: Validierung dass projectId existiert und zu Organization gehört
      const hasAccess = await checkProjectAccess(body.projectId, auth.organizationId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden: Kein Zugriff auf dieses Projekt' },
          { status: 403 }
        );
      }

      // Flow aufrufen mit vollständigen Parametern
      const result = await expertAssistantFlow({
        projectId: body.projectId,
        userPrompt: body.userPrompt,
        language: body.language || 'de',
        outputFormat: body.outputFormat,
      });

      return NextResponse.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      return NextResponse.json(
        { error: `Generation failed: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

/**
 * OPTIONS für CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}

/**
 * Prüft ob die Organization Zugriff auf das Projekt hat
 *
 * @param projectId - ID des Projekts
 * @param organizationId - ID der Organization
 * @returns true wenn Zugriff erlaubt ist
 */
async function checkProjectAccess(
  projectId: string,
  organizationId: string
): Promise<boolean> {
  try {
    // Firestore REST API aufrufen
    const projectIdEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectIdEnv}/databases/(default)/documents`;
    const docPath = `organizations/${organizationId}/projects/${projectId}`;

    const response = await fetch(`${baseUrl}/${docPath}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Wenn Dokument existiert, hat Organization Zugriff
    if (response.ok) {
      return true;
    }

    // 404 = Projekt nicht gefunden oder kein Zugriff
    if (response.status === 404) {
      return false;
    }

    // Andere Fehler loggen aber als "kein Zugriff" behandeln
    console.error('Project access check failed:', response.status);
    return false;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
}
